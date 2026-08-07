# 贡献指南

感谢你帮助改进 Open Project Council。

## 开始前

1. 阅读 [安全策略](SECURITY.md) 与 [行为准则](CODE_OF_CONDUCT.md)。
2. 对较大功能先提交 Issue，说明目标、权限边界、数据归属和验收方式。
3. 不要在 Issue、PR、截图、测试夹具或提交记录中放入 API Key、OAuth Token、私有代码或真实项目材料。

## 本地开发

```bash
corepack enable
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

变更 Worker 的模型调用或持久化逻辑时，至少补充一项能验证权限、脱敏或重启恢复的测试。变更用户界面时，检查中文、English、宽屏和窄屏状态。

## Pull Request

- 一个 PR 只解决一个清晰问题。
- 描述行为变化、风险、测试命令和未验证项。
- 新的外部调用必须说明授权来源、数据发送范围、失败行为和日志脱敏方式。
- 文档、示例和 `.env.example` 必须与配置变更同步更新。

提交贡献即表示你有权按 Apache-2.0 许可提交这些内容。
