# Open Project Council

一个 Apache-2.0 开源的多模型项目工作台。它让多个已授权的模型先独立提出方案，再进行质疑和裁决；不同意见会保留为风险，而不是被伪造成共识。

## 当前可用范围

这是面向单个所有者、自托管使用的 Alpha。

- 接入任意 OpenAI 兼容 HTTPS Endpoint，并为每个模型分配任务职责。
- 对数学、编程、网页设计任务执行“独立方案 → 质疑 → 裁决”协议。
- 自带数学证明、软件交付与网页设计三类可编辑任务模板，预填验收标准与最小权限边界。
- 云端 API Key 采用 AES-256-GCM 信封加密；浏览器、运行记录和公开快照不保留明文。
- Worker 将已加密的席位状态保存在本地数据文件或 Docker 数据卷中，重启后仍可用。
- 项目默认私有；公开内容只来自用户选择且经过脱敏的快照。
- 自带中文和 English 工作区、任务板、讨论记录、席位配置、反馈入口和桌面端检测骨架。

当前未完成 GitHub OAuth、多用户隔离、数据库/KMS、原生 Anthropic/Gemini 协议、本地 Agent 实际执行、MCP、GitHub PR、Vercel 部署和持久化任务历史。请不要把这个 Alpha 直接公开到互联网或用于多租户生产环境。

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

打开 `http://localhost:5173`，在“模型与代理”中添加至少一个云端模型。Endpoint 必须是 OpenAI 兼容的公共 HTTPS 地址，例如供应商提供的 `/v1` 地址。Worker 会将密钥加密写入 `WORKER_DATA_PATH`，默认位置为 `./data/worker-state.json`。

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

默认只绑定 `127.0.0.1:5173`，Worker 只存在于 Docker 内部网络。浏览器通过 Web 服务反向代理访问 `/api`，不会直接暴露 Worker 端口。

备份时需要同时备份 Docker 卷 `council_data` 和 `ENVELOPE_KEK_BASE64`；丢失密钥将无法解密已保存的云端凭据。更完整的部署与恢复说明见 [自托管指南](docs/self-hosting.md)。

## 安全边界

- Worker 只使用自己保存、已启用且本次被选中的席位；请求无法注入席位定义。
- 模型输入、模型输出和公开快照都会执行敏感信息脱敏；上游错误正文不会返回给浏览器。
- 质疑与裁决阶段只接收被标记为不可信的前序输出，不能改变工具权限。
- 执行器、终端、GitHub、部署、测试和截图验证未接入时会明确显示“未执行”。
- `ALLOW_INSECURE_MODEL_ENDPOINTS=true` 仅可用于本机 mock 测试，不能用于正常部署。

`LocalEnvelopeCipher` 是本地参考实现，不是 KMS/Vault 的替代品。面向互联网部署前必须实现身份认证、项目授权、速率限制、审计存储与受管密钥服务。

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
- [公开体验指南](docs/public-demo.md)
- [灵感与致谢](docs/acknowledgements.md)
- [发布检查表](docs/release-checklist.md)
- [变更记录](CHANGELOG.md)

本项目代码采用 [Apache-2.0](LICENSE) 许可。用户在其自行部署的实例中创建的项目、密钥和产物仍归用户所有，不因代码开源而自动公开。
