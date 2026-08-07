import { rolesForTask, type AgentKind, type AgentSeat, type Project, type ProjectRole, type Run, type Task, type TaskKind, type User } from "@open-project-council/core";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { defaultTaskTemplate, taskTemplates, type TaskTemplate } from "./task-templates";
import { PublicDemoApp } from "./PublicDemoApp";

type Locale = "zh" | "en";
type View = "overview" | "tasks" | "council" | "agents" | "integrations" | "publish" | "feedback" | "about";

type AgentSeatDraft = {
  projectId: string;
  name: string;
  kind: AgentKind;
  provider: string;
  model?: string;
  endpoint?: string;
  role: string;
  apiKey?: string;
};

type TaskDraft = Pick<Task, "title" | "goal" | "kind" | "context" | "acceptanceCriteria" | "allowedTools" | "budgetUsd" | "requiredPermissions">;

const agentRoleOptions = [
  { value: "独立求解器 A", zh: "独立求解器 A", en: "Independent solver A" },
  { value: "独立求解器 B", zh: "独立求解器 B", en: "Independent solver B" },
  { value: "验证器", zh: "验证器", en: "Verifier" },
  { value: "架构师", zh: "架构师", en: "Architect" },
  { value: "实现者", zh: "实现者", en: "Implementer" },
  { value: "测试与安全审查者", zh: "测试与安全审查者", en: "Test and security reviewer" },
  { value: "代码审查者 A", zh: "代码审查者 A", en: "Code reviewer A" },
  { value: "代码审查者 B", zh: "代码审查者 B", en: "Code reviewer B" },
  { value: "安全与测试验证者", zh: "安全与测试验证者", en: "Security and test verifier" },
  { value: "威胁建模者", zh: "威胁建模者", en: "Threat modeler" },
  { value: "攻击路径审查者", zh: "攻击路径审查者", en: "Attack-path reviewer" },
  { value: "安全验证者", zh: "安全验证者", en: "Security verifier" },
  { value: "研究员", zh: "研究员", en: "Researcher" },
  { value: "反证审查者", zh: "反证审查者", en: "Counterevidence reviewer" },
  { value: "证据验证者", zh: "证据验证者", en: "Evidence verifier" },
  { value: "数据分析师", zh: "数据分析师", en: "Data analyst" },
  { value: "统计审查者", zh: "统计审查者", en: "Statistical reviewer" },
  { value: "结果验证者", zh: "结果验证者", en: "Result verifier" },
  { value: "产品策略师", zh: "产品策略师", en: "Product strategist" },
  { value: "可行性审查者", zh: "可行性审查者", en: "Feasibility reviewer" },
  { value: "决策验证者", zh: "决策验证者", en: "Decision verifier" },
  { value: "技术作者", zh: "技术作者", en: "Technical writer" },
  { value: "读者审查者", zh: "读者审查者", en: "Reader reviewer" },
  { value: "事实验证者", zh: "事实验证者", en: "Fact verifier" },
  { value: "需求与 UX 分析者", zh: "需求与 UX 分析者", en: "Requirements and UX analyst" },
  { value: "前端实现者", zh: "前端实现者", en: "Frontend implementer" },
  { value: "截图审查者", zh: "截图审查者", en: "Screenshot reviewer" },
] as const;

