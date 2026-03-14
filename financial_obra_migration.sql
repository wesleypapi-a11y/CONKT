/*
  # Criar Módulo Financeiro da Obra

  1. Novas Tabelas
    - `financial_cost_centers` - Centros de custo para classificação de despesas
    - `financial_bank_accounts` - Contas bancárias da empresa/obra
    - `financial_documents` - Documentos financeiros (contas a pagar/receber, adiantamentos, etc)
    - `financial_movements` - Movimentações financeiras (pagamentos e recebimentos)
    - `financial_invoices` - Notas fiscais
    - `financial_billings` - Faturamentos para clientes
    - `financial_forecasts` - Previsões financeiras da obra

  2. Storage
    - Bucket `financial-documents` para anexos de documentos financeiros
    - Bucket `financial-invoices` para XMLs e PDFs de notas fiscais

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas isolam dados por empresa_id
    - Políticas de storage isolam arquivos por empresa_id

  4. Integração
    - Gatilhos para criar documentos financeiros automaticamente a partir de purchase_orders
    - Gatilhos para atualizar status quando movimentação for registrada
*/

-- Centros de Custo
CREATE TABLE IF NOT EXISTS financial_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_empresa ON financial_cost_centers(empresa_id);

ALTER TABLE financial_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost centers of their empresa"
  ON financial_cost_centers FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create cost centers"
  ON financial_cost_centers FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update cost centers"
  ON financial_cost_centers FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Contas Bancárias
CREATE TABLE IF NOT EXISTS financial_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid REFERENCES works(id) ON DELETE SET NULL,
  banco text NOT NULL,
  agencia text,
  numero_conta text NOT NULL,
  tipo_conta text CHECK (tipo_conta IN ('Corrente', 'Poupança', 'Investimento')),
  saldo_inicial numeric DEFAULT 0,
  saldo_atual numeric DEFAULT 0,
  ativa boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_empresa ON financial_bank_accounts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_work ON financial_bank_accounts(work_id);

ALTER TABLE financial_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank accounts of their empresa"
  ON financial_bank_accounts FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create bank accounts"
  ON financial_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update bank accounts"
  ON financial_bank_accounts FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Previsões Financeiras
