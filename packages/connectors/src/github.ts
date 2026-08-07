import type { DeliveryResult, GitHubPullRequestRequest } from "@open-project-council/core";

async function github<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

type RefResponse = { object: { sha: string } };
type CommitResponse = { sha: string; tree: { sha: string } };
type ContentResponse = { content?: string; sha?: string };
type PullResponse = { number: number; html_url: string };

export async function createGitHubPullRequest(token: string, request: GitHubPullRequestRequest): Promise<DeliveryResult> {
  const repository = request.repository.split("/");
  if (repository.length !== 2 || repository.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) throw new Error("GitHub repository must be owner/name");
  const [owner, name] = repository;
  const api = `/repos/${owner}/${name}`;
  const base = await github<RefResponse>(token, `${api}/git/ref/heads/${encodeURIComponent(request.baseBranch)}`);
  await github(token, `${api}/git/refs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${request.branch}`, sha: base.object.sha }),
  });
  for (const change of request.changes) {
    if (!change.path || change.path.startsWith("/") || change.path.includes("..") || change.content.length > 1_000_000) throw new Error("Invalid GitHub file change");
    let existing: ContentResponse | undefined;
    try { existing = await github<ContentResponse>(token, `${api}/contents/${change.path}?ref=${encodeURIComponent(request.branch)}`); } catch { /* New file. */ }
    await github(token, `${api}/contents/${change.path}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: `council: update ${change.path}`,
        content: Buffer.from(change.content, "utf8").toString("base64"),
        branch: request.branch,
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
    });
  }
  const pull = await github<PullResponse>(token, `${api}/pulls`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: request.title, body: request.body, head: request.branch, base: request.baseBranch }),
  });
  return { kind: "github_pr", id: pull.number, url: pull.html_url };
}

export async function getGitHubRepository(token: string, fullName: string): Promise<{ defaultBranch: string }> {
  const repository = fullName.split("/");
  if (repository.length !== 2) throw new Error("GitHub repository must be owner/name");
  return github<{ default_branch: string }>(token, `/repos/${repository[0]}/${repository[1]}`).then((item) => ({ defaultBranch: item.default_branch }));
}
