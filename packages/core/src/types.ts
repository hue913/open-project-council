export type Locale = "zh-CN" | "en";

export type TaskKind =
  | "math"
  | "coding"
  | "code-review"
  | "security-audit"
  | "research"
  | "data-analysis"
  | "product-planning"
  | "technical-writing"
  | "web-design";
export type TaskStatus = "draft" | "queued" | "processing" | "ready" | "error";
export type RunPhase = "independent" | "critique" | "decision" | "execution" | "verification" | "complete" | "failed";
export type AgentKind = "cloud_model" | "local_coding_agent" | "mcp_tool";
export type Permission = "read" | "write" | "execute" | "deploy_preview" | "deploy_production";
export type ProjectRole = "owner" | "editor" | "viewer";
export type BrowserAction = "click" | "type" | "navigate" | "select" | "submit" | "wait" | "finish";

export interface User {
  id: string;
  githubId: string;
  login: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  detail?: string;
}

export interface GitHubRepositoryConnection {
  provider: "github";
  fullName: string;
  defaultBranch: string;
  installationId?: string;
}

export interface VercelConnection {
  projectName?: string;
  teamId?: string;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  visibility: "private";
  createdAt: string;
  updatedAt: string;
  linkedRepository?: GitHubRepositoryConnection;
  vercelConnection?: VercelConnection;
  decisionModel?: DecisionModelConfig;
}

/** 推理时决策模型配置。JEV 通过现有模型席位适配器接入，未配置时不会调用。 */
export interface DecisionModelConfig {
  enabled: boolean;
  provider: "jev";
  model: string;
  endpoint: string;
  seatId?: string;
  visionEnabled?: boolean;
  confidenceThreshold?: number;
  fallback?: "critic" | "human";
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
  useDecisionModel?: boolean;
  status: TaskStatus;
  createdAt: string;
}

export interface ExperienceRecord {
  id: string;
  projectId: string;
  taskKind: TaskKind;
  state: string;
  action: string;
  reward: number;
  reflection: string;
  createdAt: string;
  trajectoryId?: string;
  rewardBreakdown?: Record<string, number>;
  failureReason?: string;
}

export interface BrowserStep {
  index: number;
  action: BrowserAction;
  target?: string;
  value?: string;
  screenshotId?: string;
  approved: boolean;
  createdAt: string;
  accessibilityTree?: string;
}

export interface BrowserRunResult {
  id: string;
  projectId: string;
  taskId?: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  finalUrl?: string;
  success: boolean;
  reward: number;
  steps: BrowserStep[];
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TrajectoryRecord {
  id: string;
  projectId: string;
  runId?: string;
  taskId?: string;
  source: "agent" | "browser" | "ssh";
  events: Array<{
    type: "state" | "action" | "observation" | "approval" | "result" | "reflection";
    content: string;
    screenshotId?: string;
    createdAt: string;
  }>;
  reward?: number;
  success?: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface ApprovalRequest {
  id: string;
  projectId: string;
  runId?: string;
  kind: "ssh" | "browser" | "file" | "deployment" | "decision";
  summary: string;
  payload: Record<string, string>;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface RemoteConnection {
  id: string;
  projectId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  protocol: "ssh" | "rdp" | "vnc";
  screenUrl?: string;
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

export interface LocalAgentJob {
  id: string;
  projectId: string;
  runId: string;
  seatId: string;
  agent: "codex" | "claude";
  prompt: string;
  permissions: Permission[];
  workspacePath?: string;
  createdAt: string;
  expiresAt: string;
}

export interface GitHubPullRequestRequest {
  repository: string;
  baseBranch: string;
  branch: string;
  title: string;
  body: string;
  changes: Array<{ path: string; content: string }>;
}

export interface DeliveryResult {
  kind: "github_pr" | "vercel_preview";
  url: string;
  id: string | number;
}
