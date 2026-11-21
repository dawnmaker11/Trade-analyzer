export interface Candle { open: number; high: number; low: number; close: number; volume?: number; timestamp: string; }
export function validateCandle(value: Candle): string[] {
  const errors: string[] = []; if (!Number.isFinite(value.open) || !Number.isFinite(value.high) || !Number.isFinite(value.low) || !Number.isFinite(value.close)) errors.push('OHLC values must be finite');
  if ([value.open, value.high, value.low, value.close].some((price) => price < 0)) errors.push('Prices cannot be negative');
  if (value.low > Math.min(value.open, value.close) || value.high < Math.max(value.open, value.close) || value.low > value.high) errors.push('Candle range does not contain open and close');
  if (value.volume !== undefined && (!Number.isFinite(value.volume) || value.volume < 0)) errors.push('Volume cannot be negative');
  if (Number.isNaN(Date.parse(value.timestamp))) errors.push('Timestamp is invalid'); return errors;
}
