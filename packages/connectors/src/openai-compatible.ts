export interface OpenAICompatibleRequest {
  endpoint: string;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  signal?: AbortSignal;
}

export interface OpenAICompatibleResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export async function createOpenAICompatibleCompletion(request: OpenAICompatibleRequest): Promise<OpenAICompatibleResult> {
  const endpoint = new URL(request.endpoint);
  if (!/^https?:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid model endpoint");
  const completionUrl = `${endpoint.toString().replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(completionUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${request.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
    }),
    signal: request.signal,
  });
  if (!response.ok) throw new Error(`Model gateway returned HTTP ${response.status}`);
  const payload = await response.json() as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Model gateway returned no text response");
  return {
    content: content.trim(),
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
  };
}
