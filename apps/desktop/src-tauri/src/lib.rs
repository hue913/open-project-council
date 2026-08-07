use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalAgentCapability {
  agent: String,
  available: bool,
  detail: String,
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
fn revoke_workspace_access(_project_id: String) -> Result<(), String> {
  // Capability tokens are intentionally stored in the platform keychain by
  // the production runner. This scaffold exposes the explicit revocation hook.
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![inspect_local_agents, revoke_workspace_access])
    .run(tauri::generate_context!())
    .expect("error while running desktop application");
}
