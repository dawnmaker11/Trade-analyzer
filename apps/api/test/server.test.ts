import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

process.env.TRADE_MODE = 'synthetic';

describe('Epic 1 and Epic 2 API foundation', () => {
  it('returns synthetic health and capabilities', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.mode).toBe('synthetic');
    expect(body.capabilities.automaticAgents).toBe(false);
  });

  it('rejects malformed event envelopes visibly', async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: 'POST', url: '/api/contracts/validate', payload: { schema_version: '1' }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('rejects protected settings without authentication', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/settings' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects protected owned records without authentication', async () => {
    const app = await buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/owned/portfolios/00000000-0000-4000-8000-000000000099' });
    expect(response.statusCode).toBe(401);
  });

  it('accepts a valid event envelope', async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: 'POST', url: '/api/contracts/validate', payload: {
        event_id: '00000000-0000-4000-8000-000000000001',
        schema_version: '1.0',
        occurred_at: '2026-11-19T09:15:00Z',
        received_at: '2026-11-19T09:15:01Z',
        source_id: 'synthetic-feed',
        mode: 'synthetic'
      }
    });
    expect(response.statusCode).toBe(200);
  });
});
