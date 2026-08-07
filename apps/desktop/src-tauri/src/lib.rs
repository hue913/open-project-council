use keyring::Entry;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path, process::Command};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![inspect_local_agents, connect_local_agent, list_connected_projects, run_next_local_job, revoke_workspace_access])
    .run(tauri::generate_context!())
    .expect("error while running desktop application");
}
