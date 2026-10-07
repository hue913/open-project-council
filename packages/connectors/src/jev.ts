export interface JevDecisionRequest {
  endpoint: string;
  apiKey?: string;
  model: string;
  state: Array<string | { image: string }>;
  question: string;
  options: string[];
  signal?: AbortSignal;
}

export interface JevDecisionResult {
  probabilities: Record<string, number>;
  selected: string;
  raw?: unknown;
}

type JevResponse = {
  probabilities?: Record<string, number>;
  probs?: Record<string, number>;
  scores?: Record<string, number>;
  choice?: string;
  selected?: string;
  result?: { probabilities?: Record<string, number>; choice?: string };
};

function endpointFor(value: string) {
  const endpoint = new URL(value);
  if (!/^https?:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid JEV endpoint");
  return `${endpoint.toString().replace(/\/$/, "")}/v1/decide`;
}

export async function createJevDecision(request: JevDecisionRequest): Promise<JevDecisionResult> {
  if (request.options.length < 2 || request.options.length > 256) throw new Error("JEV requires between 2 and 256 options");
  const response = await fetch(endpointFor(request.endpoint), {
    method: "POST",
    headers: {
      ...(request.apiKey ? { authorization: `Bearer ${request.apiKey}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: request.model, kind: "choice", state: request.state, question: request.question, options: request.options }),
    signal: request.signal,
  });
  if (!response.ok) throw new Error(`JEV gateway returned HTTP ${response.status}`);
  const payload = await response.json() as JevResponse;
  const probabilities = payload.probabilities ?? payload.probs ?? payload.scores ?? payload.result?.probabilities;
  if (!probabilities || typeof probabilities !== "object") throw new Error("JEV gateway returned no probabilities");
  const normalized = Object.fromEntries(request.options.map((option) => {
    const value = Number(probabilities[option] ?? 0);
    return [option, Number.isFinite(value) && value >= 0 ? value : 0];
  }));
  const selected = payload.selected ?? payload.choice ?? payload.result?.choice ?? Object.entries(normalized).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!selected) throw new Error("JEV gateway returned no selected option");
  if (!request.options.includes(selected)) throw new Error("JEV gateway selected an option outside the candidate list");
  return { probabilities: normalized, selected, raw: payload };
}
