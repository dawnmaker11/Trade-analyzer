export type PricePoint = { timestamp: string; close: number };

export function calculatePeriodReturn(points: PricePoint[]) {
  if (points.length < 2) return null;
  const ordered = [...points].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const first = ordered[0];
  const last = ordered.at(-1)!;
  if (first.close <= 0) return null;
  return {
    start: first.timestamp,
    end: last.timestamp,
    startClose: first.close,
    endClose: last.close,
    percent: ((last.close - first.close) / first.close) * 100
  };
}
