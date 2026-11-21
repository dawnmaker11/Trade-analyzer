# Epic 3 catalogue API

All endpoints require the local owner session.

- `POST /api/instruments/catalogue-imports` imports either CSV text or row objects. It requires `sourceKey`, `sourceName`, `sourceAsOf`, and `sourceMode`; `exchange`, `symbol`, and `name` are mandatory columns.
- `GET /api/instruments?query=&asOf=YYYY-MM-DD` searches active listings as of a date.
- `GET /api/instruments/provider/:provider/:key?asOf=YYYY-MM-DD` resolves only a date-valid provider mapping.
- `POST /api/options/contracts` and `GET /api/options/contracts/resolve` store/resolve exact options with effective lot and tick sizes.
- `PUT`/`GET /api/exchange-calendars/:exchange/:date` record or read explicit calendar days. Unknown is returned as unknown, not assumed.
- `GET /api/data-sources` and `GET /api/data-sources/:sourceKey/usage/:useCase` expose data-use policy decisions.
- `POST /api/dataset-acceptance-reports` records coverage and rights limitations; `POST /api/instruments/unresolved` preserves manual records that must be resolved before broker reconciliation.

The UI uses only the search/import APIs. It never calls a market-data endpoint.
