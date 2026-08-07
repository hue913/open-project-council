import type { AgentSeat } from "@open-project-council/core";
import type { EncryptedSecret } from "@open-project-council/core/envelope";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface PersistedWorkerState {
  version: 3;
  seats: AgentSeat[];
  credentials: Record<string, EncryptedSecret>;
  workspace?: EncryptedSecret;
  sessions?: Array<{ id: string; userId: string; tokenHash: string; expiresAt: string; createdAt: string }>;
}

export interface WorkerStateStore {
  load(): Promise<PersistedWorkerState>;
  save(state: PersistedWorkerState): Promise<void>;
}

export const emptyState = (): PersistedWorkerState => ({ version: 3, seats: [], credentials: {}, sessions: [] });

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
  if ((candidate.version !== 1 && candidate.version !== 2 && candidate.version !== 3) || !Array.isArray(candidate.seats) || !candidate.credentials || typeof candidate.credentials !== "object") {
    throw new Error("Worker state has an unsupported format");
  }
  if (!candidate.seats.every(isAgentSeat) || !Object.values(candidate.credentials).every(isEncryptedSecret) || (candidate.workspace !== undefined && !isEncryptedSecret(candidate.workspace))) {
    throw new Error("Worker state contains invalid records");
  }
  const sessions = candidate.sessions === undefined ? [] : candidate.sessions;
  if (!Array.isArray(sessions) || sessions.some((session) => !session || typeof session !== "object" || typeof (session as Record<string, unknown>).id !== "string" || typeof (session as Record<string, unknown>).userId !== "string" || typeof (session as Record<string, unknown>).tokenHash !== "string" || typeof (session as Record<string, unknown>).expiresAt !== "string" || typeof (session as Record<string, unknown>).createdAt !== "string")) {
    throw new Error("Worker state contains invalid sessions");
  }
  return {
    version: 3,
    seats: candidate.seats,
    credentials: candidate.credentials as Record<string, EncryptedSecret>,
    workspace: candidate.workspace as EncryptedSecret | undefined,
    sessions: sessions as PersistedWorkerState["sessions"],
  };
}

export class EncryptedStateStore implements WorkerStateStore {
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

/**
 * One encrypted state document in PostgreSQL keeps the persistence seam small
 * while allowing self-hosted deployments to use managed backups and HA storage.
 * Domain data inside `workspace` remains envelope encrypted before it reaches DB.
 */
export class PostgresStateStore implements WorkerStateStore {
  private pool: import("pg").Pool | undefined;

  constructor(private readonly databaseUrl: string) {}

  private async client() {
    if (!this.pool) {
      const { Pool } = await import("pg");
      this.pool = new Pool({ connectionString: this.databaseUrl, max: 4 });
      await this.pool.query("CREATE TABLE IF NOT EXISTS council_state (id SMALLINT PRIMARY KEY CHECK (id = 1), payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    }
    return this.pool;
  }

  async load(): Promise<PersistedWorkerState> {
    const pool = await this.client();
    const result = await pool.query<{ payload: unknown }>("SELECT payload FROM council_state WHERE id = 1");
    if (result.rowCount === 0) return emptyState();
    return parseState(JSON.stringify(result.rows[0].payload));
  }

  async save(state: PersistedWorkerState): Promise<void> {
    const pool = await this.client();
    await pool.query(
      "INSERT INTO council_state (id, payload, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()",
      [JSON.stringify(state)],
    );
  }
}
