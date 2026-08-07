import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalRuntimeConfig } from "./runtime-config.mjs";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "apps/web/dist/index.html",
  "apps/worker/dist/server.js",
];

let valid = true;
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 24) {
  console.error(`FAIL Node.js 24 or newer is required; found ${process.versions.node}.`);
  valid = false;
} else {
  console.log(`OK Node.js ${process.versions.node}`);
}

for (const relativePath of requiredFiles) {
  try {
    await access(resolve(workspace, relativePath));
    console.log(`OK ${relativePath}`);
  } catch {
    console.error(`FAIL ${relativePath} is missing. Run: pnpm build`);
    valid = false;
  }
}

try {
  const config = getLocalRuntimeConfig();
  console.log("OK encrypted credential storage key (32 bytes)");
  console.log(`OK web http://localhost:${config.webPort} -> worker ${config.workerUrl}`);
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : "Runtime configuration is invalid."}`);
  valid = false;
}

if (!valid) process.exitCode = 1;
