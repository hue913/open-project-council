import { createProtocolRun, type Run, type Task, type TaskKind } from "@open-project-council/core";
import { useState, type FormEvent } from "react";
import { demoProject, demoTask } from "./data";
import { defaultTaskTemplate, taskTemplates, type TaskTemplate } from "./task-templates";

type Locale = "zh" | "en";
type View = "overview" | "tasks" | "council" | "about";
type TaskDraft = Pick<Task, "title" | "goal" | "kind" | "context" | "acceptanceCriteria" | "allowedTools" | "budgetUsd" | "requiredPermissions">;

const copy = {
  zh: {
    overview: "概览", tasks: "任务", council: "议事厅", about: "关于与致谢", project: "项目", publicDemo: "公开体验", publicDemoCopy: "这是静态演示，不接收模型凭据、不连接私有服务，也不保存任务。", selfHostFull: "部署完整实例", createTask: "新建任务", runDemo: "运行示例议事", processing: "执行中", currentTask: "当前任务", budget: "本次预算", toolBoundary: "工具边界", protocol: "议事协议", protocolTitle: "独立判断，而不是多人复读", protocolSteps: ["独立提出方案", "交叉质疑", "裁决与保留分歧", "受限执行与验证"], ready: "就绪", queued: "排队中", previewLabel: "预览", previewTitle: "交付与部署", previewFlow: "GitHub 分支 → Vercel 预览", previewBoundary: "生产环境始终需要所有者确认", privacyLabel: "项目边界", privacyTitle: "默认私有", privacyCopy: "完整项目只存在于每位使用者自己的私有部署中。", taskBoard: "任务板", acceptanceCriteria: "验收标准", auditableDiscussion: "可审计讨论", decision: "裁决", risks: "未解决风险", noRun: "还没有运行记录。运行示例即可查看完整协议。", discussion: "讨论记录", taskTitle: "任务标题", taskGoal: "完成目标", kind: "任务类型", saveTask: "保存到本次浏览", cancel: "取消", closeDialog: "关闭新建任务窗口", newTaskLabel: "新建任务", templateLabel: "任务模板", templateHelp: "选择模板会预填目标、验收标准、工具与最小权限；保存前都可以修改。", acceptanceHelp: "每行一个可验证的验收标准。", acceptanceRequired: "至少保留一条验收标准。", aboutEyebrow: "开源说明", aboutTitle: "为独立判断而设计", aboutLead: "Open Project Council 把多模型讨论组织成可审计的项目运行：独立方案、交叉质疑、裁决、受限执行与验证。公开体验只展示协议和本地示例；真实协作始终运行在使用者自己控制的私有实例中。", aboutBoundary: "公开边界", aboutBoundaryCopy: "平台源码可以公开，项目、密钥、运行记录与本地文件仍由创建者掌控。", aboutSources: "灵感来源", acknowledgement: "感谢公开实践与社区", aboutSourcesCopy: "我们从下列项目的公开产品和技术思路中学习，并在权限、预算、审计和私有所有权方面作出独立取舍。", acknowledgementCopy: "感谢这些团队和社区分享实践。Open Project Council 不隶属于、未获授权代表、也未得到下列项目的背书。", viewSource: "查看来源", phases: { independent: "独立方案", critique: "质疑", decision: "裁决", execution: "执行", verification: "验证", complete: "完成", failed: "失败" },
  },
  en: {
    overview: "Overview", tasks: "Tasks", council: "Council", about: "About", project: "Project", publicDemo: "Public demo", publicDemoCopy: "This static demo accepts no model credentials, connects to no private service, and saves no task data.", selfHostFull: "Deploy the full instance", createTask: "New task", runDemo: "Run demo council", processing: "Running", currentTask: "Current task", budget: "Budget", toolBoundary: "Tool boundary", protocol: "Protocol", protocolTitle: "Independent judgment, not repeated answers", protocolSteps: ["Independent proposals", "Cross-critique", "Decision with dissent preserved", "Bounded execution and verification"], ready: "Ready", queued: "Queued", previewLabel: "Preview", previewTitle: "Delivery and deployment", previewFlow: "GitHub branch → Vercel preview", previewBoundary: "Production always needs owner confirmation", privacyLabel: "Project boundary", privacyTitle: "Private by default", privacyCopy: "Full projects exist only in each user's own private deployment.", taskBoard: "Task board", acceptanceCriteria: "Acceptance criteria", auditableDiscussion: "Auditable discussion", decision: "Decision", risks: "Unresolved risks", noRun: "No run yet. Run the demo to inspect the full protocol.", discussion: "Discussion", taskTitle: "Task title", taskGoal: "Goal", kind: "Task kind", saveTask: "Save for this visit", cancel: "Cancel", closeDialog: "Close new task dialog", newTaskLabel: "New task", templateLabel: "Task templates", templateHelp: "A template pre-fills goals, acceptance criteria, tools, and minimum permissions. Everything remains editable before saving.", acceptanceHelp: "One verifiable acceptance criterion per line.", acceptanceRequired: "Keep at least one acceptance criterion.", aboutEyebrow: "Open-source note", aboutTitle: "Designed for independent judgment", aboutLead: "Open Project Council turns multi-model discussion into an auditable project run: independent proposals, cross-critique, decision, bounded execution, and verification. This public demo shows only the protocol and local examples; real collaboration stays in a user-controlled private instance.", aboutBoundary: "Public boundary", aboutBoundaryCopy: "Source code can be public while projects, credentials, run records, and local files remain controlled by their creator.", aboutSources: "Sources of inspiration", acknowledgement: "Thanks to open practice and community", aboutSourcesCopy: "We learn from the public product and technical ideas below, then make independent choices around permissions, budgets, auditability, and private ownership.", acknowledgementCopy: "We thank these teams and communities for sharing their work. Open Project Council is not affiliated with, authorized by, or endorsed by any project listed below.", viewSource: "View source", phases: { independent: "Independent proposal", critique: "Critique", decision: "Decision", execution: "Execution", verification: "Verification", complete: "Complete", failed: "Failed" },
  },
} as const;

