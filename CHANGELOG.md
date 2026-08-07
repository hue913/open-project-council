# 变更记录

遵循 Keep a Changelog 风格。

## 0.1.0-alpha.3 - 2026-08-08

### Added

- 数学证明、软件交付和网页设计三种可编辑任务模板，内置验收标准与最小权限边界。
- 工作区“关于与致谢”页面与完整的开源灵感说明，感谢 RoundTalk、Decidi、MAD Studio、Hivemind、AutoGen、LangGraph 和 LiteLLM 的公开实践。
- 面向 GitHub Pages 的静态公开体验构建：可试运行本地示例议事，但不接收凭据、不请求 Worker，也不保存任务或项目数据。

### Security

- 公开体验改为独立构建入口，发布产物不包含私有工作台的模型配置表单或 `/api` 请求代码。

## 0.1.0-alpha.2 - 2026-08-08

### Added

- `pnpm check:local` 在启动前验证 Node 版本、构建产物、端口与 32 字节加密主密钥。
- `pnpm start:local` 用一个前台进程启动 Web 和 Worker，支持统一退出。

### Changed

- README 与自托管指南改为可直接执行的单终端源码运行流程。

## 0.1.0-alpha.1 - 2026-08-08

### Added

- 多模型独立方案、质疑、裁决协议与 OpenAI 兼容连接器。
- AES-256-GCM 本地信封加密、敏感信息脱敏和 Worker 加密状态持久化。
- Docker Compose 自托管、内部 Worker 代理、健康检查与加密数据卷。
- 中英文工作区、任务板、模型/Agent 席位、公开快照与反馈界面。
- CI、贡献、安全、行为准则和发布文档。

### Security

- Worker 仅信任本地保存的席位定义；未注册席位无法注入运行。
- 未接入的执行、测试与部署不会被显示为已完成。
