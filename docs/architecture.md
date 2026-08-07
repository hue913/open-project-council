# Open Project Council architecture

## Trust boundaries

- The browser holds no cloud provider secret after setup; it sends provider setup requests to the local Worker through the Web proxy. Authentication is not implemented in the Alpha, so it is for a single trusted owner only.
- A cloud envelope secret is decrypted only by the Worker immediately before a permitted provider call. Encrypted seat state is written to `WORKER_DATA_PATH`; the reference `LocalEnvelopeCipher` is a local adapter, not a KMS replacement.
- The desktop bridge makes outbound connections only. It discovers locally authenticated Codex / Claude Code commands without reading or uploading their credentials.
- Project content is private by default. Publishing creates a separate, revocable snapshot with redaction scanning; it never changes the source project's visibility.

## Run lifecycle

`independent → critique → decision → execution → verification → complete`

Only the declared transitions are valid. A failed phase ends the run with `error`; a disagreement becomes an unresolved risk rather than a fabricated consensus.

## Connector contract

Every cloud model, local coding agent and MCP tool implements `AgentConnector` from `packages/core`. The Worker is responsible for rate limits, retries, audit events and redaction. Connector implementations must request only the permissions required by their run.

## Deployment model

- Self-hosted Alpha: Docker Compose runs a Web static server and an internal Worker. The Web service binds to loopback by default and proxies `/api` to the Worker.
- Future hosted edition: a web/API service, a Worker pool, authenticated project storage and a KMS/Vault provider replace the local data volume.
- Future delivery integration: GitHub changes go through an authorized branch / PR; Vercel preview may be automatic, production deployment always requires the owner confirmation recorded in the audit trail.
