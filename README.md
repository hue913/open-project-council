# Open Project Council

一个 Apache-2.0 开源的多模型项目工作台。它让多个已授权的模型先独立提出方案，再进行质疑和裁决；不同意见会保留为风险，而不是被伪造成共识。

## 正式功能范围

这是可自托管的私有多用户工作台。公开源码采用 Apache-2.0；你的项目、密钥、运行记录和交付物不会因为源码公开而公开。

- 通过 GitHub OAuth 登录，使用 HttpOnly 会话 Cookie、PKCE、state 校验和加密 OAuth Token 保存登录态。
- 项目成员以 `owner`、`editor`、`viewer` 隔离；所有任务、运行、席位、凭据、交付和审计记录都先校验项目成员资格。
- 接入 OpenAI 兼容 API、原生 Anthropic Messages API 与原生 Gemini `generateContent` API，并为每个模型分配任务职责。
- 对数学、编程、代码审查、安全审计、研究、数据分析、产品规划、技术写作和网页设计任务执行“独立方案 → 质疑 → 裁决”协议。
- 提供 20 个可编辑任务预设，覆盖证明、调试、重构、研究比较、实验分析、威胁建模、产品发现、API 文档和响应式审查；每个预设都带有验收标准与最小权限边界。
- 接入任意 OpenAI 兼容 HTTPS Endpoint 后，Worker 会实际调用已选云模型完成独立方案、质疑和裁决；调用失败不会伪造成功运行。
- 云端 API Key、任务和运行记录采用 AES-256-GCM 信封加密；API Key 不会被浏览器持久化，模型输入、输出和公开快照会经过敏感信息脱敏。
- Worker 可将加密状态保存在本地文件，或通过 `DATABASE_URL` 保存在 PostgreSQL；Compose 默认启动 PostgreSQL。
- 私有部署可使用 AES-256-GCM 本地信封加密；公网部署必须配置 Vault Transit。Worker 健康检查会明确报告其 KMS 与生产就绪状态。
- 桌面桥接只由本机主动注册和轮询，配对令牌保存在系统钥匙串；可实际执行受限的 `codex exec` 或 `claude -p` 作业。
- 支持受限 MCP Streamable HTTP 工具调用、GitHub 仓库验证/分支/文件提交/PR，以及 Vercel 预览部署。Vercel 生产部署必须由项目所有者在请求中显式确认。
- 项目默认私有；公开内容只来自用户选择且经过脱敏的快照。
- 自带中文和 English 工作区、任务板、讨论记录、席位配置、反馈入口和桌面端检测骨架。

首次公开部署前，必须创建自己的 GitHub OAuth App、PostgreSQL 密码，并为公网实例配置 Vault Transit、HTTPS、反向代理与限流。没有这些外部授权或基础设施时，相关操作会明确失败，绝不会以模拟结果冒充成功。

## 公开体验

[公开体验站](https://hue913.github.io/open-project-council/)可以让任何人浏览任务模板、试运行不调用模型的示例议事，并查看协议与致谢。它是静态演示：不接收 API Key、不连接 Worker、不保存任务或项目数据。

完整模型协作需要每位使用者自行部署私有实例。公开体验的构建与发布边界见[公开体验指南](docs/public-demo.md)。

## 快速开始

前置条件：Node.js 24、pnpm 11。

```bash
corepack enable
pnpm install
export ENVELOPE_KEK_BASE64="$(openssl rand -base64 32)"
pnpm build
pnpm check:local
pnpm start:local
```

打开 `http://localhost:5173`，先使用 GitHub 登录并创建私有项目，再在“模型与代理”中添加席位。OpenAI 兼容模型需要公共 HTTPS `/v1` Endpoint；Anthropic 和 Gemini 使用其原生协议，可不填写 Endpoint。Worker 会将密钥、任务和运行记录加密保存。

`start:local` 会同时启动 Worker 和 Web 服务，按 `Ctrl+C` 可一并停止。开发模式仍可在两个终端中分别运行：

```bash
pnpm dev:worker
pnpm dev
```

不要把 `ENVELOPE_KEK_BASE64` 写入 Git、Issue、日志或公开快照。备份 `data/` 前请先确认其中没有明文项目材料；恢复加密席位状态时必须使用同一个主密钥。

## Docker 自托管

```bash
cp .env.example .env
# 在 .env 中填入 ENVELOPE_KEK_BASE64，使用：openssl rand -base64 32
docker compose up --build
```

默认只绑定 `127.0.0.1:5173`，Worker 与 PostgreSQL 只存在于 Docker 内部网络。浏览器通过 Web 服务反向代理访问 `/api`，不会直接暴露 Worker 或数据库端口。

备份时需要同时备份 Docker 卷 `council_data` 和 `ENVELOPE_KEK_BASE64`；丢失密钥将无法解密已保存的云端凭据。更完整的部署与恢复说明见 [自托管指南](docs/self-hosting.md)。

## 安全边界

- Worker 只使用自己保存、已启用、属于当前项目且本次被选中的席位；请求无法注入席位定义或跨项目读取资源。
- 模型输入、模型输出和公开快照都会执行敏感信息脱敏；上游错误正文不会返回给浏览器。
- 质疑与裁决阶段只接收被标记为不可信的前序输出，不能改变工具权限。
- 本地执行器、MCP、GitHub PR 和 Vercel 只会在连接、权限与所有者确认均已满足时调用；未获授权时会明确保留风险。
- `ALLOW_INSECURE_MODEL_ENDPOINTS=true` 仅可用于本机 mock 测试，不能用于正常部署。

`LocalEnvelopeCipher` 适合受信任的私有自托管环境，不是受管 KMS 的替代品。面向互联网部署必须使用 Vault Transit 或等效受管 KMS，并在反向代理层配置 HTTPS、限流和监控。

## 灵感与致谢

Open Project Council 的任务协议、审计记录与模型接入，受到 RoundTalk、Decidi、MAD Studio、Hivemind、AutoGen、LangGraph 和 LiteLLM 的公开产品与技术思路启发。我们感谢这些社区的实践与分享，但不暗示任何隶属、合作、赞助或授权关系。

完整的项目对应关系、采用的理念与独立取舍见[灵感与致谢](docs/acknowledgements.md)。

## 开发与验证

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm desktop:doctor
```

提交 PR 前应在 Node 24 与 pnpm 11 上运行上述检查。

## 贡献与发布

- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [架构说明](docs/architecture.md)
- [外部集成与桌面桥接](docs/integrations.md)
- [公开体验指南](docs/public-demo.md)
- [灵感与致谢](docs/acknowledgements.md)
- [发布检查表](docs/release-checklist.md)
- [变更记录](CHANGELOG.md)

本项目代码采用 [Apache-2.0](LICENSE) 许可。用户在其自行部署的实例中创建的项目、密钥和产物仍归用户所有，不因代码开源而自动公开。
