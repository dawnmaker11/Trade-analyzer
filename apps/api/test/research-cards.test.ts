import { describe, expect, it } from 'vitest';
import { calculatePeriodReturn } from '../src/research-cards.js';

describe('research cards', () => {
  it('calculates a bounded return from supplied observations only', () => {
    expect(calculatePeriodReturn([{ timestamp: '2026-11-02T09:15:00.000Z', close: 100 }, { timestamp: '2026-11-20T09:15:00.000Z', close: 110 }])).toMatchObject({ percent: 10, startClose: 100, endClose: 110 });
    expect(calculatePeriodReturn([{ timestamp: '2026-11-20T09:15:00.000Z', close: 110 }])).toBeNull();
  });
});
