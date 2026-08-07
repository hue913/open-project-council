import { connectLocalAgent, inspectLocalAgents, listConnectedProjects, revokeWorkspaceAccess, runNextLocalJob, type BridgePairing } from "./main";
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
void inspect();
void restoreProjects();
