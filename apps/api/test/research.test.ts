import { describe, expect, it } from 'vitest'; import { canTransition } from '../src/research.js';
describe('Epic 9 research states', () => { it('allows only auditable forward transitions', () => { expect(canTransition('DRAFT','READY_TO_EXPORT')).toBe(true); expect(canTransition('ACCEPTED','DRAFT')).toBe(false); expect(canTransition('VALIDATING','ACCEPTED')).toBe(false); }); });
