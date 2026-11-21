import { createApp, h, onMounted, ref } from 'vue';
import './style.css';

const API = 'http://localhost:3000';

type Owner = { ownerId: string; displayName: string };
type CatalogueItem = { instrument_id: string; exchange: string; symbol: string; name: string; isin?: string; data_mode: string; source_name: string };
type PortfolioAccount = { account_id: string; label: string; account_type: string; trade_count: number };
type Reminder = { reminder_id: string; due_at: string; status: string; note?: string };
type ResearchRequest = { request_id: string; status: string; question: string; horizon: string; symbol: string; updated_at: string };
type PaperAccount = { virtual_account_id: string; label: string; cash_balance: string; mode: string };
type PaperPerformance = { account: PaperAccount; realisedPnl: number; closedQuantity: number; positions: { instrumentId: string; symbol: string; quantity: number; cost: number; valuation: string }[]; notice: string };
type Observation = { source_timestamp: string; close: string | number; volume?: string | number | null; observation_type: 'quote' | 'candle' | 'option_snapshot' };
type EvidenceItem = { evidence_id: string; title: string; source_url: string; published_at?: string | null; retrieved_at: string; excerpt: string; status: 'allegation' | 'confirmed_event' | 'unverified' };
type Holding = { instrumentId: string; exchange: string; symbol: string; name: string; instrumentStatus: string; quantity: number; investedAmount: number; averageCost: number; realisedPnl: number; marketValue: number | null; unrealisedPnl: number | null; valuation: { source: string | null; price?: number; asOf?: string; label?: string } };
type BrokerSnapshotHolding = { provider_instrument_key: string; exchange?: string; symbol?: string; quantity: string | number; average_price: string | number | null; purchase_date: string | null; resolution_status: 'resolved' | 'unresolved' };
type BrokerSnapshot = { snapshotId: string; observedAt: string; status: string; holdings: BrokerSnapshotHolding[]; positions: BrokerSnapshotHolding[] };

const navigation = [
  ['Portfolio', '₹'],
  ['Explore', '⌕'],
  ['Paper Trading', '◫'],
  ['Research / Chat', '✦'],
  ['Alerts', '◉'],
  ['Settings', '⚙']
] as const;

