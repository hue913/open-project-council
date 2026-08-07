import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createOpenAICompatibleCompletion } from "./openai-compatible.js";

let closeServer: (() => Promise<void>) | undefined;

afterEach(async () => {
  await closeServer?.();
  closeServer = undefined;
});

describe("OpenAI-compatible connector", () => {
  it("sends a scoped chat request and returns only the model content", async () => {
    let authorization = "";
    const server = createServer(async (request, response) => {
      authorization = String(request.headers.authorization ?? "");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ choices: [{ message: { content: "A verifiable proposal" } }], usage: { prompt_tokens: 12, completion_tokens: 8 } }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");

    const result = await createOpenAICompatibleCompletion({
      endpoint: `http://127.0.0.1:${address.port}/v1`,
      apiKey: "test-key",
      model: "test-model",
      system: "Be independent.",
      prompt: "Review the task.",
    });

    expect(result).toEqual({ content: "A verifiable proposal", inputTokens: 12, outputTokens: 8 });
    expect(authorization).toBe("Bearer test-key");
  });

  it("does not expose an upstream error response body", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "sensitive upstream detail" } }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");

    await expect(createOpenAICompatibleCompletion({ endpoint: `http://127.0.0.1:${address.port}`, apiKey: "test-key", model: "test-model", system: "x", prompt: "x" }))
      .rejects.toThrow("Model gateway returned HTTP 401");
  });
});
