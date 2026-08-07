export type Locale = "zh-CN" | "en";

export type TaskKind = "math" | "coding" | "web-design";
export type TaskStatus = "draft" | "queued" | "processing" | "ready" | "error";
export type RunPhase = "independent" | "critique" | "decision" | "execution" | "verification" | "complete" | "failed";
export type AgentKind = "cloud_model" | "local_coding_agent" | "mcp_tool";
export type Permission = "read" | "write" | "execute" | "deploy_preview" | "deploy_production";

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  visibility: "private";
  createdAt: string;
  updatedAt: string;
  linkedRepository?: {
    provider: "github";
    fullName: string;
    defaultBranch: string;
  };
}

export interface AgentSeat {
  id: string;
  projectId: string;
  name: string;
  kind: AgentKind;
  provider: string;
  model?: string;
  endpoint?: string;
  credentialId?: string;
  roles: string[];
  capabilities: Permission[];
  credentialSource: "local" | "cloud_envelope" | "none";
  enabled: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  goal: string;
  kind: TaskKind;
  context: string[];
  acceptanceCriteria: string[];
  allowedTools: string[];
  budgetUsd: number;
  requiredPermissions: Permission[];
  status: TaskStatus;
  createdAt: string;
}

export interface DebateMessage {
  id: string;
  runId: string;
  phase: RunPhase;
  author: string;
  role: string;
  content: string;
  evidence: string[];
  confidence: number;
  createdAt: string;
}

export interface Run {
  id: string;
  projectId: string;
  taskId: string;
  phase: RunPhase;
  status: TaskStatus;
  selectedAgentIds: string[];
  messages: DebateMessage[];
  unresolvedRisks: string[];
  totalCostUsd: number;
  startedAt: string;
  completedAt?: string;
}

export interface PublicSnapshotSelection {
  includeTask: boolean;
  includeDecision: boolean;
  includeCode: boolean;
  includePreview: boolean;
  includeDiscussionSummary: boolean;
}

export interface PublicSnapshot {
  id: string;
  projectId: string;
  slug: string;
  selection: PublicSnapshotSelection;
  content: Record<string, string>;
  redactionCount: number;
  publishedAt: string;
  revokedAt?: string;
}

export interface AgentExecutionRequest {
  runId: string;
  task: Task;
  instructions: string;
  permissions: Permission[];
}

export interface AgentExecutionEvent {
  type: "log" | "artifact" | "status" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface AgentConnector {
  id: string;
  kind: AgentKind;
  describeCapabilities(): Promise<Permission[]>;
  health(): Promise<{ healthy: boolean; detail?: string }>;
  execute(request: AgentExecutionRequest, onEvent: (event: AgentExecutionEvent) => void): Promise<void>;
  cancel(runId: string): Promise<void>;
}
