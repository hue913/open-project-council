import { closeSshSession, connectLocalAgent, inspectLocalAgents, listConnectedProjects, openSshSession, readSshOutput, resizeSshSession, revokeWorkspaceAccess, runNextLocalJob, runSshCommand, writeSshInput, type BridgePairing } from "./main";
import "./desktop.css";

const status = document.querySelector<HTMLElement>("#agent-status")!;
const message = document.querySelector<HTMLElement>("#message")!;
const form = document.querySelector<HTMLFormElement>("#pairing-form")!;
const runNext = document.querySelector<HTMLButtonElement>("#run-next")!;
const revoke = document.querySelector<HTMLButtonElement>("#revoke")!;
const connectionState = document.querySelector<HTMLElement>("#connection-state")!;
const knownProjects = document.querySelector<HTMLSelectElement>("#known-projects")!;
let projectId: string | null = null;

function setMessage(value: string, error = false) {
  message.textContent = value;
  message.dataset.kind = error ? "error" : "success";
}

async function inspect() {
  try {
    const agents = await inspectLocalAgents();
    status.replaceChildren(...agents.map((agent) => {
      const item = document.createElement("div");
      item.className = agent.available ? "available" : "unavailable";
      item.textContent = `${agent.agent}: ${agent.available ? agent.detail : "不可用"}`;
      return item;
    }));
  } catch (error) { setMessage(error instanceof Error ? error.message : "无法检测本地 Agent", true); }
}

async function restoreProjects(selected?: string) {
  const projects = await listConnectedProjects();
  knownProjects.replaceChildren(new Option("选择已连接项目", ""), ...projects.map((id) => new Option(id, id)));
  const next = selected ?? (projects.length === 1 ? projects[0] : "");
  knownProjects.value = next;
  projectId = next || null;
  runNext.disabled = !projectId;
  revoke.disabled = !projectId;
  connectionState.textContent = projectId ? `已恢复项目 ${projectId} 的本地桥接。` : "尚未连接项目。";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = new FormData(form);
  const pairing: BridgePairing = {
    workerUrl: String(value.get("workerUrl") ?? ""),
    pairingId: String(value.get("pairingId") ?? ""),
    pairingToken: String(value.get("pairingToken") ?? ""),
    seatId: String(value.get("seatId") ?? ""),
    agent: String(value.get("agent")) === "claude" ? "claude" : "codex",
    workspacePath: String(value.get("workspacePath") ?? ""),
  };
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  submit.disabled = true;
  void connectLocalAgent(pairing).then((bridge) => {
    projectId = bridge.projectId;
    form.querySelector<HTMLInputElement>("#pairing-token")!.value = "";
    connectionState.textContent = `已连接项目 ${bridge.projectId} · 席位 ${bridge.seatId}`;
    runNext.disabled = false;
    revoke.disabled = false;
    setMessage("桌面桥接已连接；配对令牌仅保存在系统钥匙串。");
    return restoreProjects(bridge.projectId);
  }).catch((error) => setMessage(error instanceof Error ? error.message : "桌面连接失败", true)).finally(() => { submit.disabled = false; });
});

runNext.addEventListener("click", () => {
  if (!projectId) return;
  runNext.disabled = true;
  void runNextLocalJob(projectId).then((result) => setMessage(result.detail, result.status === "error")).catch((error) => setMessage(error instanceof Error ? error.message : "无法执行本地作业", true)).finally(() => { runNext.disabled = false; });
});

revoke.addEventListener("click", () => {
  if (!projectId) return;
  void revokeWorkspaceAccess(projectId).then(() => {
    setMessage("钥匙串中的桥接凭据已移除。");
    return restoreProjects();
  }).catch((error) => setMessage(error instanceof Error ? error.message : "无法撤销本地授权", true));
});

