export type Customer = {
  id: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  email: string | null;
  lineUserId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles?: Vehicle[];
  /** 一覧 API のみ */
  primaryPlate?: string | null;
  primaryVehicleLabel?: string | null;
};

export type Vehicle = {
  id: string;
  customerId: string;
  maker: string;
  model: string;
  plate: string;
  vin: string | null;
  inspectionExpireDate: string;
  initialMileage: number;
  initialMileageRecordedAt: string;
  monthlyAvgKm: number | null;
  lastOilChangeMileage: number | null;
  lastOilChangeAt: string | null;
  oilIntervalKm: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  name: string;
  furigana?: string;
  phone?: string;
  email?: string;
  lineUserId?: string;
  status?: string;
  notes?: string;
};

export type VehicleInput = {
  maker: string;
  model: string;
  plate: string;
  vin?: string;
  inspectionExpireDate: string;
  initialMileage?: number;
  initialMileageRecordedAt?: string;
  monthlyAvgKm?: number | null;
  lastOilChangeMileage?: number | null;
  lastOilChangeAt?: string | null;
  oilIntervalKm?: number;
};

export type ListTarget = {
  customerId: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  vehicleId: string;
  maker: string;
  model: string;
  plate: string;
  inspectionExpireDate: string;
  daysUntilInspection: number | null;
  estimatedMileage: number | null;
  hasLine: boolean;
  hasConsent: boolean;
  rule: string;
  ruleLabel: string;
  nextOilTargetKm?: number;
  oilOverageKm?: number;
};

export type QuoteLineItem = {
  label: string;
  amount: number;
  quantity: number;
  unit_price: number;
  tax_treatment: 'NON_TAXABLE' | 'TAXABLE_10';
  category?: string;
};

export type Quote = {
  id: string;
  vehicleId: string;
  quoteNo: string;
  status: string;
  totalAmount: number;
  legalItems: QuoteLineItem[];
  serviceItems: QuoteLineItem[];
  notes: string | null;
  validUntil: string | null;
  issuedAt: string | null;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceHistory = {
  id: string;
  vehicleId: string;
  title: string;
  performedAt: string;
  mileage: number | null;
  notes: string | null;
  createdAt: string;
};

export type LineUnmatchedItem = {
  id: string;
  lineUserId: string;
  displayName: string | null;
  lastText: string | null;
  lastMessageAt: string | null;
  createdAt: string;
};

export type NotificationJob = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  vehicleId: string | null;
  ruleKey: string;
  channel: string;
  templateKey: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse = {
  rule: string;
  label: string;
  targets: ListTarget[];
};
