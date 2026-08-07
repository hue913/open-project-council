import type { NativeModelResult } from "./anthropic.js";

export interface GeminiRequest {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  endpoint?: string;
  signal?: AbortSignal;
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export async function createGeminiContent(request: GeminiRequest): Promise<NativeModelResult> {
  const endpoint = new URL(request.endpoint ?? "https://generativelanguage.googleapis.com/v1beta");
  if (!/^https:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid Gemini endpoint");
  const model = encodeURIComponent(request.model);
  const response = await fetch(`${endpoint.toString().replace(/\/$/, "")}/models/${model}:generateContent?key=${encodeURIComponent(request.apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
    signal: request.signal,
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  const payload = await response.json() as GeminiResponse;
  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part.text === "string" ? part.text : "")
    .join("\n")
    .trim();
  if (!content) throw new Error("Gemini returned no text response");
  return {
    content,
    inputTokens: payload.usageMetadata?.promptTokenCount,
    outputTokens: payload.usageMetadata?.candidatesTokenCount,
  };
}
