import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const backupDir = path.resolve(root, '../backup/kuruma');

function parseCsvFile(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
      if (ch === '\r') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows[0];
  return rows.slice(1).map((vals) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? '';
    });
    return obj;
  });
}

function parseCsv(text) {
  return parseCsvFile(text.trim());
}

function sql(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function iso(ts) {
  if (!ts) return new Date().toISOString();
  return ts.replace(' ', 'T').replace('+00', 'Z').replace(/\.\d+Z$/, 'Z');
}

function dateOnly(d) {
  if (!d) return null;
  return d.slice(0, 10);
}

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(backupDir, name), 'utf8'));
}

const customers = readCsv('customers_rows.csv');
const vehicles = readCsv('vehicles_rows.csv');
const consents = readCsv('consents_rows.csv');
const statutory = readCsv('statutory_fee_rates_rows.csv');
const histories = readCsv('service_histories_rows.csv');
const quotes = readCsv('quotes_rows.csv');
const templates = readCsv('template_versions_rows.csv');
const rules = readCsv('notification_rules_rows.csv');

function pickActiveLineTemplates(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.channel !== 'LINE') continue;
    if (row.active !== 'true' && row.active !== '1') continue;
    const key = row.template_key;
    const prev = map.get(key);
    const version = Number(row.version) || 1;
    if (!prev || version > (Number(prev.version) || 1)) map.set(key, row);
  }
  return [...map.values()];
}

const lineTemplates = pickActiveLineTemplates(templates);

let out = `-- Demo seed for kuruma_cf
-- Source: backup/kuruma/*.csv

DELETE FROM notification_logs;
DELETE FROM notification_jobs;
DELETE FROM service_histories;
DELETE FROM quotes;
DELETE FROM consents;
DELETE FROM vehicles;
DELETE FROM customers;
DELETE FROM line_unmatched;
DELETE FROM notification_rules;
DELETE FROM template_versions;
DELETE FROM statutory_fee_rates;

`;