type Translation = {
  [Key in keyof typeof copy.zh]: Key extends "protocolSteps"
    ? readonly string[]
    : Key extends "phases"
      ? Record<keyof typeof copy.zh.phases, string>
      : string;
};

const inspiration = [
  { name: "RoundTalk", href: "https://www.roundtalk.app/", zh: "跨模型共享上下文与多轮讨论", en: "Shared context across models and multi-round discussion" },
  { name: "Decidi", href: "https://decidi.ai/", zh: "反方、裁决与可审计结论", en: "Dissent, adjudication, and auditable conclusions" },
  { name: "MAD Studio", href: "https://multiagentdebates.com/", zh: "结构化多代理辩论", en: "Structured multi-agent debate" },
  { name: "Hivemind", href: "https://github.com/hivementality-ai/hivemind", zh: "持久工作空间、工具与本地代理", en: "Persistent workspaces, tools, and local agents" },
  { name: "AutoGen", href: "https://microsoft.github.io/autogen/", zh: "可组合的多代理协作抽象", en: "Composable multi-agent collaboration abstractions" },
  { name: "LangGraph", href: "https://langchain-ai.github.io/langgraph/", zh: "状态化、可恢复的流程编排", en: "Stateful, recoverable workflow orchestration" },
  { name: "LiteLLM", href: "https://docs.litellm.ai/", zh: "多供应商模型路由", en: "Multi-provider model routing" },
];

const kindLabels: Record<TaskKind, Record<Locale, string>> = {
  math: { zh: "数学", en: "Math" },
  coding: { zh: "编程", en: "Coding" },
  "code-review": { zh: "代码审查", en: "Code review" },
  "security-audit": { zh: "安全审计", en: "Security audit" },
  research: { zh: "研究", en: "Research" },
  "data-analysis": { zh: "数据分析", en: "Data analysis" },
  "product-planning": { zh: "产品规划", en: "Product planning" },
  "technical-writing": { zh: "技术写作", en: "Technical writing" },
  "web-design": { zh: "网页设计", en: "Web design" },
};

function statusLabel(locale: Locale, status: Task["status"]) {
  return status === "ready" ? copy[locale].ready : status === "processing" ? copy[locale].processing : copy[locale].queued;
}

export function PublicDemoApp() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState<Task[]>([demoTask]);
  const [selectedTaskId, setSelectedTaskId] = useState(demoTask.id);
  const [run, setRun] = useState<Run | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const t = copy[locale] as Translation;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];

  function addTask(draft: TaskDraft) {
    const task: Task = { ...demoTask, id: `public-task-${Date.now()}`, ...draft, status: "draft", createdAt: new Date().toISOString() };
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);
    setShowComposer(false);
    setView("tasks");
  }

  function runDemo() {
    setRun(createProtocolRun({ ...selectedTask, status: "processing" }, []));
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, status: "ready" } : task));
    setView("council");
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◌</span><div><strong>Open Project Council</strong><small>multi-model workspace</small></div></div>
      <div className="project-chip"><span className="visibility-dot" />{t.publicDemo}</div>
      <nav aria-label="Workspace navigation">{(["overview", "tasks", "council", "about"] as View[]).map((item) => <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)}>{t[item]}</button>)}</nav>
      <div className="sidebar-bottom"><button className="language-button" onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>{locale === "zh" ? "中文 / EN" : "EN / 中文"}</button><p>Apache-2.0<br />Your project stays yours.</p></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">{t.project}</p><h1>{demoProject.name}</h1><p className="subtle">{demoProject.description}</p></div><div className="topbar-actions"><span className="demo-pill">{t.publicDemo}</span><a className="button secondary" href="https://github.com/hue913/open-project-council" target="_blank" rel="noreferrer">{t.selfHostFull}</a><button className="button secondary" onClick={() => setShowComposer(true)}>{t.createTask}</button><button className="button primary" onClick={runDemo}>{t.runDemo}</button></div></header>
      <section className="demo-notice"><strong>{t.publicDemo}</strong><span>{t.publicDemoCopy}</span></section>
      {showComposer && <TaskComposer t={t} locale={locale} onCancel={() => setShowComposer(false)} onSave={addTask} />}
      {view === "overview" && <Overview t={t} locale={locale} task={selectedTask} run={run} onOpenTasks={() => setView("tasks")} onRun={runDemo} />}
      {view === "tasks" && <TaskBoard t={t} locale={locale} tasks={tasks} selectedId={selectedTaskId} onSelect={setSelectedTaskId} onRun={runDemo} />}
      {view === "council" && <CouncilView t={t} run={run} />}
      {view === "about" && <AboutView t={t} locale={locale} />}
    </section>
  </main>;
}

