import type { PublicSnapshot, PublicSnapshotSelection } from "./types.js";

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/g,
  /(?:xox[baprs]-)[A-Za-z0-9-]{10,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /(?:api[_-]?key|authorization|token)\s*[:=]\s*(?!\[REDACTED\])[^\s,;]+/gi,
];

export function redactSensitiveText(input: string): { value: string; redactionCount: number } {
  let value = input;
  let redactionCount = 0;
  for (const pattern of secretPatterns) {
    value = value.replace(pattern, () => {
      redactionCount += 1;
      return "[REDACTED]";
    });
  }
  return { value, redactionCount };
}

export function createPublicSnapshot(input: {
  id: string;
  projectId: string;
  slug: string;
  selection: PublicSnapshotSelection;
  rawContent: Record<string, string>;
}): PublicSnapshot {
  const content: Record<string, string> = {};
  let redactionCount = 0;
  for (const [key, rawValue] of Object.entries(input.rawContent)) {
    const result = redactSensitiveText(rawValue);
    content[key] = result.value;
    redactionCount += result.redactionCount;
  }
  return {
    id: input.id,
    projectId: input.projectId,
    slug: input.slug,
    selection: input.selection,
    content,
    redactionCount,
    publishedAt: new Date().toISOString(),
  };
}

export function canPublish(selection: PublicSnapshotSelection): boolean {
  return Object.values(selection).some(Boolean);
}
