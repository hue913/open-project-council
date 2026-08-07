export interface AnthropicRequest {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  endpoint?: string;
  signal?: AbortSignal;
}

export interface NativeModelResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: unknown }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export async function createAnthropicMessage(request: AnthropicRequest): Promise<NativeModelResult> {
  const endpoint = new URL(request.endpoint ?? "https://api.anthropic.com");
  if (!/^https:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid Anthropic endpoint");
  const response = await fetch(`${endpoint.toString().replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: 4096,
      temperature: 0.2,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
    }),
    signal: request.signal,
  });
  if (!response.ok) throw new Error(`Anthropic returned HTTP ${response.status}`);
  const payload = await response.json() as AnthropicResponse;
  const content = payload.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
  if (!content) throw new Error("Anthropic returned no text response");
  return { content, inputTokens: payload.usage?.input_tokens, outputTokens: payload.usage?.output_tokens };
}
