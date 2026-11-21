import { describe, expect, it } from 'vitest';
import { catalogueRow, checksum, parseCsv } from '../src/catalogue.js';

describe('Epic 3 catalogue primitives', () => {
  it('parses reviewed CSV values, including quoted company names', () => {
    const rows = parseCsv('exchange,symbol,name,isin\nNSE,TATASTEEL,"Tata Steel, Limited",INE081A01020\n');
    expect(rows).toEqual([{ exchange: 'NSE', symbol: 'TATASTEEL', name: 'Tata Steel, Limited', isin: 'INE081A01020' }]);
    expect(catalogueRow(rows[0])).toMatchObject({ exchange: 'NSE', symbol: 'TATASTEEL', name: 'Tata Steel, Limited' });
  });

  it('rejects incomplete catalogue rows and malformed CSV', () => {
    expect(() => catalogueRow({ exchange: 'NSE', symbol: '', name: 'Tata Steel' })).toThrow('exchange, symbol, and name');
    expect(() => parseCsv('exchange,symbol,name\nNSE,TATASTEEL,"unclosed')).toThrow('unclosed');
  });

  it('produces stable content checksums for idempotent imports', () => {
    expect(checksum('exchange,symbol,name\nNSE,TATASTEEL,Tata Steel\n')).toBe(checksum('exchange,symbol,name\nNSE,TATASTEEL,Tata Steel\n'));
    expect(checksum('one')).not.toBe(checksum('two'));
  });
});
