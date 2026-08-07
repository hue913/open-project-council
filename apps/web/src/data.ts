import type { Project, Task } from "@open-project-council/core";

const now = "2026-08-07T09:30:00.000Z";

export const demoProject: Project = {
  id: "project-council",
  ownerId: "demo-owner",
  name: "Proofboard",
  description: "把数学验证、产品代码与网页设计放进同一项可审计的 AI 项目协作。",
  visibility: "private",
  createdAt: now,
  updatedAt: now,
  linkedRepository: { provider: "github", fullName: "you/proofboard", defaultBranch: "main" },
};

export const demoTask: Task = {
  id: "task-auth-flow",
  projectId: demoProject.id,
  title: "实现 OAuth 登录与私有项目边界",
  goal: "设计一个可审计的 GitHub 登录流程，并确保项目默认私有、发布仅生成脱敏快照。",
  kind: "coding",
  context: ["用户通过 GitHub 登录", "项目归创建者所有", "生产部署必须人工确认"],
  acceptanceCriteria: ["未登录用户不能读项目", "敏感值不进入日志", "预览和生产权限分离"],
  allowedTools: ["GitHub", "终端", "浏览器"],
  budgetUsd: 6,
  requiredPermissions: ["read", "write", "execute"],
  status: "draft",
  createdAt: now,
};
