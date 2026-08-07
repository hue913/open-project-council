# 发布检查表

## 推送前

- [ ] `pnpm test`、`pnpm typecheck`、`pnpm build` 全部通过。
- [ ] `pnpm build:public-demo` 通过，且产物中没有 `/api`、凭据表单或私有运行记录。
- [ ] 使用干净环境完成 `pnpm install --frozen-lockfile`。
- [ ] 检查 `.env`、`data/`、构建产物和真实凭据未被跟踪。
- [ ] 更新 `CHANGELOG.md`、README 与配置说明。
- [ ] 审阅 Docker Compose：Web 仅绑定回环地址，Worker 没有宿主机端口。

## GitHub 发布

- [ ] `git init -b main`（仅首次）并创建远程仓库。
- [ ] 推送前检查 `git status` 与 `git diff --check`。
- [ ] 在仓库设置中启用 Issues、Private Security Advisories、分支保护和 CI 必需检查。
- [ ] 发布版本标签，附上 KMS、OAuth、数据库迁移和升级说明。
- [ ] 如发布公开体验，将 `apps/web/dist` 推送到专用 `gh-pages` 分支，并确认 Pages 只提供静态文件。

首次公开源码时，可在确认暂存内容不含私有文件后执行：

```bash
git config user.name "你的 GitHub 用户名"
git config user.email "你的 GitHub noreply 邮箱"
git add .env.example .github .gitignore CHANGELOG.md CODE_OF_CONDUCT.md CONTRIBUTING.md Dockerfile LICENSE README.md SECURITY.md apps docker-compose.yml docs package.json packages pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json
git diff --cached --check
git commit -m "发布 Open Project Council"
gh repo create open-project-council --public --source=. --remote=origin --push
git tag -a v0.1.0-alpha.1 -m "Open Project Council v0.1.0-alpha.1"
git push origin v0.1.0-alpha.1
```

将仓库设为 Public 只公开本仓库中的源码和文档。使用者自行部署时的项目、密钥、运行记录和 Docker 数据卷不会被上传。

公开体验的构建与 GitHub Pages 发布方式见[公开体验指南](public-demo.md)。

## 禁止项

- [ ] 不提交 API Key、Token、私有任务、运行记录、Docker 数据卷或 `.env`。
- [ ] 公网部署已验证 Vault Transit、HTTPS、PostgreSQL 备份、限流和 GitHub OAuth 回调。
