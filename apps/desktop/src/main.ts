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
