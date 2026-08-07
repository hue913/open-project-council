# 灵感与致谢

Open Project Council 感谢多模型协作、可审计决策与本地 Agent 社区提供的公开产品和技术启发。本项目不与下列项目存在隶属、合作、赞助或授权关系；未复制其用户数据、私有实现或品牌资产。

| 项目 | 本项目借鉴的公开理念 | Open Project Council 的取舍 |
| --- | --- | --- |
| [RoundTalk](https://www.roundtalk.app/) | 在不同模型之间保留共享任务上下文与多轮讨论 | 将讨论收敛为任务协议与运行记录，而非开放式聊天。 |
| [Decidi](https://decidi.ai/) | 结构化呈现不同立场与可追溯决策 | 不以多数意见伪造共识，保留未解决风险。 |
| [MAD Studio](https://multiagentdebates.com/) | 让多 Agent 辩论过程可观察、可检查 | 要求质疑指向可验证的证据、反例或约束。 |
| [Hivemind](https://github.com/hivementality-ai/hivemind) | 持久工作空间、工具边界和本地编码代理的实践 | 本项目把本地 Agent 与云端凭据分开，避免开放用户设备的入站访问。 |
| [AutoGen](https://microsoft.github.io/autogen/) | 可组合的多 Agent 协作抽象 | 使用明确阶段、权限和预算约束组织运行。 |
| [LangGraph](https://langchain-ai.github.io/langgraph/) | 状态化流程、可恢复执行和图式编排 | 运行只允许声明过的阶段迁移，失败和分歧保留在审计记录中。 |
| [LiteLLM](https://docs.litellm.ai/) | 多供应商模型网关和统一调用接口 | 提供 OpenAI 兼容接入面，并与原生 Anthropic / Gemini 协议并存。 |

这些参考帮助我们明确方向，但不替代独立的安全、隐私和工程判断。Open Project Council 已实现身份认证、项目隔离、MCP 和远程交付接口；公网部署仍必须采用 Vault Transit、HTTPS、限流、监控与独立安全审计。