createApp({
  setup() {
    const owner = ref<Owner | null>(null);
    const setupNeeded = ref(true);
    const runMode = ref('manual');
    const portfolioMode = ref<'manual' | 'live'>('manual');
    const portfolioModeSaving = ref(false);
    const loading = ref(true);
    const submitting = ref(false);
    const displayName = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const passwordVisible = ref(false);
    const error = ref('');
    const success = ref('');
    const activePage = ref('Portfolio');
    const mobileNavOpen = ref(false);
    const catalogueQuery = ref('');
    const catalogueItems = ref<CatalogueItem[]>([]);
    const catalogueLoading = ref(false);
    const catalogueNotice = ref('');
    const catalogueFile = ref<File | null>(null);
    const catalogueSourceName = ref('Reviewed local catalogue');
    const catalogueSourceKey = ref('local-reviewed-catalogue');
    const catalogueMode = ref('manual');
    const catalogueAsOf = ref(new Date().toISOString().slice(0, 16));
    const portfolioAccounts = ref<PortfolioAccount[]>([]);
    const portfolioNotice = ref('');
    const selectedInstrument = ref<CatalogueItem | null>(null);
    const observationNotice = ref('Select an instrument to inspect available stored observations.');
    const observationCount = ref(0);
    const observationSeries = ref<Observation[]>([]);
    const evidenceItems = ref<EvidenceItem[]>([]);
    const evidenceNotice = ref('No instrument selected.');
    const newAccountLabel = ref('');
    const accountSubmitting = ref(false);
    const reminders = ref<Reminder[]>([]);
    const reminderNotice = ref('');
    const researchRequests = ref<ResearchRequest[]>([]);
    const researchNotice = ref('');
    const paperAccounts = ref<PaperAccount[]>([]);
    const paperNotice = ref('');
    const paperPerformance = ref<PaperPerformance | null>(null);
    const portfolioHoldings = ref<Holding[]>([]);
    const holdingsNotice = ref('Create or select a manual account to record real holdings.');
    const holdingSearch = ref('');
    const holdingMatches = ref<CatalogueItem[]>([]);
    const selectedHoldingInstrument = ref<CatalogueItem | null>(null);
    const holdingExchange = ref('NSE');
    const holdingSymbol = ref('');
    const holdingName = ref('');
    const holdingType = ref<'buy' | 'sell'>('buy');
    const holdingQuantity = ref('');
    const holdingPrice = ref('');
    const holdingDate = ref(new Date().toISOString().slice(0, 10));
    const holdingComment = ref('');
    const holdingSubmitting = ref(false);
    const kiteStatus = ref('Kite is not connected.');
    const kiteConnectionState = ref('not_connected');
    const kiteSnapshot = ref<BrokerSnapshot | null>(null);

    async function readJson(response: Response) {
      try { return await response.json(); } catch { return null; }
    }

    async function refreshOwner() {
      try {
        const configResponse = await fetch(`${API}/api/config`, { credentials: 'include' });
        if (configResponse.ok) { const config = await readJson(configResponse); runMode.value = config?.mode ?? 'manual'; }
        const statusResponse = await fetch(`${API}/api/auth/status`, { credentials: 'include' });
        if (statusResponse.ok) {
          const status = await readJson(statusResponse);
          setupNeeded.value = Boolean(status?.setupNeeded);
        }
        const response = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
        owner.value = response.ok ? await response.json() : null;
        if (owner.value) {
          await loadPortfolioMode();
          const kiteResult = new URLSearchParams(window.location.search).get('kite');
          if (kiteResult) window.history.replaceState({}, document.title, window.location.pathname);
          if (kiteResult === 'connected') kiteStatus.value = 'Kite connected. Loading its latest snapshot…';
          if (kiteResult === 'error') kiteStatus.value = 'Kite login did not complete. You can try Connect Zerodha again.';
          void loadPortfolio();
        }
      } catch {
        error.value = 'The local API is unavailable. Start Trade and try again.';
      } finally {
        loading.value = false;
      }
    }

    async function setup() {
      if (submitting.value) return;
      error.value = '';
      success.value = '';
      if (!displayName.value.trim()) { error.value = 'Enter a display name.'; return; }
      if (password.value.length < 12) { error.value = 'Use at least 12 characters for the password.'; return; }
      if (password.value !== confirmPassword.value) { error.value = 'Passwords do not match.'; return; }
      submitting.value = true;
      try {
        const response = await fetch(`${API}/api/auth/setup`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: displayName.value.trim(), password: password.value })
        });
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.message ?? 'Could not create the owner account.');
        success.value = 'Owner account created.';
        await refreshOwner();
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Could not create the owner account.';
      } finally {
        submitting.value = false;
      }
    }

    async function login() {
      if (submitting.value) return;
      error.value = '';
      success.value = '';
      if (!password.value) { error.value = 'Enter the owner password.'; return; }
      submitting.value = true;
      try {
        const response = await fetch(`${API}/api/auth/login`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password.value })
        });
        const body = await readJson(response);
        if (!response.ok) throw new Error(response.status === 401 ? 'Password is incorrect.' : body?.message ?? 'Login failed.');
        success.value = 'Signed in securely.';
        await refreshOwner();
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Login failed.';
      } finally {
        submitting.value = false;
      }
    }

    async function logout() {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      password.value = '';
      confirmPassword.value = '';
      success.value = '';
      activePage.value = 'Portfolio';
      await refreshOwner();
    }

    async function saveSettings() {
      success.value = '';
      const response = await fetch(`${API}/api/settings`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayTimezone: 'Asia/Kolkata', notificationEnabled: true })
      });
      success.value = response.ok ? 'Preferences saved.' : '';
      if (!response.ok) error.value = 'Could not save preferences.';
    }

    async function loadPortfolioMode() {
      try {
        const response = await fetch(`${API}/api/settings`, { credentials: 'include' });
        if (!response.ok) return;
        const settings = await readJson(response);
        const savedMode = settings?.preferences?.portfolioMode;
        portfolioMode.value = savedMode === 'live' || savedMode === 'manual'
          ? savedMode
          : runMode.value === 'live' ? 'live' : 'manual';
      } catch {
        // The server-mode badge remains the source of truth if preferences are unavailable.
      }
    }

    async function setPortfolioMode(mode: 'manual' | 'live') {
      if (portfolioModeSaving.value || mode === portfolioMode.value) return;
      if (mode === 'live' && runMode.value !== 'live') {
        portfolioNotice.value = 'Live is configured in .env, but the API is still running in Manual mode. Restart the API terminal, then select Live.';
        return;
      }
      portfolioModeSaving.value = true;
      try {
        const response = await fetch(`${API}/api/settings`, {
          method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: { portfolioMode: mode } })
        });
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.message ?? 'Could not save the portfolio mode.');
        portfolioMode.value = mode;
        portfolioNotice.value = mode === 'live'
          ? 'Live portfolio mode selected. Connect Zerodha to import a broker snapshot; manual entries remain available.'
          : 'Manual portfolio mode selected. Your broker connection and imported snapshots are retained but will not refresh automatically.';
        if (mode === 'live') await loadKiteStatus();
      } catch (cause) {
        portfolioNotice.value = cause instanceof Error ? cause.message : 'Could not save the portfolio mode.';
      } finally {
        portfolioModeSaving.value = false;
      }
    }

    async function searchCatalogue() {
      if (!owner.value) return;
      catalogueLoading.value = true;
      catalogueNotice.value = '';
      try {
        const response = await fetch(`${API}/api/instruments?query=${encodeURIComponent(catalogueQuery.value)}`, { credentials: 'include' });
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.message ?? 'Could not search the local catalogue.');
        catalogueItems.value = body.instruments ?? [];
        if (!catalogueItems.value.length) catalogueNotice.value = 'No active listing matches this search. You can record an unresolved manual instrument when needed.';
      } catch (cause) { catalogueNotice.value = cause instanceof Error ? cause.message : 'Could not search the local catalogue.'; }
      finally { catalogueLoading.value = false; }
    }

    async function importCatalogue() {
      if (!catalogueFile.value) { catalogueNotice.value = 'Choose a reviewed CSV file first.'; return; }
      catalogueNotice.value = '';
      catalogueLoading.value = true;
      try {
        const csv = await catalogueFile.value.text();
        const response = await fetch(`${API}/api/instruments/catalogue-imports`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceKey: catalogueSourceKey.value, sourceName: catalogueSourceName.value, sourceAsOf: new Date(catalogueAsOf.value).toISOString(), sourceMode: catalogueMode.value, csv })
        });
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.message ?? 'The catalogue could not be imported.');
        catalogueNotice.value = body.duplicate ? `This exact catalogue was already imported (${body.importedCount} rows).` : `Imported ${body.importedCount} catalogue rows.`;
        await searchCatalogue();
      } catch (cause) { catalogueNotice.value = cause instanceof Error ? cause.message : 'The catalogue could not be imported.'; }
      finally { catalogueLoading.value = false; }
    }

    async function loadPortfolio() {
      if (!owner.value) return;
      try { const response = await fetch(`${API}/api/portfolios/accounts`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load portfolio accounts.'); portfolioAccounts.value = body.accounts ?? []; portfolioNotice.value = portfolioAccounts.value.length ? '' : 'No manual portfolio accounts yet.'; void loadPortfolioHoldings(portfolioAccounts.value[0]?.account_id); void loadKiteStatus(); }
      catch (cause) { portfolioNotice.value = cause instanceof Error ? cause.message : 'Could not load portfolio accounts.'; }
    }

    async function createPortfolioAccount() {
      if (accountSubmitting.value) return;
      if (!newAccountLabel.value.trim()) { portfolioNotice.value = 'Enter an account name.'; return; }
      accountSubmitting.value = true;
      try { const response = await fetch(`${API}/api/portfolios/accounts`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: newAccountLabel.value.trim() }) }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not create the account.'); newAccountLabel.value = ''; portfolioNotice.value = 'Manual account created.'; await loadPortfolio(); }
      catch (cause) { portfolioNotice.value = cause instanceof Error ? cause.message : 'Could not create the account.'; }
      finally { accountSubmitting.value = false; }
    }

    async function searchHoldingInstrument() {
      const query = holdingSearch.value.trim(); if (!query) { holdingMatches.value = []; return; }
      try { const response = await fetch(`${API}/api/instruments?query=${encodeURIComponent(query)}`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not search the permitted catalogue.'); holdingMatches.value = body.instruments ?? []; holdingsNotice.value = holdingMatches.value.length ? 'Select a permitted catalogue listing, or use the explicit unresolved manual entry below.' : 'No permitted catalogue listing matched. You can enter an unresolved manual symbol.'; }
      catch (cause) { holdingsNotice.value = cause instanceof Error ? cause.message : 'Could not search the permitted catalogue.'; }
    }

    async function loadPortfolioHoldings(accountId?: string) {
      const activeAccount = accountId ?? portfolioAccounts.value[0]?.account_id; if (!activeAccount) { portfolioHoldings.value = []; return; }
      try { const response = await fetch(`${API}/api/portfolios/accounts/${encodeURIComponent(activeAccount)}/holdings`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load holdings.'); portfolioHoldings.value = body.holdings ?? []; holdingsNotice.value = body.valuationNotice ?? ''; }
      catch (cause) { holdingsNotice.value = cause instanceof Error ? cause.message : 'Could not load holdings.'; }
    }

    async function ensureManualAccount() {
      if (portfolioAccounts.value[0]) return portfolioAccounts.value[0].account_id;
      const response = await fetch(`${API}/api/portfolios/accounts`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Personal holdings' }) }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not create the personal holdings account.'); await loadPortfolio(); return body.account_id as string;
    }

    async function submitHolding() {
      if (holdingSubmitting.value) return;
      if (!holdingQuantity.value || !holdingPrice.value || !holdingDate.value) { holdingsNotice.value = 'Quantity, purchase/sale price, and trade date are required.'; return; }
      holdingSubmitting.value = true;
      try {
        let instrumentId = selectedHoldingInstrument.value?.instrument_id;
        if (!instrumentId) {
          if (!holdingSymbol.value.trim()) throw new Error('Choose a catalogue listing or enter exchange and symbol for an unresolved manual holding.');
          const manual = await fetch(`${API}/api/instruments/manual`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exchange: holdingExchange.value, symbol: holdingSymbol.value, name: holdingName.value || undefined }) }); const manualBody = await readJson(manual); if (!manual.ok) throw new Error(manualBody?.message ?? 'Could not create the unresolved manual instrument.'); instrumentId = manualBody.instrumentId;
        }
        const accountId = await ensureManualAccount();
        const trade = await fetch(`${API}/api/portfolios/accounts/${accountId}/trades`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instrumentId, type: holdingType.value, quantity: Number(holdingQuantity.value), price: Number(holdingPrice.value), tradedOn: holdingDate.value, comment: holdingComment.value || undefined, idempotencyKey: crypto.randomUUID() }) }); const tradeBody = await readJson(trade); if (!trade.ok) throw new Error(tradeBody?.message ?? 'Could not record the holding transaction.');
        holdingsNotice.value = selectedHoldingInstrument.value ? 'Transaction recorded from the selected catalogue instrument.' : 'Transaction recorded against an unresolved manual instrument; it is not broker-mapped.';
        holdingQuantity.value = ''; holdingPrice.value = ''; holdingComment.value = ''; holdingMatches.value = []; selectedHoldingInstrument.value = null; await loadPortfolio(); await loadPortfolioHoldings(accountId);
      } catch (cause) { holdingsNotice.value = cause instanceof Error ? cause.message : 'Could not record the holding transaction.'; }
      finally { holdingSubmitting.value = false; }
    }

    async function loadObservations(item: CatalogueItem) {
      selectedInstrument.value = item; observationNotice.value = 'Loading stored observations…'; observationCount.value = 0; observationSeries.value = []; void loadEvidence(item);
      try { const response = await fetch(`${API}/api/market/observations?instrumentId=${encodeURIComponent(item.instrument_id)}`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load observations.'); observationSeries.value = body.observations ?? []; observationCount.value = observationSeries.value.length; observationNotice.value = observationCount.value ? `${body.seriesType === 'candles' ? 'Candle' : 'Sparse observation'} series · latest ${body.freshness ?? 'unknown'}.` : 'No stored observations are available for this instrument.'; }
      catch (cause) { observationNotice.value = cause instanceof Error ? cause.message : 'Could not load observations.'; }
    }

    async function loadEvidence(item: CatalogueItem) {
      evidenceItems.value = []; evidenceNotice.value = 'Loading linked evidence…';
      try { const response = await fetch(`${API}/api/evidence?instrumentId=${encodeURIComponent(item.instrument_id)}`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load linked evidence.'); evidenceItems.value = body.evidence ?? []; evidenceNotice.value = evidenceItems.value.length ? 'Links are unverified until you review their source.' : 'No linked evidence is stored for this instrument.'; }
      catch (cause) { evidenceNotice.value = cause instanceof Error ? cause.message : 'Could not load linked evidence.'; }
    }

    async function loadReminders() {
      if (!owner.value) return;
      try { const response = await fetch(`${API}/api/review-reminders`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load reminders.'); reminders.value = body.reminders ?? []; reminderNotice.value = reminders.value.length ? 'Snapshot-only review reminders.' : 'No open review reminders.'; }
      catch (cause) { reminderNotice.value = cause instanceof Error ? cause.message : 'Could not load reminders.'; }
    }

    async function loadResearchRequests() {
      if (!owner.value) return;
      try { const response = await fetch(`${API}/api/research-requests`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load research requests.'); researchRequests.value = body.requests ?? []; researchNotice.value = researchRequests.value.length ? 'Manual research exchange; imported analysis remains unverified until reviewed.' : 'No research requests yet.'; }
      catch (cause) { researchNotice.value = cause instanceof Error ? cause.message : 'Could not load research requests.'; }
    }

    async function loadPaperAccounts() {
      if (!owner.value) return;
      try { const response = await fetch(`${API}/api/paper/accounts`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load paper accounts.'); paperAccounts.value = body.accounts ?? []; paperNotice.value = paperAccounts.value.length ? 'Synthetic accounts only. No broker order execution.' : 'No synthetic paper accounts yet.'; paperPerformance.value = null; if (paperAccounts.value[0]) await loadPaperPerformance(paperAccounts.value[0].virtual_account_id); }
      catch (cause) { paperNotice.value = cause instanceof Error ? cause.message : 'Could not load paper accounts.'; }
    }

    async function loadPaperPerformance(accountId: string) {
      try { const response = await fetch(`${API}/api/paper/accounts/${encodeURIComponent(accountId)}/performance`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not load synthetic performance.'); paperPerformance.value = body; }
      catch (cause) { paperNotice.value = cause instanceof Error ? cause.message : 'Could not load synthetic performance.'; }
    }

    async function startKiteConnection() {
      try {
        const statusResponse = await fetch(`${API}/api/broker-connections/kite/status`, { credentials: 'include' });
        const status = await readJson(statusResponse);
        if (statusResponse.ok && status?.status === 'connected') { kiteStatus.value = 'Kite is already connected. Use Refresh Kite to import the latest snapshot, or Disconnect Kite before reconnecting.'; return; }
        if (statusResponse.ok && status?.status === 'awaiting_callback') { kiteStatus.value = 'A Kite login is already awaiting its callback. Complete that browser login or disconnect before starting another one.'; return; }
        const response = await fetch(`${API}/api/broker-connections/kite/connect`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Kite is not ready to connect.'); window.location.assign(body.authorizationUrl);
      }
      catch (cause) { holdingsNotice.value = cause instanceof Error ? cause.message : 'Kite is not ready to connect.'; }
    }

    async function loadKiteStatus() {
      try { const response = await fetch(`${API}/api/broker-connections/kite/status`, { credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not read Kite status.'); kiteConnectionState.value = body.status ?? 'not_connected'; kiteStatus.value = body.configured ? `Kite ${body.status}${body.lastSyncedAt ? ` · last synced ${new Date(body.lastSyncedAt).toLocaleString()}` : ''}` : 'Kite is not configured locally.'; if (body.lastSyncedAt) await loadKiteSnapshot(); else if (body.status !== 'awaiting_callback') kiteSnapshot.value = null; }
      catch (cause) { kiteStatus.value = cause instanceof Error ? cause.message : 'Could not read Kite status.'; }
    }

    async function loadKiteSnapshot() {
      try {
        const response = await fetch(`${API}/api/broker-connections/kite/latest-snapshot`, { credentials: 'include' });
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.message ?? 'Could not load the Kite snapshot.');
        kiteSnapshot.value = body.snapshot ?? null;
      } catch (cause) { kiteStatus.value = cause instanceof Error ? cause.message : 'Could not load the Kite snapshot.'; }
    }

    async function syncKite() {
      try { const response = await fetch(`${API}/api/broker-connections/kite/live-sync`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshotKey: `kite-${crypto.randomUUID()}` }) }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Kite refresh failed.'); kiteStatus.value = `Kite snapshot saved at ${new Date(body.observedAt).toLocaleString()}; ${body.unresolved} unresolved instrument(s).`; await loadKiteStatus(); }
      catch (cause) { kiteStatus.value = cause instanceof Error ? cause.message : 'Kite refresh failed.'; }
    }

    async function disconnectKite() {
      try { const response = await fetch(`${API}/api/broker-connections/kite`, { method: 'DELETE', credentials: 'include' }); const body = await readJson(response); if (!response.ok) throw new Error(body?.message ?? 'Could not disconnect Kite.'); kiteStatus.value = body.disconnected ? 'Kite disconnected. Stored access is revoked locally.' : 'Kite disconnect did not complete.'; }
      catch (cause) { kiteStatus.value = cause instanceof Error ? cause.message : 'Could not disconnect Kite.'; }
    }

    onMounted(refreshOwner);

    const passwordField = (label: string, value: typeof password, confirmation = false) => h('div', { class: 'field' }, [
      h('label', { for: confirmation ? 'confirm-password' : 'password' }, label),
      h('div', { class: 'input-wrap' }, [
        h('input', {
          id: confirmation ? 'confirm-password' : 'password',
          class: 'text-input password-input',
          type: passwordVisible.value ? 'text' : 'password',
          value: value.value,
          autocomplete: confirmation ? 'new-password' : (setupNeeded.value ? 'new-password' : 'current-password'),
          'aria-invalid': Boolean(error.value),
          onInput: (event: Event) => { value.value = (event.target as HTMLInputElement).value; error.value = ''; }
        }),
        h('button', {
          type: 'button', class: 'visibility-button',
          'aria-label': passwordVisible.value ? 'Hide password' : 'Show password',
          onClick: () => passwordVisible.value = !passwordVisible.value
        }, passwordVisible.value ? 'Hide' : 'Show')
      ])
    ]);

    const authView = () => h('div', { class: 'auth-page' }, [
      h('section', { class: 'auth-brand', 'aria-label': 'Trade introduction' }, [
        h('div', { class: 'brand-mark' }, [h('span', { class: 'brand-symbol', 'aria-hidden': 'true' }, 'T'), h('span', 'Trade')]),
        h('div', { class: 'brand-copy' }, [
          h('h1', 'A clearer view of every trade.'),
          h('p', 'Private portfolio research, evidence-led analysis and deliberate paper execution for the Indian markets.')
        ]),
        h('div', { class: 'mode-badge', style: 'background: rgba(255,255,255,.08); color: white; border-color: rgba(255,255,255,.18)' }, [
          h('span', { class: 'mode-dot' }), `${runMode.value.toUpperCase()} MODE`
        ])
      ]),
      h('section', { class: 'auth-panel' }, [
        h('div', { class: 'auth-card' }, [
          h('h2', setupNeeded.value ? 'Create local owner' : 'Welcome back'),
          h('p', setupNeeded.value
            ? 'Set up the private owner account for this device.'
            : 'Enter the owner password to access your workspace.'),
          setupNeeded.value ? h('div', { class: 'field' }, [
            h('label', { for: 'display-name' }, 'Display name'),
            h('input', { id: 'display-name', class: 'text-input', value: displayName.value, autocomplete: 'name', onInput: (event: Event) => displayName.value = (event.target as HTMLInputElement).value })
          ]) : null,
          passwordField(setupNeeded.value ? 'Password' : 'Owner password', password),
          setupNeeded.value ? passwordField('Confirm password', confirmPassword, true) : null,
          error.value ? h('div', { class: 'feedback feedback-error', role: 'alert' }, error.value) : null,
          success.value ? h('div', { class: 'feedback feedback-success', role: 'status' }, success.value) : null,
          h('button', {
            type: 'button', class: 'button button-primary full-button', disabled: submitting.value,
            onClick: setupNeeded.value ? setup : login
          }, submitting.value ? 'Please wait…' : (setupNeeded.value ? 'Create owner account' : 'Sign in')),
          !setupNeeded.value ? h('details', { class: 'password-reset-help' }, [
            h('summary', 'Forgot the local owner password?'),
            h('p', 'For privacy, password reset is available only from an interactive terminal on this computer. It signs out existing sessions and never displays a password hash.'),
            h('code', 'npm run reset:owner-password')
          ]) : null
        ])
      ])
    ]);

    const emptyCopy: Record<string, [string, string]> = {
      Portfolio: ['Portfolio', 'Add holdings and reconcile broker or manual records when those stories are available.'],
      Explore: ['Explore instruments', 'Instrument search and charts require the Epic 3 catalogue and later market-data stories.'],
      'Paper Trading': ['Paper trading', 'The synthetic virtual ledger will appear after the paper execution stories are implemented.'],
      'Research / Chat': ['Research workspace', 'Copy/imported research workflows are available after their Epic 9 and Epic 15 stories.'],
      Alerts: ['Alerts', 'Alert rules and review reminders are not implemented yet.'],
      Settings: ['Settings', 'Manage local preferences and privacy controls from this workspace.']
    };

    const portfolioMvpView = () => h('section', { class: 'portfolio-mvp' }, [
      h('article', { class: 'card portfolio-actions' }, [
        h('div', [h('h2', 'Real portfolio'), h('p', 'Record actual holdings locally. Broker sync is optional and never creates purchase history that the broker did not provide.'), h('div', { class: 'mode-switch', role: 'group', 'aria-label': 'Portfolio operating mode' }, [
          h('button', { type: 'button', class: `button ${portfolioMode.value === 'manual' ? 'button-primary' : ''}`, 'aria-pressed': portfolioMode.value === 'manual', disabled: portfolioModeSaving.value, onClick: () => void setPortfolioMode('manual') }, 'Manual'),
          h('button', { type: 'button', class: `button ${portfolioMode.value === 'live' ? 'button-primary' : ''}`, 'aria-pressed': portfolioMode.value === 'live', disabled: portfolioModeSaving.value || runMode.value !== 'live', onClick: () => void setPortfolioMode('live') }, 'Live')
        ]), h('p', { class: 'muted-copy broker-status', 'aria-live': 'polite' }, portfolioMode.value === 'live' ? kiteStatus.value : 'Manual entries are active. Select Live to connect or refresh Zerodha.'), h('p', { class: 'muted-copy broker-status', 'aria-live': 'polite' }, holdingsNotice.value)]),
        h('div', { class: 'portfolio-action-buttons' }, [h('button', { type: 'button', class: 'button button-primary', onClick: () => document.getElementById('add-holding')?.scrollIntoView({ behavior: 'smooth' }) }, 'Add holding'), h('button', { type: 'button', class: 'button', disabled: portfolioMode.value !== 'live', onClick: startKiteConnection }, 'Connect Zerodha'), h('button', { type: 'button', class: 'button', disabled: portfolioMode.value !== 'live', onClick: syncKite }, 'Refresh Kite'), h('button', { type: 'button', class: 'button', disabled: portfolioMode.value !== 'live', onClick: disconnectKite }, 'Disconnect Kite')])
      ]),
      h('article', { id: 'add-holding', class: 'card portfolio-form' }, [
        h('h2', 'Add holding'), h('p', 'Search a permitted catalogue first. If it is absent, record your own exchange/symbol as unresolved—never as a synthetic substitute.'),
        h('div', { class: 'catalogue-search-row' }, [h('input', { class: 'text-input', placeholder: 'Search company or symbol', value: holdingSearch.value, onInput: (event: Event) => holdingSearch.value = (event.target as HTMLInputElement).value, onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void searchHoldingInstrument(); } }), h('button', { type: 'button', class: 'button', onClick: searchHoldingInstrument }, 'Search catalogue')]),
        holdingMatches.value.length ? h('ul', { class: 'instrument-picker' }, holdingMatches.value.map((item) => h('li', { key: item.instrument_id }, [h('button', { type: 'button', class: selectedHoldingInstrument.value?.instrument_id === item.instrument_id ? 'selected' : '', onClick: () => { selectedHoldingInstrument.value = item; holdingSymbol.value = item.symbol; holdingExchange.value = item.exchange; holdingName.value = item.name; } }, `${item.exchange}:${item.symbol} — ${item.name} (${item.data_mode})`)]))) : null,
        h('div', { class: 'portfolio-form-grid' }, [
          h('label', ['Exchange', h('input', { class: 'text-input', value: holdingExchange.value, onInput: (event: Event) => { holdingExchange.value = (event.target as HTMLInputElement).value; selectedHoldingInstrument.value = null; } })]),
          h('label', ['Symbol', h('input', { class: 'text-input', value: holdingSymbol.value, onInput: (event: Event) => { holdingSymbol.value = (event.target as HTMLInputElement).value; selectedHoldingInstrument.value = null; } })]),
          h('label', ['Company / instrument', h('input', { class: 'text-input', value: holdingName.value, onInput: (event: Event) => holdingName.value = (event.target as HTMLInputElement).value })]),
          h('label', ['Transaction', h('select', { class: 'text-input', value: holdingType.value, onChange: (event: Event) => holdingType.value = (event.target as HTMLSelectElement).value as 'buy' | 'sell' }, [h('option', { value: 'buy' }, 'Purchase'), h('option', { value: 'sell' }, 'Sale')])]),
          h('label', ['Quantity', h('input', { class: 'text-input', type: 'number', min: '0.0001', step: 'any', value: holdingQuantity.value, onInput: (event: Event) => holdingQuantity.value = (event.target as HTMLInputElement).value })]),
          h('label', ['Price per unit', h('input', { class: 'text-input', type: 'number', min: '0', step: 'any', value: holdingPrice.value, onInput: (event: Event) => holdingPrice.value = (event.target as HTMLInputElement).value })]),
          h('label', ['Purchase / sale date', h('input', { class: 'text-input', type: 'date', value: holdingDate.value, onInput: (event: Event) => holdingDate.value = (event.target as HTMLInputElement).value })]),
          h('label', ['Optional comments', h('input', { class: 'text-input', value: holdingComment.value, onInput: (event: Event) => holdingComment.value = (event.target as HTMLInputElement).value })])
        ]),
        h('button', { type: 'button', class: 'button button-primary', disabled: holdingSubmitting.value, onClick: submitHolding }, holdingSubmitting.value ? 'Saving…' : 'Save transaction'),
        h('p', { class: 'muted-copy', 'aria-live': 'polite' }, holdingsNotice.value)
      ]),
      h('article', { class: 'card portfolio-holdings' }, [
        h('h2', 'Holdings'),
        portfolioHoldings.value.length ? h('div', { class: 'catalogue-table-wrap' }, [
          h('table', { class: 'catalogue-table' }, [
            h('thead', [h('tr', [h('th', 'Instrument'), h('th', 'Quantity'), h('th', 'Invested'), h('th', 'Average cost'), h('th', 'Valuation')])]),
            h('tbody', portfolioHoldings.value.map((holding) => h('tr', { key: holding.instrumentId }, [
              h('td', `${holding.exchange}:${holding.symbol}${holding.instrumentStatus === 'unresolved' ? ' · Unresolved' : ''}`),
              h('td', String(holding.quantity)), h('td', `₹${holding.investedAmount.toFixed(2)}`), h('td', `₹${holding.averageCost.toFixed(2)}`),
              h('td', holding.valuation.source ? `Manual ₹${holding.valuation.price?.toFixed(2)} · ${new Date(holding.valuation.asOf!).toLocaleString()}` : 'Price unavailable')
            ])))
          ])
        ]) : h('p', { class: 'muted-copy' }, holdingsNotice.value)
      ]),
      h('article', { class: 'card portfolio-holdings' }, [
        h('h2', 'Kite broker snapshot'),
        kiteSnapshot.value ? [
          h('p', { class: 'muted-copy' }, `Imported ${new Date(kiteSnapshot.value.observedAt).toLocaleString()}. These broker quantities are displayed separately and are not added to manual holdings.`),
          kiteSnapshot.value.holdings.length ? h('div', { class: 'catalogue-table-wrap' }, [h('table', { class: 'catalogue-table' }, [
            h('thead', [h('tr', [h('th', 'Instrument'), h('th', 'Quantity'), h('th', 'Average price'), h('th', 'Mapping')])]),
            h('tbody', kiteSnapshot.value.holdings.map((holding) => h('tr', { key: holding.provider_instrument_key }, [
              h('td', `${holding.exchange ?? 'Unknown'}:${holding.symbol ?? holding.provider_instrument_key}`),
              h('td', String(holding.quantity)), h('td', holding.average_price === null ? 'Not supplied' : `₹${Number(holding.average_price).toFixed(2)}`),
              h('td', holding.resolution_status === 'resolved' ? 'Resolved' : 'Unresolved · not added to manual holdings')
            ])))
          ])]) : h('p', { class: 'muted-copy' }, 'Kite reported no holdings in this snapshot.')
        ] : h('p', { class: 'muted-copy' }, kiteConnectionState.value === 'connected' ? 'No broker snapshot has been imported yet. Select Refresh Kite.' : 'Connect Zerodha and select Refresh Kite to import a read-only broker snapshot.')
      ])
    ]);

    const observationChart = () => {
      const points = observationSeries.value.filter((item) => Number.isFinite(Number(item.close)));
      if (points.length < 2) return h('p', { class: 'muted-copy' }, 'A chart needs at least two supplied observations.');
      const values = points.map((item) => Number(item.close));
      const minimum = Math.min(...values); const maximum = Math.max(...values); const range = maximum - minimum || 1;
      const volumes = points.map((item) => Number(item.volume)).filter((value) => Number.isFinite(value) && value > 0);
      const maximumVolume = Math.max(...volumes, 1);
      const coordinates = points.map((item, index) => `${(index / (points.length - 1)) * 680 + 20},${170 - ((Number(item.close) - minimum) / range) * 125}`).join(' ');
      return h('div', { class: 'observation-chart' }, [
        h('div', { class: 'chart-axis' }, [`₹${maximum.toFixed(2)}`, h('span', `${points.length} supplied observations`), `₹${minimum.toFixed(2)}`]),
        h('svg', { viewBox: '0 0 720 220', role: 'img', 'aria-label': `Close-price${volumes.length ? ' and volume' : ''} chart from ${points.length} supplied observations` }, [
          h('line', { x1: 20, y1: 170, x2: 700, y2: 170, class: 'chart-grid-line' }),
          volumes.length ? h('g', { class: 'volume-bars', 'aria-hidden': 'true' }, points.map((item, index) => {
            const volume = Number(item.volume); const height = Number.isFinite(volume) && volume > 0 ? (volume / maximumVolume) * 28 : 0;
            return h('rect', { key: `volume:${item.source_timestamp}:${index}`, x: (index / (points.length - 1)) * 680 + 16, y: 205 - height, width: Math.max(2, 640 / points.length), height, class: 'volume-bar' });
          })) : null,
          h('polyline', { points: coordinates, class: 'chart-line', fill: 'none' }),
          ...points.map((item, index) => h('circle', { key: `${item.source_timestamp}:${index}`, cx: (index / (points.length - 1)) * 680 + 20, cy: 170 - ((Number(item.close) - minimum) / range) * 125, r: 3, class: 'chart-point' }))
        ]),
        h('p', { class: 'muted-copy chart-caption' }, `Range ${new Date(points[0].source_timestamp).toLocaleDateString()}–${new Date(points.at(-1)!.source_timestamp).toLocaleDateString()}. This is a supplied ${points[0].observation_type} series${volumes.length ? ' with supplied volume bars' : ' with no supplied volume values'}, not a live price chart.`)
      ]);
    };

    const exploreView = () => h('section', { class: 'catalogue-view' }, [
      h('article', { class: 'card catalogue-search-card' }, [
        h('div', [h('h2', 'Instrument catalogue'), h('p', 'Search local, reviewed listings only. No paid market-data endpoint is called.')]),
        h('div', { class: 'catalogue-search-row' }, [
          h('label', { class: 'sr-only', for: 'catalogue-search' }, 'Search symbol, company, or ISIN'),
          h('input', { id: 'catalogue-search', class: 'text-input', placeholder: 'Search symbol, company, or ISIN', value: catalogueQuery.value, onInput: (event: Event) => catalogueQuery.value = (event.target as HTMLInputElement).value, onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void searchCatalogue(); } }),
          h('button', { type: 'button', class: 'button button-primary', disabled: catalogueLoading.value, onClick: searchCatalogue }, catalogueLoading.value ? 'Searching…' : 'Search')
        ])
      ]),
      h('article', { class: 'card catalogue-results', 'aria-live': 'polite' }, [
        h('h2', 'Results'),
        catalogueItems.value.length ? h('div', { class: 'catalogue-table-wrap' }, [h('table', { class: 'catalogue-table' }, [
          h('thead', [h('tr', [h('th', 'Symbol'), h('th', 'Company'), h('th', 'Exchange'), h('th', 'ISIN'), h('th', 'Source')])]),
          h('tbody', catalogueItems.value.map((item) => h('tr', { key: item.instrument_id, tabindex: 0, style: 'cursor:pointer', onClick: () => void loadObservations(item), onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void loadObservations(item); } }, [h('td', item.symbol), h('td', item.name), h('td', item.exchange), h('td', item.isin || '—'), h('td', `${item.source_name}${item.data_mode === 'synthetic' ? ' · Synthetic' : ''}`)])))
        ])]) : h('p', { class: 'muted-copy' }, catalogueNotice.value || 'Search by company name, symbol, or ISIN.')
      ]),
      selectedInstrument.value ? h('article', { class: 'card catalogue-results' }, [h('h2', `${selectedInstrument.value.symbol} observations`), h('p', { class: 'muted-copy', 'aria-live': 'polite' }, `${observationCount.value} records · ${observationNotice.value}`), observationChart()]) : null,
      selectedInstrument.value ? h('article', { class: 'card catalogue-results evidence-panel' }, [
        h('h2', `${selectedInstrument.value.symbol} evidence`),
        evidenceItems.value.length ? h('ul', { class: 'evidence-list' }, evidenceItems.value.map((item) => h('li', { key: item.evidence_id }, [
          h('a', { href: item.source_url, target: '_blank', rel: 'noreferrer noopener' }, item.title),
          h('span', { class: 'evidence-meta' }, `${item.status.replace('_', ' ')} · published ${item.published_at ? new Date(item.published_at).toLocaleDateString() : 'unknown'} · retrieved ${new Date(item.retrieved_at).toLocaleDateString()}`),
          h('p', item.excerpt)
        ]))) : h('p', { class: 'muted-copy', 'aria-live': 'polite' }, evidenceNotice.value),
        h('p', { class: 'muted-copy evidence-disclaimer' }, 'Evidence can support review but does not establish causal attribution or ownership data.')
      ]) : null,
      h('details', { class: 'card catalogue-import-card' }, [
        h('summary', 'Import a reviewed catalogue CSV'),
        h('p', 'Required columns: exchange, symbol, name. Optional: isin, provider, provider_instrument_key, valid_from, valid_to. Synthetic catalogues remain visibly synthetic.'),
        h('div', { class: 'catalogue-import-grid' }, [
          h('div', { class: 'field' }, [h('label', { for: 'source-key' }, 'Source key'), h('input', { id: 'source-key', class: 'text-input', value: catalogueSourceKey.value, onInput: (event: Event) => catalogueSourceKey.value = (event.target as HTMLInputElement).value })]),
          h('div', { class: 'field' }, [h('label', { for: 'source-name' }, 'Reviewed source'), h('input', { id: 'source-name', class: 'text-input', value: catalogueSourceName.value, onInput: (event: Event) => catalogueSourceName.value = (event.target as HTMLInputElement).value })]),
          h('div', { class: 'field' }, [h('label', { for: 'catalogue-as-of' }, 'Source as of'), h('input', { id: 'catalogue-as-of', class: 'text-input', type: 'datetime-local', value: catalogueAsOf.value, onInput: (event: Event) => catalogueAsOf.value = (event.target as HTMLInputElement).value })]),
          h('div', { class: 'field' }, [h('label', { for: 'catalogue-mode' }, 'Catalogue mode'), h('select', { id: 'catalogue-mode', class: 'text-input', value: catalogueMode.value, onChange: (event: Event) => catalogueMode.value = (event.target as HTMLSelectElement).value }, [h('option', { value: 'manual' }, 'Manual / reviewed'), h('option', { value: 'synthetic' }, 'Synthetic'), h('option', { value: 'licensed' }, 'Licensed')])]),
          h('div', { class: 'field catalogue-file-field' }, [h('label', { for: 'catalogue-file' }, 'CSV file'), h('input', { id: 'catalogue-file', type: 'file', accept: '.csv,text/csv', onChange: (event: Event) => catalogueFile.value = (event.target as HTMLInputElement).files?.[0] ?? null })])
        ]),
        h('button', { type: 'button', class: 'button button-primary', disabled: catalogueLoading.value, onClick: importCatalogue }, catalogueLoading.value ? 'Importing…' : 'Import catalogue')
      ])
    ]);

    const shellView = () => h('div', { class: 'app-shell' }, [
      h('aside', { class: `sidebar${mobileNavOpen.value ? ' open' : ''}`, 'aria-label': 'Primary navigation' }, [
        h('div', { class: 'sidebar-brand' }, [h('span', { class: 'brand-symbol', 'aria-hidden': 'true' }, 'T'), h('span', 'Trade')]),
        h('nav', { class: 'nav-list' }, navigation.map(([label, icon]) => h('button', {
          type: 'button', class: `nav-button${activePage.value === label ? ' active' : ''}`,
          'aria-current': activePage.value === label ? 'page' : undefined,
          onClick: () => { activePage.value = label; mobileNavOpen.value = false; if (label === 'Explore') void searchCatalogue(); if (label === 'Portfolio') void loadPortfolio(); if (label === 'Alerts') void loadReminders(); if (label === 'Research / Chat') void loadResearchRequests(); if (label === 'Paper Trading') void loadPaperAccounts(); }
        }, [`${icon}  ${label}`]))),
        h('div', { class: 'sidebar-footer' }, [
          h('div', { class: 'owner-name' }, owner.value?.displayName ?? 'Local owner'),
          h('button', { type: 'button', class: 'button logout-button', onClick: logout }, 'Logout')
        ])
      ]),
      h('main', { class: 'app-main' }, [
        h('header', { class: 'topbar' }, [
          h('div', { class: 'topbar-left' }, [
            h('button', { type: 'button', class: 'mobile-menu', 'aria-label': 'Open navigation', onClick: () => mobileNavOpen.value = !mobileNavOpen.value }, '☰'),
            h('h1', { class: 'page-title' }, activePage.value)
          ]),
          h('div', { class: 'mode-badge' }, [h('span', { class: 'mode-dot' }), runMode.value.toUpperCase()])
        ]),
        h('div', { class: 'content' }, [
          activePage.value === 'Portfolio' ? portfolioMvpView() : null,
          activePage.value === 'Portfolio' ? h('div', { class: 'metric-grid' }, [
            h('article', { class: 'card metric-card' }, [h('div', { class: 'metric-label' }, 'Accounts'), h('div', { class: 'metric-value' }, String(portfolioAccounts.value.length))]),
            h('article', { class: 'card metric-card' }, [h('div', { class: 'metric-label' }, 'Valuation'), h('div', { class: 'metric-value' }, 'Unavailable')]),
            h('article', { class: 'card metric-card' }, [h('div', { class: 'metric-label' }, 'Data status'), h('div', { class: 'metric-value', style: 'font-size:18px' }, 'Synthetic')])
          ]) : null,
          activePage.value === 'Portfolio' ? h('section', { class: 'card catalogue-results', style: 'margin-top:16px' }, [h('h2', 'Manual accounts'), h('div', { class: 'catalogue-search-row' }, [h('label', { class: 'sr-only', for: 'new-account' }, 'New manual account'), h('input', { id: 'new-account', class: 'text-input', placeholder: 'Account name', value: newAccountLabel.value, onInput: (event: Event) => newAccountLabel.value = (event.target as HTMLInputElement).value, onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') void createPortfolioAccount(); } }), h('button', { type: 'button', class: 'button button-primary', disabled: accountSubmitting.value, onClick: createPortfolioAccount }, accountSubmitting.value ? 'Creating…' : 'Add account')]), portfolioAccounts.value.length ? h('ul', { class: 'account-list' }, portfolioAccounts.value.map((account) => h('li', { key: account.account_id }, `${account.label} · ${account.account_type} · ${account.trade_count} trades`))) : h('p', { class: 'muted-copy' }, portfolioNotice.value || 'Loading accounts…')]) : activePage.value === 'Explore' ? exploreView() : activePage.value === 'Alerts' ? h('section', { class: 'card catalogue-results' }, [h('h2', 'Review reminders'), reminders.value.length ? h('ul', { class: 'account-list' }, reminders.value.map((reminder) => h('li', { key: reminder.reminder_id }, `${new Date(reminder.due_at).toLocaleString()} · ${reminder.note || reminder.status}`))) : h('p', { class: 'muted-copy' }, reminderNotice.value || 'Loading reminders…')]) : activePage.value === 'Research / Chat' ? h('section', { class: 'card catalogue-results' }, [h('h2', 'Manual research requests'), researchRequests.value.length ? h('ul', { class: 'account-list' }, researchRequests.value.map((item) => h('li', { key: item.request_id }, `${item.symbol} · ${item.status} · ${item.horizon} — ${item.question}`))) : h('p', { class: 'muted-copy' }, researchNotice.value || 'Loading research requests…')]) : activePage.value === 'Paper Trading' ? h('section', { class: 'card catalogue-results' }, [h('h2', 'Synthetic paper accounts'), paperAccounts.value.length ? h('ul', { class: 'account-list' }, paperAccounts.value.map((item) => h('li', { key: item.virtual_account_id }, `${item.label} · ₹${item.cash_balance} · ${item.mode}`))) : h('p', { class: 'muted-copy' }, paperNotice.value || 'Loading paper accounts…')]) : h('section', { class: 'card empty-state', style: activePage.value === 'Portfolio' ? 'margin-top:16px' : '' }, [
            h('div', { class: 'empty-inner' }, [
              h('div', { class: 'empty-icon', 'aria-hidden': 'true' }, '—'),
              h('h2', emptyCopy[activePage.value]?.[0] ?? activePage.value),
              h('p', emptyCopy[activePage.value]?.[1] ?? 'This feature is awaiting implementation.'),
              h('div', { class: 'status-row', style: 'justify-content:center' }, [
                h('span', { class: 'status-badge status-warning' }, 'Not implemented'),
                h('span', { class: 'status-badge status-neutral' }, 'Synthetic mode')
              ]),
              activePage.value === 'Settings' ? h('button', { type: 'button', class: 'button button-primary', onClick: saveSettings }, 'Save local preference') : null,
              success.value ? h('div', { class: 'feedback feedback-success', role: 'status' }, success.value) : null,
              error.value ? h('div', { class: 'feedback feedback-error', role: 'alert' }, error.value) : null
            ])
          ])
        ])
      ])
    ]);

    return () => h('div', null, loading.value ? h('main', { class: 'auth-page' }, [h('section', { class: 'auth-panel' }, [h('p', 'Loading secure session…')])]) : (owner.value ? shellView() : authView()));
  }
}).mount('#app');
