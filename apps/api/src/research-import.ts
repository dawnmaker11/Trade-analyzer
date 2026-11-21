import { z } from 'zod';

const timestamp = z.string().datetime();

export const manualResearchImportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  requestId: z.string().uuid(),
  requestVersion: z.number().int().positive(),
  instrumentId: z.string().uuid(),
  analysisAt: timestamp,
  horizonStart: timestamp,
  horizonEnd: timestamp,
  dataAsOf: timestamp.nullable(),
  authorType: z.literal('manual_chatgpt_import'),
  summary: z.string().trim().min(1).max(12_000),
  factors: z.array(z.object({
    text: z.string().trim().min(1).max(2_000),
    evidenceIds: z.array(z.string().min(1)).max(30),
    direction: z.enum(['positive', 'negative', 'mixed', 'unknown']),
    kind: z.enum(['observed_fact', 'interpretation'])
  })).max(50).default([]),
  scenarios: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    entry: z.coerce.number().nonnegative().nullable().optional(),
    target: z.coerce.number().nonnegative().nullable().optional(),
    invalidation: z.coerce.number().nonnegative().nullable().optional(),
    units: z.string().trim().min(1).max(40),
    conditions: z.array(z.string().trim().min(1).max(1_000)).max(20).default([]),
    evidenceIds: z.array(z.string().min(1)).max(30).default([]),
    probability: z.coerce.number().min(0).max(1).nullable().optional()
  })).max(30).default([]),
  evidence: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(1_000),
    url: z.string().url().max(4_000),
    publishedAt: timestamp.nullable().optional(),
    retrievedAt: timestamp,
    excerpt: z.string().trim().min(1).max(3_000)
  })).max(100).default([]),
  contradictions: z.array(z.string().trim().min(1).max(2_000)).max(50).default([]),
  missingInputs: z.array(z.string().trim().min(1).max(500)).max(50).default([])
}).superRefine((value, context) => {
  if (value.horizonEnd < value.horizonStart) context.addIssue({ code: 'custom', path: ['horizonEnd'], message: 'Horizon end must not precede horizon start.' });
  const ids = new Set<string>();
  for (const [index, evidence] of value.evidence.entries()) {
    if (ids.has(evidence.id)) context.addIssue({ code: 'custom', path: ['evidence', index, 'id'], message: 'Evidence IDs must be unique.' });
    ids.add(evidence.id);
  }
  const checkReferences = (references: string[], path: (string | number)[]) => {
    for (const reference of references) if (!ids.has(reference)) context.addIssue({ code: 'custom', path, message: `Evidence reference ${reference} is not present in this import.` });
  };
  value.factors.forEach((factor, index) => checkReferences(factor.evidenceIds, ['factors', index, 'evidenceIds']));
  value.scenarios.forEach((scenario, index) => checkReferences(scenario.evidenceIds, ['scenarios', index, 'evidenceIds']));
});

export type ManualResearchImport = z.infer<typeof manualResearchImportSchema>;
