import type { Permission, TaskKind } from "@open-project-council/core";

export type WorkspaceLocale = "zh" | "en";

export type TaskTemplate = {
  id: string;
  kind: TaskKind;
  title: Record<WorkspaceLocale, string>;
  summary: Record<WorkspaceLocale, string>;
  goal: Record<WorkspaceLocale, string>;
  acceptanceCriteria: Record<WorkspaceLocale, string[]>;
  context: Record<WorkspaceLocale, string[]>;
  allowedTools: string[];
  budgetUsd: number;
  requiredPermissions: Permission[];
};

export const taskTemplates: TaskTemplate[] = [
  {
    id: "math-proof",
    kind: "math",
    title: { zh: "证明边界条件与反例", en: "Prove boundary cases and counterexamples" },
    summary: { zh: "双求解器与独立验证", en: "Two solvers with independent verification" },
    goal: { zh: "给出可复核的推导，明确假设、边界条件和可能的反例。", en: "Produce a reviewable derivation with explicit assumptions, boundary cases, and counterexamples." },
    acceptanceCriteria: {
      zh: ["定义、假设和结论彼此一致", "推导可逐步复核", "列出未解决的边界或反例"],
      en: ["Definitions, assumptions, and conclusions are consistent", "The derivation is reviewable step by step", "Unresolved boundary cases or counterexamples are listed"],
    },
    context: { zh: ["待验证的命题或公式", "已知条件与适用范围"], en: ["Statement or formula to verify", "Known conditions and applicability range"] },
    allowedTools: [],
    budgetUsd: 3,
    requiredPermissions: ["read"],
  },
  {
    id: "coding-delivery",
    kind: "coding",
    title: { zh: "交付一个可验证的软件功能", en: "Deliver a verifiable software feature" },
    summary: { zh: "架构、实现与测试审查", en: "Architecture, implementation, and test review" },
    goal: { zh: "实现一个边界清晰的功能，保留设计取舍并用自动化验证关键行为。", en: "Implement a well-bounded feature, record design trade-offs, and verify critical behavior automatically." },
    acceptanceCriteria: {
      zh: ["实现覆盖声明的验收条件", "测试或类型检查覆盖关键风险", "未解决的安全或发布风险被明确记录"],
      en: ["The implementation covers the declared acceptance criteria", "Tests or type checks cover critical risks", "Unresolved security or release risks are recorded explicitly"],
    },
    context: { zh: ["现有代码与约束", "接口、性能或兼容性要求"], en: ["Existing code and constraints", "Interface, performance, or compatibility requirements"] },
    allowedTools: ["终端", "测试"],
    budgetUsd: 6,
    requiredPermissions: ["read", "write", "execute"],
  },
  {
    id: "web-design-review",
    kind: "web-design",
    title: { zh: "设计并审查可实现的网页工作区", en: "Design and review an implementable web workspace" },
    summary: { zh: "需求、前端与截图审查", en: "Requirements, frontend, and screenshot review" },
    goal: { zh: "把用户流程、界面层级和响应式约束落成可实现的网页方案，并用截图审查关键状态。", en: "Turn user flows, hierarchy, and responsive constraints into an implementable web plan, then review key states with screenshots." },
    acceptanceCriteria: {
      zh: ["首屏能识别当前对象与主要动作", "宽屏和窄屏均无重叠或水平溢出", "截图审查保留问题与修复结论"],
      en: ["The first viewport identifies the current object and primary action", "Wide and narrow layouts have no overlap or horizontal overflow", "Screenshot review records issues and fixes"],
    },
    context: { zh: ["目标用户与主要工作流", "现有视觉规范和页面约束"], en: ["Target user and primary workflow", "Existing visual system and page constraints"] },
    allowedTools: ["浏览器", "截图审查"],
    budgetUsd: 5,
    requiredPermissions: ["read", "write"],
  },
];

export const defaultTaskTemplate = taskTemplates[1];