const copy = {
  zh: {
    private: "私有项目", overview: "概览", tasks: "任务", council: "议事厅", integrations: "集成与交付", publish: "发布快照", feedback: "反馈", about: "关于与致谢", publicDemo: "公开体验", publicDemoCopy: "不接收 API Key、不连接 Worker，也不保存任务。完整模型协作请自行部署私有实例。", selfHostFull: "部署完整实例", runDemo: "运行示例议事",
    createTask: "新建任务", run: "运行议事协议", running: "协议已完成", publishNow: "生成公开快照", preview: "打开 Vercel 预览",
    taskTitle: "任务标题", taskGoal: "完成目标", kind: "任务类型", requiredRoles: "所需席位职责", saveTask: "保存并加入任务板", savingTask: "正在加密保存", taskLoadError: "未能读取已保存的任务；当前仅显示本地草稿。", taskSaveError: "无法保存任务。", runError: "议事运行失败；未保存模拟结果。", cancel: "取消",
    project: "项目", agents: "代理席位", budget: "本次预算", toolBoundary: "工具边界", public: "公开内容", noRun: "还没有运行记录。先从一个任务开始。",
    ready: "就绪", queued: "排队中", processing: "执行中", decision: "裁决", risks: "未解决风险", discussion: "讨论记录",
    feedbackTitle: "提出反馈", feedbackPlaceholder: "说明建议、问题或想要改进的体验。", sendFeedback: "保存反馈", saved: "已保存，可在连接 GitHub 后同步为 Issue。",
    snapshot: "公开快照", snapshotHelp: "项目原件保持私有；只会发布你勾选且经过脱敏扫描的内容。", selections: ["任务", "裁决", "代码", "预览", "讨论摘要"],
    currentTask: "当前任务", protocol: "议事协议", protocolTitle: "独立判断，而不是多人复读", protocolSteps: ["独立提出方案", "交叉质疑", "裁决与保留分歧", "受限执行与验证"],
    previewLabel: "预览", previewTitle: "交付与部署", previewFlow: "GitHub 分支 → Vercel 预览", previewBoundary: "生产环境始终需要所有者确认", privacyLabel: "项目边界", privacyTitle: "默认私有", privacyCopy: "公开内容始终来自可撤销的脱敏快照。", agentSummary: "2 个云端 · 1 个本地 · 1 个视觉审查",
    taskBoard: "任务板", acceptanceCriteria: "验收标准", auditableDiscussion: "可审计讨论", safePublishCheck: "安全发布检查", scanSummary: "密钥扫描 · 隐私扫描 · 差异预览", scanHelp: "发布前会移除常见 API Key、OAuth Token 和授权头。原始项目与运行日志保持私有。",
    feedbackHelp: "附带的运行上下文由你在提交前选择；私有项目内容不会自动送往公开 Issue。", newTaskLabel: "新建任务", closeDialog: "关闭新建任务窗口", phases: { independent: "独立方案", critique: "质疑", decision: "裁决", execution: "执行", verification: "验证", complete: "完成", failed: "失败" },
    agentSettings: "模型与代理", configureAgents: "配置模型与 Agent", agentSettingsTitle: "模型与 Agent 席位", agentSettingsHelp: "为项目分配模型职责与受控工具。云端密钥只发送到 Worker 加密保存。", addAgent: "添加模型或 Agent", noCustomAgents: "尚未接入自定义席位。", connected: "已连接", disabled: "已停用", enable: "启用", disable: "停用", provider: "供应商或 Agent", model: "模型", endpoint: "OpenAI 兼容 API Endpoint", role: "任务职责", seatName: "席位名称", cloudModel: "云端模型", localAgent: "本地编码 Agent", mcpTool: "MCP 工具", apiKey: "API Key", apiKeyHelp: "密钥仅用于本次提交；浏览器不保留它。云端模型需填写兼容的 HTTPS Endpoint；Worker 需要设置 ENVELOPE_KEK_BASE64 才会接受云端密钥。", saveAgent: "保存席位", savingAgent: "正在加密并保存", agentSaved: "席位已保存，可参与后续运行。", agentLoadError: "未能读取已保存的席位。", setupError: "无法保存席位。", closeAgentDialog: "关闭模型与 Agent 窗口", roleLabels: { cloud_model: "云端模型", local_coding_agent: "本地编码 Agent", mcp_tool: "MCP 工具" }, credentialLabels: { cloud_envelope: "加密云端凭据", local: "本地钥匙串", none: "无需云端凭据" }, agentsAvailable: "已启用席位可参与当前任务", feedbackContact: "反馈联络：QQ 2136493019", templateLabel: "任务模板", templateHelp: "选择模板会预填目标、验收标准、工具与最小权限；保存前都可以修改。", acceptanceHelp: "每行一个可验证的验收标准。", acceptanceRequired: "至少保留一条验收标准。", aboutEyebrow: "开源说明", aboutTitle: "为独立判断而设计", aboutLead: "Open Project Council 把多模型讨论组织成可审计的项目运行：独立方案、交叉质疑、裁决、受限执行与验证。", aboutBoundary: "独立实现与安全边界", aboutBoundaryCopy: "项目默认私有。用户的项目、密钥和产物归用户所有；开源的是平台代码，而不是用户内容。", aboutSources: "灵感与来源", aboutSourcesCopy: "我们感谢下列公开项目和技术社区提供的产品与工程启发。引用不表示合作、背书、授权或隶属关系。", viewSource: "查看来源", acknowledgement: "感谢开源社区", acknowledgementCopy: "感谢每一个公开分享多 Agent 协作、工作流编排、模型网关和本地工具实践的团队与贡献者。完整对应关系与取舍已写入仓库文档。",
  },
  en: {
    private: "Private project", overview: "Overview", tasks: "Tasks", council: "Council", integrations: "Integrations & delivery", publish: "Publish snapshot", feedback: "Feedback", about: "About and thanks", publicDemo: "Public demo", publicDemoCopy: "This demo accepts no API keys, connects to no Worker, and stores no tasks. Self-host a private instance for full model collaboration.", selfHostFull: "Self-host the full app", runDemo: "Run sample council",
    createTask: "New task", run: "Run council protocol", running: "Protocol complete", publishNow: "Create public snapshot", preview: "Open Vercel preview",
    taskTitle: "Task title", taskGoal: "Goal", kind: "Task kind", requiredRoles: "Required seat roles", saveTask: "Save to task board", savingTask: "Saving with encryption", taskLoadError: "Saved tasks could not be loaded; only a local draft is shown.", taskSaveError: "Could not save the task.", runError: "Council run failed; no simulated result was saved.", cancel: "Cancel",
    project: "Project", agents: "Agent seats", budget: "Run budget", toolBoundary: "Tool boundary", public: "Public content", noRun: "No runs yet. Start with a task.",
    ready: "Ready", queued: "Queued", processing: "Processing", decision: "Decision", risks: "Unresolved risks", discussion: "Discussion",
    feedbackTitle: "Send feedback", feedbackPlaceholder: "Describe an idea, issue, or a workflow to improve.", sendFeedback: "Save feedback", saved: "Saved. It can be synced to a GitHub Issue after you connect one.",
    snapshot: "Public snapshot", snapshotHelp: "The source project stays private. Only selected, redaction-scanned material is published.", selections: ["Task", "Decision", "Code", "Preview", "Discussion summary"],
    currentTask: "Current task", protocol: "Protocol", protocolTitle: "Independent judgment, not repeated answers", protocolSteps: ["Independent proposals", "Cross-examination", "Decision with dissent", "Constrained execution and verification"],
    previewLabel: "Preview", previewTitle: "Delivery and deployment", previewFlow: "GitHub branch → Vercel preview", previewBoundary: "Production always requires owner confirmation", privacyLabel: "Project boundary", privacyTitle: "Private by default", privacyCopy: "Public material always comes from a revocable, redaction-scanned snapshot.", agentSummary: "2 cloud · 1 local · 1 visual reviewer",
    taskBoard: "Task board", acceptanceCriteria: "Acceptance criteria", auditableDiscussion: "Auditable discussion", safePublishCheck: "Safe publish check", scanSummary: "Secret scan · privacy scan · diff preview", scanHelp: "Common API keys, OAuth tokens, and authorization headers are removed before publishing. Source projects and raw run logs stay private.",
    feedbackHelp: "You choose the run context attached before submission; private project material is never sent to a public Issue automatically.", newTaskLabel: "New task", closeDialog: "Close new-task dialog", phases: { independent: "Independent", critique: "Critique", decision: "Decision", execution: "Execution", verification: "Verification", complete: "Complete", failed: "Failed" },
    agentSettings: "Models & agents", configureAgents: "Configure models & agents", agentSettingsTitle: "Model and agent seats", agentSettingsHelp: "Assign each model a project role and controlled tools. Cloud keys are sent only to the Worker for encrypted storage.", addAgent: "Add model or agent", noCustomAgents: "No custom seats are connected yet.", connected: "Connected", disabled: "Disabled", enable: "Enable", disable: "Disable", provider: "Provider or agent", model: "Model", endpoint: "OpenAI-compatible API endpoint", role: "Task role", seatName: "Seat name", cloudModel: "Cloud model", localAgent: "Local coding agent", mcpTool: "MCP tool", apiKey: "API key", apiKeyHelp: "The key is used only for this submission and is never retained by the browser. Cloud models need a compatible HTTPS endpoint; the Worker must have ENVELOPE_KEK_BASE64 set before it will accept cloud keys.", saveAgent: "Save seat", savingAgent: "Encrypting and saving", agentSaved: "Seat saved. It can take part in subsequent runs.", agentLoadError: "Could not load saved seats.", setupError: "Could not save the agent seat.", closeAgentDialog: "Close model and agent dialog", roleLabels: { cloud_model: "Cloud model", local_coding_agent: "Local coding agent", mcp_tool: "MCP tool" }, credentialLabels: { cloud_envelope: "Encrypted cloud credential", local: "Local keychain", none: "No cloud credential" }, agentsAvailable: "Enabled seats can join the current task", feedbackContact: "Feedback contact: QQ 2136493019", templateLabel: "Task templates", templateHelp: "A template pre-fills the goal, acceptance criteria, tools, and least-privilege boundary. Everything remains editable before you save.", acceptanceHelp: "Use one verifiable acceptance criterion per line.", acceptanceRequired: "Keep at least one acceptance criterion.", aboutEyebrow: "Open source note", aboutTitle: "Built for independent judgment", aboutLead: "Open Project Council turns multi-model discussion into an auditable project run: independent proposals, cross-examination, decision, constrained execution, and verification.", aboutBoundary: "Independent implementation and security boundary", aboutBoundaryCopy: "Projects are private by default. Your projects, keys, and artifacts remain yours; the platform code is open source, not your content.", aboutSources: "Inspiration and sources", aboutSourcesCopy: "We thank the public projects and technical communities below for product and engineering inspiration. A reference does not imply partnership, endorsement, licensing, or affiliation.", viewSource: "View source", acknowledgement: "Thanks to the open-source community", acknowledgementCopy: "Thank you to every team and contributor who shares work on multi-agent collaboration, workflow orchestration, model gateways, and local tools. The repository documents the detailed mapping and trade-offs.",
  },
} as const;

