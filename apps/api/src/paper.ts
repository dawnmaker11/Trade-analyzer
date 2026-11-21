export function reserveCash(balance:number, quantity:number, price:number, fee=0){const required=quantity*price+fee;if(required>balance)throw new Error('Insufficient synthetic cash.');return {required,remaining:balance-required};}

export type SyntheticFill = {
  instrumentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  fillPrice: number;
  fee: number;
  filledAt: string;
};

type Lot = { quantity: number; unitCost: number };

export function summarizeSyntheticPerformance(fills: SyntheticFill[]) {
  const lots = new Map<string, Lot[]>();
  const symbols = new Map<string, string>();
  let realisedPnl = 0;
  let closedQuantity = 0;

  for (const fill of [...fills].sort((left, right) => left.filledAt.localeCompare(right.filledAt))) {
    symbols.set(fill.instrumentId, fill.symbol);
    const instrumentLots = lots.get(fill.instrumentId) ?? [];
    lots.set(fill.instrumentId, instrumentLots);
    if (fill.side === 'buy') {
      instrumentLots.push({ quantity: fill.quantity, unitCost: (fill.fillPrice * fill.quantity + fill.fee) / fill.quantity });
      continue;
    }
    let remaining = fill.quantity;
    let cost = 0;
    while (remaining > 0 && instrumentLots.length) {
      const lot = instrumentLots[0];
      const consumed = Math.min(remaining, lot.quantity);
      cost += consumed * lot.unitCost;
      lot.quantity -= consumed;
      remaining -= consumed;
      if (lot.quantity === 0) instrumentLots.shift();
    }
    if (remaining > 0) throw new Error('Synthetic performance cannot value a sell without an earlier filled buy.');
    realisedPnl += fill.fillPrice * fill.quantity - fill.fee - cost;
    closedQuantity += fill.quantity;
  }

  const positions = [...lots.entries()].flatMap(([instrumentId, instrumentLots]) => {
    const quantity = instrumentLots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (!quantity) return [];
    const cost = instrumentLots.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0);
    return [{ instrumentId, symbol: symbols.get(instrumentId) ?? instrumentId, quantity, cost }];
  });
  return { realisedPnl, closedQuantity, positions };
}
