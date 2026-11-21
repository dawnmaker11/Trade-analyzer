import crypto from 'node:crypto';

export const catalogueModes = ['manual', 'synthetic', 'licensed'] as const;
export type CatalogueMode = typeof catalogueModes[number];

export interface CatalogueRow {
  exchange: string;
  symbol: string;
  name: string;
  isin?: string;
  provider?: string;
  providerInstrumentKey?: string;
  validFrom?: string;
  validTo?: string;
}

export function canonicalText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizedSymbol(value: string): string {
  return canonicalText(value).toUpperCase();
}

export function checksum(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/** A small RFC-4180 compatible parser for local reviewed catalogue uploads. */
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted value.');
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header and at least one row.');
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])));
}

export function catalogueRow(row: Record<string, string>): CatalogueRow {
  const exchange = canonicalText(row.exchange ?? '');
  const symbol = normalizedSymbol(row.symbol ?? '');
  const name = canonicalText(row.name ?? row['company name'] ?? '');
  if (!exchange || !symbol || !name) throw new Error('Each row needs exchange, symbol, and name.');
  return {
    exchange: exchange.toUpperCase(), symbol, name,
    isin: canonicalText(row.isin ?? '') || undefined,
    provider: canonicalText(row.provider ?? '') || undefined,
    providerInstrumentKey: canonicalText(row.provider_instrument_key ?? row.providerinstrumentkey ?? '') || undefined,
    validFrom: row.valid_from || undefined, validTo: row.valid_to || undefined
  };
}

export function isValidDate(value: string | undefined): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}
