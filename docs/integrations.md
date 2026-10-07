# 外部集成与桌面桥接

所有接口都通过 Web 同源代理调用，并要求 GitHub 登录会话。错误响应不会包含供应商密钥、OAuth Token 或上游正文。

## 模型席位

在工作区的“模型与代理”中创建席位。

- `OpenAI` 或其他名称：填写 OpenAI 兼容的 HTTPS `/v1` Endpoint、模型和 API Key。
- `Anthropic` / `Claude`：填写原生模型名与 API Key；Endpoint 留空时使用 `https://api.anthropic.com`。
- `Gemini` / `Google`：填写原生模型名与 API Key；Endpoint 留空时使用 Google Generative Language API。
- `MCP 工具`：填写 Streamable HTTP Endpoint 和工具名；令牌可选，任务必须声明 `execute` 权限才会发起 `tools/call`。

密钥只在浏览器提交时出现，Worker 立即进行信封加密。返回的席位对象不会包含明文或密文凭据。

## GitHub 与 Vercel

GitHub OAuth 授权会请求 `read:user user:email repo`，用于读取用户身份、验证仓库并创建分支与 PR。项目所有者可通过以下受控接口连接和交付：

```text
PATCH /api/projects/:projectId/repository
PATCH /api/projects/:projectId/vercel
POST  /api/projects/:projectId/deliveries/github-pr
POST  /api/projects/:projectId/deliveries/vercel-preview
POST  /api/projects/:projectId/deliveries/vercel-production
GET   /api/projects/:projectId/audit-events
```

`github-pr` 的请求必须显式提供目标分支、标题和文件内容；Worker 不会执行模型生成的隐式文件操作。`vercel-production` 必须包含 JSON 字段 `confirm: true`，且调用者必须是项目 `owner`。

## 本地 Agent

1. 项目所有者先创建 `local_coding_agent` 席位，再调用 `POST /api/projects/:projectId/local-agent-pairings`。
2. 在桌面应用中粘贴一次性配对 ID 和令牌，选择本地席位、Agent 与绝对工作目录，然后点击“安全连接”。
3. 桌面端将桥接令牌与工作目录仅保存在操作系统钥匙串，点击“运行下一项作业”主动轮询作业。重启后可从“已连接项目”恢复桥接。
4. Worker 只保存桥接标识、席位和作业状态，不接收本地工作目录或本地订阅凭据。

## JEV 决策模型

项目所有者可以在“集成与交付”中启用外部 JEV Endpoint，任务还必须单独勾选 JEV 才会调用。默认模型为 `autotrust/JEV-27B`，视觉任务可选 `autotrust/JEV-27B-VL`。Worker 调用 JEV 的 `POST /v1/decide`，只把候选方案、任务状态和经过授权的截图作为决策输入；JEV 不能改变工具权限或审批状态。置信度低于项目阈值、候选不足或网关失败时回退到 Critic 或人工审批。

## Browser Runner / WebArena

`apps/browser-runner` 是独立 Playwright 服务。它为每个任务创建隔离 BrowserContext，并记录动作、URL、accessibility tree、截图和最终奖励。Worker 代理以下内部接口并执行项目权限检查：

```text
POST /api/projects/:projectId/browser-runs
GET  /api/projects/:projectId/browser-runs/:runId
POST /api/projects/:projectId/browser-runs/:runId/cancel
GET  /api/projects/:projectId/browser-runs/:runId/trajectory
```

Runner 本身提供同名 `/internal/browser-runs` 接口。生产环境应将它放在私有网络中，并设置 `BROWSER_RUNNER_TOKEN`。WebArena 的 Shopping、GitLab、论坛和 Wiki 站点地址由部署环境提供，不能把测试账号写入仓库；截图和轨迹默认加密保留七天。

生产环境还必须设置 32 字节的 `BROWSER_RUNNER_SCREENSHOT_KEY_BASE64`；Runner 在缺少该密钥时拒绝启动运行。开发环境可以省略它以便调试，但不应把开发截图卷用于生产。

Runner 还提供受 Bearer Token 保护的 `GET /internal/browser-runs/:runId/screenshots/:screenshotId` 和 `DELETE /internal/browser-runs/:runId/screenshots`。通过 `BROWSER_ALLOWED_ORIGINS` 设定允许导航的站点 origin，避免把 Runner 变成任意内网请求代理。需要 JEV-VL 时，可在任务上下文加入 `image:https://...` 或 `screenshot:https://...`，并选择 `autotrust/JEV-27B-VL`；Worker 只在项目和任务都开启 JEV 且图片 URL 为 HTTPS（开发环境允许 localhost）时发送图片 state。

JEV 低置信度或不可用且项目 fallback 设为 `human` 时，会生成待处理审批。项目成员可通过 `GET /api/projects/:projectId/approvals` 查看，并用 `POST` 或 `PATCH /api/projects/:projectId/approvals/:approvalId` 提交 `{ "status": "approved" | "rejected" }`。

桌面端使用参数数组而不是 shell 拼接来执行 `codex exec --sandbox` 或 `claude -p`。任务未声明 `write` 时，Codex 以只读沙箱运行。
