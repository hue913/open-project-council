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

桌面端使用参数数组而不是 shell 拼接来执行 `codex exec --sandbox` 或 `claude -p`。任务未声明 `write` 时，Codex 以只读沙箱运行。
