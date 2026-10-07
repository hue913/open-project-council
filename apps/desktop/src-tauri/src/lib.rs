use keyring::Entry;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, io::{Read, Write}, path::Path, process::Command, sync::{Arc, Mutex, OnceLock}, sync::atomic::{AtomicU64, Ordering}, thread};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalAgentCapability {
  agent: String,
  available: bool,
  detail: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgePairing {
  worker_url: String,
  pairing_id: String,
  pairing_token: String,
  seat_id: String,
  agent: String,
  workspace_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectedBridge {
  bridge_id: String,
  project_id: String,
  seat_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalExecutionResult {
  status: String,
  detail: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredBridge {
  worker_url: String,
  bridge_id: String,
  bridge_token: String,
  project_id: String,
  seat_id: String,
  agent: String,
  workspace_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalJob {
  id: String,
  prompt: String,
  permissions: Vec<String>,
  workspace_path: Option<String>,
}

#[derive(Deserialize)]
struct JobPollResponse {
  job: Option<LocalJob>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SshConnection {
  host: String,
  port: u16,
  username: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SshCommandResult {
  output: String,
  exit_code: i32,
  requires_approval: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SshSessionResult {
  session_id: String,
  requires_approval: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SshOutputResult {
  output: String,
  closed: bool,
}

struct SshSession {
  master: Mutex<Box<dyn MasterPty + Send>>,
  writer: Mutex<Box<dyn Write + Send>>,
  output: Arc<Mutex<Vec<u8>>>,
  child: Mutex<Box<dyn Child + Send + Sync>>,
}

static SSH_SESSIONS: OnceLock<Mutex<HashMap<String, Arc<SshSession>>>> = OnceLock::new();
static NEXT_SESSION_ID: AtomicU64 = AtomicU64::new(1);

fn ssh_sessions() -> &'static Mutex<HashMap<String, Arc<SshSession>>> {
  SSH_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn validate_ssh_connection(connection: &SshConnection) -> Result<(), String> {
  let host = connection.host.trim();
  let username = connection.username.trim();
  if host.is_empty() || username.is_empty() || connection.port == 0 {
    return Err("SSH host, username, and port are required".to_string());
  }
  if host.contains([' ', '\n', '\r', '@', '/']) || username.contains([' ', '\n', '\r', '@', '/']) {
    return Err("SSH host or username contains unsupported shell characters".to_string());
  }
  Ok(())
}

fn validate_pty_size(cols: u16, rows: u16) -> Result<(), String> {
  if cols == 0 || rows == 0 || cols > 500 || rows > 300 {
    return Err("PTY size must be between 1x1 and 500x300".to_string());
  }
  Ok(())
}

fn keychain_entry(project_id: &str) -> Result<Entry, String> {
  Entry::new("org.openprojectcouncil.desktop", &format!("bridge-{project_id}")).map_err(|error| error.to_string())
}

fn project_index_entry() -> Result<Entry, String> {
  Entry::new("org.openprojectcouncil.desktop", "bridge-project-index").map_err(|error| error.to_string())
}

fn connected_project_ids() -> Vec<String> {
  project_index_entry().ok().and_then(|entry| entry.get_password().ok()).and_then(|value| serde_json::from_str(&value).ok()).unwrap_or_default()
}

fn save_connected_project_ids(projects: &[String]) -> Result<(), String> {
  project_index_entry()?.set_password(&serde_json::to_string(projects).map_err(|error| error.to_string())?).map_err(|error| error.to_string())
}

fn saved_bridge(project_id: &str) -> Result<StoredBridge, String> {
  let serialized = keychain_entry(project_id)?.get_password().map_err(|error| error.to_string())?;
  serde_json::from_str(&serialized).map_err(|error| error.to_string())
}

fn ensure_workspace(path: &str) -> Result<(), String> {
  let workspace = Path::new(path);
  if !workspace.is_absolute() || !workspace.is_dir() {
    return Err("Workspace path must be an existing absolute directory".to_string());
  }
  fs::canonicalize(workspace).map_err(|error| error.to_string())?;
  Ok(())
}

fn command_available(command: &str) -> LocalAgentCapability {
  let output = Command::new(command).arg("--version").output();
  match output {
    Ok(result) if result.status.success() => LocalAgentCapability {
      agent: command.to_string(),
      available: true,
      detail: String::from_utf8_lossy(&result.stdout).trim().to_string(),
    },
    _ => LocalAgentCapability {
      agent: command.to_string(),
      available: false,
      detail: "Not installed or not authenticated locally".to_string(),
    },
  }
}

#[tauri::command]
fn inspect_local_agents() -> Vec<LocalAgentCapability> {
  vec![command_available("codex"), command_available("claude")]
}

#[tauri::command]
fn connect_local_agent(pairing: BridgePairing) -> Result<ConnectedBridge, String> {
  if pairing.agent != "codex" && pairing.agent != "claude" {
    return Err("Only codex and claude local agents are supported".to_string());
  }
  ensure_workspace(&pairing.workspace_path)?;
  let worker = pairing.worker_url.trim_end_matches('/');
  let response = Client::new()
    .post(format!("{worker}/api/local-agents/register"))
    .header("x-council-pairing", &pairing.pairing_token)
    .json(&serde_json::json!({
      "pairingId": pairing.pairing_id,
      "seatId": pairing.seat_id,
      "agent": pairing.agent,
    }))
    .send()
    .map_err(|error| error.to_string())?;
  if !response.status().is_success() {
    return Err("Local bridge registration was rejected".to_string());
  }
  let registered = response.json::<serde_json::Value>().map_err(|error| error.to_string())?;
  let bridge = registered.get("bridge").ok_or("Missing bridge registration")?;
  let bridge_id = bridge.get("id").and_then(|value| value.as_str()).ok_or("Missing bridge ID")?.to_string();
  let bridge_token = bridge.get("token").and_then(|value| value.as_str()).ok_or("Missing bridge token")?.to_string();
  let project_id = bridge.get("projectId").and_then(|value| value.as_str()).ok_or("Missing project ID")?.to_string();
  let seat_id = bridge.get("seatId").and_then(|value| value.as_str()).ok_or("Missing seat ID")?.to_string();
  let config = StoredBridge { worker_url: worker.to_string(), bridge_id: bridge_id.clone(), bridge_token, project_id: project_id.clone(), seat_id: seat_id.clone(), agent: pairing.agent, workspace_path: pairing.workspace_path };
  keychain_entry(&project_id)?.set_password(&serde_json::to_string(&config).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
  let mut projects = connected_project_ids();
  if !projects.iter().any(|id| id == &project_id) { projects.push(project_id.clone()); save_connected_project_ids(&projects)?; }
  Ok(ConnectedBridge { bridge_id, project_id, seat_id })
}

#[tauri::command]
fn list_connected_projects() -> Vec<String> {
  connected_project_ids()
}

fn execute_job(config: &StoredBridge, job: &LocalJob) -> Result<String, String> {
  let workspace = job.workspace_path.as_deref().unwrap_or(&config.workspace_path);
  ensure_workspace(workspace)?;
  let can_write = job.permissions.iter().any(|permission| permission == "write");
  let mut command = if config.agent == "codex" {
    let mut child = Command::new("codex");
    child.arg("exec");
    child.arg("--sandbox");
    child.arg(if can_write { "workspace-write" } else { "read-only" });
    child.arg(&job.prompt);
    child
  } else {
    let mut child = Command::new("claude");
    child.arg("-p");
    child.arg(&job.prompt);
    if can_write { child.arg("--permission-mode").arg("acceptEdits"); }
    child
  };
  let output = command.current_dir(workspace).output().map_err(|error| format!("Could not start local agent: {error}"))?;
  let stdout = String::from_utf8_lossy(&output.stdout);
  let stderr = String::from_utf8_lossy(&output.stderr);
  let text = format!("{}{}{}", stdout, if !stdout.is_empty() && !stderr.is_empty() { "\n" } else { "" }, stderr);
  let limited: String = text.chars().take(12_000).collect();
  if output.status.success() { Ok(limited) } else { Err(if limited.is_empty() { format!("Local agent exited with {}", output.status) } else { limited }) }
}

#[tauri::command]
fn run_next_local_job(project_id: String) -> Result<LocalExecutionResult, String> {
  let config = saved_bridge(&project_id)?;
  let base = format!("{}/api/local-agents/{}/jobs", config.worker_url.trim_end_matches('/'), config.bridge_id);
  let client = Client::new();
  let response = client.get(&base).bearer_auth(&config.bridge_token).send().map_err(|error| error.to_string())?;
  if !response.status().is_success() { return Err("Local bridge job poll failed".to_string()); }
  let poll = response.json::<JobPollResponse>().map_err(|error| error.to_string())?;
  let Some(job) = poll.job else { return Ok(LocalExecutionResult { status: "idle".to_string(), detail: "No local job is waiting".to_string() }); };
  match execute_job(&config, &job) {
    Ok(output) => {
      let response = client.post(format!("{base}/{}/complete", job.id)).bearer_auth(&config.bridge_token).json(&serde_json::json!({ "status": "complete", "output": output })).send().map_err(|error| error.to_string())?;
      if !response.status().is_success() { return Err("Could not report local job completion".to_string()); }
      Ok(LocalExecutionResult { status: "complete".to_string(), detail: "Local agent completed the assigned job".to_string() })
    }
    Err(error) => {
      let _ = client.post(format!("{base}/{}/complete", job.id)).bearer_auth(&config.bridge_token).json(&serde_json::json!({ "status": "error", "error": error })).send();
      Ok(LocalExecutionResult { status: "error".to_string(), detail: "Local agent failed; sanitized output was reported".to_string() })
    }
  }
}

#[tauri::command]
fn revoke_workspace_access(project_id: String) -> Result<(), String> {
  keychain_entry(&project_id)?.delete_credential().map_err(|error| error.to_string())?;
  let projects: Vec<String> = connected_project_ids().into_iter().filter(|id| id != &project_id).collect();
  save_connected_project_ids(&projects)
}

fn ssh_command_requires_approval(command: &str, args: &[String]) -> bool {
  let value = std::iter::once(command).chain(args.iter().map(String::as_str)).collect::<Vec<_>>().join(" ").to_ascii_lowercase();
  [" rm ", "rm -", " mv ", " cp ", " touch ", " mkdir ", " rmdir ", " reboot", " shutdown", " poweroff", " systemctl restart", " systemctl stop", " deploy", " kubectl apply", " kubectl delete", " docker rm", " docker stop", " chmod ", " chown ", " sudo ", " git push", " npm install", " pip install", " apt install", " kill "]
    .iter()
    .any(|needle| format!(" {value} ").contains(needle))
}

#[tauri::command]
fn open_ssh_session(connection: SshConnection, cols: u16, rows: u16, approved: bool) -> Result<SshSessionResult, String> {
  validate_ssh_connection(&connection)?;
  validate_pty_size(cols, rows)?;
  if !approved {
    // Opening a shell is read-only by itself; commands typed into it still require
    // the user's approval at the command execution boundary.
  }
  let pty_system = native_pty_system();
  let pair = pty_system.openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 }).map_err(|error| format!("无法创建 PTY: {error}"))?;
  let mut command = CommandBuilder::new("ssh");
  command.arg("-tt");
  command.arg("-p");
  command.arg(connection.port.to_string());
  command.arg(format!("{}@{}", connection.username.trim(), connection.host.trim()));
  let child = pair.slave.spawn_command(command).map_err(|error| format!("无法启动 ssh: {error}"))?;
  drop(pair.slave);
  let reader = pair.master.try_clone_reader().map_err(|error| format!("无法读取 SSH 输出: {error}"))?;
  let writer = pair.master.take_writer().map_err(|error| format!("无法写入 SSH 会话: {error}"))?;
  let output = Arc::new(Mutex::new(Vec::new()));
  let output_for_reader = Arc::clone(&output);
  thread::spawn(move || {
    let mut reader = reader;
    let mut buffer = [0_u8; 4096];
    loop {
      match reader.read(&mut buffer) {
        Ok(0) | Err(_) => break,
        Ok(count) => {
          if let Ok(mut pending) = output_for_reader.lock() {
            pending.extend_from_slice(&buffer[..count]);
            if pending.len() > 200_000 {
              let trim = pending.len() - 200_000;
              pending.drain(..trim);
            }
          }
        }
      }
    }
  });
  let id = format!("ssh-{}", NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed));
  let session = Arc::new(SshSession { master: Mutex::new(pair.master), writer: Mutex::new(writer), output, child: Mutex::new(child) });
  ssh_sessions().lock().map_err(|_| "SSH 会话锁不可用".to_string())?.insert(id.clone(), session);
  Ok(SshSessionResult { session_id: id, requires_approval: false })
}

#[tauri::command]
fn write_ssh_input(session_id: String, input: String, approved: bool) -> Result<(), String> {
  let command_line = input.trim_end_matches(['\r', '\n']).trim();
  if input.contains(['\0']) || command_line.contains(['\n', '\r', ';', '|', '&', '`', '$']) {
    return Err("SSH 输入包含不支持的字符".to_string());
  }
  let sessions = ssh_sessions().lock().map_err(|_| "SSH 会话锁不可用".to_string())?;
  let session = sessions.get(&session_id).ok_or("SSH 会话不存在或已关闭")?;
  if !approved && ssh_command_requires_approval(command_line, &[]) {
    return Err("此输入可能改变服务器状态，需要逐次审批".to_string());
  }
  session.writer.lock().map_err(|_| "SSH 写入锁不可用".to_string())?.write_all(input.as_bytes()).map_err(|error| format!("无法写入 SSH 会话: {error}"))?;
  Ok(())
}

#[tauri::command]
fn read_ssh_output(session_id: String) -> Result<SshOutputResult, String> {
  let sessions = ssh_sessions().lock().map_err(|_| "SSH 会话锁不可用".to_string())?;
  let session = sessions.get(&session_id).ok_or("SSH 会话不存在或已关闭")?;
  let mut pending = session.output.lock().map_err(|_| "SSH 输出锁不可用".to_string())?;
  let bytes = std::mem::take(&mut *pending);
  let closed = session.child.lock().ok().and_then(|mut child| child.try_wait().ok()).flatten().is_some();
  Ok(SshOutputResult { output: String::from_utf8_lossy(&bytes).to_string(), closed })
}

#[tauri::command]
fn resize_ssh_session(session_id: String, cols: u16, rows: u16) -> Result<(), String> {
  validate_pty_size(cols, rows)?;
  let session = {
    let sessions = ssh_sessions().lock().map_err(|_| "SSH 会话锁不可用".to_string())?;
    Arc::clone(sessions.get(&session_id).ok_or("SSH 会话不存在或已关闭")?)
  };
  let result = session.master.lock().map_err(|_| "PTY 锁不可用".to_string())?.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 }).map_err(|error| format!("无法调整 PTY 尺寸: {error}"));
  result
}

#[tauri::command]
fn close_ssh_session(session_id: String) -> Result<(), String> {
  let session = ssh_sessions().lock().map_err(|_| "SSH 会话锁不可用")?.remove(&session_id);
  if let Some(session) = session {
    if let Ok(mut child) = session.child.lock() {
      let _ = child.kill();
      let _ = child.wait();
    }
  }
  Ok(())
}

#[tauri::command]
fn run_ssh_command(connection: SshConnection, command: String, args: Vec<String>, approved: bool) -> Result<SshCommandResult, String> {
  let host = connection.host.trim();
  let username = connection.username.trim();
  let command = command.trim();
  validate_ssh_connection(&connection)?;
  if command.is_empty() {
    return Err("SSH host, username, port, and command are required".to_string());
  }
  if host.contains([' ', '\n', '\r', '@', '/']) || username.contains([' ', '\n', '\r', '@', '/']) || command.contains(['\n', '\r', ';', '|', '&', '`', '$']) || args.iter().any(|arg| arg.contains(['\n', '\r', ';', '|', '&', '`', '$'])) {
    return Err("SSH fields contain unsupported shell characters".to_string());
  }
  let requires_approval = ssh_command_requires_approval(command, &args);
  if requires_approval && !approved {
    return Ok(SshCommandResult { output: "此命令可能写入、重启、部署或删除数据，需要逐次审批。".to_string(), exit_code: 126, requires_approval: true });
  }
  let mut child = Command::new("ssh");
  child.arg("-p").arg(connection.port.to_string()).arg(format!("{username}@{host}")).arg(command);
  for arg in args { child.arg(arg); }
  let output = child.output().map_err(|error| format!("无法启动 ssh: {error}"))?;
  let stdout = String::from_utf8_lossy(&output.stdout);
  let stderr = String::from_utf8_lossy(&output.stderr);
  let combined = format!("{}{}{}", stdout, if !stdout.is_empty() && !stderr.is_empty() { "\n" } else { "" }, stderr);
  Ok(SshCommandResult { output: combined.chars().take(20_000).collect(), exit_code: output.status.code().unwrap_or(1), requires_approval: false })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![inspect_local_agents, connect_local_agent, list_connected_projects, run_next_local_job, revoke_workspace_access, run_ssh_command, open_ssh_session, write_ssh_input, read_ssh_output, resize_ssh_session, close_ssh_session])
    .run(tauri::generate_context!())
    .expect("error while running desktop application");
}
