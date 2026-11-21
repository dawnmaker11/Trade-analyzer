export interface LedgerTrade { tradeId: string; type: 'buy' | 'sell'; quantity: number; price: number; fees: number; date: string; }
export interface Valuation { quantity: number; cost: number; realisedPnl: number; unrealisedPnl: number | null; marketValue: number | null; priceAsOf: string | null; }
export interface CorporateAction { type: 'split' | 'bonus'; effectiveOn: string; numerator: number; denominator: number; }
export function applyCorporateActions(trades: LedgerTrade[], actions: CorporateAction[]): LedgerTrade[] {
  return trades.map((trade) => actions.filter((action) => action.effectiveOn > trade.date).sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn)).reduce((adjusted, action) => {
    const factor = action.type === 'split' ? action.numerator / action.denominator : 1 + action.numerator / action.denominator;
    return { ...adjusted, quantity: adjusted.quantity * factor, price: adjusted.price / factor, fees: adjusted.fees };
  }, { ...trade }));
}
export function fifoValuation(trades: LedgerTrade[], marketPrice?: number, priceAsOf?: string): Valuation {
  const lots: Array<{ quantity: number; unitCost: number }> = []; let realised = 0;
  for (const trade of [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.tradeId.localeCompare(b.tradeId))) {
    if (trade.type === 'buy') lots.push({ quantity: trade.quantity, unitCost: (trade.quantity * trade.price + trade.fees) / trade.quantity });
    else { let remaining = trade.quantity; let proceeds = trade.quantity * trade.price - trade.fees; while (remaining > 0 && lots.length) { const lot = lots[0]; const used = Math.min(remaining, lot.quantity); realised += proceeds * (used / trade.quantity) - used * lot.unitCost; lot.quantity -= used; remaining -= used; if (!lot.quantity) lots.shift(); } if (remaining > 0) throw new Error('Sell quantity exceeds available quantity.'); }
  }
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0); const cost = lots.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0);
  return { quantity, cost, realisedPnl: realised, marketValue: marketPrice === undefined ? null : quantity * marketPrice, unrealisedPnl: marketPrice === undefined ? null : quantity * marketPrice - cost, priceAsOf: marketPrice === undefined ? null : priceAsOf ?? null };
}
