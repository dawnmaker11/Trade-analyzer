import { describe, expect, it } from 'vitest';
import { manualResearchImportSchema } from '../src/research-import.js';

const valid = {
  schemaVersion: '1.0', requestId: '00000000-0000-4000-8000-000000000002', requestVersion: 1, instrumentId: '00000000-0000-4000-8000-000000000001',
  analysisAt: '2026-11-20T09:15:00.000Z', horizonStart: '2026-11-20T09:15:00.000Z', horizonEnd: '2026-12-20T09:15:00.000Z', dataAsOf: null,
  authorType: 'manual_chatgpt_import', summary: 'A conditional research summary.',
  factors: [{ text: 'Demand was reported to improve.', evidenceIds: ['e1'], direction: 'positive', kind: 'observed_fact' }],
  scenarios: [{ label: 'Base case', units: 'INR', conditions: ['No material new risk'], evidenceIds: ['e1'], probability: null }],
  evidence: [{ id: 'e1', title: 'Source', url: 'https://example.com/source', publishedAt: null, retrievedAt: '2026-11-20T09:00:00.000Z', excerpt: 'A supporting excerpt.' }],
  contradictions: [], missingInputs: ['Current market price']
};

describe('manual research import contract', () => {
  it('requires versioned, referenced, time-ordered research data', () => {
    expect(manualResearchImportSchema.safeParse(valid).success).toBe(true);
    expect(manualResearchImportSchema.safeParse({ ...valid, schemaVersion: '2.0' }).success).toBe(false);
    expect(manualResearchImportSchema.safeParse({ ...valid, factors: [{ ...valid.factors[0], evidenceIds: ['missing'] }] }).success).toBe(false);
    expect(manualResearchImportSchema.safeParse({ ...valid, horizonEnd: '2026-11-19T09:15:00.000Z' }).success).toBe(false);
  });
});
