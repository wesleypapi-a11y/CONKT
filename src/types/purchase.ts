export interface PurchaseRequest {
  id: string;
  request_number: string;
  work_id: string | null;
  phase_id?: string | null;
  subphase_id?: string | null;
  status: 'aberta' | 'mapa' | 'cotando' | 'aprovada' | 'cancelada';
  requester_id: string | null;
  need_date: string | null;
  description: string;
  contact_name?: string;
  contact_whatsapp?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  item_type: 'item_livre' | 'insumo' | 'servico';
  phase_id: string | null;
  subphase_id: string | null;
  item_name: string;
  complement: string;
  quantity: number;
  unit: string;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
}

export interface Quotation {
  id: string;
  request_id: string;
  supplier_id: string;
  total_value: number;
  delivery_time: string | null;
  payment_conditions: string | null;
  observations: string | null;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  request_item_id: string;
  phase_id?: string | null;
  subphase_id?: string | null;
  unit_price: number;
  total_price: number;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  request_id: string;
  quotation_id: string | null;
  supplier_id: string;
  total_value: number;
  delivery_address: string | null;
  delivery_date: string | null;
  payment_conditions: string | null;
  observations: string | null;
  status: 'aberto' | 'aprovado' | 'cancelado' | 'recebido';
  requester_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  frozen: boolean;
  is_paid?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialEntry {
  id: string;
  subphase_id: string;
  purchase_order_id: string | null;
  entry_type: 'debito' | 'credito';
  value: number;
  description: string | null;
  origin: string;
  reference_number: string | null;
  status: 'ativo' | 'cancelado';
  requester_id: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
}
