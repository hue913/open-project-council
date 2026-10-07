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

export interface SshConnection {
  host: string;
  port: number;
  username: string;
}

export interface SshCommandResult {
  output: string;
  exitCode: number;
  requiresApproval: boolean;
}

export async function runSshCommand(connection: SshConnection, command: string, args: string[], approved = false): Promise<SshCommandResult> {
  return invoke("run_ssh_command", { connection, command, args, approved });
}

export interface SshSessionResult { sessionId: string; requiresApproval: boolean }
export interface SshOutputResult { output: string; closed: boolean }

export async function openSshSession(connection: SshConnection, cols = 120, rows = 32): Promise<SshSessionResult> {
  return invoke("open_ssh_session", { connection, cols, rows, approved: true });
}

export async function writeSshInput(sessionId: string, input: string, approved = false): Promise<void> {
  return invoke("write_ssh_input", { sessionId, input, approved });
}

export async function readSshOutput(sessionId: string): Promise<SshOutputResult> {
  return invoke("read_ssh_output", { sessionId });
}

export async function resizeSshSession(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("resize_ssh_session", { sessionId, cols, rows });
}

export async function closeSshSession(sessionId: string): Promise<void> {
  return invoke("close_ssh_session", { sessionId });
}
