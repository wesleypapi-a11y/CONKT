/*
  # Módulo Financeiro Completo
  
  1. Novas Tabelas
    - `bank_accounts` - Contas bancárias da empresa
    - `financial_accounts` - Contas gerenciais (centros de custo)
    - `financial_documents` - Documentos financeiros (provisão, previsão, adiantamento, recebimento)
    - `financial_movements` - Movimentos financeiros (entradas/saídas)
    - `invoices` - Notas fiscais
    - `billing_rules` - Regras de faturamento
    - `cashflow_projections` - Projeções de fluxo de caixa
    
  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados
*/

-- Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('conta_corrente', 'poupanca', 'investimento')),
  agency text,
  account_number text,
  initial_balance numeric(15,2) DEFAULT 0,
  current_balance numeric(15,2) DEFAULT 0,
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar contas bancárias"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir contas bancárias"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar contas bancárias"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Contas Gerenciais
CREATE TABLE IF NOT EXISTS financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('operacional', 'administrativo', 'investimento', 'financeiro')),
  work_id uuid REFERENCES works(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL,
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar contas gerenciais"
  ON financial_accounts FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir contas gerenciais"
  ON financial_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar contas gerenciais"
  ON financial_accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Documentos Financeiros
CREATE TABLE IF NOT EXISTS financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('provisao', 'previsao', 'adiantamento', 'receber', 'pagar')),
  transaction_type text NOT NULL CHECK (transaction_type IN ('receita', 'despesa')),
  work_id uuid REFERENCES works(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  financial_account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  paid_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2),
  due_date date NOT NULL,
  payment_date date,
  payment_method text CHECK (payment_method IN ('dinheiro', 'pix', 'ted', 'doc', 'boleto', 'cartao_credito', 'cartao_debito', 'cheque')),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  status text DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'parcial', 'atrasado', 'cancelado')),
  category text,
  description text,
  notes text,
  installment_number int,
  total_installments int,
  parent_document_id uuid REFERENCES financial_documents(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar documentos financeiros"
  ON financial_documents FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir documentos financeiros"
  ON financial_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar documentos financeiros"
  ON financial_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Movimentos Financeiros
CREATE TABLE IF NOT EXISTS financial_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'transferencia')),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  destination_bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  financial_document_id uuid REFERENCES financial_documents(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  movement_date date NOT NULL,
  reconciled boolean DEFAULT false,
  reconciliation_date date,
  description text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar movimentos financeiros"
  ON financial_movements FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir movimentos financeiros"
  ON financial_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar movimentos financeiros"
  ON financial_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Notas Fiscais
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  invoice_type text NOT NULL CHECK (invoice_type IN ('entrada', 'saida')),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  cnpj text,
  amount numeric(15,2) NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  financial_document_id uuid REFERENCES financial_documents(id) ON DELETE SET NULL,
  xml_file_url text,
  pdf_file_url text,
  status text DEFAULT 'emitida' CHECK (status IN ('emitida', 'cancelada', 'vinculada')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar notas fiscais"
  ON invoices FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir notas fiscais"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar notas fiscais"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Regras de Faturamento
CREATE TABLE IF NOT EXISTS billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('taxa_administracao', 'avanco_fisico', 'medicao', 'fixo_mensal')),
  percentage numeric(5,2),
  fixed_amount numeric(15,2),
  calculation_base text CHECK (calculation_base IN ('valor_obra', 'valor_executado', 'medicao_aprovada')),
  frequency text CHECK (frequency IN ('mensal', 'quinzenal', 'semanal', 'por_medicao')),
  start_date date,
  end_date date,
  auto_generate_document boolean DEFAULT true,
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE billing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar regras de faturamento"
  ON billing_rules FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir regras de faturamento"
  ON billing_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar regras de faturamento"
  ON billing_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de Projeções de Fluxo de Caixa
CREATE TABLE IF NOT EXISTS cashflow_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_date date NOT NULL,
  work_id uuid REFERENCES works(id) ON DELETE SET NULL,
  projected_income numeric(15,2) DEFAULT 0,
  projected_expenses numeric(15,2) DEFAULT 0,
  projected_balance numeric(15,2) DEFAULT 0,
  actual_income numeric(15,2) DEFAULT 0,
  actual_expenses numeric(15,2) DEFAULT 0,
  actual_balance numeric(15,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(projection_date, work_id)
);

ALTER TABLE cashflow_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar projeções de fluxo"
  ON cashflow_projections FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Usuários autenticados podem inserir projeções de fluxo"
  ON cashflow_projections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar projeções de fluxo"
  ON cashflow_projections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_documents_work ON financial_documents(work_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_documents_supplier ON financial_documents(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_documents_client ON financial_documents(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_documents_status ON financial_documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_documents_due_date ON financial_documents(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_movements_bank_account ON financial_movements(bank_account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_movements_document ON financial_movements(financial_document_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_rules_work ON billing_rules(work_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cashflow_projections_date ON cashflow_projections(projection_date) WHERE deleted_at IS NULL;
