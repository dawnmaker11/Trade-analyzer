import { describe, expect, it } from 'vitest';
import { validateCandle } from '../src/market.js';
describe('Epic 6 market validation', () => { it('rejects malformed candle ranges and negative prices', () => { expect(validateCandle({ open: 100, high: 99, low: 98, close: 101, timestamp: '2026-01-01T09:15:00Z' })).toHaveLength(1); expect(validateCandle({ open: -1, high: 2, low: -1, close: 1, timestamp: 'bad' }).length).toBeGreaterThan(1); }); });
