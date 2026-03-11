export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_type: 'conta_corrente' | 'poupanca' | 'investimento';
  agency?: string;
  account_number?: string;
  initial_balance: number;
  current_balance: number;
  status: 'ativa' | 'inativa';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'operacional' | 'administrativo' | 'investimento' | 'financeiro';
  work_id?: string;
  work_name?: string;
  parent_id?: string;
  parent_name?: string;
  status: 'ativa' | 'inativa';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialDocument {
  id: string;
  document_number: string;
  document_type: 'provisao' | 'previsao' | 'adiantamento' | 'receber' | 'pagar';
  transaction_type: 'receita' | 'despesa';
  work_id?: string;
  work_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  client_id?: string;
  client_name?: string;
  purchase_order_id?: string;
  financial_account_id?: string;
  financial_account_name?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_date?: string;
  payment_method?: 'dinheiro' | 'pix' | 'ted' | 'doc' | 'boleto' | 'cartao_credito' | 'cartao_debito' | 'cheque';
  bank_account_id?: string;
  bank_account_name?: string;
  status: 'aberto' | 'pago' | 'parcial' | 'atrasado' | 'cancelado';
  category?: string;
  description?: string;
  notes?: string;
  installment_number?: number;
  total_installments?: number;
  parent_document_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialMovement {
  id: string;
  movement_type: 'entrada' | 'saida' | 'transferencia';
  bank_account_id?: string;
  bank_account_name?: string;
  destination_bank_account_id?: string;
  destination_bank_account_name?: string;
  financial_document_id?: string;
  amount: number;
  movement_date: string;
  reconciled: boolean;
  reconciliation_date?: string;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: 'entrada' | 'saida';
  supplier_id?: string;
  supplier_name?: string;
  client_id?: string;
  client_name?: string;
  cnpj?: string;
  amount: number;
  issue_date: string;
  due_date?: string;
  purchase_order_id?: string;
  financial_document_id?: string;
  xml_file_url?: string;
  pdf_file_url?: string;
  status: 'emitida' | 'cancelada' | 'vinculada';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface BillingRule {
  id: string;
  work_id?: string;
  work_name?: string;
  contract_id?: string;
  billing_type: 'taxa_administracao' | 'avanco_fisico' | 'medicao' | 'fixo_mensal';
  percentage?: number;
  fixed_amount?: number;
  calculation_base?: 'valor_obra' | 'valor_executado' | 'medicao_aprovada';
  frequency?: 'mensal' | 'quinzenal' | 'semanal' | 'por_medicao';
  start_date?: string;
  end_date?: string;
  auto_generate_document: boolean;
  status: 'ativa' | 'inativa';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CashflowProjection {
  id: string;
  projection_date: string;
  work_id?: string;
  work_name?: string;
  projected_income: number;
  projected_expenses: number;
  projected_balance: number;
  actual_income: number;
  actual_expenses: number;
  actual_balance: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