CREATE TABLE IF NOT EXISTS financial_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  mes integer NOT NULL,
  ano integer NOT NULL,
  entradas_previstas numeric DEFAULT 0,
  saidas_previstas numeric DEFAULT 0,
  saldo_previsto numeric DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(empresa_id, work_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_empresa ON financial_forecasts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_work ON financial_forecasts(work_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_periodo ON financial_forecasts(ano, mes);

ALTER TABLE financial_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecasts of their empresa"
  ON financial_forecasts FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create forecasts"
  ON financial_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update forecasts"
  ON financial_forecasts FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Documentos Financeiros
CREATE TABLE IF NOT EXISTS financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('Conta a Pagar', 'Conta a Receber', 'Adiantamento', 'Reembolso', 'Medicao', 'Imposto', 'Parcelamento')),
  descricao text NOT NULL,
  fornecedor_id uuid REFERENCES suppliers(id),
  cliente_id uuid REFERENCES clients(id),
  cost_center_id uuid REFERENCES financial_cost_centers(id),
  categoria text,
  valor numeric NOT NULL,
  valor_pago numeric DEFAULT 0,
  data_vencimento date NOT NULL,
  data_pagamento date,
  forma_pagamento text,
  numero_documento text,
  status text NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'aprovado', 'pago', 'recebido', 'cancelado')),
  observacoes text,
  anexo_path text,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  contract_id uuid REFERENCES contracts(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_financial_docs_empresa ON financial_documents(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financial_docs_work ON financial_documents(work_id);
CREATE INDEX IF NOT EXISTS idx_financial_docs_status ON financial_documents(status);
CREATE INDEX IF NOT EXISTS idx_financial_docs_vencimento ON financial_documents(data_vencimento);

ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial documents of their empresa"
  ON financial_documents FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create financial documents"
  ON financial_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update financial documents"
  ON financial_documents FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can delete financial documents"
  ON financial_documents FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Movimentos Financeiros
CREATE TABLE IF NOT EXISTS financial_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  document_id uuid REFERENCES financial_documents(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES financial_bank_accounts(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric NOT NULL,
  data_movimento date NOT NULL,
  forma_pagamento text,
  descricao text,
  comprovante_path text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_movements_empresa ON financial_movements(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movements_work ON financial_movements(work_id);
CREATE INDEX IF NOT EXISTS idx_movements_document ON financial_movements(document_id);
CREATE INDEX IF NOT EXISTS idx_movements_data ON financial_movements(data_movimento);

ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements of their empresa"
  ON financial_movements FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create movements"
  ON financial_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update movements"
  ON financial_movements FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can delete movements"
  ON financial_movements FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Notas Fiscais
CREATE TABLE IF NOT EXISTS financial_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  document_id uuid REFERENCES financial_documents(id) ON DELETE SET NULL,
  numero_nota text NOT NULL,
  fornecedor_id uuid REFERENCES suppliers(id),
  cliente_id uuid REFERENCES clients(id),
  cnpj text,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric NOT NULL,
  data_emissao date NOT NULL,
  chave_acesso text,
  xml_path text,
  pdf_path text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invoices_empresa ON financial_invoices(empresa_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work ON financial_invoices(work_id);
CREATE INDEX IF NOT EXISTS idx_invoices_numero ON financial_invoices(numero_nota);

ALTER TABLE financial_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices of their empresa"
  ON financial_invoices FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create invoices"
  ON financial_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update invoices"
  ON financial_invoices FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can delete invoices"
  ON financial_invoices FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Faturamento
CREATE TABLE IF NOT EXISTS financial_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clients(id),
  tipo text NOT NULL CHECK (tipo IN ('Medicao', 'Parcela Contrato', 'Reembolso', 'Outros')),
  descricao text NOT NULL,
  numero_medicao integer,
  valor numeric NOT NULL,
  data_emissao date NOT NULL,
  data_vencimento date,
  data_recebimento date,
  status text NOT NULL DEFAULT 'a_faturar' CHECK (status IN ('a_faturar', 'faturado', 'recebido', 'atrasado')),
  observacoes text,
  invoice_id uuid REFERENCES financial_invoices(id),
  contract_id uuid REFERENCES contracts(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_billings_empresa ON financial_billings(empresa_id);
CREATE INDEX IF NOT EXISTS idx_billings_work ON financial_billings(work_id);
CREATE INDEX IF NOT EXISTS idx_billings_status ON financial_billings(status);

ALTER TABLE financial_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view billings of their empresa"
  ON financial_billings FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can create billings"
  ON financial_billings FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can update billings"
  ON financial_billings FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Users can delete billings"
  ON financial_billings FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
  );

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-documents', 'financial-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-invoices', 'financial-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for financial-documents
CREATE POLICY "Users can view financial documents of their empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'financial-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

CREATE POLICY "Users can upload financial documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'financial-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

CREATE POLICY "Users can delete financial documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'financial-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

-- Storage policies for financial-invoices
CREATE POLICY "Users can view invoices files of their empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'financial-invoices'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

CREATE POLICY "Users can upload invoice files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'financial-invoices'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

CREATE POLICY "Users can delete invoice files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'financial-invoices'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
    )
  );

-- Trigger: Atualizar saldo da conta bancária após movimentação
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL AND NEW.bank_account_id IS NOT NULL THEN
    IF NEW.tipo = 'entrada' THEN
      UPDATE financial_bank_accounts
      SET saldo_atual = saldo_atual + NEW.valor
      WHERE id = NEW.bank_account_id;
    ELSIF NEW.tipo = 'saida' THEN
      UPDATE financial_bank_accounts
      SET saldo_atual = saldo_atual - NEW.valor
      WHERE id = NEW.bank_account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.bank_account_id IS NOT NULL THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      IF NEW.tipo = 'entrada' THEN
        UPDATE financial_bank_accounts
        SET saldo_atual = saldo_atual - NEW.valor
        WHERE id = NEW.bank_account_id;
      ELSIF NEW.tipo = 'saida' THEN
        UPDATE financial_bank_accounts
        SET saldo_atual = saldo_atual + NEW.valor
        WHERE id = NEW.bank_account_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_balance ON financial_movements;
CREATE TRIGGER trigger_update_bank_balance
  AFTER INSERT OR UPDATE ON financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_account_balance();

-- Trigger: Atualizar valor_pago do documento após movimento
CREATE OR REPLACE FUNCTION update_document_paid_value()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL AND NEW.document_id IS NOT NULL THEN
    UPDATE financial_documents
    SET valor_pago = valor_pago + NEW.valor
    WHERE id = NEW.document_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.document_id IS NOT NULL THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE financial_documents
      SET valor_pago = valor_pago - NEW.valor
      WHERE id = NEW.document_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_paid_value ON financial_movements;
CREATE TRIGGER trigger_update_paid_value
  AFTER INSERT OR UPDATE ON financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_document_paid_value();

-- Trigger: Criar documento financeiro automaticamente quando purchase_order for aprovada
CREATE OR REPLACE FUNCTION create_financial_doc_from_purchase_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    INSERT INTO financial_documents (
      empresa_id,
      work_id,
      tipo,
      descricao,
      fornecedor_id,
      categoria,
      valor,
      data_vencimento,
      forma_pagamento,
      numero_documento,
      status,
      purchase_order_id,
      created_by
    )
    VALUES (
      NEW.empresa_id,
      NEW.work_id,
      'Conta a Pagar',
      'OC-' || NEW.order_number || ' - ' || COALESCE(
        (SELECT s.nome_fantasia FROM suppliers s WHERE s.id = NEW.supplier_id),
        'Fornecedor não identificado'
      ),
      NEW.supplier_id,
      'Compras',
      NEW.total_value,
      COALESCE(NEW.delivery_date, CURRENT_DATE + INTERVAL '30 days'),
      NEW.payment_method,
      NEW.order_number,
      'aprovado',
      NEW.id,
      NEW.created_by
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_financial_from_po ON purchase_orders;
CREATE TRIGGER trigger_create_financial_from_po
  AFTER INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_financial_doc_from_purchase_order();

-- Inserir centros de custo padrão para todas as empresas
INSERT INTO financial_cost_centers (empresa_id, nome, codigo, descricao, created_by)
SELECT
  e.id,
  cc.nome,
  cc.codigo,
  cc.descricao,
  (SELECT id FROM profiles WHERE empresa_id = e.id AND role IN ('master', 'admin') LIMIT 1)
FROM empresas e
CROSS JOIN (
  VALUES
    ('Fundação', 'CC-001', 'Custos de fundação e terraplanagem'),
    ('Estrutura', 'CC-002', 'Custos de estrutura (concreto, aço)'),
    ('Alvenaria', 'CC-003', 'Custos de alvenaria e fechamento'),
    ('Instalações', 'CC-004', 'Instalações elétricas, hidráulicas e SPDA'),
    ('Acabamento', 'CC-005', 'Acabamentos, pintura, revestimentos'),
    ('Mão de Obra', 'CC-006', 'Custos com mão de obra'),
    ('Equipamentos', 'CC-007', 'Locação e manutenção de equipamentos'),
    ('Projetos', 'CC-008', 'Custos de projetos e consultorias'),
    ('Administrativo', 'CC-009', 'Custos administrativos da obra'),
    ('Outros', 'CC-999', 'Outros custos não classificados')
) AS cc(nome, codigo, descricao)
WHERE NOT EXISTS (
  SELECT 1 FROM financial_cost_centers fcc
  WHERE fcc.empresa_id = e.id AND fcc.codigo = cc.codigo
);
