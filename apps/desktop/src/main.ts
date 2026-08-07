import { invoke } from "@tauri-apps/api/core";

export interface LocalAgentCapability {
  agent: "codex" | "claude-code";
  available: boolean;
  detail: string;
}

export async function inspectLocalAgents(): Promise<LocalAgentCapability[]> {
  return invoke<LocalAgentCapability[]>("inspect_local_agents");
}

export async function revokeWorkspaceAccess(projectId: string): Promise<void> {
  await invoke("revoke_workspace_access", { projectId });
}

export interface BridgePairing {
  workerUrl: string;
  pairingId: string;
  pairingToken: string;
  seatId: string;
  agent: "codex" | "claude";
  workspacePath: string;
}

export async function connectLocalAgent(pairing: BridgePairing): Promise<{ bridgeId: string; projectId: string; seatId: string }> {
  return invoke("connect_local_agent", { pairing });
}

export async function listConnectedProjects(): Promise<string[]> {
  return invoke("list_connected_projects");
}

export async function runNextLocalJob(projectId: string): Promise<{ status: "idle" | "complete" | "error"; detail: string }> {
  return invoke("run_next_local_job", { projectId });
}
