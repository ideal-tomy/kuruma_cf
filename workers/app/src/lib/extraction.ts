import {
  computeEstimatedMileage,
  daysUntil,
  nextOilTargetKm,
  oilOverageKm,
} from './mileage';
import type { ConsentRow, CustomerRow, VehicleRow } from '../types';

export const LIST_RULES = [
  'shaken-overdue',
  'shaken-30',
  'shaken-90',
  'shaken-180',
  'oil',
] as const;

export type ListRule = (typeof LIST_RULES)[number];

export const LIST_RULE_LABELS: Record<ListRule, string> = {
  'shaken-overdue': '車検満了後',
  'shaken-30': '車検1か月前',
  'shaken-90': '車検3か月前',
  'shaken-180': '車検半年前',
  oil: 'オイル交換目安',
};

export type CustomerOverview = {
  customerId: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  email: string | null;
  lineUserId: string | null;
  status: string;
  vehicleId: string;
  maker: string;
  model: string;
  plate: string;
  inspectionExpireDate: string;
  initialMileage: number;
  initialMileageRecordedAt: string;
  monthlyAvgKm: number | null;
  lastOilChangeMileage: number | null;
  lastOilChangeAt: string | null;
  oilIntervalKm: number;
  estimatedMileage: number | null;
  daysUntilInspection: number | null;
  hasLine: boolean;
  hasConsent: boolean;
};

export type ListTarget = CustomerOverview & {
  rule: ListRule;
  ruleLabel: string;
  nextOilTargetKm?: number;
  oilOverageKm?: number;
};

type ConsentMap = Map<string, { line?: boolean; mail?: boolean }>;

function buildConsentMap(rows: ConsentRow[]): ConsentMap {
  const map: ConsentMap = new Map();
  for (const row of rows) {
    const entry = map.get(row.customer_id) ?? {};
    if (row.channel === 'LINE') entry.line = row.opt_in === 1;
    if (row.channel === 'MAIL') entry.mail = row.opt_in === 1;
    map.set(row.customer_id, entry);
  }
  return map;
}

function hasConsent(consents: ConsentMap, customerId: string): boolean {
  const c = consents.get(customerId);
  const lineOk = c?.line ?? true;
  const mailOk = c?.mail ?? true;
  return lineOk || mailOk;
}

export function buildOverviewRows(
  customers: CustomerRow[],
  vehicles: VehicleRow[],
  consents: ConsentRow[],
  asOf: Date = new Date(),
): CustomerOverview[] {
  const consentMap = buildConsentMap(consents);
  const vehiclesByCustomer = new Map<string, VehicleRow[]>();
  for (const v of vehicles) {
    const list = vehiclesByCustomer.get(v.customer_id) ?? [];
    list.push(v);
    vehiclesByCustomer.set(v.customer_id, list);
  }

  const rows: CustomerOverview[] = [];
  for (const c of customers) {
    if (c.status !== 'ACTIVE') continue;
    const vehicleList = vehiclesByCustomer.get(c.id) ?? [];
    for (const v of vehicleList) {
      const estimated = computeEstimatedMileage(
        v.initial_mileage,
        v.initial_mileage_recorded_at,
        v.monthly_avg_km,
        asOf,
      );
      rows.push({
        customerId: c.id,
        name: c.name,
        furigana: c.furigana,
        phone: c.phone,
        email: c.email,
        lineUserId: c.line_user_id,
        status: c.status,
        vehicleId: v.id,
        maker: v.maker,
        model: v.model,
        plate: v.plate,
        inspectionExpireDate: v.inspection_expire_date,
        initialMileage: v.initial_mileage,
        initialMileageRecordedAt: v.initial_mileage_recorded_at,
        monthlyAvgKm: v.monthly_avg_km,
        lastOilChangeMileage: v.last_oil_change_mileage,
        lastOilChangeAt: v.last_oil_change_at,
        oilIntervalKm: v.oil_interval_km,
        estimatedMileage: estimated,
        daysUntilInspection: daysUntil(v.inspection_expire_date, asOf),
        hasLine: Boolean(c.line_user_id),
        hasConsent: hasConsent(consentMap, c.id),
      });
    }
  }
  return rows;
}

function matchesRule(row: CustomerOverview, rule: ListRule): boolean {
  if (!row.hasConsent) return false;
  const days = row.daysUntilInspection;
  switch (rule) {
    case 'shaken-180':
      return days != null && days >= 150 && days <= 210;
    case 'shaken-90':
      return days != null && days >= 60 && days <= 100;
    case 'shaken-30':
      return days != null && days >= 0 && days <= 30;
    case 'shaken-overdue':
      return days != null && days >= -90 && days <= -1;
    case 'oil': {
      const overage = oilOverageKm(
        row.estimatedMileage,
        row.lastOilChangeMileage,
        row.initialMileage,
        row.oilIntervalKm,
      );
      return overage >= -200;
    }
    default:
      return false;
  }
}

export function filterByRule(rows: CustomerOverview[], rule: ListRule): ListTarget[] {
  return rows
    .filter((row) => matchesRule(row, rule))
    .map((row) => {
      const target: ListTarget = {
        ...row,
        rule,
        ruleLabel: LIST_RULE_LABELS[rule],
      };
      if (rule === 'oil') {
        target.nextOilTargetKm = nextOilTargetKm(
          row.lastOilChangeMileage,
          row.initialMileage,
          row.oilIntervalKm,
        );
        target.oilOverageKm = oilOverageKm(
          row.estimatedMileage,
          row.lastOilChangeMileage,
          row.initialMileage,
          row.oilIntervalKm,
        );
      }
      return target;
    })
    .sort((a, b) => {
      if (rule === 'oil') {
        return (b.oilOverageKm ?? 0) - (a.oilOverageKm ?? 0);
      }
      return (a.daysUntilInspection ?? 9999) - (b.daysUntilInspection ?? 9999);
    });
}

export function countByRules(rows: CustomerOverview[]): Record<ListRule, number> {
  const counts = Object.fromEntries(LIST_RULES.map((r) => [r, 0])) as Record<ListRule, number>;
  for (const rule of LIST_RULES) {
    counts[rule] = filterByRule(rows, rule).length;
  }
  return counts;
}

export async function loadOverviewFromDb(db: D1Database, asOf = new Date()): Promise<CustomerOverview[]> {
  const [customersRes, vehiclesRes, consentsRes] = await Promise.all([
    db.prepare('SELECT * FROM customers ORDER BY name ASC').all<CustomerRow>(),
    db.prepare('SELECT * FROM vehicles ORDER BY plate ASC').all<VehicleRow>(),
    db.prepare('SELECT * FROM consents').all<ConsentRow>(),
  ]);
  return buildOverviewRows(
    customersRes.results ?? [],
    vehiclesRes.results ?? [],
    consentsRes.results ?? [],
    asOf,
  );
}

export function isListRule(value: string): value is ListRule {
  return (LIST_RULES as readonly string[]).includes(value);
}
