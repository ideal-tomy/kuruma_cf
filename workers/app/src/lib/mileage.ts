const DAYS_PER_MONTH = 30.4375;

export function computeEstimatedMileage(
  initialMileage: number | null | undefined,
  initialRecordedAt: string | null | undefined,
  monthlyAvgKm: number | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (initialMileage == null || initialRecordedAt == null) return initialMileage ?? null;
  const recorded = new Date(initialRecordedAt + 'T00:00:00');
  if (Number.isNaN(recorded.getTime())) return initialMileage ?? null;
  const days = Math.max(0, (asOf.getTime() - recorded.getTime()) / (1000 * 60 * 60 * 24));
  const months = days / DAYS_PER_MONTH;
  return Math.max(0, Math.round(initialMileage + (monthlyAvgKm ?? 0) * months));
}

export function daysUntil(date: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!date) return null;
  const target = new Date(date + 'T00:00:00');
  if (Number.isNaN(target.getTime())) return null;
  const asOfDate = new Date(asOf.toISOString().slice(0, 10) + 'T00:00:00');
  return Math.round((target.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function nextOilTargetKm(
  lastOilChangeMileage: number | null | undefined,
  initialMileage: number | null | undefined,
  oilIntervalKm: number,
): number {
  return (lastOilChangeMileage ?? initialMileage ?? 0) + oilIntervalKm;
}

export function oilOverageKm(
  estimatedMileage: number | null | undefined,
  lastOilChangeMileage: number | null | undefined,
  initialMileage: number | null | undefined,
  oilIntervalKm: number,
): number {
  return (estimatedMileage ?? 0) - nextOilTargetKm(lastOilChangeMileage, initialMileage, oilIntervalKm);
}
