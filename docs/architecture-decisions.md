# Architecture Decisions

## AD-01 — Phase A baseline

Decision: use Vue 3/TypeScript, Node.js/TypeScript, PostgreSQL, and deterministic orchestration. Add Python analysis only in Phase B.

Consequences: the application remains runnable without paid APIs or an LLM adapter. Manual ChatGPT JSON/text exchange is persisted and validated separately.

## AD-02 — Repository boundaries

Decision: use one repository with `apps/*`, `packages/*`, `services/*`, `db/migrations`, `tests/fixtures`, and `docs`.

Consequences: module ownership stays explicit and deployment begins as separately running local processes.

## AD-03 — Data and execution restrictions

Decision: Kite/other licensed portfolio inputs may not feed virtual or mock trading under the current documented terms. Synthetic mode is the default development and test feed.

Consequences: broker live acceptance is separate from paper-execution acceptance, and source-use permissions must be checked before data use.

## AD-04 — Local deployment

Decision: bind to loopback, keep secrets in ignored server configuration, use PostgreSQL durable jobs, and use local artifact storage.

Consequences: Phase A has ₹0 cloud cost and no domain prerequisite. PostgreSQL availability remains a foundation dependency.

## AD-05 — Financial and temporal invariants

Decision: use decimal-safe money/quantity handling, UTC storage, Asia/Kolkata display, effective-dated instrument contracts, append-only financial corrections, and immutable research payloads.

Consequences: chart, portfolio, replay, and research histories preserve provenance rather than silently replacing values.

## AD-06 — Instrument identity and data-use gates

Decision: keep a canonical instrument separate from dated exchange listings, provider mappings, and option specifications. Store source-use decisions as explicit permitted/prohibited/unresolved records rather than inferring rights from a source name.

Consequences: symbol changes retain history, an expired mapping cannot resolve to a new identity, historical option lots replay accurately, and downstream paper/AI workflows can reject prohibited or unresolved source use.