const kindLabels: Record<TaskKind, { zh: string; en: string }> = {
  math: { zh: "数学推理", en: "Math reasoning" },
  coding: { zh: "编程", en: "Coding" },
  "code-review": { zh: "代码审查", en: "Code review" },
  "security-audit": { zh: "安全审计", en: "Security audit" },
  research: { zh: "研究", en: "Research" },
  "data-analysis": { zh: "数据分析", en: "Data analysis" },
  "product-planning": { zh: "产品规划", en: "Product planning" },
  "technical-writing": { zh: "技术写作", en: "Technical writing" },
  "web-design": { zh: "网页设计", en: "Web design" },
};

const inspirations: { name: string; href: string; note: Record<Locale, string> }[] = [
  { name: "RoundTalk", href: "https://www.roundtalk.app/", note: { zh: "跨模型共享上下文与多轮讨论", en: "Shared context across models and multi-round discussion" } },
  { name: "Decidi", href: "https://decidi.ai/", note: { zh: "结构化分歧与透明决策记录", en: "Structured dissent and transparent decision records" } },
  { name: "MAD Studio", href: "https://multiagentdebates.com/", note: { zh: "可观察的多 Agent 辩论", en: "Observable multi-agent debate" } },
  { name: "Hivemind", href: "https://github.com/hivementality-ai/hivemind", note: { zh: "持久工作空间与本地编码代理", en: "Persistent workspaces and local coding agents" } },
  { name: "AutoGen", href: "https://microsoft.github.io/autogen/", note: { zh: "可组合的多 Agent 协作抽象", en: "Composable multi-agent collaboration abstractions" } },
  { name: "LangGraph", href: "https://langchain-ai.github.io/langgraph/", note: { zh: "状态化、可恢复的流程编排", en: "Stateful, recoverable workflow orchestration" } },
  { name: "LiteLLM", href: "https://docs.litellm.ai/", note: { zh: "多供应商模型网关", en: "A multi-provider model gateway" } },
];

type Translation = (typeof copy)[keyof typeof copy];

const statusLabel = (locale: Locale, status: string) => copy[locale][status as "ready" | "queued" | "processing"] ?? status;

const roleLabel = (role: string, locale: Locale) => agentRoleOptions.find((option) => option.value === role)?.[locale] ?? role;

export function App() {
  return import.meta.env.VITE_PUBLIC_DEMO === "true" ? <PublicDemoApp /> : <PrivateWorkspace />;
}

type ProjectEntry = { project: Project; role: ProjectRole };

