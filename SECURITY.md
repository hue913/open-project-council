# 安全策略

## 支持范围

`0.1.x` 是单用户自托管 Alpha。它不提供身份认证、多租户隔离、KMS/Vault、GitHub OAuth 或远程执行器授权，因此不适合暴露到公共互联网。

## 报告漏洞

请不要在公开 Issue 中提交 API Key、Token、私有项目内容或可利用细节。仓库创建后，请优先使用 GitHub Private Security Advisory；若该入口尚未开启，请联系项目维护者并仅发送经过脱敏的最小复现。

报告请包含：受影响版本、攻击前提、复现步骤、影响范围和建议修复方向。维护者会先确认收到，再协调公开披露时间。

## 部署要求

- 为每个部署生成独立的 32 字节 Base64 `ENVELOPE_KEK_BASE64`。
- 限制 `WORKER_DATA_PATH` 与 Docker 数据卷的宿主机访问权限。
- 不要设置 `ALLOW_INSECURE_MODEL_ENDPOINTS=true`。
- 在身份认证和项目授权落地前，只绑定本机回环地址。
