import { spawn } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(pnpmCommand, ["--filter", "@open-project-council/web", "build"], {
  env: {
    ...process.env,
    VITE_BASE_PATH: process.env.VITE_BASE_PATH ?? "/open-project-council/",
    VITE_PUBLIC_DEMO: "true",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Could not build the public demo: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  if (code === 0) {
    const source = new URL("../apps/web/dist/public-demo.html", import.meta.url);
    const target = new URL("../apps/web/dist/index.html", import.meta.url);
    if (existsSync(source)) renameSync(source, target);
  }
  process.exitCode = code ?? 1;
});
