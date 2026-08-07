import { spawnSync } from "node:child_process";

const checks = [
  ["codex", ["--version"]],
  ["claude", ["--version"]],
  ["git", ["--version"]],
];

console.log("Open Project Council desktop capability check");
for (const [command, args] of checks) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform === "win32" });
  const available = !result.error && result.status === 0;
  console.log(`${available ? "✓" : "○"} ${command}${available ? ` — ${result.stdout.trim()}` : " — not available"}`);
}
console.log("Credentials remain in the OS keychain / the authenticated local CLI. They are never printed by this command.");
