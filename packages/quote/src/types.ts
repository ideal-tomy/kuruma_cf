export type StatutoryFeeRateRow = {
  id: string;
  effective_from: string;
  vehicle_class: 'LIGHT' | 'STANDARD';
  jibaiseki_24mo_yen: number;
  weight_tax_yen_standard: number;
  weight_tax_yen_eco: number;
  prepaid_inspection_yen: number;
  lane_stamp_yen: number;
  document_fee_yen: number;
  notes: string | null;
  created_at: string;
};
