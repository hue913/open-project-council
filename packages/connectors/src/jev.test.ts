import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createJevDecision } from "./jev.js";

let closeServer: (() => Promise<void>) | undefined;

afterEach(async () => {
  await closeServer?.();
  closeServer = undefined;
});

describe("JEV decision connector", () => {
  it("sends a choice request and normalizes probabilities", async () => {
    let body = "";
    const server = createServer(async (request, response) => {
      for await (const chunk of request) body += chunk;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ probs: { "方案 1": 0.2, "方案 2": 0.8 }, choice: "方案 2" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");

    const result = await createJevDecision({ endpoint: `http://127.0.0.1:${address.port}`, model: "autotrust/JEV-9B", state: ["任务状态"], question: "请选择", options: ["方案 1", "方案 2"] });

    expect(JSON.parse(body)).toMatchObject({ model: "autotrust/JEV-9B", kind: "choice", options: ["方案 1", "方案 2"] });
    expect(result).toMatchObject({ selected: "方案 2", probabilities: { "方案 1": 0.2, "方案 2": 0.8 } });
  });

  it("rejects an invalid option count and upstream failures", async () => {
    await expect(createJevDecision({ endpoint: "http://127.0.0.1:1", model: "jev", state: [], question: "x", options: ["only"] })).rejects.toThrow("between 2 and 256");
    const server = createServer((_request, response) => { response.writeHead(503); response.end(); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");
    await expect(createJevDecision({ endpoint: `http://127.0.0.1:${address.port}`, model: "jev", state: [], question: "x", options: ["a", "b"] })).rejects.toThrow("HTTP 503");
  });

  it("preserves visual state items for JEV-VL", async () => {
    let received: unknown;
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received = JSON.parse(body).state;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ probabilities: { a: 1, b: 0 }, selected: "a" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");
    await createJevDecision({ endpoint: `http://127.0.0.1:${address.port}`, model: "autotrust/JEV-27B-VL", state: ["状态", { image: "https://example.com/screen.png" }], question: "选择", options: ["a", "b"] });
    expect(received).toEqual(["状态", { image: "https://example.com/screen.png" }]);
  });
});
