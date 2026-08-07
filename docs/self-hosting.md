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

数据卷只包含密文凭据与席位元数据，不包含浏览器中的明文 API Key。任务和运行记录在 Alpha 中仍是浏览器会话数据。

## 升级

```bash
git pull --ff-only
docker compose up --build -d
```

本项目的 Compose 配置从当前源码构建应用镜像，因此升级需要先拉取已审阅的源码，再重新构建容器。升级前备份数据卷。状态文件格式不兼容时，Worker 会返回存储不可用，而不是清空已有数据。
