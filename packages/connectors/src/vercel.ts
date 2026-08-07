import type { DeliveryResult } from "@open-project-council/core";

export interface VercelPreviewRequest {
  token: string;
  repository: string;
  ref: string;
  projectName?: string;
  teamId?: string;
  target?: "preview" | "production";
}

export async function createVercelPreview(request: VercelPreviewRequest): Promise<DeliveryResult> {
  const [org, repo] = request.repository.split("/");
  if (!org || !repo) throw new Error("Vercel preview requires a GitHub repository in owner/name format");
  const query = request.teamId ? `?teamId=${encodeURIComponent(request.teamId)}` : "";
  const response = await fetch(`https://api.vercel.com/v13/deployments${query}`, {
    method: "POST",
    headers: { authorization: `Bearer ${request.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      name: request.projectName,
      ...(request.target === "production" ? { target: "production" } : {}),
      gitSource: { type: "github", org, repo, ref: request.ref },
    }),
  });
  if (!response.ok) throw new Error(`Vercel returned HTTP ${response.status}`);
  const deployment = await response.json() as { id?: string; url?: string };
  if (!deployment.id || !deployment.url) throw new Error("Vercel returned an invalid deployment");
  return { kind: "vercel_preview", id: deployment.id, url: `https://${deployment.url}` };
}
