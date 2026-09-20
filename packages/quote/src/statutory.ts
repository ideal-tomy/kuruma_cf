import type { StatutoryFeeRateRow } from './types';

/** asOf: YYYY-MM-DD */
export function pickStatutoryFeeRow(
  rates: StatutoryFeeRateRow[],
  vehicleClass: 'LIGHT' | 'STANDARD',
  asOfDate: string,
): StatutoryFeeRateRow | null {
  const cutoff = asOfDate.slice(0, 10);
  const filtered = rates
    .filter((r) => r.vehicle_class === vehicleClass && r.effective_from <= cutoff)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : a.effective_from > b.effective_from ? -1 : 0));
  return filtered[0] ?? null;
}
