import type { AgentSeat } from "@open-project-council/core";
import type { EncryptedSecret } from "@open-project-council/core/envelope";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface PersistedWorkerState {
  version: 1;
  seats: AgentSeat[];
  credentials: Record<string, EncryptedSecret>;
}

const emptyState = (): PersistedWorkerState => ({ version: 1, seats: [], credentials: {} });

function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["ciphertext", "iv", "tag", "keyId"].every((key) => typeof candidate[key] === "string");
}

function isAgentSeat(value: unknown): value is AgentSeat {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && typeof candidate.projectId === "string"
    && typeof candidate.name === "string"
    && typeof candidate.kind === "string"
    && typeof candidate.provider === "string"
    && Array.isArray(candidate.roles)
    && Array.isArray(candidate.capabilities)
    && typeof candidate.credentialSource === "string"
    && typeof candidate.enabled === "boolean";
}

function parseState(input: string): PersistedWorkerState {
  const value = JSON.parse(input) as unknown;
  if (!value || typeof value !== "object") throw new Error("Worker state is invalid");
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || !Array.isArray(candidate.seats) || !candidate.credentials || typeof candidate.credentials !== "object") {
    throw new Error("Worker state has an unsupported format");
  }
  if (!candidate.seats.every(isAgentSeat) || !Object.values(candidate.credentials).every(isEncryptedSecret)) {
    throw new Error("Worker state contains invalid records");
  }
  return {
    version: 1,
    seats: candidate.seats,
    credentials: candidate.credentials as Record<string, EncryptedSecret>,
  };
}

export class EncryptedStateStore {
  constructor(private readonly path: string) {}

  async load(): Promise<PersistedWorkerState> {
    try {
      return parseState(await readFile(this.path, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async save(state: PersistedWorkerState): Promise<void> {
    const directory = dirname(this.path);
    const temporaryPath = `${this.path}.next`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, this.path);
  }
}
