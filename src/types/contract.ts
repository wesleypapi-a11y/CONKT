export type ContractStatus = 'ativo' | 'concluido' | 'cancelado';
export type InstallmentStatus = 'pendente' | 'pago' | 'parcial';
export type AttachmentType = 'escopo' | 'proposta' | 'orcamento' | 'outro';
export type ContractVinculo = 'com_vinculo' | 'sem_vinculo';

export interface Contract {
  id: string;
  user_id: string;
  client_id: string;
  work_id: string;
  budget_id?: string;
  supplier_id: string;
  contract_number: string;
  contract_date: string;
  total_value: number;
  payment_method: string;
  installments_count: number;
  first_due_date?: string;
  recurrence_days?: number;
  budget_phase_id?: string;
  budget_subphase_id?: string;
  scope: string;
  internal_notes: string;
  status: ContractStatus;
  vinculo: ContractVinculo;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
}

export interface ContractInstallment {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
  paid_date?: string | null;
  paid_amount?: number | null;
  purchase_order_number?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ContractAttachment {
  id: string;
  contract_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: AttachmentType;
  created_at: string;
  created_by: string;
}
