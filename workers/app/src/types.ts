export type CustomerRow = {
  id: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  email: string | null;
  line_user_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  customer_id: string;
  maker: string;
  model: string;
  plate: string;
  vin: string | null;
  inspection_expire_date: string;
  initial_mileage: number;
  initial_mileage_recorded_at: string;
  monthly_avg_km: number | null;
  last_oil_change_mileage: number | null;
  last_oil_change_at: string | null;
  oil_interval_km: number;
  vehicle_specs: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsentRow = {
  id: string;
  customer_id: string;
  channel: string;
  opt_in: number;
  opt_out_at: string | null;
  source: string | null;
  updated_at: string;
};

export type CustomerInput = {
  name?: string;
  furigana?: string | null;
  phone?: string | null;
  email?: string | null;
  lineUserId?: string | null;
  status?: string;
  notes?: string | null;
};

export type QuoteRow = {
  id: string;
  vehicle_id: string;
  quote_no: string;
  status: string;
  total_amount: number;
  legal_items: string;
  service_items: string;
  notes: string | null;
  valid_until: string | null;
  issued_at: string | null;
  taxable_subtotal_ex_tax: number;
  tax_amount_10: number;
  non_taxable_subtotal: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
};

export type TemplateVersionRow = {
  id: string;
  template_key: string;
  channel: string;
  subject: string | null;
  content: string;
  version: number;
  active: number;
  created_at: string;
};

export type NotificationJobRow = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  rule_key: string;
  channel: string;
  template_key: string;
  scheduled_at: string;
  status: string;
  attempts: number;
  idempotency_key: string;
  payload: string;
  last_error: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceHistoryRow = {
  id: string;
  vehicle_id: string;
  title: string;
  performed_at: string;
  mileage: number | null;
  notes: string | null;
  created_at: string;
};

export type NotificationRuleRow = {
  id: string;
  rule_key: string;
  rule_name: string;
  kind: string;
  trigger_days_before: number | null;
  trigger_oil_interval_km: number | null;
  channels: string;
  template_key: string;
  active: number;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  resource: string | null;
  payload: string;
  created_at: string;
};

export type VehicleInput = {
  maker?: string;
  model?: string;
  plate?: string;
  vin?: string | null;
  inspectionExpireDate?: string;
  initialMileage?: number;
  initialMileageRecordedAt?: string;
  monthlyAvgKm?: number | null;
  lastOilChangeMileage?: number | null;
  lastOilChangeAt?: string | null;
  oilIntervalKm?: number;
};
