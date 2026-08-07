import { describe, expect, it } from "vitest";
import { advanceRun, canAdvanceRun, createProtocolRun, rolesForTask, selectMinimumSeats } from "./protocol.js";
import type { AgentSeat, Run, Task } from "./types.js";

const task: Task = {
  id: "task-1", projectId: "project-1", title: "证明边界", goal: "验证推理", kind: "math",
  context: [], acceptanceCriteria: ["给出可复核步骤"], allowedTools: ["python"], budgetUsd: 2,
  requiredPermissions: ["execute"], status: "draft", createdAt: "2026-08-07T00:00:00.000Z",
};

const seats: AgentSeat[] = [
  { id: "a", projectId: "project-1", name: "GPT", kind: "cloud_model", provider: "openai", roles: ["独立求解器 A"], capabilities: ["read"], credentialSource: "cloud_envelope", enabled: true },
  { id: "b", projectId: "project-1", name: "Claude", kind: "cloud_model", provider: "anthropic", roles: ["独立求解器 B"], capabilities: ["read"], credentialSource: "cloud_envelope", enabled: true },
  { id: "c", projectId: "project-1", name: "Verifier", kind: "local_coding_agent", provider: "codex", roles: ["验证器"], capabilities: ["execute"], credentialSource: "local", enabled: true },
];

describe("multi-model protocol", () => {
  it("uses the required specialized roles for math", () => {
    expect(rolesForTask("math")).toEqual(["独立求解器 A", "独立求解器 B", "验证器"]);
    expect(selectMinimumSeats(task, seats).map((seat) => seat.id)).toEqual(["a", "b", "c"]);
  });

  it("routes every specialized task type to a distinct protocol", () => {
    expect(rolesForTask("research")).toEqual(["研究员", "反证审查者", "证据验证者"]);
    expect(rolesForTask("data-analysis")).toEqual(["数据分析师", "统计审查者", "结果验证者"]);
    expect(rolesForTask("code-review")).toEqual(["代码审查者 A", "代码审查者 B", "安全与测试验证者"]);
    expect(rolesForTask("security-audit")).toEqual(["威胁建模者", "攻击路径审查者", "安全验证者"]);
    expect(rolesForTask("product-planning")).toEqual(["产品策略师", "可行性审查者", "决策验证者"]);
    expect(rolesForTask("technical-writing")).toEqual(["技术作者", "读者审查者", "事实验证者"]);
  });

  it("preserves unresolved risks in a completed demo run", () => {
    const run = createProtocolRun(task, seats);
    expect(run.phase).toBe("complete");
    expect(run.messages.some((entry) => entry.phase === "critique")).toBe(true);
    expect(run.unresolvedRisks).not.toHaveLength(0);
  });

  it("only permits the declared run lifecycle", () => {
    const run = { id: "r", projectId: "p", taskId: "t", phase: "independent", status: "processing", selectedAgentIds: [], messages: [], unresolvedRisks: [], totalCostUsd: 0, startedAt: "now" } as Run;
    expect(canAdvanceRun("independent", "critique")).toBe(true);
    expect(canAdvanceRun("independent", "execution")).toBe(false);
    expect(advanceRun(run, "critique").phase).toBe("critique");
    expect(() => advanceRun(run, "execution")).toThrow("Invalid run transition");
  });
});
