import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EncryptedStateStore } from "./state-store.js";

let testDirectory: string | undefined;

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = undefined;
});

describe("encrypted Worker state store", () => {
  it("persists only the provided encrypted credential records", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "council-worker-"));
    const path = join(testDirectory, "worker-state.json");
    const store = new EncryptedStateStore(path);
    const state = {
      version: 1 as const,
      seats: [{ id: "seat-1", projectId: "project-1", name: "Model", kind: "cloud_model" as const, provider: "openai", roles: ["架构师"], capabilities: ["read" as const], credentialSource: "cloud_envelope" as const, credentialId: "credential-1", enabled: true }],
      credentials: { "credential-1": { ciphertext: "encrypted-value", iv: "iv", tag: "tag", keyId: "local" } },
    };

    await store.save(state);

    expect(await store.load()).toEqual(state);
    expect(await readFile(path, "utf8")).not.toContain("plaintext-api-key");
  });

  it("rejects a malformed state instead of silently discarding it", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "council-worker-"));
    const path = join(testDirectory, "worker-state.json");
    const store = new EncryptedStateStore(path);
    await writeFile(path, "{invalid", "utf8");

    await expect(store.load()).rejects.toThrow();
  });
});
