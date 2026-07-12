export const CRM_STATUSES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;

export const DATA_SOURCES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number] | '';
export type DataSource = (typeof DATA_SOURCES)[number] | '';

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface ParsedResultRow {
  row_index: number;
  status: 'imported' | 'skipped';
  reason?: string; // why it was skipped, or a short note on ambiguous mapping
  confidence?: number; // 0-1, model's self-reported mapping confidence
  record?: CrmRecord;
  raw?: Record<string, string>;
}

export interface ExtractBatchResponse {
  results: ParsedResultRow[];
}

export interface ExtractProgress {
  batchIndex: number;
  totalBatches: number;
  imported: number;
  skipped: number;
}