function Overview({ t, locale, task, run, onOpenTasks, onRun }: { t: Translation; locale: Locale; task: Task; run: Run | null; onOpenTasks: () => void; onRun: () => void }) {
  return <div className="content-grid overview-grid">
    <section className="hero-card"><p className="eyebrow">{t.currentTask}</p><h2>{task.title}</h2><p>{task.goal}</p><div className="tag-row"><span>{kindLabels[task.kind][locale]}</span><span>{t.budget} · ${task.budgetUsd}</span><span>{t.toolBoundary} · {task.allowedTools.join(" · ")}</span></div><div className="hero-actions"><button className="text-button" onClick={onOpenTasks}>{t.tasks} →</button><button className="text-button" onClick={onRun}>{run ? t.discussion : t.runDemo} →</button></div></section>
    <section className="metric-card agent-metric"><p>{t.publicDemo}</p><strong>—</strong><small>{t.runDemo}</small></section>
    <section className="metric-card budget-metric"><p>{t.budget}</p><strong>$0</strong><small>{run ? t.ready : t.queued}</small></section>
    <section className="panel protocol-card"><div className="panel-heading"><div><p className="eyebrow">{t.protocol}</p><h3>{t.protocolTitle}</h3></div><span className={`status ${run ? "ready" : "queued"}`}>{run ? t.ready : t.queued}</span></div><ol className="protocol">{t.protocolSteps.map((step, index) => <li key={step}><b>{String(index + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol></section>
    <section className="panel preview-card"><div className="panel-heading"><div><p className="eyebrow">{t.previewLabel}</p><h3>{t.previewTitle}</h3></div></div><div className="preview-placeholder terminal-readout"><span>↗</span><p>{t.previewFlow}</p><small>{t.previewBoundary}</small></div></section>
    <section className="security-card"><p className="eyebrow">{t.privacyLabel}</p><h3>{t.privacyTitle}</h3><p>{t.privacyCopy}</p></section>
  </div>;
}

function TaskBoard({ t, locale, tasks, selectedId, onSelect, onRun }: { t: Translation; locale: Locale; tasks: Task[]; selectedId: string; onSelect: (id: string) => void; onRun: () => void }) {
  return <div className="content-grid task-grid"><section className="panel task-list"><div className="panel-heading"><div><p className="eyebrow">{t.taskBoard}</p><h2>{t.tasks}</h2></div><span>{tasks.length}</span></div>{tasks.map((task) => <button className={`task-row ${task.id === selectedId ? "selected" : ""}`} onClick={() => onSelect(task.id)} key={task.id}><span className={`status ${task.status}`}>{statusLabel(locale, task.status)}</span><strong>{task.title}</strong><small>{kindLabels[task.kind][locale]} · $0</small></button>)}</section><section className="panel task-detail">{tasks.filter((task) => task.id === selectedId).map((task) => <div key={task.id}><p className="eyebrow">{t.acceptanceCriteria}</p><h2>{task.title}</h2><p>{task.goal}</p><ul className="criteria">{task.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul><button className="button primary" onClick={onRun}>{t.runDemo}</button></div>)}</section></div>;
}

function CouncilView({ t, run }: { t: Translation; run: Run | null }) {
  if (!run) return <section className="empty-panel"><p className="eyebrow">{t.council}</p><h2>{t.noRun}</h2></section>;
  return <div className="council-layout"><section className="timeline panel"><div className="panel-heading"><div><p className="eyebrow">{t.auditableDiscussion}</p><h2>{t.discussion}</h2></div><span className="status ready">{t.ready}</span></div>{run.messages.map((entry, index) => <article className="message" key={entry.id}><div className="message-rail"><span>{String(index + 1).padStart(2, "0")}</span></div><div><div className="message-meta"><span className={`phase ${entry.phase}`}>{t.phases[entry.phase]}</span><strong>{entry.author}</strong><small>{entry.role}</small></div><p>{entry.content}</p>{entry.evidence.length > 0 && <div className="evidence">{entry.evidence.map((item) => <span key={item}>{item}</span>)}</div>}</div></article>)}</section><aside className="run-sidebar"><section className="panel"><p className="eyebrow">{t.decision}</p><h3>{run.messages.find((message) => message.phase === "decision")?.content}</h3></section><section className="risk-panel"><p className="eyebrow">{t.risks}</p>{run.unresolvedRisks.map((risk) => <p key={risk}>{risk}</p>)}</section></aside></div>;
}

function AboutView({ t, locale }: { t: Translation; locale: Locale }) {
  return <div className="about-layout"><section className="panel about-intro"><p className="eyebrow">{t.aboutEyebrow}</p><h2>{t.aboutTitle}</h2><p>{t.aboutLead}</p></section><section className="security-card about-boundary"><p className="eyebrow">{t.aboutBoundary}</p><h3>{t.privacyTitle}</h3><p>{t.aboutBoundaryCopy}</p></section><section className="panel about-sources"><p className="eyebrow">{t.aboutSources}</p><h2>{t.acknowledgement}</h2><p>{t.aboutSourcesCopy}</p></section><section className="inspiration-grid" aria-label={t.aboutSources}>{inspiration.map((source) => <article className="inspiration-card" key={source.name}><h3>{source.name}</h3><p>{source[locale]}</p><a className="source-link" href={source.href} target="_blank" rel="noreferrer">{t.viewSource} <span aria-hidden="true">↗</span></a></article>)}</section><section className="panel acknowledgement-panel"><p className="eyebrow">{t.acknowledgement}</p><p>{t.acknowledgementCopy}</p><a className="source-link" href="https://github.com/hue913/open-project-council/blob/main/docs/acknowledgements.md" target="_blank" rel="noreferrer">{t.viewSource} <span aria-hidden="true">↗</span></a></section></div>;
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const acceptanceCriteria = acceptanceText.split("\n").map((criterion) => criterion.trim()).filter(Boolean);
    if (!title.trim() || !goal.trim() || acceptanceCriteria.length === 0) {
      setError(t.acceptanceRequired);
      return;
    }
    onSave({ title: title.trim(), goal: goal.trim(), kind, acceptanceCriteria, context: selectedTemplate.context[locale], allowedTools: selectedTemplate.allowedTools, budgetUsd: selectedTemplate.budgetUsd, requiredPermissions: selectedTemplate.requiredPermissions });
  }

  return <div className="composer-backdrop" role="presentation"><form className="task-composer" role="dialog" aria-modal="true" aria-label={t.createTask} onSubmit={submit}><div className="composer-header"><div><p className="eyebrow">{t.newTaskLabel}</p><h2>{t.createTask}</h2></div><button type="button" className="close-button" aria-label={t.closeDialog} onClick={onCancel}>×</button></div><div className="composer-body"><p className="form-help">{t.templateHelp}</p><div className="template-picker" aria-label={t.templateLabel}>{taskTemplates.map((template) => <button type="button" className={`template-option ${template.id === selectedTemplate.id ? "selected" : ""}`} aria-pressed={template.id === selectedTemplate.id} key={template.id} onClick={() => applyTemplate(template)}><span>{kindLabels[template.kind][locale]}</span><strong>{template.title[locale]}</strong><small>{template.summary[locale]}</small></button>)}</div><label htmlFor="public-task-title">{t.taskTitle}<input id="public-task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required /></label><label htmlFor="public-task-goal">{t.taskGoal}<textarea id="public-task-goal" value={goal} onChange={(event) => setGoal(event.target.value)} required rows={4} /></label><label htmlFor="public-task-kind">{t.kind}<select id="public-task-kind" value={kind} onChange={(event) => { const template = taskTemplates.find((candidate) => candidate.kind === event.target.value); if (template) applyTemplate(template); }}>{(Object.keys(kindLabels) as TaskKind[]).map((option) => <option key={option} value={option}>{kindLabels[option][locale]}</option>)}</select></label><label htmlFor="public-task-acceptance">{t.acceptanceCriteria}<textarea id="public-task-acceptance" value={acceptanceText} onChange={(event) => { setAcceptanceText(event.target.value); setError(null); }} required rows={4} /></label><p className="form-help">{t.acceptanceHelp}</p>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="composer-actions"><button type="button" className="button secondary" onClick={onCancel}>{t.cancel}</button><button className="button primary" type="submit">{t.saveTask}</button></div></form></div>;
}