document.querySelector<HTMLButtonElement>("#inspect")!.addEventListener("click", () => { void inspect(); });
knownProjects.addEventListener("change", () => { projectId = knownProjects.value || null; runNext.disabled = !projectId; revoke.disabled = !projectId; connectionState.textContent = projectId ? `已选择项目 ${projectId}。` : "尚未连接项目。"; });
const sshForm = document.querySelector<HTMLFormElement>("#ssh-form")!;
const sshOutput = document.querySelector<HTMLElement>("#ssh-output")!;
sshForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = new FormData(sshForm);
  const args = String(value.get("args") ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const approved = value.get("approved") === "on";
  const submit = sshForm.querySelector<HTMLButtonElement>("button[type=submit]")!;
  submit.disabled = true;
  sshOutput.textContent = "正在连接 SSH…";
  void runSshCommand({ host: String(value.get("host") ?? ""), port: Number(value.get("port") ?? 22), username: String(value.get("username") ?? "") }, String(value.get("command") ?? ""), args, approved)
    .then((result) => { sshOutput.textContent = result.output || `退出码：${result.exitCode}`; if (result.requiresApproval) setMessage("命令需要逐次审批。请勾选确认后再次运行。", true); })
    .catch((error) => { sshOutput.textContent = error instanceof Error ? error.message : "SSH 命令失败"; })
    .finally(() => { submit.disabled = false; });
});
const screenUrl = document.querySelector<HTMLInputElement>("#screen-url")!;
const screenFrame = document.querySelector<HTMLIFrameElement>("#screen-frame")!;
document.querySelector<HTMLButtonElement>("#open-screen")!.addEventListener("click", () => {
  const url = screenUrl.value.trim();
  try { const parsed = new URL(url); const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname); if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) throw new Error("画面 URL 必须使用 HTTPS（开发环境 localhost 可使用 HTTP）"); screenFrame.src = parsed.toString(); screenFrame.hidden = false; } catch (error) { setMessage(error instanceof Error ? error.message : "画面 URL 无效", true); }
});

const sessionOpen = document.querySelector<HTMLButtonElement>("#ssh-session-open")!;
const sessionClose = document.querySelector<HTMLButtonElement>("#ssh-session-close")!;
const sessionInput = document.querySelector<HTMLTextAreaElement>("#ssh-session-input")!;
const sessionOutput = document.querySelector<HTMLElement>("#ssh-session-output")!;
let sshSessionId: string | null = null;
let sshPollTimer: number | undefined;

function sessionConnection() {
  const value = new FormData(sshForm);
  return { host: String(value.get("host") ?? ""), port: Number(value.get("port") ?? 22), username: String(value.get("username") ?? "") };
}

function stopSessionPolling() {
  if (sshPollTimer !== undefined) window.clearInterval(sshPollTimer);
  sshPollTimer = undefined;
}

async function pollSessionOutput() {
  if (!sshSessionId) return;
  try {
    const result = await readSshOutput(sshSessionId);
    if (result.output) sessionOutput.textContent += result.output;
    if (result.closed) {
      stopSessionPolling();
      sessionClose.disabled = true;
      sessionOpen.disabled = false;
      sshSessionId = null;
      setMessage("SSH 会话已关闭", true);
    }
  } catch (error) {
    stopSessionPolling();
    setMessage(error instanceof Error ? error.message : "无法读取 SSH 会话", true);
  }
}

sessionOpen.addEventListener("click", () => {
  sessionOpen.disabled = true;
  void openSshSession(sessionConnection()).then((result) => {
    sshSessionId = result.sessionId;
    sessionClose.disabled = false;
    sessionOutput.textContent = "";
    sshPollTimer = window.setInterval(() => { void pollSessionOutput(); }, 250);
    void pollSessionOutput();
    setMessage("交互式 SSH 会话已打开。危险命令仍需逐次审批。", false);
  }).catch((error) => {
    sessionOpen.disabled = false;
    setMessage(error instanceof Error ? error.message : "无法打开 SSH 会话", true);
  });
});

sessionClose.addEventListener("click", () => {
  if (!sshSessionId) return;
  const id = sshSessionId;
  stopSessionPolling();
  sshSessionId = null;
  sessionClose.disabled = true;
  sessionOpen.disabled = false;
  void closeSshSession(id).then(() => setMessage("SSH 会话已关闭")).catch((error) => setMessage(error instanceof Error ? error.message : "无法关闭 SSH 会话", true));
});

sessionInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  if (!sshSessionId) { setMessage("请先打开交互式 SSH 会话", true); return; }
  const input = sessionInput.value;
  if (!input) return;
  const approved = document.querySelector<HTMLInputElement>("#ssh-form input[name=approved]")?.checked ?? false;
  sessionInput.value = "";
  void writeSshInput(sshSessionId, `${input}\n`, approved).catch((error) => setMessage(error instanceof Error ? error.message : "无法写入 SSH 会话", true));
});

window.addEventListener("resize", () => {
  if (!sshSessionId) return;
  const cols = Math.min(180, Math.max(80, Math.floor(window.innerWidth / 8)));
  const rows = Math.min(80, Math.max(24, Math.floor(window.innerHeight / 18)));
  void resizeSshSession(sshSessionId, cols, rows).catch(() => undefined);
});

window.addEventListener("beforeunload", () => {
  if (sshSessionId) void closeSshSession(sshSessionId);
});
void inspect();
void restoreProjects();
