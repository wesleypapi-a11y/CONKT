export interface FinancialCostCenter {
  id: string;
  empresa_id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialBankAccount {
  id: string;
  empresa_id: string;
  work_id?: string;
  banco: string;
  agencia?: string;
  numero_conta: string;
  tipo_conta?: 'Corrente' | 'Poupança' | 'Investimento';
  saldo_inicial: number;
  saldo_atual: number;
  ativa: boolean;
  observacoes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialDocument {
  id: string;
  empresa_id: string;
  work_id?: string;
  tipo: 'Conta a Pagar' | 'Conta a Receber' | 'Adiantamento' | 'Reembolso' | 'Medicao' | 'Imposto' | 'Parcelamento';
  descricao: string;
  fornecedor_id?: string;
  cliente_id?: string;
  cost_center_id?: string;
  categoria?: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  numero_documento?: string;
  status: 'previsto' | 'aprovado' | 'pago' | 'recebido' | 'cancelado';
  observacoes?: string;
  anexo_path?: string;
  purchase_order_id?: string;
  contract_id?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialMovement {
  id: string;
  empresa_id: string;
  work_id?: string;
  document_id?: string;
  bank_account_id?: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_movimento: string;
  forma_pagamento?: string;
  descricao?: string;
  comprovante_path?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialInvoice {
  id: string;
  empresa_id: string;
  work_id?: string;
  document_id?: string;
  numero_nota: string;
  fornecedor_id?: string;
  cliente_id?: string;
  cnpj?: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data_emissao: string;
  chave_acesso?: string;
  xml_path?: string;
  pdf_path?: string;
  observacoes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialBilling {
  id: string;
  empresa_id: string;
  work_id: string;
  cliente_id?: string;
  tipo: 'Medicao' | 'Parcela Contrato' | 'Reembolso' | 'Outros';
  descricao: string;
  numero_medicao?: number;
  valor: number;
  data_emissao: string;
  data_vencimento?: string;
  data_recebimento?: string;
  status: 'a_faturar' | 'faturado' | 'recebido' | 'atrasado';
  observacoes?: string;
  invoice_id?: string;
  contract_id?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FinancialForecast {
  id: string;
  empresa_id: string;
  work_id: string;
  mes: number;
  ano: number;
  entradas_previstas: number;
  saidas_previstas: number;
  saldo_previsto: number;
  observacoes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted_at?: string;
}
