# 自托管指南

## 目标与边界

本指南适用于私有自托管和受控团队部署。应用使用 GitHub OAuth、项目成员角色和加密状态；不要把默认本机端口直接公开到互联网。

## Docker Compose

```bash
cp .env.example .env
openssl rand -base64 32
openssl rand -base64 32
```

把第一个值填入 `.env` 的 `ENVELOPE_KEK_BASE64`，把第二个值填入 `POSTGRES_PASSWORD`。在 GitHub 创建 OAuth App 后，把回调地址设为 `http://localhost:5173/api/auth/github/callback`，并填入 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。然后运行：

```bash
docker compose up --build
```

访问 `http://localhost:5173`，使用 GitHub 登录后创建第一个私有项目。Web 服务默认绑定 `127.0.0.1`，Worker 和 PostgreSQL 不映射宿主机端口。需要更改本机访问端口时设置 `WEB_PORT`。

## 数据与恢复

`council_postgres` Docker 卷保存 Worker 状态，项目正文、凭据索引和授权事务在写入前会信封加密。备份和恢复必须成对处理：

1. 备份 PostgreSQL 数据卷。
2. 使用密码管理器或受控密钥系统备份 `ENVELOPE_KEK_BASE64`。
3. 恢复时使用相同密钥；更换密钥会使旧凭据无法解密。

数据卷包含加密的云端凭据、GitHub OAuth Token、席位、任务、运行档案、成员关系和审计记录，不包含浏览器持久化的明文 API Key。任务和运行记录由 Worker 读取和加密写回；恢复时同样需要原始 `ENVELOPE_KEK_BASE64`。

浏览器请求 Worker 时不携带席位定义，运行只可引用 Worker 已保存、已启用且属于当前项目的席位；Worker 不会在模型调用全部失败时保存模拟结果。`owner` 可以添加成员和配置外部交付，`editor` 可以创建任务和席位，`viewer` 只能读取项目内容。

## 公网部署

公网实例必须将 `APP_URL` 设为 HTTPS 地址，并把 GitHub OAuth 回调改为 `${APP_URL}/api/auth/github/callback`。设置 `KMS_PROVIDER=vault`、`VAULT_ADDR`、`VAULT_TOKEN` 和 `VAULT_TRANSIT_KEY` 后，Worker 会使用 Vault Transit 加密。`KMS_PROVIDER=local` 仅限受信任私有环境，健康检查不会把它标记为公网生产就绪。

在反向代理层启用 TLS、请求体限制、速率限制和访问日志脱敏。不要把 `VAULT_TOKEN`、GitHub OAuth Secret、模型 Key 或 Vercel Token 放进 Git 仓库。

## 升级

```bash
git pull --ff-only
docker compose up --build -d
```

本项目的 Compose 配置从当前源码构建应用镜像，因此升级需要先拉取已审阅的源码，再重新构建容器。升级前备份数据卷。状态文件格式不兼容时，Worker 会返回存储不可用，而不是清空已有数据。

## 直接从源码运行

适合没有 Docker 的使用者。先生成并仅保存在当前终端或密码管理器中的密钥：

```bash
corepack enable
pnpm install --frozen-lockfile
export ENVELOPE_KEK_BASE64="$(openssl rand -base64 32)"
pnpm build
pnpm check:local
pnpm start:local
```

`start:local` 同时运行 Web 与 Worker。使用 `Ctrl+C` 会停止两项服务。首次接入模型前请确认 `http://localhost:5173` 仅对你信任的设备可见；公网部署请按“公网部署”章节配置 HTTPS、Vault Transit 和反向代理保护。
