import { afterAll, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

const integrationUrl = process.env.TRADE_INTEGRATION_DATABASE_URL;
const integration = integrationUrl ? describe : describe.skip;

integration('Epic 3 catalogue API integration', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let cookie = '';

  async function authenticatedApp() {
    process.env.DATABASE_URL = integrationUrl;
    process.env.TRADE_MODE = 'synthetic';
    app = await buildServer();
    const setup = await app.inject({ method: 'POST', url: '/api/auth/setup', payload: { displayName: 'Epic 3 smoke owner', password: 'epic-3-test-password' } });
    expect(setup.statusCode).toBe(200);
    cookie = String(setup.headers['set-cookie']).split(';')[0];
  }

  it('imports, searches and date-resolves an explicitly reviewed catalogue', async () => {
    await authenticatedApp();
    const csv = 'exchange,symbol,name,isin,provider,provider_instrument_key,valid_from\nNSE,TATASTEEL,Tata Steel,INE081A01020,fixture,500470,2026-01-01\n';
    const imported = await app.inject({ method: 'POST', url: '/api/instruments/catalogue-imports', headers: { cookie }, payload: {
      sourceKey: 'integration-catalogue', sourceName: 'Integration fixture', sourceAsOf: '2026-11-20T09:00:00.000Z', sourceMode: 'synthetic', csv
    } });
    expect(imported.statusCode).toBe(200);
    expect(imported.json()).toMatchObject({ importedCount: 1, duplicate: false });
    const duplicate = await app.inject({ method: 'POST', url: '/api/instruments/catalogue-imports', headers: { cookie }, payload: {
      sourceKey: 'integration-catalogue', sourceName: 'Integration fixture', sourceAsOf: '2026-11-20T09:00:00.000Z', sourceMode: 'synthetic', csv
    } });
    expect(duplicate.json()).toMatchObject({ importedCount: 1, duplicate: true });
    const searched = await app.inject({ method: 'GET', url: '/api/instruments?query=tata&asOf=2026-11-20', headers: { cookie } });
    expect(searched.statusCode).toBe(200);
    expect(searched.json().instruments).toHaveLength(1);
    const resolved = await app.inject({ method: 'GET', url: '/api/instruments/provider/fixture/500470?asOf=2026-11-20', headers: { cookie } });
    expect(resolved.statusCode).toBe(200);
    const expired = await app.inject({ method: 'GET', url: '/api/instruments/provider/fixture/500470?asOf=2025-12-31', headers: { cookie } });
    expect(expired.statusCode).toBe(404);
  });

  it('requires an exact dated option specification and honors the Kite simulation restriction', async () => {
    const instruments = await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } });
    const underlyingInstrumentId = instruments.json().instruments[0].instrument_id;
    const created = await app.inject({ method: 'POST', url: '/api/options/contracts', headers: { cookie }, payload: {
      underlyingInstrumentId, exchange: 'NFO', symbol: 'TATASTEEL26NOV150CE', name: 'Tata Steel 150 CE', optionType: 'CE', strike: 150, expiryDate: '2026-11-26', lotSize: 5500, tickSize: 0.05, effectiveFrom: '2026-01-01', sourceName: 'Integration fixture'
    } });
    expect(created.statusCode).toBe(200);
    const exact = await app.inject({ method: 'GET', url: `/api/options/contracts/resolve?underlyingInstrumentId=${underlyingInstrumentId}&exchange=NFO&expiryDate=2026-11-26&strike=150&optionType=CE&asOf=2026-11-20`, headers: { cookie } });
    expect(exact.statusCode).toBe(200);
    expect(exact.json()).toMatchObject({ lot_size: '5500.0000', tick_size: '0.0500' });
    const changedLot = await app.inject({ method: 'POST', url: '/api/options/contracts', headers: { cookie }, payload: {
      underlyingInstrumentId, exchange: 'NFO', symbol: 'TATASTEEL26NOV150CE', name: 'Tata Steel 150 CE', optionType: 'CE', strike: 150, expiryDate: '2026-11-26', lotSize: 5000, tickSize: 0.05, effectiveFrom: '2026-06-01', sourceName: 'Integration fixture'
    } });
    expect(changedLot.statusCode).toBe(200);
    const historical = await app.inject({ method: 'GET', url: `/api/options/contracts/resolve?underlyingInstrumentId=${underlyingInstrumentId}&exchange=NFO&expiryDate=2026-11-26&strike=150&optionType=CE&asOf=2026-05-31`, headers: { cookie } });
    expect(historical.json()).toMatchObject({ lot_size: '5500.0000' });
    const current = await app.inject({ method: 'GET', url: `/api/options/contracts/resolve?underlyingInstrumentId=${underlyingInstrumentId}&exchange=NFO&expiryDate=2026-11-26&strike=150&optionType=CE&asOf=2026-11-20`, headers: { cookie } });
    expect(current.json()).toMatchObject({ lot_size: '5000.0000' });
    const holiday = await app.inject({ method: 'PUT', url: '/api/exchange-calendars/NSE/2026-12-25', headers: { cookie }, payload: { isTradingDay: false, sourceName: 'Integration fixture' } });
    expect(holiday.statusCode).toBe(200);
    const holidayRead = await app.inject({ method: 'GET', url: '/api/exchange-calendars/NSE/2026-12-25', headers: { cookie } });
    expect(holidayRead.json()).toMatchObject({ is_trading_day: false });
    const kitePolicy = await app.inject({ method: 'GET', url: '/api/data-sources/kite-personal/usage/simulation', headers: { cookie } });
    expect(kitePolicy.json()).toMatchObject({ decision: 'prohibited', allowed: false });
  });

  it('records acceptance limits and preserves unresolved manual entries for later reconciliation', async () => {
    const report = await app.inject({ method: 'POST', url: '/api/dataset-acceptance-reports', headers: { cookie }, payload: {
      sourceKey: 'integration-catalogue', datasetName: 'Sample option history', assessedAt: '2026-11-20T09:00:00.000Z', verdict: 'dependency',
      sampleSchema: ['timestamp', 'symbol', 'close'], availableInstruments: ['TATASTEEL'], usableHorizons: ['2026-01-01 to 2026-11-20'],
      absentFields: ['expired option chain'], missingIntervals: ['weekends'], rightsNotes: 'Fixture only; no live data rights are asserted.'
    } });
    expect(report.statusCode).toBe(200);
    expect(report.json()).toMatchObject({ verdict: 'dependency', report: { absentFields: ['expired option chain'] } });
    const unresolved = await app.inject({ method: 'POST', url: '/api/instruments/unresolved', headers: { cookie }, payload: { exchange: 'NSE', symbol: 'UNKNOWN', name: 'Unknown company', reason: 'Broker symbol has not been resolved to the approved catalogue.' } });
    expect(unresolved.statusCode).toBe(200);
    expect(unresolved.json()).toMatchObject({ status: 'unresolved' });
  });

  it('lists owner-scoped manual evidence linked to the selected instrument', async () => {
    const instrumentId = (await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } })).json().instruments[0].instrument_id;
    const created = await app.inject({ method: 'POST', url: '/api/evidence', headers: { cookie }, payload: { title: 'Fixture source', sourceUrl: 'https://example.com/tata-steel', retrievedAt: '2026-11-20T09:00:00.000Z', excerpt: 'An owner-added excerpt.', status: 'unverified', instrumentIds: [instrumentId] } });
    expect(created.statusCode).toBe(200);
    const listed = await app.inject({ method: 'GET', url: `/api/evidence?instrumentId=${instrumentId}`, headers: { cookie } });
    expect(listed.json()).toMatchObject({ verification: 'links_are_unverified_until_owner_review' });
    expect(listed.json().evidence).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Fixture source', status: 'unverified' })]));
  });

  it('persists fixture broker snapshots idempotently without inventing purchase dates', async () => {
    const begin = await app.inject({ method: 'POST', url: '/api/broker-connections/kite/fixture/connect', headers: { cookie }, payload: { mode: 'success' } });
    expect(begin.statusCode).toBe(200);
    const callback = await app.inject({ method: 'POST', url: '/api/brokers/kite/callback', headers: { cookie }, payload: { state: begin.json().state, requestToken: 'fixture-token' } });
    expect(callback.statusCode).toBe(200);
    const synced = await app.inject({ method: 'POST', url: '/api/broker-connections/kite/sync', headers: { cookie }, payload: { snapshotKey: 'fixture-snapshot-20261120' } });
    expect(synced.statusCode).toBe(200);
    expect(synced.json()).toMatchObject({ duplicate: false, holdings: 1, unresolved: 0, purchaseDates: 'unknown_when_not_supplied' });
    const retry = await app.inject({ method: 'POST', url: '/api/broker-connections/kite/sync', headers: { cookie }, payload: { snapshotKey: 'fixture-snapshot-20261120' } });
    expect(retry.json()).toMatchObject({ duplicate: true });
  });

  it('records idempotent manual trades and reports FIFO valuation', async () => {
    const instruments = await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } });
    const instrumentId = instruments.json().instruments[0].instrument_id;
    const account = await app.inject({ method: 'POST', url: '/api/portfolios/accounts', headers: { cookie }, payload: { label: 'Manual holdings' } });
    const accountId = account.json().account_id;
    const first = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades`, headers: { cookie }, payload: { instrumentId, type: 'buy', quantity: 10, price: 100, fees: 10, tradedOn: '2026-01-01', idempotencyKey: 'manual-trade-0001' } });
    expect(first.json()).toMatchObject({ duplicate: false });
    const retry = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades`, headers: { cookie }, payload: { instrumentId, type: 'buy', quantity: 10, price: 100, fees: 10, tradedOn: '2026-01-01', idempotencyKey: 'manual-trade-0001' } });
    expect(retry.json()).toMatchObject({ duplicate: true });
    const corrected = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades/${first.json().tradeId}/correct`, headers: { cookie }, payload: { quantity: 10, price: 101, fees: 10, tradedOn: '2026-01-01', idempotencyKey: 'manual-correction-0001' } });
    expect(corrected.json()).toMatchObject({ duplicate: false });
    const future = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades`, headers: { cookie }, payload: { instrumentId, type: 'buy', quantity: 1, price: 100, tradedOn: '2099-01-01', idempotencyKey: 'manual-trade-0002' } });
    expect(future.statusCode).toBe(400);
    const value = await app.inject({ method: 'GET', url: `/api/portfolios/accounts/${accountId}/valuation?instrumentId=${instrumentId}&marketPrice=110&priceAsOf=2026-01-02T09:15:00.000Z`, headers: { cookie } });
    expect(value.json()).toMatchObject({ costBasis: 'FIFO', quantity: 10, cost: 1020, marketValue: 1100, unrealisedPnl: 80 });
  });

  it('persists an unresolved real manual holding through purchases, a partial sale, and a manual valuation', async () => {
    const manual = await app.inject({ method: 'POST', url: '/api/instruments/manual', headers: { cookie }, payload: { exchange: 'NSE', symbol: 'OWNERHOLD', name: 'Owner entered holding' } });
    expect(manual.json()).toMatchObject({ status: 'unresolved', dataMode: 'manual', created: true });
    const account = await app.inject({ method: 'POST', url: '/api/portfolios/accounts', headers: { cookie }, payload: { label: 'Personal MVP holdings' } }); const accountId = account.json().account_id; const instrumentId = manual.json().instrumentId;
    for (const [type, quantity, price, tradedOn, key] of [['buy', 10, 100, '2026-01-01', 'mvp-buy-0001'], ['buy', 5, 120, '2026-01-02', 'mvp-buy-0002'], ['sell', 4, 130, '2026-01-03', 'mvp-sell-0001']] as const) {
      const recorded = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades`, headers: { cookie }, payload: { instrumentId, type, quantity, price, tradedOn, idempotencyKey: key } }); expect(recorded.statusCode).toBe(200);
    }
    const valuation = await app.inject({ method: 'PUT', url: `/api/portfolios/accounts/${accountId}/manual-valuations/${instrumentId}`, headers: { cookie }, payload: { price: 125, priceAsOf: '2026-11-20T09:15:00.000Z', note: 'Owner supplied mark' } }); expect(valuation.json()).toMatchObject({ source: 'manual' });
    const holdings = await app.inject({ method: 'GET', url: `/api/portfolios/accounts/${accountId}/holdings`, headers: { cookie } });
    expect(holdings.json()).toMatchObject({ costBasis: 'FIFO', totalInvestedAmount: 1200, holdings: [expect.objectContaining({ symbol: 'OWNERHOLD', instrumentStatus: 'unresolved', quantity: 11, investedAmount: 1200, realisedPnl: 120, marketValue: 1375, valuation: expect.objectContaining({ source: 'manual', price: 125 }) })] });
    const history = await app.inject({ method: 'GET', url: `/api/portfolios/accounts/${accountId}/history`, headers: { cookie } }); expect(history.json().transactions).toHaveLength(3);
  });

  it('previews invalid CSV rows and commits a valid batch without duplicate trades', async () => {
    const instrumentId = (await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } })).json().instruments[0].instrument_id;
    void instrumentId;
    const account = await app.inject({ method: 'POST', url: '/api/portfolios/accounts', headers: { cookie }, payload: { label: 'CSV holdings' } }); const accountId = account.json().account_id;
    const invalid = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trade-imports/preview`, headers: { cookie }, payload: { importKey: 'csv-batch-0001', csv: 'exchange,symbol,type,quantity,price,traded_on\nNSE,UNKNOWN,buy,-1,100,2026-01-01\n' } });
    expect(invalid.json()).toMatchObject({ valid: false }); expect(invalid.json().rows[0].errors.length).toBeGreaterThan(0);
    const csv = 'exchange,symbol,type,quantity,price,fees,traded_on\nNSE,TATASTEEL,buy,2,100,1,2026-01-01\n';
    const commit = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trade-imports/commit`, headers: { cookie }, payload: { importKey: 'csv-batch-0002', csv } }); expect(commit.json()).toMatchObject({ committed: 1 });
    const retry = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trade-imports/commit`, headers: { cookie }, payload: { importKey: 'csv-batch-0002', csv } }); expect(retry.json()).toMatchObject({ committed: 0, duplicate: true });
  });

  it('reconciles an idempotent broker snapshot with manual holdings', async () => {
    const instrumentId = (await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } })).json().instruments[0].instrument_id;
    const account = await app.inject({ method: 'POST', url: '/api/portfolios/accounts', headers: { cookie }, payload: { label: 'Reconciliation holdings' } }); const accountId = account.json().account_id;
    await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/trades`, headers: { cookie }, payload: { instrumentId, type: 'buy', quantity: 20, price: 150, tradedOn: '2026-01-01', idempotencyKey: 'reconcile-trade-0001' } });
    const begin = await app.inject({ method: 'POST', url: '/api/broker-connections/kite/fixture/connect', headers: { cookie }, payload: { mode: 'success' } }); await app.inject({ method: 'POST', url: '/api/brokers/kite/callback', headers: { cookie }, payload: { state: begin.json().state, requestToken: 'fixture-token' } });
    const snapshot = await app.inject({ method: 'POST', url: '/api/broker-connections/kite/sync', headers: { cookie }, payload: { snapshotKey: 'reconcile-snapshot-20261120' } });
    const reconciled = await app.inject({ method: 'POST', url: `/api/portfolios/accounts/${accountId}/reconcile`, headers: { cookie }, payload: { snapshotId: snapshot.json().snapshotId } });
    expect(reconciled.json()).toMatchObject({ status: 'matched' });
  });

  it('runs a risk-gated synthetic paper order lifecycle', async () => {
    const instrumentId = (await app.inject({ method: 'GET', url: '/api/instruments?query=TATASTEEL&asOf=2026-11-20', headers: { cookie } })).json().instruments[0].instrument_id;
    await app.inject({ method: 'PUT', url: '/api/risk-limits', headers: { cookie }, payload: { maxPositionValue: 1000, maxPortfolioLoss: 500, maxTradeLoss: 200 } });
    const paper = await app.inject({ method: 'POST', url: '/api/paper/accounts', headers: { cookie }, payload: { label: 'Synthetic smoke', openingCash: 1000 } }); const accountId = paper.json().virtual_account_id;
    const order = await app.inject({ method: 'POST', url: `/api/paper/accounts/${accountId}/orders`, headers: { cookie }, payload: { instrumentId, side: 'buy', quantity: 2, limitPrice: 400 } }); expect(order.statusCode).toBe(200);
    const cancelled = await app.inject({ method: 'POST', url: `/api/paper/orders/${order.json().orderId}/cancel`, headers: { cookie }, payload: {} }); expect(cancelled.json()).toMatchObject({ status: 'cancelled', releasedCash: 800, mode: 'synthetic' });
    const next = await app.inject({ method: 'POST', url: `/api/paper/accounts/${accountId}/orders`, headers: { cookie }, payload: { instrumentId, side: 'buy', quantity: 1, limitPrice: 500 } });
    const filled = await app.inject({ method: 'POST', url: `/api/paper/orders/${next.json().orderId}/fill`, headers: { cookie }, payload: { fillPrice: 490, fee: 1, filledAt: '2026-11-20T09:15:00.000Z' } }); expect(filled.json()).toMatchObject({ status: 'filled', mode: 'synthetic' });
    const sell = await app.inject({ method: 'POST', url: `/api/paper/accounts/${accountId}/orders`, headers: { cookie }, payload: { instrumentId, side: 'sell', quantity: 1, limitPrice: 510 } }); expect(sell.statusCode).toBe(200);
    const sold = await app.inject({ method: 'POST', url: `/api/paper/orders/${sell.json().orderId}/fill`, headers: { cookie }, payload: { fillPrice: 510, fee: 1, filledAt: '2026-11-20T09:16:00.000Z' } }); expect(sold.json()).toMatchObject({ status: 'filled', mode: 'synthetic' });
    const performance = await app.inject({ method: 'GET', url: `/api/paper/accounts/${accountId}/performance`, headers: { cookie } }); expect(performance.json()).toMatchObject({ realisedPnl: 18, positions: [], equity: null, mode: 'synthetic' });
  });

  it('retains real manual holdings after an API process restart', async () => {
    await app.close();
    app = await buildServer();
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { password: 'epic-3-test-password' } });
    expect(login.statusCode).toBe(200); cookie = String(login.headers['set-cookie']).split(';')[0];
    const accounts = await app.inject({ method: 'GET', url: '/api/portfolios/accounts', headers: { cookie } });
    const manual = accounts.json().accounts.find((account: { label: string }) => account.label === 'Personal MVP holdings');
    const holdings = await app.inject({ method: 'GET', url: `/api/portfolios/accounts/${manual.account_id}/holdings`, headers: { cookie } });
    expect(holdings.json()).toMatchObject({ holdings: [expect.objectContaining({ symbol: 'OWNERHOLD', quantity: 11, investedAmount: 1200 })] });
  });

  afterAll(async () => { await app?.close(); });
});
