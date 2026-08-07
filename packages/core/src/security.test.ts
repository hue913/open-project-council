import { describe, expect, it } from "vitest";
import { canPublish, createPublicSnapshot, redactSensitiveText } from "./index.js";
import { LocalEnvelopeCipher } from "./envelope.js";

describe("security boundaries", () => {
  it("redacts common API credentials before public output", () => {
    const testKey = ["sk", "abcdefghijklmnopqrstuvwxyz0123456789"].join("-");
    const result = redactSensitiveText(`OPENAI_API_KEY=${testKey}`);
    expect(result.value).toContain("[REDACTED]");
    expect(result.value).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });

  it("round trips a secret without exposing plaintext in the envelope", () => {
    const cipher = new LocalEnvelopeCipher(Buffer.alloc(32, 7));
    const encrypted = cipher.encrypt("keep-this-private");
    expect(encrypted.ciphertext).not.toContain("keep-this-private");
    expect(cipher.decrypt(encrypted)).toBe("keep-this-private");
  });

  it("creates a redacted, opt-in snapshot", () => {
    const selection = { includeTask: true, includeDecision: false, includeCode: false, includePreview: false, includeDiscussionSummary: false };
    const testKey = ["sk", "abcdefghijklmnopqrstuvwx"].join("-");
    expect(canPublish(selection)).toBe(true);
    const snapshot = createPublicSnapshot({ id: "s", projectId: "p", slug: "demo", selection, rawContent: { task: `token=${testKey}` } });
    expect(snapshot.content.task).toContain("[REDACTED]");
    expect(snapshot.redactionCount).toBe(1);
  });
});
