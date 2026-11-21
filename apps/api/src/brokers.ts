export type BrokerId = 'kite' | 'angel-one' | 'upstox';
export type BrokerFailureCode = 'RATE_LIMITED' | 'SESSION_EXPIRED' | 'UNSUPPORTED' | 'UNAVAILABLE';

export class BrokerError extends Error {
  constructor(public readonly code: BrokerFailureCode, message: string) { super(message); }
}

export interface BrokerHolding { brokerInstrumentKey: string; exchange: string; symbol: string; quantity: string; averagePrice?: string; purchaseDate?: string; }
export interface BrokerPosition { brokerInstrumentKey: string; product: string; quantity: string; averagePrice?: string; }
export interface BrokerSession { connectionId: string; expiresAt: string; }
export interface BrokerConnector {
  readonly broker: BrokerId;
  beginConnect(callbackUrl: string): Promise<{ authorizationUrl: string; state: string }>;
  completeCallback(input: { state: string; requestToken?: string; error?: string }): Promise<BrokerSession>;
  getHoldings(session: BrokerSession): Promise<BrokerHolding[]>;
  getPositions(session: BrokerSession): Promise<BrokerPosition[]>;
  sync(session: BrokerSession): Promise<{ asOf: string; holdings: BrokerHolding[]; positions: BrokerPosition[] }>;
  disconnect(session: BrokerSession): Promise<void>;
  getHistoricalTrades(): Promise<never>;
}

export type FixtureMode = 'success' | 'rate_limited' | 'expired' | 'unavailable';
export class FixtureBrokerConnector implements BrokerConnector {
  readonly broker: BrokerId = 'kite';
  constructor(private readonly mode: FixtureMode = 'success') {}
  async beginConnect(callbackUrl: string) {
    if (this.mode === 'unavailable') throw new BrokerError('UNAVAILABLE', 'Fixture broker is unavailable.');
    return { authorizationUrl: `https://fixture.invalid/connect?redirect_uri=${encodeURIComponent(callbackUrl)}`, state: 'fixture-state' };
  }
  async completeCallback(input: { state: string; requestToken?: string; error?: string }) {
    if (input.error || input.state !== 'fixture-state' || !input.requestToken) throw new BrokerError('SESSION_EXPIRED', 'Broker callback was invalid or expired.');
    return { connectionId: 'fixture-kite-connection', expiresAt: this.mode === 'expired' ? '2000-01-01T00:00:00.000Z' : '2099-01-01T00:00:00.000Z' };
  }
  private assertSession(session: BrokerSession) {
    if (this.mode === 'rate_limited') throw new BrokerError('RATE_LIMITED', 'Broker rate limit reached.');
    if (this.mode === 'unavailable') throw new BrokerError('UNAVAILABLE', 'Fixture broker is unavailable.');
    if (this.mode === 'expired' || new Date(session.expiresAt) <= new Date()) throw new BrokerError('SESSION_EXPIRED', 'Broker session has expired.');
  }
  async getHoldings(session: BrokerSession): Promise<BrokerHolding[]> { this.assertSession(session); return [{ brokerInstrumentKey: '500470', exchange: 'NSE', symbol: 'TATASTEEL', quantity: '20', averagePrice: '150.25' }]; }
  async getPositions(session: BrokerSession): Promise<BrokerPosition[]> { this.assertSession(session); return []; }
  async sync(session: BrokerSession) { this.assertSession(session); return { asOf: new Date().toISOString(), holdings: await this.getHoldings(session), positions: await this.getPositions(session) }; }
  async disconnect(_session: BrokerSession) { return; }
  async getHistoricalTrades(): Promise<never> { throw new BrokerError('UNSUPPORTED', 'Historical trades are not available from this connector.'); }
}

export function kiteLoginUrl(apiKey: string, state: string): string {
  const url = new URL('https://kite.zerodha.com/connect/login');
  url.searchParams.set('v', '3'); url.searchParams.set('api_key', apiKey); url.searchParams.set('redirect_params', `state=${state}`);
  return url.toString();
}

export async function exchangeKiteRequestToken(apiKey: string, apiSecret: string, requestToken: string) {
  const checksum = (await import('node:crypto')).default.createHash('sha256').update(`${apiKey}${requestToken}${apiSecret}`).digest('hex');
  const response = await fetch('https://api.kite.trade/session/token', { method: 'POST', headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }) });
  if (!response.ok) throw new BrokerError('SESSION_EXPIRED', 'Kite could not exchange the login token. Reconnect and try again.');
  const payload = await response.json() as { status?: string; data?: { access_token?: string } };
  if (payload.status !== 'success' || !payload.data?.access_token) throw new BrokerError('SESSION_EXPIRED', 'Kite returned an incomplete login session.');
  return { accessToken: payload.data.access_token };
}

export async function fetchKitePortfolio(apiKey: string, accessToken: string) {
  const headers = { 'X-Kite-Version': '3', Authorization: `token ${apiKey}:${accessToken}` };
  const [holdingsResponse, positionsResponse] = await Promise.all([fetch('https://api.kite.trade/portfolio/holdings', { headers }), fetch('https://api.kite.trade/portfolio/positions', { headers })]);
  if (holdingsResponse.status === 401 || positionsResponse.status === 401 || holdingsResponse.status === 403 || positionsResponse.status === 403) throw new BrokerError('SESSION_EXPIRED', 'Kite session expired. Reconnect to continue.');
  if (!holdingsResponse.ok || !positionsResponse.ok) throw new BrokerError('UNAVAILABLE', 'Kite portfolio data is unavailable. Manual holdings remain available.');
  const holdingsPayload = await holdingsResponse.json() as { data?: Array<Record<string, unknown>> };
  const positionsPayload = await positionsResponse.json() as { data?: { net?: Array<Record<string, unknown>> } };
  const holdings = (holdingsPayload.data ?? []).map((item) => ({ brokerInstrumentKey: String(item.instrument_token), exchange: String(item.exchange), symbol: String(item.tradingsymbol), quantity: String(item.quantity), averagePrice: item.average_price === undefined ? undefined : String(item.average_price) }));
  const positions = (positionsPayload.data?.net ?? []).map((item) => ({ brokerInstrumentKey: String(item.instrument_token), product: String(item.product), quantity: String(item.quantity), averagePrice: item.average_price === undefined ? undefined : String(item.average_price) }));
  return { asOf: new Date().toISOString(), holdings, positions, raw: { holdings: holdingsPayload.data ?? [], positions: positionsPayload.data?.net ?? [] } };
}
