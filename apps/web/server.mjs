import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.WEB_PORT ?? 5173);
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const workerUrl = new URL(process.env.WORKER_URL ?? "http://localhost:8787");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function proxyToWorker(request, response) {
  const upstreamUrl = new URL(request.url ?? "/", workerUrl);
  const send = upstreamUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = send(upstreamUrl, {
    method: request.method,
    headers: { ...request.headers, host: upstreamUrl.host },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => sendJson(response, 502, { error: "Worker is unavailable" }));
  request.pipe(upstream);
}

async function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const requestedPath = resolve(webRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
  const safePath = requestedPath.startsWith(`${webRoot}/`) ? requestedPath : resolve(webRoot, "index.html");
  let file = safePath;
  try {
    if (!(await stat(file)).isFile()) file = resolve(webRoot, "index.html");
  } catch {
    file = resolve(webRoot, "index.html");
  }
  const cacheControl = file.includes(`${webRoot}/assets/`) ? "public, max-age=31536000, immutable" : "no-cache";
  response.writeHead(200, { "content-type": mimeTypes[extname(file)] ?? "application/octet-stream", "cache-control": cacheControl });
  createReadStream(file).pipe(response);
}

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") return sendJson(response, 200, { ok: true, service: "council-web" });
  if (request.url?.startsWith("/api/")) return proxyToWorker(request, response);
  if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Method not allowed" });
  return serveStatic(request, response);
}).listen(port, () => console.log(`Council web listening on http://localhost:${port}`));
