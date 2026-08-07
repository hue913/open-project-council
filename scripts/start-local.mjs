import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalRuntimeConfig } from "./runtime-config.mjs";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

async function requireBuildArtifacts() {
  for (const relativePath of ["apps/web/dist/index.html", "apps/worker/dist/server.js"]) {
    try {
      await access(resolve(workspace, relativePath));
    } catch {
      throw new Error(`Missing ${relativePath}. Run: pnpm build`);
    }
  }
}

let config;
try {
  config = getLocalRuntimeConfig();
  await requireBuildArtifacts();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local startup checks failed.");
  process.exit(1);
}

const environment = {
  ...process.env,
  APP_URL: config.appUrl,
  ENVELOPE_KEK_BASE64: config.envelopeKey,
  WEB_PORT: String(config.webPort),
  WORKER_PORT: String(config.workerPort),
  WORKER_URL: config.workerUrl,
};

const children = [
  spawn(pnpmCommand, ["--filter", "@open-project-council/worker", "start"], { cwd: workspace, env: environment, stdio: "inherit" }),
  spawn(pnpmCommand, ["--filter", "@open-project-council/web", "start"], { cwd: workspace, env: environment, stdio: "inherit" }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 2_000).unref();
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(`Could not start local service: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`A local service stopped unexpectedly (${signal ?? code ?? "unknown"}).`);
      stop(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
console.log(`Open Project Council is starting at ${config.appUrl}`);