function PrivateWorkspace() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [projectEntries, setProjectEntries] = useState<ProjectEntry[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seats, setSeats] = useState<AgentSeat[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [view, setView] = useState<View>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showAgentComposer, setShowAgentComposer] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agentSaved, setAgentSaved] = useState(false);
  const t = copy[locale];
  const selectedProjectEntry = projectEntries.find((entry) => entry.project.id === selectedProjectId);
  const project = selectedProjectEntry?.project;
  const role = selectedProjectEntry?.role;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const selectedSeats = useMemo(() => seats.filter((seat) => seat.enabled), [seats]);
  const canEdit = role === "owner" || role === "editor";
  const navigation: View[] = ["overview", "tasks", "council", "agents", "integrations", "about"];

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() as Promise<{ user: User | null }> : Promise.reject(new Error("Unable to load session")))
      .then(({ user: currentUser }) => { if (!cancelled) setUser(currentUser); })
      .catch(() => { if (!cancelled) { setUser(null); setLoadError("无法连接到私有工作区服务。"); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    let cancelled = false;
    void fetch("/api/projects")
      .then((response) => response.ok ? response.json() as Promise<{ projects: ProjectEntry[] }> : Promise.reject(new Error("Unable to load projects")))
      .then(({ projects: entries }) => {
        if (cancelled) return;
        setProjectEntries(entries);
        setSelectedProjectId((current) => entries.some((entry) => entry.project.id === current) ? current : entries[0]?.project.id ?? null);
        setLoadError(null);
      })
      .catch(() => { if (!cancelled) setLoadError("项目列表加载失败，请重试。"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!project) { setTasks([]); setSeats([]); setSelectedTaskId(null); return; }
    let cancelled = false;
    setLoadError(null);
    void Promise.all([
      fetch(`/api/tasks?projectId=${encodeURIComponent(project.id)}`).then(async (response) => { if (!response.ok) throw new Error("任务加载失败"); return response.json() as Promise<{ tasks: Task[] }>; }),
      fetch(`/api/agent-seats?projectId=${encodeURIComponent(project.id)}`).then(async (response) => { if (!response.ok) throw new Error("席位加载失败"); return response.json() as Promise<{ seats: AgentSeat[] }>; }),
    ]).then(([taskPayload, seatPayload]) => {
      if (cancelled) return;
      setTasks(taskPayload.tasks);
      setSeats(seatPayload.seats);
      setSelectedTaskId(taskPayload.tasks[0]?.id ?? null);
      setRun(null);
    }).catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "项目内容加载失败"); });
    return () => { cancelled = true; };
  }, [project?.id]);

  useEffect(() => {
    if (!selectedTaskId) { setRun(null); return; }
    let cancelled = false;
    void fetch(`/api/runs?taskId=${encodeURIComponent(selectedTaskId)}`)
      .then(async (response) => { if (!response.ok) throw new Error("运行记录加载失败"); return response.json() as Promise<{ runs: Run[] }>; })
      .then(({ runs }) => { if (!cancelled) setRun(runs[0] ?? null); })
      .catch(() => { if (!cancelled) setRun(null); });
    return () => { cancelled = true; };
  }, [selectedTaskId]);

  async function createProject(name: string, description: string) {
    const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description }) });
    const payload = await response.json() as { project?: Project; error?: string };
    if (!response.ok || !payload.project) throw new Error(payload.error ?? "无法创建项目");
    const entry = { project: payload.project, role: "owner" as const };
    setProjectEntries((current) => [entry, ...current]);
    setSelectedProjectId(entry.project.id);
  }

  async function addTask(draft: TaskDraft) {
    if (!project || taskSaving) return;
    setTaskSaving(true); setTaskSaveError(null);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, projectId: project.id }) });
      const payload = await response.json() as { task?: Task; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error ?? "任务保存失败");
      setTasks((current) => [payload.task!, ...current]); setSelectedTaskId(payload.task.id); setShowComposer(false); setView("tasks");
    } catch (error) { setTaskSaveError(error instanceof Error ? error.message : "任务保存失败"); } finally { setTaskSaving(false); }
  }

  async function runCouncil() {
    if (!selectedTask || isRunning || !canEdit) return;
    setIsRunning(true); setRunError(null);
    try {
      const response = await fetch("/api/runs/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: selectedTask.id, seatIds: selectedSeats.map((seat) => seat.id) }) });
      const payload = await response.json() as { run?: Run; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? "议事运行失败");
      setRun(payload.run); setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status: "ready" } : task)); setView("council");
    } catch (error) { setRunError(error instanceof Error ? error.message : "议事运行失败"); } finally { setIsRunning(false); }
  }

  async function addAgentSeat(seat: AgentSeat) {
    setSeats((current) => [seat, ...current.filter((item) => item.id !== seat.id)]); setAgentSaved(true); setShowAgentComposer(false); setView("agents");
  }

  async function toggleManagedSeat(seat: AgentSeat) {
    const response = await fetch(`/api/agent-seats/${encodeURIComponent(seat.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !seat.enabled }) });
    const payload = await response.json() as { seat?: AgentSeat; error?: string };
    if (!response.ok || !payload.seat) throw new Error(payload.error ?? "席位更新失败");
    setSeats((current) => current.map((item) => item.id === payload.seat?.id ? payload.seat : item));
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); setProjectEntries([]); setSelectedProjectId(null);
  }

  if (isLoading || user === undefined) return <main className="auth-screen"><section className="auth-card"><span className="brand-mark">◌</span><p>正在验证私有工作区会话…</p></section></main>;
  if (!user) return <LoginScreen error={loadError} />;
  if (!project) return <ProjectLauncher user={user} error={loadError} onCreate={createProject} onSignOut={signOut} />;

  function updateProject(updated: Project) {
    setProjectEntries((current) => current.map((entry) => entry.project.id === updated.id ? { ...entry, project: updated } : entry));
  }

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">◌</span><div><strong>Open Project Council</strong><small>multi-model workspace</small></div></div><div className="project-chip"><span className="visibility-dot" />{t.private} · {role}</div><nav aria-label="Workspace navigation">{navigation.map((item) => <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)}>{item === "agents" ? t.agentSettings : t[item]}</button>)}</nav><div className="sidebar-bottom"><button className="language-button" onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>{locale === "zh" ? "中文 / EN" : "EN / 中文"}</button><button className="signout-button" onClick={() => void signOut()}>@{user.login} · 退出</button><p>Apache-2.0<br />Your project stays yours.</p></div></aside>
    <section className="workspace"><header className="topbar"><div><p className="eyebrow">{t.project}</p><h1>{project.name}</h1><p className="subtle">{project.description || "私有协作项目"}</p></div><div className="topbar-actions"><select className="project-switcher" aria-label="切换项目" value={project.id} onChange={(event) => setSelectedProjectId(event.target.value)}>{projectEntries.map((entry) => <option value={entry.project.id} key={entry.project.id}>{entry.project.name} · {entry.role}</option>)}</select>{canEdit && <><button className="button secondary" onClick={() => { setAgentSaved(false); setShowAgentComposer(true); }}>{t.configureAgents}</button><button className="button secondary" onClick={() => { setTaskSaveError(null); setShowComposer(true); }}>{t.createTask}</button></>}<button className="button primary" onClick={runCouncil} disabled={!selectedTask || !canEdit || isRunning || selectedSeats.length === 0}>{isRunning ? t.processing : t.run}</button></div></header>{loadError && <p className="form-error" role="alert">{loadError}</p>}{runError && <p className="form-error" role="alert">{runError}</p>}{showComposer && <TaskComposer t={t} locale={locale} isSaving={taskSaving} saveError={taskSaveError} onCancel={() => setShowComposer(false)} onSave={addTask} />}{showAgentComposer && <AgentComposer projectId={project.id} t={t} locale={locale} onCancel={() => setShowAgentComposer(false)} onSave={(seat) => void addAgentSeat(seat)} />}{view === "integrations" ? <IntegrationsView project={project} role={role!} seats={seats} onProjectUpdated={updateProject} /> : !selectedTask ? <EmptyWorkspace canEdit={canEdit} onCreate={() => setShowComposer(true)} /> : <>{view === "overview" && <Overview t={t} locale={locale} task={selectedTask} run={run} seatCount={selectedSeats.length} isRunning={isRunning} isPublicDemo={false} onOpenTasks={() => setView("tasks")} onOpenCouncil={run ? () => setView("council") : runCouncil} />}{view === "tasks" && <TaskBoard t={t} locale={locale} tasks={tasks} selectedId={selectedTaskId ?? ""} isRunning={isRunning} isPublicDemo={false} onSelect={setSelectedTaskId} onRun={runCouncil} />}{view === "council" && <CouncilView t={t} run={run} />}{view === "agents" && <AgentSeatsView t={t} locale={locale} seats={seats} loadFailed={false} saved={agentSaved} onAdd={() => { setAgentSaved(false); setShowAgentComposer(true); }} onToggle={toggleManagedSeat} />}{view === "about" && <AboutView t={t} locale={locale} />}</>}</section>
  </main>;
}

function LoginScreen({ error }: { error: string | null }) {
  return <main className="auth-screen"><section className="auth-card"><span className="brand-mark">◌</span><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Open Project Council</h1><p>使用 GitHub 登录后创建私有项目。项目成员、模型凭据和运行记录均按项目隔离。</p><button className="button primary" onClick={() => { window.location.assign(`/api/auth/github/start?returnTo=${encodeURIComponent(window.location.origin + "/")}`); }}>使用 GitHub 登录</button>{error && <p className="form-error" role="alert">{error}</p>}</section></main>;
}

function ProjectLauncher({ user, error, onCreate, onSignOut }: { user: User; error: string | null; onCreate: (name: string, description: string) => Promise<void>; onSignOut: () => Promise<void> }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [pending, setPending] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!name.trim()) return; setPending(true); setFormError(null); try { await onCreate(name.trim(), description.trim()); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "无法创建项目"); } finally { setPending(false); } }
  return <main className="auth-screen"><form className="auth-card project-launcher" onSubmit={(event) => void submit(event)}><span className="brand-mark">◌</span><p className="eyebrow">@{user.login}</p><h1>创建你的第一个私有项目</h1><p>项目默认私有，只会向你明确加入的成员开放。</p><label>项目名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required autoFocus /></label><label>项目说明（可选）<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} /></label>{(formError ?? error) && <p className="form-error" role="alert">{formError ?? error}</p>}<div className="auth-actions"><button type="button" className="button secondary" onClick={() => void onSignOut()} disabled={pending}>退出</button><button className="button primary" disabled={pending}>{pending ? "正在创建…" : "创建私有项目"}</button></div></form></main>;
}

function EmptyWorkspace({ canEdit, onCreate }: { canEdit: boolean; onCreate: () => void }) {
  return <section className="empty-panel"><p className="eyebrow">TASKS</p><h2>{canEdit ? "从一项可验证任务开始" : "该项目还没有任务"}</h2><p>{canEdit ? "选择任务预设后，系统会按该任务的最小权限和验收标准创建真实记录。" : "你有只读权限，等待项目编辑者创建任务。"}</p>{canEdit && <button className="button primary" onClick={onCreate}>新建任务</button>}</section>;
}

function IntegrationsView({ project, role, seats, onProjectUpdated }: { project: Project; role: ProjectRole; seats: AgentSeat[]; onProjectUpdated: (project: Project) => void }) {
  const [repository, setRepository] = useState(project.linkedRepository?.fullName ?? "");
  const [vercelToken, setVercelToken] = useState("");
  const [vercelProject, setVercelProject] = useState(project.vercelConnection?.projectName ?? "");
  const [ref, setRef] = useState(project.linkedRepository?.defaultBranch ?? "main");
  const [branch, setBranch] = useState("council/change");
  const [title, setTitle] = useState("Council change");
  const [filePath, setFilePath] = useState("README.md");
  const [fileContent, setFileContent] = useState("");
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{ id: string; token: string; expiresAt: string; workerUrl: string } | null>(null);
  const owner = role === "owner";
  const localSeats = seats.filter((seat) => seat.kind === "local_coding_agent");

  async function request<T>(action: string, path: string, body: unknown): Promise<T> {
    setPending(action); setError(null); setNotice(null);
    try {
      const response = await fetch(path, { method: action === "repository" || action === "vercel" ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as T & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "操作失败");
      return payload;
    } catch (cause) { const message = cause instanceof Error ? cause.message : "操作失败"; setError(message); throw cause; } finally { setPending(null); }
  }

  async function linkRepository(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const payload = await request<{ project: Project }>("repository", `/api/projects/${encodeURIComponent(project.id)}/repository`, { fullName: repository }); onProjectUpdated(payload.project); setRef(payload.project.linkedRepository?.defaultBranch ?? ref); setNotice("GitHub 仓库已验证并关联。"); } catch { /* keep input for correction */ } }
  async function connectVercel(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const payload = await request<{ project: Project }>("vercel", `/api/projects/${encodeURIComponent(project.id)}/vercel`, { token: vercelToken, projectName: vercelProject || undefined }); onProjectUpdated(payload.project); setVercelToken(""); setNotice("Vercel 令牌已加密保存。"); } catch { /* keep input for correction */ } }
  async function createPairing() { try { const payload = await request<{ pairing: { id: string; token: string; expiresAt: string; workerUrl: string } }>("pairing", `/api/projects/${encodeURIComponent(project.id)}/local-agent-pairings`, {}); setPairing(payload.pairing); setNotice("一次性桌面配对码已生成。离开此页后请重新生成。 "); } catch { /* keep existing form state */ } }
  async function createPullRequest(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const payload = await request<{ delivery: { url: string } }>("pr", `/api/projects/${encodeURIComponent(project.id)}/deliveries/github-pr`, { branch, title, changes: [{ path: filePath, content: fileContent }] }); setNotice(`GitHub PR 已创建：${payload.delivery.url}`); } catch { /* preserve requested change */ } }
  async function deploy(target: "preview" | "production") { try { const payload = await request<{ delivery: { url: string } }>(target, `/api/projects/${encodeURIComponent(project.id)}/deliveries/vercel-${target}`, { ref, ...(target === "production" ? { confirm: confirmProduction } : {}) }); setNotice(`${target === "preview" ? "预览" : "生产"}部署已创建：${payload.delivery.url}`); } catch { /* preserve deployment input */ } }

  return <section className="integrations-layout"><div className="settings-heading"><div><p className="eyebrow">INTEGRATIONS</p><h2>集成与交付</h2><p>连接凭据以加密形式保存。所有外部写操作都会记入项目审计记录。</p></div><span className={`status ${owner ? "ready" : "queued"}`}>{owner ? "所有者可配置" : "只读集成状态"}</span></div>{notice && <p className="success">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="integration-grid"><article className="panel integration-card"><p className="eyebrow">GITHUB</p><h3>仓库与 PR</h3><p>{project.linkedRepository ? `已关联 ${project.linkedRepository.fullName} · ${project.linkedRepository.defaultBranch}` : "关联后才可创建受审计的分支和 PR。"}</p>{owner && <><form onSubmit={(event) => void linkRepository(event)}><label>GitHub 仓库（owner/name）<input value={repository} onChange={(event) => setRepository(event.target.value)} required /></label><button className="button secondary" disabled={pending !== null}>{pending === "repository" ? "正在验证…" : "关联仓库"}</button></form>{project.linkedRepository && <form onSubmit={(event) => void createPullRequest(event)} className="delivery-form"><label>分支<input value={branch} onChange={(event) => setBranch(event.target.value)} required /></label><label>PR 标题<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>文件路径<input value={filePath} onChange={(event) => setFilePath(event.target.value)} required /></label><label>文件内容<textarea value={fileContent} onChange={(event) => setFileContent(event.target.value)} rows={5} required /></label><button className="button primary" disabled={pending !== null}>{pending === "pr" ? "正在创建 PR…" : "创建 GitHub PR"}</button></form>}</>}</article><article className="panel integration-card"><p className="eyebrow">VERCEL</p><h3>预览与生产</h3><p>{project.vercelConnection ? "Vercel 已连接；令牌不会再次显示。" : "添加项目级 Vercel 令牌后可创建预览。"}</p>{owner && <><form onSubmit={(event) => void connectVercel(event)}><label>Vercel Token<input type="password" autoComplete="new-password" value={vercelToken} onChange={(event) => setVercelToken(event.target.value)} required /></label><label>Vercel 项目名（可选）<input value={vercelProject} onChange={(event) => setVercelProject(event.target.value)} /></label><button className="button secondary" disabled={pending !== null}>{pending === "vercel" ? "正在加密…" : project.vercelConnection ? "更新 Vercel 连接" : "连接 Vercel"}</button></form>{project.vercelConnection && project.linkedRepository && <div className="delivery-form"><label>Git ref<input value={ref} onChange={(event) => setRef(event.target.value)} required /></label><button className="button secondary" onClick={() => void deploy("preview")} disabled={pending !== null}>{pending === "preview" ? "正在创建预览…" : "创建 Vercel 预览"}</button><label className="confirm-production"><input type="checkbox" checked={confirmProduction} onChange={(event) => setConfirmProduction(event.target.checked)} />我确认将此 ref 部署到生产环境</label><button className="button primary" onClick={() => void deploy("production")} disabled={pending !== null || !confirmProduction}>{pending === "production" ? "正在部署…" : "部署到生产"}</button></div>}</>}</article><article className="panel integration-card"><p className="eyebrow">LOCAL AGENT</p><h3>桌面桥接</h3><p>本地路径和订阅凭据仅保存在桌面端钥匙串。Worker 只保留短时作业和桥接标识。</p>{owner && <>{localSeats.length === 0 ? <p className="form-help">请先在“模型与代理”创建 Codex 或 Claude 本地席位。</p> : <button className="button secondary" onClick={() => void createPairing()} disabled={pending !== null}>{pending === "pairing" ? "正在生成…" : "生成桌面配对码"}</button>}{pairing && <div className="pairing-output"><strong>一次性配对码</strong><code>{pairing.id}</code><code>{pairing.token}</code><small>过期：{new Date(pairing.expiresAt).toLocaleString()}。在桌面端选择席位和本地工作目录后完成配对。</small></div>}</>}</article></div></section>;
}

function Overview({ t, locale, task, run, seatCount, isRunning, isPublicDemo, onOpenTasks, onOpenCouncil }: { t: Translation; locale: Locale; task: Task; run: Run | null; seatCount: number; isRunning: boolean; isPublicDemo: boolean; onOpenTasks: () => void; onOpenCouncil: () => void }) {
  return <div className="content-grid overview-grid">
    <section className="hero-card"><p className="eyebrow">{t.currentTask}</p><h2>{task.title}</h2><p>{task.goal}</p><div className="tag-row"><span>{kindLabels[task.kind][locale]}</span><span>{t.budget} · ${task.budgetUsd}</span><span>{t.toolBoundary} · {task.allowedTools.join(" · ")}</span></div><div className="hero-actions"><button className="text-button" onClick={onOpenTasks}>{t.tasks} →</button><button className="text-button" onClick={onOpenCouncil} disabled={!run && isRunning}>{run ? t.discussion : isPublicDemo ? t.runDemo : t.run} →</button></div></section>
    <section className="metric-card agent-metric"><p>{isPublicDemo ? t.publicDemo : t.agents}</p><strong>{isPublicDemo ? "—" : seatCount}</strong><small>{isPublicDemo ? t.runDemo : t.agentsAvailable}</small></section>
    <section className="metric-card budget-metric"><p>{t.budget}</p><strong>${run?.totalCostUsd ?? task.budgetUsd}</strong><small>{run ? t.ready : t.queued}</small></section>
    <section className="panel protocol-card"><div className="panel-heading"><div><p className="eyebrow">{t.protocol}</p><h3>{t.protocolTitle}</h3></div><span className={`status ${run ? "ready" : "queued"}`}>{run ? t.ready : t.queued}</span></div><ol className="protocol">{t.protocolSteps.map((step, index) => <li key={step}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol></section>
    <section className="panel preview-card"><div className="panel-heading"><div><p className="eyebrow">{t.previewLabel}</p><h3>{t.previewTitle}</h3></div></div><div className="preview-placeholder terminal-readout"><span>↗</span><p>{t.previewFlow}</p><small>{t.previewBoundary}</small></div></section>
    <section className="security-card"><p className="eyebrow">{t.privacyLabel}</p><h3>{t.privacyTitle}</h3><p>{t.privacyCopy}</p></section>
  </div>;
}

function TaskBoard({ t, locale, tasks, selectedId, isRunning, isPublicDemo, onSelect, onRun }: { t: Translation; locale: Locale; tasks: Task[]; selectedId: string; isRunning: boolean; isPublicDemo: boolean; onSelect: (id: string) => void; onRun: () => void }) {
  return <div className="content-grid task-grid"><section className="panel task-list"><div className="panel-heading"><div><p className="eyebrow">{t.taskBoard}</p><h2>{t.tasks}</h2></div><span>{tasks.length}</span></div>{tasks.map((task) => <button className={`task-row ${task.id === selectedId ? "selected" : ""}`} onClick={() => onSelect(task.id)} key={task.id}><span className={`status ${task.status}`}>{statusLabel(locale, task.status)}</span><strong>{task.title}</strong><small>{kindLabels[task.kind][locale]} · ${task.budgetUsd}</small></button>)}</section><section className="panel task-detail">{tasks.filter((task) => task.id === selectedId).map((task) => <div key={task.id}><p className="eyebrow">{t.acceptanceCriteria}</p><h2>{task.title}</h2><p>{task.goal}</p><ul className="criteria">{task.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul><p className="eyebrow">{t.requiredRoles}</p><div className="tag-row">{rolesForTask(task.kind).map((role) => <span key={role}>{roleLabel(role, locale)}</span>)}</div><button className="button primary" onClick={onRun} disabled={isRunning}>{isRunning ? t.processing : isPublicDemo ? t.runDemo : t.run}</button></div>)}</section></div>;
}

function CouncilView({ t, run }: { t: Translation; run: Run | null }) {
  if (!run) return <section className="empty-panel"><p className="eyebrow">{t.council}</p><h2>{t.noRun}</h2></section>;
  return <div className="council-layout"><section className="timeline panel"><div className="panel-heading"><div><p className="eyebrow">{t.auditableDiscussion}</p><h2>{t.discussion}</h2></div><span className="status ready">{t.ready}</span></div>{run.messages.map((entry, index) => <article className="message" key={entry.id}><div className="message-rail"><span>{String(index + 1).padStart(2, "0")}</span></div><div><div className="message-meta"><span className={`phase ${entry.phase}`}>{t.phases[entry.phase]}</span><strong>{entry.author}</strong><small>{entry.role}</small></div><p>{entry.content}</p>{entry.evidence.length > 0 && <div className="evidence">{entry.evidence.map((item) => <span key={item}>{item}</span>)}</div>}</div></article>)}</section><aside className="run-sidebar"><section className="panel"><p className="eyebrow">{t.decision}</p><h3>{run.messages.find((message) => message.phase === "decision")?.content}</h3></section><section className="risk-panel"><p className="eyebrow">{t.risks}</p>{run.unresolvedRisks.map((risk) => <p key={risk}>{risk}</p>)}</section></aside></div>;
}

function AgentSeatsView({ t, locale, seats, loadFailed, saved, onAdd, onToggle }: { t: Translation; locale: Locale; seats: AgentSeat[]; loadFailed: boolean; saved: boolean; onAdd: () => void; onToggle: (seat: AgentSeat) => Promise<void> }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(seat: AgentSeat) {
    setPendingId(seat.id);
    setError(null);
    try {
      await onToggle(seat);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.setupError);
    } finally {
      setPendingId(null);
    }
  }

  return <section className="agent-settings">
    <div className="settings-heading"><div><p className="eyebrow">{t.agentSettings}</p><h2>{t.agentSettingsTitle}</h2><p>{t.agentSettingsHelp}</p></div><button className="button primary" onClick={onAdd}>{t.addAgent}</button></div>
    {saved && <p className="success settings-notice">✓ {t.agentSaved}</p>}
    {loadFailed && <p className="form-error" role="alert">{t.agentLoadError}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {seats.length === 0 && !loadFailed && <p className="agent-empty">{t.noCustomAgents}</p>}
    <div className="agent-grid">
      {seats.map((seat) => {
        const role = agentRoleOptions.find((option) => option.value === seat.roles[0]);
        return <article className="agent-seat" key={seat.id}>
          <div className="agent-seat-heading"><div><span className={`status ${seat.enabled ? "ready" : "queued"}`}>{seat.enabled ? t.connected : t.disabled}</span><h3>{seat.name}</h3></div><span className="agent-kind">{t.roleLabels[seat.kind]}</span></div>
          <dl className="agent-details">
            <div><dt>{t.provider}</dt><dd>{seat.provider}</dd></div>
            <div><dt>{t.model}</dt><dd>{seat.model ?? "-"}</dd></div>
            <div><dt>{t.role}</dt><dd>{role ? role[locale] : seat.roles.join(", ")}</dd></div>
            <div><dt>{t.credentialLabels[seat.credentialSource]}</dt><dd>{seat.endpoint ?? seat.capabilities.join(" · ")}</dd></div>
          </dl>
          <button className="button secondary seat-toggle" onClick={() => void toggle(seat)} disabled={pendingId === seat.id}>{seat.enabled ? t.disable : t.enable}</button>
        </article>;
      })}
    </div>
  </section>;
}

function AgentComposer({ projectId, t, locale, onCancel, onSave }: { projectId: string; t: Translation; locale: Locale; onCancel: () => void; onSave: (seat: AgentSeat) => void }) {
  const [kind, setKind] = useState<AgentKind>("cloud_model");
  const [name, setName] = useState("OpenAI · 架构");
  const [provider, setProvider] = useState("OpenAI");
  const [model, setModel] = useState("gpt-5");
  const [endpoint, setEndpoint] = useState("");
  const [role, setRole] = useState<string>(agentRoleOptions[3].value);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function selectKind(nextKind: AgentKind) {
    setKind(nextKind);
    setApiKey("");
    setEndpoint("");
    if (nextKind === "cloud_model") {
      setName("OpenAI · 架构");
      setProvider("OpenAI");
      setModel("gpt-5");
      setRole(agentRoleOptions[3].value);
    } else if (nextKind === "local_coding_agent") {
      setName("Codex · 本地执行");
      setProvider("Codex");
      setModel("CLI");
      setRole(agentRoleOptions[4].value);
    } else {
      setName("GitHub · 工具");
      setProvider("GitHub");
      setModel("");
      setRole(agentRoleOptions[5].value);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const draft: AgentSeatDraft = { projectId, name, kind, provider, model, endpoint, role, ...((kind === "cloud_model" || kind === "mcp_tool") && apiKey ? { apiKey } : {}) };
    try {
      const response = await fetch("/api/agent-seats", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json() as { seat?: AgentSeat; error?: string };
      if (!response.ok || !payload.seat) throw new Error(payload.error ?? t.setupError);
      onSave(payload.seat);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.setupError);
      setApiKey("");
    } finally {
      setIsSaving(false);
    }
  }

  const kindOptions: { value: AgentKind; label: string }[] = [
    { value: "cloud_model", label: t.cloudModel },
    { value: "local_coding_agent", label: t.localAgent },
    { value: "mcp_tool", label: t.mcpTool },
  ];
  const nativeProvider = /^(anthropic|claude|gemini|google)$/i.test(provider.trim());
  const acceptsSecret = kind === "cloud_model" || kind === "mcp_tool";

  return <div className="composer-backdrop" role="presentation"><form className="task-composer agent-composer" role="dialog" aria-modal="true" aria-label={t.addAgent} autoComplete="off" onSubmit={(event) => void submit(event)}>
    <div className="composer-header"><div><p className="eyebrow">{t.agentSettings}</p><h2>{t.addAgent}</h2></div><button type="button" className="close-button" aria-label={t.closeAgentDialog} onClick={onCancel}>×</button></div>
    <div className="composer-body">
      <div className="kind-segment" role="radiogroup" aria-label={t.agentSettings}>{kindOptions.map((option) => <button type="button" role="radio" aria-checked={kind === option.value} className={kind === option.value ? "selected" : ""} key={option.value} onClick={() => selectKind(option.value)}>{option.label}</button>)}</div>
      <label htmlFor="agent-name">{t.seatName}<input id="agent-name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label htmlFor="agent-provider">{t.provider}<input id="agent-provider" value={provider} onChange={(event) => setProvider(event.target.value)} required /></label>
      <div className="agent-form-grid"><label htmlFor="agent-model">{t.model}<input id="agent-model" value={model} onChange={(event) => setModel(event.target.value)} /></label><label htmlFor="agent-role">{t.role}<select id="agent-role" value={role} onChange={(event) => setRole(event.target.value)}>{agentRoleOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}</select></label></div>
      {((kind === "cloud_model" && !nativeProvider) || kind === "mcp_tool") && <label htmlFor="agent-endpoint">{kind === "mcp_tool" ? "MCP Streamable HTTP Endpoint" : t.endpoint}<input id="agent-endpoint" inputMode="url" placeholder="https://api.example.com/v1" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required /></label>}
      {acceptsSecret && <><label htmlFor="agent-key">{kind === "mcp_tool" ? "MCP 访问令牌（可选）" : t.apiKey}<input id="agent-key" name="model-api-key" type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required={kind === "cloud_model"} /></label><p className="secure-note">{t.apiKeyHelp}</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="composer-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={isSaving}>{t.cancel}</button><button className="button primary" type="submit" disabled={isSaving}>{isSaving ? t.savingAgent : t.saveAgent}</button></div>
  </form></div>;
}

function AboutView({ t, locale }: { t: Translation; locale: Locale }) {
  return <div className="about-layout">
    <section className="panel about-intro"><p className="eyebrow">{t.aboutEyebrow}</p><h2>{t.aboutTitle}</h2><p>{t.aboutLead}</p></section>
    <section className="security-card about-boundary"><p className="eyebrow">{t.aboutBoundary}</p><h3>{t.privacyTitle}</h3><p>{t.aboutBoundaryCopy}</p></section>
    <section className="panel about-sources"><p className="eyebrow">{t.aboutSources}</p><h2>{t.acknowledgement}</h2><p>{t.aboutSourcesCopy}</p></section>
    <section className="inspiration-grid" aria-label={t.aboutSources}>{inspirations.map((source) => <article className="inspiration-card" key={source.name}><h3>{source.name}</h3><p>{source.note[locale]}</p><a className="source-link" href={source.href} target="_blank" rel="noreferrer">{t.viewSource} <span aria-hidden="true">↗</span></a></article>)}</section>
    <section className="panel acknowledgement-panel"><p className="eyebrow">{t.acknowledgement}</p><p>{t.acknowledgementCopy}</p><a className="source-link" href="https://github.com/hue913/open-project-council/blob/main/docs/acknowledgements.md" target="_blank" rel="noreferrer">{t.viewSource} <span aria-hidden="true">↗</span></a></section>
  </div>;
}

function TaskComposer({ t, locale, isSaving, saveError, onCancel, onSave }: { t: Translation; locale: Locale; isSaving: boolean; saveError: string | null; onCancel: () => void; onSave: (draft: TaskDraft) => void }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTaskTemplate.id);
  const [title, setTitle] = useState(defaultTaskTemplate.title[locale]);
  const [goal, setGoal] = useState(defaultTaskTemplate.goal[locale]);
  const [kind, setKind] = useState<TaskKind>(defaultTaskTemplate.kind);
  const [acceptanceText, setAcceptanceText] = useState(defaultTaskTemplate.acceptanceCriteria[locale].join("\n"));
  const [error, setError] = useState<string | null>(null);
  const selectedTemplate = taskTemplates.find((template) => template.id === selectedTemplateId) ?? defaultTaskTemplate;

  function applyTemplate(template: TaskTemplate) {
    setSelectedTemplateId(template.id);
    setKind(template.kind);
    setTitle(template.title[locale]);
    setGoal(template.goal[locale]);
    setAcceptanceText(template.acceptanceCriteria[locale].join("\n"));
    setError(null);
  }

  function selectKind(nextKind: TaskKind) {
    const template = taskTemplates.find((candidate) => candidate.kind === nextKind);
    if (template) applyTemplate(template);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const acceptanceCriteria = acceptanceText.split("\n").map((criterion) => criterion.trim()).filter(Boolean);
    if (!title.trim() || !goal.trim() || acceptanceCriteria.length === 0) {
      setError(t.acceptanceRequired);
      return;
    }
    onSave({
      title: title.trim(),
      goal: goal.trim(),
      kind,
      acceptanceCriteria,
      context: selectedTemplate.context[locale],
      allowedTools: selectedTemplate.allowedTools,
      budgetUsd: selectedTemplate.budgetUsd,
      requiredPermissions: selectedTemplate.requiredPermissions,
    });
  }

  return <div className="composer-backdrop" role="presentation"><form className="task-composer" role="dialog" aria-modal="true" aria-label={t.createTask} onSubmit={submit}>
    <div className="composer-header"><div><p className="eyebrow">{t.newTaskLabel}</p><h2>{t.createTask}</h2></div><button type="button" className="close-button" aria-label={t.closeDialog} onClick={onCancel}>×</button></div>
    <div className="composer-body">
      <p className="form-help">{t.templateHelp}</p>
      <div className="template-picker" aria-label={t.templateLabel}>{taskTemplates.map((template) => <button type="button" className={`template-option ${template.id === selectedTemplate.id ? "selected" : ""}`} aria-pressed={template.id === selectedTemplate.id} key={template.id} onClick={() => applyTemplate(template)}><span>{kindLabels[template.kind][locale]}</span><strong>{template.title[locale]}</strong><small>{template.summary[locale]}</small></button>)}</div>
      <label htmlFor="task-title">{t.taskTitle}<input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required /></label>
      <label htmlFor="task-goal">{t.taskGoal}<textarea id="task-goal" value={goal} onChange={(event) => setGoal(event.target.value)} required rows={4} /></label>
      <label htmlFor="task-kind">{t.kind}<select id="task-kind" value={kind} onChange={(event) => selectKind(event.target.value as TaskKind)}>{(Object.keys(kindLabels) as TaskKind[]).map((option) => <option key={option} value={option}>{kindLabels[option][locale]}</option>)}</select></label>
      <label htmlFor="task-acceptance">{t.acceptanceCriteria}<textarea id="task-acceptance" value={acceptanceText} onChange={(event) => { setAcceptanceText(event.target.value); setError(null); }} required rows={4} /></label>
      <p className="form-help">{t.acceptanceHelp}</p>
      {(error ?? saveError) && <p className="form-error" role="alert">{error ?? saveError}</p>}
    </div>
    <div className="composer-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={isSaving}>{t.cancel}</button><button className="button primary" type="submit" disabled={isSaving}>{isSaving ? t.savingTask : t.saveTask}</button></div>
  </form></div>;
}
