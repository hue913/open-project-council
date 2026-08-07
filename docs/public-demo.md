# 公开体验

公开体验是一个静态网页，用于让任何人了解任务模板、议事协议、审计记录和开源致谢。它刻意不提供真实模型调用或持久化能力：不会接收 API Key、不会请求 Worker、不会保存任务、不会写入项目数据。

这使它可以安全地托管在 GitHub Pages 等静态站点上。需要接入模型、保存加密席位、运行真实讨论或生成脱敏快照时，每个使用者应按[自托管指南](self-hosting.md)运行自己的私有实例。

## 构建

```bash
pnpm install --frozen-lockfile
pnpm build:public-demo
```

构建结果位于 `apps/web/dist`。默认基础路径为 `/open-project-council/`，适用于 GitHub Pages 项目站点。站点名称不同可在构建前设置 `VITE_BASE_PATH`，例如：

```bash
VITE_BASE_PATH=/my-site/ pnpm build:public-demo
```

构建会验证 `dist/index.html` 存在，并拒绝包含私有 `/api` 路径、席位管理或凭据字段标识的产物。

## GitHub Pages

仓库所有者可以将 `apps/web/dist` 的内容发布到专用 `gh-pages` 分支，再在仓库 Settings → Pages 中选择该分支的根目录作为发布源。Open Project Council 的公开体验地址为：

`https://hue913.github.io/open-project-council/`

不要用主分支、Docker 卷或 Worker 目录作为 Pages 发布源。Pages 只能接收该命令生成的静态 `dist` 文件。

## 发布约束

- 只发布由 `build:public-demo` 生成的静态文件，绝不发布 `.env`、`data/`、Worker 状态文件或运行日志。
- 公共站点不得代理到私有 Worker，也不得提供输入 API Key 的表单。
- 页面必须保留“公开体验”提示，并将完整功能引导回使用者自己的私有部署。
