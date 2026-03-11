export type WorkStatus = 'pre_obra' | 'em_andamento' | 'em_orcamento' | 'finalizada' | 'pos_obra';

export type BillingAddressType = 'obra' | 'cliente' | 'empresa' | 'outro';

export type Frequency = 'semanal' | 'quinzenal' | 'mensal';

export type TrackingType = 'custo' | 'valor_vendas' | 'ambos';

export type TaxAdminType = 'tipo_custo' | 'fase_obra';

export interface Work {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  category?: string;
  status: WorkStatus;
  observation?: string;
  photo_url?: string;

  start_date?: string;
  duration?: number;
  duration_unit?: string;
  end_date?: string;

  cno?: string;
  area?: number;
  contractor?: string;
  technical_manager?: string;
  art_number?: string;
  work_manager?: string;

  work_zip_code?: string;
  work_address?: string;
  work_number?: string;
  work_neighborhood?: string;
  work_complement?: string;
  work_state?: string;
  work_city?: string;

  billing_address_type?: BillingAddressType;
  billing_zip_code?: string;
  billing_address?: string;
  billing_number?: string;
  billing_neighborhood?: string;
  billing_complement?: string;
  billing_state?: string;
  billing_city?: string;

  billing_type?: string;
  billing_frequency?: Frequency;
  document_type?: string;
  planning_frequency?: Frequency;
  tracking_type?: TrackingType;
  work_days?: string[];
  client_access?: boolean;
  tax_admin_type?: TaxAdminType;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface WorkContact {
  id: string;
  work_id: string;
  origin?: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  observation?: string;
  created_at?: string;
}
