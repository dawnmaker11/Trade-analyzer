# Project architecture

Trade is a loopback-only Vue/TypeScript web app, Fastify/TypeScript API, PostgreSQL database, and Node worker. The API owns mutations; the web app uses authenticated HTTP-only sessions. Shared contracts/configuration are in `packages/contracts`.

Phase A uses manual, synthetic, and explicitly imported data. Broker fixtures and local research exchange preserve the interfaces needed for later provider activation. Provider credentials, licensed data, and model adapters remain external activation dependencies.

Core safety rules: every owned record is server-scoped by `owner_id`; secrets remain server-side; source use is explicitly permitted/prohibited/unresolved; raw trades and imported research are preserved rather than overwritten; synthetic execution is isolated from broker inputs.
