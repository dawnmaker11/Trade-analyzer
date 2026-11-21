import { describe, expect, it } from 'vitest';
import { summarizeSyntheticPerformance } from '../src/paper.js';

describe('synthetic paper performance', () => {
  it('uses FIFO lots and keeps open positions at cost without inventing a market mark', () => {
    const summary = summarizeSyntheticPerformance([
      { instrumentId: 'a', symbol: 'AAA', side: 'buy', quantity: 2, fillPrice: 100, fee: 2, filledAt: '2026-01-01T09:15:00.000Z' },
      { instrumentId: 'a', symbol: 'AAA', side: 'buy', quantity: 1, fillPrice: 120, fee: 0, filledAt: '2026-01-02T09:15:00.000Z' },
      { instrumentId: 'a', symbol: 'AAA', side: 'sell', quantity: 2, fillPrice: 110, fee: 2, filledAt: '2026-01-03T09:15:00.000Z' }
    ]);
    expect(summary.realisedPnl).toBe(16);
    expect(summary.closedQuantity).toBe(2);
    expect(summary.positions).toEqual([{ instrumentId: 'a', symbol: 'AAA', quantity: 1, cost: 120 }]);
  });
});
