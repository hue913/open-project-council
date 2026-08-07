import type { AgentSeat, DebateMessage, Permission, Run, RunPhase, Task, TaskKind } from "./types.js";

const now = () => new Date().toISOString();

const roleTemplates: Record<TaskKind, string[]> = {
  math: ["独立求解器 A", "独立求解器 B", "验证器"],
  coding: ["架构师", "实现者", "测试与安全审查者"],
  "code-review": ["代码审查者 A", "代码审查者 B", "安全与测试验证者"],
  "security-audit": ["威胁建模者", "攻击路径审查者", "安全验证者"],
  research: ["研究员", "反证审查者", "证据验证者"],
  "data-analysis": ["数据分析师", "统计审查者", "结果验证者"],
  "product-planning": ["产品策略师", "可行性审查者", "决策验证者"],
  "technical-writing": ["技术作者", "读者审查者", "事实验证者"],
  "web-design": ["需求与 UX 分析者", "前端实现者", "截图审查者"],
};

export function rolesForTask(kind: TaskKind): string[] {
  return roleTemplates[kind];
}

export function selectMinimumSeats(task: Task, seats: AgentSeat[]): AgentSeat[] {
  const roles = rolesForTask(task.kind);
  const enabled = seats.filter((seat) => seat.enabled);
  const chosen = roles
    .map((role) => enabled.find((seat) => seat.roles.includes(role)))
    .filter((seat): seat is AgentSeat => Boolean(seat));

  if (chosen.length === roles.length) return chosen;

  const fallback = enabled.filter((seat) => !chosen.some((candidate) => candidate.id === seat.id));
  return [...chosen, ...fallback].slice(0, roles.length);
}

export function canAdvanceRun(current: RunPhase, next: RunPhase): boolean {
  const transitions: Record<RunPhase, RunPhase[]> = {
    independent: ["critique", "failed"],
    critique: ["decision", "failed"],
    decision: ["execution", "failed"],
    execution: ["verification", "failed"],
    verification: ["complete", "failed"],
    complete: [],
    failed: [],
  };
  return transitions[current].includes(next);
}

export function advanceRun(run: Run, next: RunPhase): Run {
  if (!canAdvanceRun(run.phase, next)) {
    throw new Error(`Invalid run transition: ${run.phase} → ${next}`);
  }
  return {
    ...run,
    phase: next,
    status: next === "complete" ? "ready" : next === "failed" ? "error" : "processing",
    completedAt: next === "complete" || next === "failed" ? now() : undefined,
  };
}

function message(runId: string, phase: RunPhase, author: string, role: string, content: string, evidence: string[] = []): DebateMessage {
  return {
    id: `${runId}-${phase}-${author}`,
    runId,
    phase,
    author,
    role,
    content,
    evidence,
    confidence: phase === "decision" ? 0.78 : 0.68,
    createdAt: now(),
  };
}

/**
 * Creates the protocol timeline shared by real Worker runs and the public demo.
 * Callers replace only the phases backed by authorized connectors.
 */
export function createProtocolRun(task: Task, seats: AgentSeat[]): Run {
  const selected = selectMinimumSeats(task, seats);
  const runId = `run-${crypto.randomUUID()}`;
  const roles = rolesForTask(task.kind);
  const proposals = selected.map((seat, index) =>
    message(
      runId,
      "independent",
      seat.name,
      roles[index] ?? "分析者",
      `${seat.name} 独立分析了“${task.title}”，提出可验证方案并列出假设。`,
      task.acceptanceCriteria,
    ),
  );
  const critique = message(
    runId,
    "critique",
    selected.at(-1)?.name ?? "审查者",
    roles.at(-1) ?? "审查者",
    "发现两个方案在成本与边界条件上存在分歧；保留分歧并要求执行阶段验证。",
    ["比较独立方案", "验证边界条件"],
  );
  const decision = message(
    runId,
    "decision",
    "协调器",
    "裁决者",
    "采用风险较低的方案作为执行基线；未解决风险会在验证报告中保留。",
    task.acceptanceCriteria,
  );
  const execution = message(
    runId,
    "execution",
    selected[1]?.name ?? selected[0]?.name ?? "执行者",
    roles[1] ?? "执行者",
    "已生成受限执行计划，等待获得所需权限后写入分支并运行验证。",
    task.allowedTools,
  );
  const verification = message(
    runId,
    "verification",
    selected.at(-1)?.name ?? "验证者",
    roles.at(-1) ?? "验证者",
    "演示模式已通过验收条件映射；真实运行将附上测试、截图或数学验证证据。",
    task.acceptanceCriteria,
  );

  return {
    id: runId,
    projectId: task.projectId,
    taskId: task.id,
    phase: "complete",
    status: "ready",
    selectedAgentIds: selected.map((seat) => seat.id),
    messages: [...proposals, critique, decision, execution, verification],
    unresolvedRisks: ["真实模型、仓库和部署工具尚未获得本次运行授权。"],
    totalCostUsd: 0,
    startedAt: now(),
    completedAt: now(),
  };
}

export function requiresOwnerConfirmation(permission: Permission): boolean {
  return permission === "deploy_production";
}
