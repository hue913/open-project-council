# Open Project Council architecture

## Trust boundaries

- GitHub OAuth uses PKCE and state validation. The Worker stores only a hash of the HttpOnly session token; its GitHub access token is an encrypted user credential and never reaches browser JavaScript.
- Every request that names a project checks a `viewer` / `editor` / `owner` membership before loading data or creating side effects. Credentials have an explicit user or project owner and are never returned in a response.
- A cloud envelope secret is decrypted only by the Worker immediately before a permitted provider call. The state seam supports encrypted local files and PostgreSQL. `LocalEnvelopeCipher` is restricted to private self-hosting; Vault Transit is the KMS adapter for public deployments.
- The desktop bridge makes outbound requests only. A one-time pairing code creates a bridge token held in the operating-system keychain; the Worker can queue a job but cannot initiate a connection to the user's computer.
- Project content is private by default. Publishing creates a separate, revocable snapshot with redaction scanning; it never changes the source project's visibility.

## Run lifecycle

`independent → critique → decision → execution → verification → complete`

Only the declared transitions are valid. A failed phase ends the run with `error`; a disagreement becomes an unresolved risk rather than a fabricated consensus.

## Task protocols

- Math uses two independent solvers and a verifier.
- Coding uses an architect, implementer, and test/security reviewer.
- Code review, security audit, research, data analysis, product planning, technical writing, and web design each have their own three-seat role template.
- The Worker stores the task before a real run and reloads completed runs from its encrypted archive after restart. The browser can choose only seat IDs; it cannot inject an arbitrary provider endpoint, role, or credential into a run request.

## Connector and delivery contract

OpenAI-compatible, Anthropic Messages and Gemini `generateContent` calls use native provider request shapes. MCP uses JSON-RPC `tools/call` against a configured streamable HTTP endpoint and is allowed only when the task declares `execute`.

GitHub delivery reads the linked repository through the signed-in owner's OAuth token, creates an owner-approved branch, writes explicitly supplied files, and opens a PR. Vercel preview uses a separately encrypted project token. Production deployment is refused unless the owner includes an explicit confirmation in that same request. Each external action appends a redacted audit event.

## Deployment model

- Private self-hosted mode: Docker Compose runs Web, Worker and PostgreSQL. Web binds to loopback by default and proxies `/api` to Worker.
- Public deployment mode: PostgreSQL, Vault Transit, HTTPS termination, rate limiting and backups are deployment prerequisites. The Worker health response reports `productionReady: false` until database and Vault mode are configured.
