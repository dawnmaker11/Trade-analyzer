import { describe, expect, it } from 'vitest';
import { BrokerError, FixtureBrokerConnector } from '../src/brokers.js';

describe('Epic 4 broker connector contract', () => {
  it('supports the fixture connect/callback/holdings/positions/sync lifecycle', async () => {
    const broker = new FixtureBrokerConnector();
    const begin = await broker.beginConnect('http://127.0.0.1:3000/api/brokers/kite/callback');
    expect(begin.authorizationUrl).toContain('fixture.invalid');
    const session = await broker.completeCallback({ state: begin.state, requestToken: 'fixture-token' });
    expect((await broker.sync(session)).holdings).toHaveLength(1);
    await expect(broker.getHistoricalTrades()).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
  it('surfaces rate limiting and expired callbacks safely', async () => {
    await expect(new FixtureBrokerConnector('rate_limited').getHoldings({ connectionId: 'x', expiresAt: '2099-01-01T00:00:00Z' })).rejects.toMatchObject({ code: 'RATE_LIMITED' } satisfies Partial<BrokerError>);
    await expect(new FixtureBrokerConnector().completeCallback({ state: 'wrong' })).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });
});
