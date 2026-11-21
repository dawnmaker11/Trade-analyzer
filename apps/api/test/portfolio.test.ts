import { describe, expect, it } from 'vitest';
import { applyCorporateActions, fifoValuation } from '../src/portfolio.js';

describe('Epic 5 FIFO accounting', () => {
  it('reconciles repeat purchases, a partial sale, and current valuation', () => {
    const result = fifoValuation([
      { tradeId: '1', type: 'buy', quantity: 10, price: 100, fees: 10, date: '2026-01-01' },
      { tradeId: '2', type: 'buy', quantity: 10, price: 120, fees: 0, date: '2026-01-02' },
      { tradeId: '3', type: 'sell', quantity: 12, price: 130, fees: 12, date: '2026-01-03' }
    ], 125, '2026-01-04T09:15:00Z');
    expect(result).toMatchObject({ quantity: 8, cost: 960, realisedPnl: 298, marketValue: 1000, unrealisedPnl: 40 });
  });
  it('rejects sales that exceed owned quantity and leaves missing price unavailable', () => {
    expect(() => fifoValuation([{ tradeId: '1', type: 'sell', quantity: 1, price: 100, fees: 0, date: '2026-01-01' }])).toThrow('exceeds');
    expect(fifoValuation([], undefined)).toMatchObject({ marketValue: null, unrealisedPnl: null, priceAsOf: null });
  });
  it('adjusts derived lots for splits without overwriting raw trades', () => {
    const raw = [{ tradeId: '1', type: 'buy' as const, quantity: 10, price: 100, fees: 0, date: '2026-01-01' }];
    const adjusted = applyCorporateActions(raw, [{ type: 'split', numerator: 2, denominator: 1, effectiveOn: '2026-02-01' }]);
    expect(raw[0]).toMatchObject({ quantity: 10, price: 100 });
    expect(adjusted[0]).toMatchObject({ quantity: 20, price: 50 });
  });
});
