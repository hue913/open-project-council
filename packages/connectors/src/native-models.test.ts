import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnthropicMessage } from "./anthropic.js";
import { createGeminiContent } from "./gemini.js";

afterEach(() => vi.unstubAllGlobals());

describe("native model connectors", () => {
  it("uses Anthropic Messages and returns text blocks only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "Independent proposal" }], usage: { input_tokens: 12, output_tokens: 7 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createAnthropicMessage({ apiKey: "secret", model: "claude-test", system: "system", prompt: "prompt" })).resolves.toEqual({ content: "Independent proposal", inputTokens: 12, outputTokens: 7 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers).toMatchObject({ "x-api-key": "secret", "anthropic-version": "2023-06-01" });
  });

  it("uses Gemini generateContent without putting the key in logged request content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Verified result" }] } }], usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 4 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createGeminiContent({ apiKey: "secret", model: "gemini-test", system: "system", prompt: "prompt" })).resolves.toEqual({ content: "Verified result", inputTokens: 9, outputTokens: 4 });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("models/gemini-test:generateContent?key=secret");
  });
});
