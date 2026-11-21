# Development guidelines

Run `npm run check`, `npm test`, and `npm run build` before handoff. Apply migrations through `npm run migrate` with `DATABASE_URL` set. Use an isolated temporary database for database-backed smoke tests.

Do not commit credentials, broker tokens, personal exports, or licensed datasets. Preserve existing migrations and user changes. New owner data must enforce `owner_id`; mutating operations should be idempotent where retries are expected. Never label synthetic/manual data as live, and do not claim external-provider acceptance without running it.
