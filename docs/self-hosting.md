# 自托管指南

## 目标与边界

本指南针对单个受信任所有者在本机或受控服务器上运行 Alpha。当前版本没有登录、团队成员或项目级授权；不要把 Web 端口直接公开到互联网。

## Docker Compose

```bash
cp .env.example .env
openssl rand -base64 32
```

把生成值填入 `.env` 的 `ENVELOPE_KEK_BASE64`，然后运行：

```bash
docker compose up --build
```

访问 `http://localhost:5173`。Web 服务默认绑定 `127.0.0.1`，Worker 不映射宿主机端口。需要更改本机访问端口时设置 `WEB_PORT`；不要在 OAuth 与项目授权完成前把该端口改为 `0.0.0.0`。

## 数据与恢复

`council_data` Docker 卷保存 Worker 的加密状态。备份和恢复必须成对处理：

1. 备份数据卷。
2. 使用密码管理器或受控密钥系统备份 `ENVELOPE_KEK_BASE64`。
3. 恢复时使用相同密钥；更换密钥会使旧凭据无法解密。

数据卷包含加密的云端凭据、席位、任务和运行档案，不包含浏览器持久化的明文 API Key。任务和运行记录由 Worker 读取和加密写回；恢复时同样需要原始 `ENVELOPE_KEK_BASE64`。

任务与运行记录只适用于当前单所有者实例。浏览器请求 Worker 时不携带席位定义，运行只可引用 Worker 已保存、已启用且属于该项目的席位；Worker 不会在模型调用全部失败时保存模拟结果。

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

`start:local` 同时运行 Web 与 Worker。使用 `Ctrl+C` 会停止两项服务。首次接入模型前请确认 `http://localhost:5173` 仅对你信任的设备可见；这个 Alpha 不是可供陌生用户共用的公共 SaaS。
