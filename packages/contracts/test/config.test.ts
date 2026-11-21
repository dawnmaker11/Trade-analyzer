import { describe, expect, it } from 'vitest';
import { loadConfig, utcNow } from '../src/config.js';

describe('configuration and time foundation', () => {
  it('defaults to manual without real credentials', () => {
    const config = loadConfig({});
    expect(config.mode).toBe('manual');
    expect(config.exchangeTimezone).toBe('Asia/Kolkata');
    expect(config.capabilities.liveBroker).toBe(false);
    expect(config.capabilities.automaticAgents).toBe(false);
  });

  it('rejects invalid ports', () => {
    expect(() => loadConfig({ API_PORT: 'not-a-port' })).toThrow('Invalid port');
  });

  it('can advance a UTC clock deterministically', () => {
    const fixed = new Date('2026-11-19T09:15:00Z');
    expect(utcNow(() => fixed).toISOString()).toBe(fixed.toISOString());
  });
});
