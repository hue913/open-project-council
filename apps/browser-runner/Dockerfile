FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/browser-runner/package.json apps/browser-runner/package.json
RUN pnpm install --frozen-lockfile
COPY apps/browser-runner apps/browser-runner
RUN pnpm --filter @open-project-council/browser-runner build
ENV NODE_ENV=production
ENV BROWSER_RUNNER_PORT=8790
EXPOSE 8790
CMD ["pnpm", "--filter", "@open-project-council/browser-runner", "start"]
