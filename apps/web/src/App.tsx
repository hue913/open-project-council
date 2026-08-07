import { createDemoRun, createPublicSnapshot, type AgentKind, type AgentSeat, type PublicSnapshotSelection, type Run, type Task, type TaskKind } from "@open-project-council/core";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { demoProject, demoTask } from "./data";
import { defaultTaskTemplate, taskTemplates, type TaskTemplate } from "./task-templates";

type Locale = "zh" | "en";
type View = "overview" | "tasks" | "council" | "agents" | "publish" | "feedback" | "about";

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
  { value: "需求与 UX 分析者", zh: "需求与 UX 分析者", en: "Requirements and UX analyst" },
  { value: "前端实现者", zh: "前端实现者", en: "Frontend implementer" },
  { value: "截图审查者", zh: "截图审查者", en: "Screenshot reviewer" },
] as const;

const copy = {
  zh: {
    private: "私有项目", overview: "概览", tasks: "任务", council: "议事厅", publish: "发布快照", feedback: "反馈", about: "关于与致谢", publicDemo: "公开体验", publicDemoCopy: "不接收 API Key、不连接 Worker，也不保存任务。完整模型协作请自行部署私有实例。", selfHostFull: "部署完整实例", runDemo: "运行示例议事",
    createTask: "新建任务", run: "运行议事协议", running: "协议已完成", publishNow: "生成公开快照", preview: "打开 Vercel 预览",
    taskTitle: "任务标题", taskGoal: "完成目标", kind: "任务类型", saveTask: "保存并加入任务板", cancel: "取消",
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
    private: "Private project", overview: "Overview", tasks: "Tasks", council: "Council", publish: "Publish snapshot", feedback: "Feedback", about: "About and thanks", publicDemo: "Public demo", publicDemoCopy: "This demo accepts no API keys, connects to no Worker, and stores no tasks. Self-host a private instance for full model collaboration.", selfHostFull: "Self-host the full app", runDemo: "Run sample council",
    createTask: "New task", run: "Run council protocol", running: "Protocol complete", publishNow: "Create public snapshot", preview: "Open Vercel preview",
    taskTitle: "Task title", taskGoal: "Goal", kind: "Task kind", saveTask: "Save to task board", cancel: "Cancel",
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

export function App() {
  const isPublicDemo = import.meta.env.VITE_PUBLIC_DEMO === "true";
  const [locale, setLocale] = useState<Locale>("zh");
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState<Task[]>([demoTask]);
  const [seats, setSeats] = useState<AgentSeat[]>([]);
  const [agentSeatLoadFailed, setAgentSeatLoadFailed] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(demoTask.id);
  const [run, setRun] = useState<Run | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [selection, setSelection] = useState<PublicSnapshotSelection>({ includeTask: true, includeDecision: true, includeCode: false, includePreview: true, includeDiscussionSummary: false });
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [showAgentComposer, setShowAgentComposer] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);
  const t = copy[locale];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const selectedSeats = useMemo(() => seats.filter((seat) => seat.enabled), [seats]);
  const navigation: View[] = isPublicDemo ? ["overview", "tasks", "council", "about"] : ["overview", "tasks", "council", "agents", "publish", "feedback", "about"];

  useEffect(() => {
    if (isPublicDemo) return;
    let cancelled = false;
    void fetch(`/api/agent-seats?projectId=${encodeURIComponent(demoProject.id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load agent seats");
        return response.json() as Promise<{ seats: AgentSeat[] }>;
      })
      .then(({ seats: storedSeats }) => {
        if (cancelled) return;
        setSeats(storedSeats);
        setAgentSeatLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setAgentSeatLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, [isPublicDemo]);

  function addTask(draft: TaskDraft) {
    if (!draft.title || !draft.goal || draft.acceptanceCriteria.length === 0) return;
    const task: Task = {
      ...demoTask,
      id: `task-${Date.now()}`,
      ...draft,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);
    setShowComposer(false);
    setView("tasks");
  }

  async function runCouncil() {
    if (!selectedTask || isRunning) return;
    setIsRunning(true);
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status: "processing" } : task));
    if (isPublicDemo) {
      const demoRun = createDemoRun({ ...selectedTask, status: "processing" }, []);
      setRun(demoRun);
      setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status: "ready" } : task));
      setIsRunning(false);
      setView("council");
      return;
    }
    try {
      const response = await fetch("/api/runs/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: { ...selectedTask, status: "processing" }, seats: selectedSeats }),
      });
      const payload = await response.json() as { run?: Run; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? "Could not execute council run");
      setRun(payload.run);
    } catch {
      const fallback = createDemoRun({ ...selectedTask, status: "processing" }, selectedSeats);
      setRun({ ...fallback, unresolvedRisks: [...fallback.unresolvedRisks, "Worker 不可用；本次仅生成了本地演示记录，未调用云端模型。"] });
    } finally {
      setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status: "ready" } : task));
      setIsRunning(false);
      setView("council");
    }
  }

  function publishSnapshot() {
    const snapshot = createPublicSnapshot({
      id: `snapshot-${Date.now()}`,
      projectId: demoProject.id,
      slug: `${demoProject.name.toLowerCase()}-${Date.now()}`,
      selection,
      rawContent: {
        task: selection.includeTask ? selectedTask.goal : "",
        decision: selection.includeDecision ? run?.messages.find((message) => message.phase === "decision")?.content ?? "尚未裁决" : "",
        code: selection.includeCode ? "// Code is selected for publishing.\nconst visibility = 'owner-controlled';" : "",
        preview: selection.includePreview ? "https://vercel.com/preview/example" : "",
        discussion: selection.includeDiscussionSummary ? run?.messages.map((message) => message.content).join("\n") ?? "" : "",
      },
    });
    setSnapshotUrl(`/snapshots/${snapshot.slug}`);
  }

  function addAgentSeat(seat: AgentSeat) {
    setSeats((current) => [seat, ...current.filter((currentSeat) => currentSeat.id !== seat.id)]);
    setAgentSeatLoadFailed(false);
    setAgentSaved(true);
    setShowAgentComposer(false);
    setView("agents");
  }

  async function toggleManagedSeat(seat: AgentSeat) {
    const response = await fetch(`/api/agent-seats/${encodeURIComponent(seat.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !seat.enabled }),
    });
    const payload = await response.json() as { seat?: AgentSeat; error?: string };
    if (!response.ok || !payload.seat) throw new Error(payload.error ?? t.setupError);
    setSeats((current) => current.map((currentSeat) => currentSeat.id === payload.seat?.id ? payload.seat : currentSeat));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◌</span><div><strong>Open Project Council</strong><small>multi-model workspace</small></div></div>
        <div className="project-chip"><span className="visibility-dot" />{t.private}</div>
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)}>{item === "agents" ? t.agentSettings : t[item]}</button>
          ))}
        </nav>
        <div className="sidebar-bottom"><button className="language-button" onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>{locale === "zh" ? "中文 / EN" : "EN / 中文"}</button><p>Apache-2.0<br />Your project stays yours.</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><p className="eyebrow">{t.project}</p><h1>{demoProject.name}</h1><p className="subtle">{demoProject.description}</p></div><div className="topbar-actions">{isPublicDemo ? <><span className="demo-pill">{t.publicDemo}</span><a className="button secondary" href="https://github.com/hue913/open-project-council" target="_blank" rel="noreferrer">{t.selfHostFull}</a></> : <><span className="repo-pill">⌘ {demoProject.linkedRepository?.fullName}</span><button className="button secondary" onClick={() => { setAgentSaved(false); setShowAgentComposer(true); }}>{t.configureAgents}</button></>}<button className="button secondary" onClick={() => setShowComposer(true)}>{t.createTask}</button><button className="button primary" onClick={runCouncil} disabled={isRunning}>{isRunning ? t.processing : isPublicDemo ? t.runDemo : t.run}</button></div></header>
        {isPublicDemo && <section className="demo-notice"><strong>{t.publicDemo}</strong><span>{t.publicDemoCopy}</span></section>}

        {showComposer && <TaskComposer t={t} locale={locale} onCancel={() => setShowComposer(false)} onSave={addTask} />}
        {showAgentComposer && <AgentComposer t={t} locale={locale} onCancel={() => setShowAgentComposer(false)} onSave={addAgentSeat} />}

        {view === "overview" && <Overview t={t} locale={locale} task={selectedTask} run={run} seatCount={selectedSeats.length} isRunning={isRunning} isPublicDemo={isPublicDemo} onOpenTasks={() => setView("tasks")} onOpenCouncil={run ? () => setView("council") : runCouncil} />}
        {view === "tasks" && <TaskBoard t={t} locale={locale} tasks={tasks} selectedId={selectedTaskId} isRunning={isRunning} isPublicDemo={isPublicDemo} onSelect={setSelectedTaskId} onRun={runCouncil} />}
        {view === "council" && <CouncilView t={t} run={run} />}
        {view === "agents" && <AgentSeatsView t={t} locale={locale} seats={seats} loadFailed={agentSeatLoadFailed} saved={agentSaved} onAdd={() => { setAgentSaved(false); setShowAgentComposer(true); }} onToggle={toggleManagedSeat} />}
        {view === "publish" && <PublishView t={t} selection={selection} setSelection={setSelection} snapshotUrl={snapshotUrl} onPublish={publishSnapshot} />}
        {view === "feedback" && <FeedbackView t={t} feedback={feedback} setFeedback={setFeedback} saved={feedbackSaved} onSave={() => { setFeedbackSaved(true); setFeedback(""); }} />}
        {view === "about" && <AboutView t={t} locale={locale} />}
      </section>
    </main>
  );
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
  return <div className="content-grid task-grid"><section className="panel task-list"><div className="panel-heading"><div><p className="eyebrow">{t.taskBoard}</p><h2>{t.tasks}</h2></div><span>{tasks.length}</span></div>{tasks.map((task) => <button className={`task-row ${task.id === selectedId ? "selected" : ""}`} onClick={() => onSelect(task.id)} key={task.id}><span className={`status ${task.status}`}>{statusLabel(locale, task.status)}</span><strong>{task.title}</strong><small>{kindLabels[task.kind][locale]} · ${task.budgetUsd}</small></button>)}</section><section className="panel task-detail">{tasks.filter((task) => task.id === selectedId).map((task) => <div key={task.id}><p className="eyebrow">{t.acceptanceCriteria}</p><h2>{task.title}</h2><p>{task.goal}</p><ul className="criteria">{task.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul><button className="button primary" onClick={onRun} disabled={isRunning}>{isRunning ? t.processing : isPublicDemo ? t.runDemo : t.run}</button></div>)}</section></div>;
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

function AgentComposer({ t, locale, onCancel, onSave }: { t: Translation; locale: Locale; onCancel: () => void; onSave: (seat: AgentSeat) => void }) {
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
    const draft: AgentSeatDraft = { projectId: demoProject.id, name, kind, provider, model, endpoint, role, ...(kind === "cloud_model" ? { apiKey } : {}) };
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

  return <div className="composer-backdrop" role="presentation"><form className="task-composer agent-composer" role="dialog" aria-modal="true" aria-label={t.addAgent} autoComplete="off" onSubmit={(event) => void submit(event)}>
    <div className="composer-header"><div><p className="eyebrow">{t.agentSettings}</p><h2>{t.addAgent}</h2></div><button type="button" className="close-button" aria-label={t.closeAgentDialog} onClick={onCancel}>×</button></div>
    <div className="composer-body">
      <div className="kind-segment" role="radiogroup" aria-label={t.agentSettings}>{kindOptions.map((option) => <button type="button" role="radio" aria-checked={kind === option.value} className={kind === option.value ? "selected" : ""} key={option.value} onClick={() => selectKind(option.value)}>{option.label}</button>)}</div>
      <label htmlFor="agent-name">{t.seatName}<input id="agent-name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label htmlFor="agent-provider">{t.provider}<input id="agent-provider" value={provider} onChange={(event) => setProvider(event.target.value)} required /></label>
      <div className="agent-form-grid"><label htmlFor="agent-model">{t.model}<input id="agent-model" value={model} onChange={(event) => setModel(event.target.value)} /></label><label htmlFor="agent-role">{t.role}<select id="agent-role" value={role} onChange={(event) => setRole(event.target.value)}>{agentRoleOptions.map((option) => <option value={option.value} key={option.value}>{option[locale]}</option>)}</select></label></div>
      {kind === "cloud_model" && <><label htmlFor="agent-endpoint">{t.endpoint}<input id="agent-endpoint" inputMode="url" placeholder="https://api.example.com/v1" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required /></label><label htmlFor="agent-key">{t.apiKey}<input id="agent-key" name="model-api-key" type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required /></label><p className="secure-note">{t.apiKeyHelp}</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="composer-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={isSaving}>{t.cancel}</button><button className="button primary" type="submit" disabled={isSaving}>{isSaving ? t.savingAgent : t.saveAgent}</button></div>
  </form></div>;
}

function PublishView({ t, selection, setSelection, snapshotUrl, onPublish }: { t: Translation; selection: PublicSnapshotSelection; setSelection: (selection: PublicSnapshotSelection) => void; snapshotUrl: string | null; onPublish: () => void }) {
  const keys = Object.keys(selection) as (keyof PublicSnapshotSelection)[];
  return <section className="publish-layout"><div className="panel"><p className="eyebrow">{t.snapshot.toUpperCase()}</p><h2>{t.snapshot}</h2><p>{t.snapshotHelp}</p><div className="selection-list">{keys.map((key, index) => <label key={key}><input type="checkbox" checked={selection[key]} onChange={(event) => setSelection({ ...selection, [key]: event.target.checked })} /><span>{t.selections[index]}</span></label>)}</div><button className="button primary" onClick={onPublish} disabled={!Object.values(selection).some(Boolean)}>{t.publishNow}</button></div><aside className="snapshot-preview"><p className="eyebrow">{t.safePublishCheck}</p><h3>{t.scanSummary}</h3><p>{t.scanHelp}</p>{snapshotUrl && <a href={snapshotUrl} onClick={(event) => event.preventDefault()}>✓ {snapshotUrl}</a>}</aside></section>;
}

function FeedbackView({ t, feedback, setFeedback, saved, onSave }: { t: Translation; feedback: string; setFeedback: (value: string) => void; saved: boolean; onSave: () => void }) {
  return <section className="feedback-layout"><div className="panel"><p className="eyebrow">{t.feedback}</p><h2>{t.feedbackTitle}</h2><p>{t.feedbackHelp}</p><p className="feedback-contact">{t.feedbackContact}</p><textarea value={feedback} placeholder={t.feedbackPlaceholder} onChange={(event) => { setFeedback(event.target.value); }} rows={7} /><button className="button primary" onClick={onSave} disabled={!feedback.trim()}>{t.sendFeedback}</button>{saved && <p className="success">✓ {t.saved}</p>}</div></section>;
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

function TaskComposer({ t, locale, onCancel, onSave }: { t: Translation; locale: Locale; onCancel: () => void; onSave: (draft: TaskDraft) => void }) {
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
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="composer-actions"><button type="button" className="button secondary" onClick={onCancel}>{t.cancel}</button><button className="button primary" type="submit">{t.saveTask}</button></div>
  </form></div>;
}
