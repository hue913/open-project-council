import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { BrowserRunner, validateRunRequest } from "./engine.js";

const port = Number(process.env.BROWSER_RUNNER_PORT ?? 8790);
const maxBodyBytes = 256 * 1024;
const runner = new BrowserRunner();

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": process.env.APP_URL ?? "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" });
  response.end(JSON.stringify(body));
}

function authorized(request: IncomingMessage) {
  const expected = process.env.BROWSER_RUNNER_TOKEN;
  return !expected || request.headers.authorization === `Bearer ${expected}`;
}

async function body(request: IncomingMessage) {
  let raw = "";
  for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > maxBodyBytes) throw new Error("request body is too large"); }
  try { return JSON.parse(raw || "{}"); } catch { throw new Error("request body must be valid JSON"); }
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") { json(response, 204, {}); return; }
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const runMatch = url.pathname.match(/^\/internal\/browser-runs\/([^/]+)(?:\/(cancel|trajectory|screenshots)(?:\/([^/]+))?)?$/);
  try {
    if (!authorized(request)) { json(response, 401, { error: "unauthorized" }); return; }
    if (request.method === "POST" && url.pathname === "/internal/browser-runs") {
      const run = runner.start(validateRunRequest(await body(request)));
      json(response, 202, run);
      return;
    }
    if (runMatch) {
      const id = decodeURIComponent(runMatch[1]);
      const suffix = runMatch[2];
      const screenshotId = runMatch[3] ? decodeURIComponent(runMatch[3]) : undefined;
      if (request.method === "GET" && !suffix) {
        const run = runner.get(id);
        if (!run) { json(response, 404, { error: "run not found" }); return; }
        json(response, 200, run);
        return;
      }
      if (request.method === "GET" && suffix === "trajectory") {
        const trajectory = runner.trajectory(id);
        if (!trajectory) { json(response, 404, { error: "run not found" }); return; }
        json(response, 200, { runId: id, steps: trajectory });
        return;
      }
      if (request.method === "POST" && suffix === "cancel") {
        if (!(await runner.cancel(id))) { json(response, 404, { error: "run not found or already finished" }); return; }
        json(response, 202, runner.get(id));
        return;
      }
      if (request.method === "DELETE" && suffix === "screenshots") {
        await runner.deleteScreenshot(id);
        json(response, 204, {});
        return;
      }
      if (request.method === "GET" && suffix === "screenshots" && screenshotId) {
        const screenshot = await runner.screenshot(id, screenshotId);
        if (!screenshot) { json(response, 404, { error: "screenshot not found" }); return; }
        response.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
        response.end(screenshot);
        return;
      }
    }
    json(response, 404, { error: "not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    json(response, /not found|already finished/i.test(message) ? 404 : 400, { error: message });
  }
});

server.listen(port, () => console.log(`browser runner listening on http://localhost:${port}`));
setInterval(() => { void runner.purgeExpired(); }, 60 * 60 * 1000).unref();