out += 'INSERT INTO customers (id, name, furigana, phone, email, line_user_id, status, notes, created_at, updated_at) VALUES\n';
out += customers
  .map(
    (c) =>
      `  (${sql(c.id)}, ${sql(c.name)}, ${sql(c.furigana || null)}, ${sql(c.phone || null)}, ${sql(c.email || null)}, ${sql(c.line_user_id || null)}, ${sql(c.status || 'ACTIVE')}, ${sql(c.notes || null)}, ${sql(iso(c.created_at))}, ${sql(iso(c.updated_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out +=
  'INSERT INTO vehicles (id, customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, initial_mileage_recorded_at, monthly_avg_km, last_oil_change_mileage, last_oil_change_at, oil_interval_km, vehicle_specs, created_at, updated_at) VALUES\n';
out += vehicles
  .map(
    (v) =>
      `  (${sql(v.id)}, ${sql(v.customer_id)}, ${sql(v.maker)}, ${sql(v.model)}, ${sql(v.plate)}, ${sql(v.vin || null)}, ${sql(dateOnly(v.inspection_expire_date))}, ${v.initial_mileage || 0}, ${sql(dateOnly(v.initial_mileage_recorded_at))}, ${v.monthly_avg_km ? v.monthly_avg_km : 'NULL'}, ${v.last_oil_change_mileage ? v.last_oil_change_mileage : 'NULL'}, ${v.last_oil_change_at ? sql(dateOnly(v.last_oil_change_at)) : 'NULL'}, ${v.oil_interval_km || 4000}, ${sql(v.vehicle_specs || '{}')}, ${sql(iso(v.created_at))}, ${sql(iso(v.updated_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out += 'INSERT INTO consents (id, customer_id, channel, opt_in, opt_out_at, source, updated_at) VALUES\n';
out += consents
  .map(
    (c) =>
      `  (${sql(c.id)}, ${sql(c.customer_id)}, ${sql(c.channel)}, ${c.opt_in === 'true' || c.opt_in === '1' ? 1 : 0}, ${c.opt_out_at ? sql(iso(c.opt_out_at)) : 'NULL'}, ${c.source ? sql(c.source) : 'NULL'}, ${sql(iso(c.updated_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out +=
  'INSERT INTO statutory_fee_rates (id, effective_from, vehicle_class, jibaiseki_24mo_yen, weight_tax_yen_standard, weight_tax_yen_eco, prepaid_inspection_yen, lane_stamp_yen, document_fee_yen, notes, created_at) VALUES\n';
out += statutory
  .map(
    (r) =>
      `  (${sql(r.id)}, ${sql(dateOnly(r.effective_from))}, ${sql(r.vehicle_class)}, ${r.jibaiseki_24mo_yen}, ${r.weight_tax_yen_standard}, ${r.weight_tax_yen_eco}, ${r.prepaid_inspection_yen || 2200}, ${r.lane_stamp_yen || 2300}, ${r.document_fee_yen || 770}, ${r.notes ? sql(r.notes) : 'NULL'}, ${sql(iso(r.created_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out +=
  'INSERT INTO service_histories (id, vehicle_id, title, performed_at, mileage, notes, created_at) VALUES\n';
out += histories
  .map(
    (h) =>
      `  (${sql(h.id)}, ${sql(h.vehicle_id)}, ${sql(h.title)}, ${sql(dateOnly(h.performed_at))}, ${h.mileage ? h.mileage : 'NULL'}, ${h.notes ? sql(h.notes) : 'NULL'}, ${sql(iso(h.created_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out += `INSERT INTO quotes (
  id, vehicle_id, quote_no, status, total_amount, legal_items, service_items, notes,
  valid_until, issued_at, taxable_subtotal_ex_tax, tax_amount_10, non_taxable_subtotal,
  grand_total, created_at, updated_at
) VALUES\n`;
out += quotes
  .map(
    (q) =>
      `  (${sql(q.id)}, ${sql(q.vehicle_id)}, ${sql(q.quote_no)}, ${sql(q.status || 'ISSUED')}, ${q.total_amount || q.grand_total || 0}, ${sql(q.legal_items)}, ${sql(q.service_items)}, ${q.notes ? sql(q.notes) : 'NULL'}, ${q.valid_until ? sql(dateOnly(q.valid_until)) : 'NULL'}, ${q.issued_at ? sql(iso(q.issued_at)) : 'NULL'}, ${q.taxable_subtotal_ex_tax || 0}, ${q.tax_amount_10 || 0}, ${q.non_taxable_subtotal || 0}, ${q.grand_total || q.total_amount || 0}, ${sql(iso(q.created_at))}, ${sql(iso(q.updated_at))})`,
  )
  .join(',\n');
out += ';\n\n';

out +=
  'INSERT INTO template_versions (id, template_key, channel, subject, content, version, active, created_at) VALUES\n';
out += lineTemplates
  .map(
    (t) =>
      `  (${sql(t.id)}, ${sql(t.template_key)}, ${sql(t.channel)}, ${t.subject ? sql(t.subject) : 'NULL'}, ${sql(t.content)}, ${t.version || 1}, 1, ${sql(iso(t.created_at))})`,
  )
  .join(',\n');
out += ';\n\n';

const extraRules = [
  {
    id: 'rule-shaken-30',
    rule_key: 'shaken_30days',
    rule_name: '車検30日前',
    kind: 'SHAKEN_DAYS_BEFORE',
    trigger_days_before: 30,
    template_key: 'shaken_30days',
  },
  {
    id: 'rule-shaken-overdue',
    rule_key: 'shaken_overdue',
    rule_name: '車検満了後',
    kind: 'SHAKEN_DAYS_BEFORE',
    trigger_days_before: 0,
    template_key: 'shaken_overdue',
  },
];

out +=
  'INSERT INTO notification_rules (id, rule_key, rule_name, kind, trigger_days_before, trigger_oil_interval_km, channels, template_key, active, created_at, updated_at) VALUES\n';
const allRules = [
  ...rules.map((r) => ({
    id: r.id,
    rule_key: r.rule_key,
    rule_name: r.rule_name,
    kind: r.kind,
    trigger_days_before: r.trigger_days_before || 'NULL',
    trigger_oil_interval_km: r.trigger_oil_interval_km || 'NULL',
    channels: '["LINE"]',
    template_key: r.template_key,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  })),
  ...extraRules.map((r) => ({
    ...r,
    trigger_oil_interval_km: 'NULL',
    channels: '["LINE"]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
];
out += allRules
  .map(
    (r) =>
      `  (${sql(r.id)}, ${sql(r.rule_key)}, ${sql(r.rule_name)}, ${sql(r.kind)}, ${r.trigger_days_before}, ${r.trigger_oil_interval_km}, ${sql(r.channels)}, ${sql(r.template_key)}, 1, ${sql(r.created_at)}, ${sql(r.updated_at)})`,
  )
  .join(',\n');
out += ';\n';

const outPath = path.join(root, 'seed/demo.sql');
fs.writeFileSync(outPath, out);
console.log(
  `Wrote ${outPath}: ${customers.length} customers, ${lineTemplates.length} LINE templates, ${allRules.length} rules`,
);
