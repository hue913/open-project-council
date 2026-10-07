import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type BrowserActionKind = "click" | "type" | "navigate" | "select" | "submit" | "wait" | "finish";

export interface BrowserAction {
  action: BrowserActionKind;
  target?: string;
  value?: string;
  timeoutMs?: number;
  approved?: boolean;
}

export interface BrowserStep {
  index: number;
  action: BrowserActionKind;
  target?: string;
  value?: string;
  screenshotId?: string;
  screenshotPath?: string;
  approved: boolean;
  createdAt: string;
  url?: string;
  accessibilityTree?: string;
  error?: string;
}

export type BrowserRunStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface BrowserRunResult {
  id: string;
  status: BrowserRunStatus;
  success: boolean;
  reward: number;
  steps: BrowserStep[];
  startedAt?: string;
  completedAt?: string;
  finalUrl?: string;
  failureReason?: string;
}

export interface BrowserRunRequest {
  startUrl: string;
  actions?: BrowserAction[];
  taskId?: string;
  timeoutMs?: number;
  headless?: boolean;
}

function configuredOrigins() {
  return (process.env.BROWSER_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean).map((value) => {
    try { return new URL(value).origin; } catch { return undefined; }
  }).filter((value): value is string => Boolean(value));
}

function screenshotKey() {
  const encoded = process.env.BROWSER_RUNNER_SCREENSHOT_KEY_BASE64;
  if (!encoded) return undefined;
  try {
    const key = Buffer.from(encoded, "base64");
    return key.length === 32 ? key : undefined;
  } catch { return undefined; }
}
function requireScreenshotKey() {
  const key = screenshotKey();
  if (process.env.NODE_ENV === "production" && !key) throw new Error("BROWSER_RUNNER_SCREENSHOT_KEY_BASE64 is required in production");
  return key;
}
function sealScreenshot(data: Buffer) {
  const key = requireScreenshotKey();
  if (!key) return data;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from("OPC1"), iv, cipher.getAuthTag(), encrypted]);
}
function openScreenshot(data: Buffer) {
  const key = screenshotKey();
  if (!key || data.subarray(0, 4).toString() !== "OPC1") return data;
  const iv = data.subarray(4, 16);
  const tag = data.subarray(16, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
}

export function assertAllowedNavigation(value: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("navigation URL must be valid"); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("navigation URL must use http(s)");
  const origins = configuredOrigins();
  if (origins.length > 0 && !origins.includes(parsed.origin)) throw new Error("navigation URL is outside BROWSER_ALLOWED_ORIGINS");
  return parsed.toString();
}

interface ActiveRun {
  result: BrowserRunResult;
  context?: BrowserContext;
  browser?: Browser;
  cancelled: boolean;
}

export function validateRunRequest(input: unknown): BrowserRunRequest {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const body = input as Record<string, unknown>;
  if (typeof body.startUrl !== "string") throw new Error("startUrl must be an http(s) URL");
  let startUrl: string;
  try { startUrl = assertAllowedNavigation(body.startUrl); } catch (error) { throw new Error(`startUrl is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  if (body.actions !== undefined && (!Array.isArray(body.actions) || body.actions.length > 200)) throw new Error("actions must contain at most 200 items");
  const actions = (body.actions ?? []).map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`actions[${index}] must be an object`);
    const action = raw as Record<string, unknown>;
    const kind = action.action;
    if (!["click", "type", "navigate", "select", "submit", "wait", "finish"].includes(String(kind))) throw new Error(`actions[${index}].action is invalid`);
    if (action.target !== undefined && typeof action.target !== "string") throw new Error(`actions[${index}].target must be a string`);
    if (action.value !== undefined && typeof action.value !== "string") throw new Error(`actions[${index}].value must be a string`);
    if (action.timeoutMs !== undefined && (typeof action.timeoutMs !== "number" || action.timeoutMs < 0 || action.timeoutMs > 120_000)) throw new Error(`actions[${index}].timeoutMs is invalid`);
    return { action: kind as BrowserActionKind, target: action.target as string | undefined, value: action.value as string | undefined, timeoutMs: action.timeoutMs as number | undefined, approved: action.approved !== false };
  });
  return { startUrl, actions, taskId: typeof body.taskId === "string" ? body.taskId : undefined, timeoutMs: typeof body.timeoutMs === "number" ? Math.min(120_000, Math.max(1, body.timeoutMs)) : 30_000, headless: body.headless !== false };
}

export class BrowserRunner {
  private readonly runs = new Map<string, ActiveRun>();
  private readonly screenshotDir: string;

  constructor(screenshotDir = process.env.BROWSER_RUNNER_DATA_DIR ?? path.resolve("./data/browser-runs")) { this.screenshotDir = screenshotDir; }

  get(id: string): BrowserRunResult | undefined {
    const result = this.runs.get(id)?.result;
    return result ? { ...result, steps: result.steps.map(({ screenshotPath: _screenshotPath, ...step }) => step) } : undefined;
  }

  trajectory(id: string): BrowserStep[] | undefined {
    const steps = this.runs.get(id)?.result.steps;
    return steps?.map(({ screenshotPath: _screenshotPath, ...step }) => step);
  }

  async screenshot(id: string, screenshotId: string): Promise<Buffer | undefined> {
    const step = this.runs.get(id)?.result.steps.find((candidate) => candidate.screenshotId === screenshotId);
    if (!step?.screenshotPath) return undefined;
    try { return openScreenshot(await readFile(step.screenshotPath)); } catch { return undefined; }
  }

  async cancel(id: string): Promise<boolean> {
    const run = this.runs.get(id);
    if (!run || ["success", "failed", "cancelled"].includes(run.result.status)) return false;
    run.cancelled = true;
    run.result.status = "cancelled";
    run.result.success = false;
    run.result.failureReason = "Cancelled by request";
    await run.context?.close().catch(() => undefined);
    await run.browser?.close().catch(() => undefined);
    return true;
  }

  start(request: BrowserRunRequest): BrowserRunResult {
    const id = randomUUID();
    const result: BrowserRunResult = { id, status: "queued", success: false, reward: 0, steps: [] };
    const active: ActiveRun = { result, cancelled: false };
    this.runs.set(id, active);
    void this.execute(active, request);
    return result;
  }

  private async execute(active: ActiveRun, request: BrowserRunRequest) {
    const { result } = active;
    result.status = "running";
    result.startedAt = new Date().toISOString();
    try {
      requireScreenshotKey();
      await mkdir(this.screenshotDir, { recursive: true });
      active.browser = await chromium.launch({ headless: request.headless !== false });
      active.context = await active.browser.newContext();
      const page = await active.context.newPage();
      await page.goto(request.startUrl, { waitUntil: "domcontentloaded", timeout: request.timeoutMs });
      for (let i = 0; i < (request.actions ?? []).length; i += 1) {
        if (active.cancelled) return;
        const action = request.actions?.[i];
        if (!action) continue;
        const step: BrowserStep = { index: i, action: action.action, target: action.target, value: action.value, approved: action.approved !== false, createdAt: new Date().toISOString() };
        result.steps.push(step);
        try {
          if (action.approved === false && ["click", "type", "select", "submit"].includes(action.action)) throw new Error("This browser action requires explicit approval");
          await this.perform(page, action, request.timeoutMs ?? 30_000);
          step.url = page.url();
          const snapshot = await page.locator("body").ariaSnapshot().catch(() => undefined);
          if (snapshot) step.accessibilityTree = snapshot.slice(0, 20_000);
          const screenshotId = `${result.id}-${String(i).padStart(3, "0")}.png`;
          step.screenshotId = screenshotId;
          step.screenshotPath = path.join(this.screenshotDir, screenshotId);
          const screenshot = await page.screenshot({ fullPage: false });
          await writeFile(step.screenshotPath, sealScreenshot(screenshot));
          if (action.action === "finish") break;
        } catch (error) {
          step.error = error instanceof Error ? error.message : String(error);
          throw new Error(`step ${i} (${action.action}) failed: ${step.error}`);
        }
      }
      if (active.cancelled) return;
      result.status = "success";
      result.success = true;
      result.reward = 1;
      result.finalUrl = page.url();
    } catch (error) {
      if (!active.cancelled) {
        result.status = "failed";
        result.failureReason = error instanceof Error ? error.message : String(error);
      }
    } finally {
      result.completedAt = new Date().toISOString();
      await active.context?.close().catch(() => undefined);
      await active.browser?.close().catch(() => undefined);
      active.context = undefined;
      active.browser = undefined;
    }
  }

  private async perform(page: Page, action: BrowserAction, timeout: number) {
    const options = { timeout: action.timeoutMs ?? timeout };
    switch (action.action) {
      case "navigate": await page.goto(assertAllowedNavigation(action.value ?? action.target ?? "about:blank"), { waitUntil: "domcontentloaded", ...options }); break;
      case "click": await page.locator(action.target ?? "").first().click(options); break;
      case "type": await page.locator(action.target ?? "").first().fill(action.value ?? "", options); break;
      case "select": await page.locator(action.target ?? "").first().selectOption(action.value ?? "", options); break;
      case "submit": await Promise.all([page.waitForLoadState("domcontentloaded", options).catch(() => undefined), page.locator(action.target ?? "").first().click(options)]); break;
      case "wait": await page.waitForTimeout(Math.min(action.timeoutMs ?? Number(action.value ?? 250), 120_000)); break;
      case "finish": break;
    }
  }

  async deleteScreenshot(id: string) {
    const run = this.runs.get(id);
    if (!run) return;
    await Promise.all(run.result.steps.map((step) => step.screenshotPath ? unlink(step.screenshotPath).catch(() => undefined) : undefined));
  }

  async purgeExpired(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, run] of this.runs) {
      const createdAt = Date.parse(run.result.startedAt ?? "");
      if (Number.isFinite(createdAt) && createdAt < cutoff) {
        await this.deleteScreenshot(id);
        this.runs.delete(id);
      }
    }
  }
}
