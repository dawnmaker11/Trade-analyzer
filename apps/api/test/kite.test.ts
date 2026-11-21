import { describe, expect, it } from 'vitest';
import { kiteLoginUrl } from '../src/brokers.js';

describe('Kite hosted-login URL', () => {
  it('uses the documented v3 endpoint and forwards only the opaque callback state', () => {
    const url = new URL(kiteLoginUrl('api-key', 'opaque-state'));
    expect(url.origin + url.pathname).toBe('https://kite.zerodha.com/connect/login');
    expect(url.searchParams.get('v')).toBe('3');
    expect(url.searchParams.get('api_key')).toBe('api-key');
    expect(url.searchParams.get('redirect_params')).toBe('state=opaque-state');
  });
});
