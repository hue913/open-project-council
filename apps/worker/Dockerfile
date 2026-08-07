FROM node:24-alpine
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/desktop/package.json apps/desktop/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/connectors/package.json packages/connectors/package.json
RUN pnpm install --frozen-lockfile
COPY apps/worker apps/worker
COPY packages/core packages/core
COPY packages/connectors packages/connectors
RUN pnpm --filter @open-project-council/core build && pnpm --filter @open-project-council/connectors build && pnpm --filter @open-project-council/worker build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["pnpm", "--filter", "@open-project-council/worker", "start"]
