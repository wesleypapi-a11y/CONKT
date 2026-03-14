/*
  # Criação dos Módulos da Empresa: Fluxo de Caixa, Colaboradores e Arquivos

  1. Novas Tabelas
    
    **company_cashflow_entries** - Lançamentos financeiros da empresa
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, not null) - FK para empresas
      - `tipo` (text) - 'entrada' ou 'saida'
      - `categoria` (text) - categoria do lançamento
      - `descricao` (text) - descrição do lançamento
      - `valor` (numeric) - valor do lançamento
      - `data_lancamento` (date) - data do lançamento
      - `forma_pagamento` (text) - forma de pagamento
      - `observacoes` (text) - observações adicionais
      - `status` (text) - 'previsto', 'realizado', 'vencido'
      - `created_by` (uuid) - FK para profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz) - soft delete

    **company_employees** - Colaboradores da empresa
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, not null) - FK para empresas
      - `nome_completo` (text, not null)
      - `email` (text)
      - `telefone` (text)
      - `cargo_funcao` (text)
      - `tipo_vinculo` (text) - 'CLT', 'PJ', 'Autonomo', 'Freelancer', 'Estagiario'
      - `valor_mensal` (numeric) - valor fixo mensal
      - `valor_diario` (numeric) - valor diário se aplicável
      - `data_inicio` (date)
      - `data_fim` (date) - quando inativado
      - `status` (text) - 'ativo', 'inativo'
      - `observacoes` (text)
      - `created_by` (uuid) - FK para profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz) - soft delete

    **company_employee_payments** - Pagamentos a colaboradores
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, not null) - FK para empresas
      - `employee_id` (uuid, not null) - FK para company_employees
      - `data_pagamento` (date)
      - `valor` (numeric)
      - `competencia` (text) - ex: "01/2026"
      - `observacao` (text)
      - `status` (text) - 'pago', 'pendente'
      - `created_by` (uuid) - FK para profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz) - soft delete

    **company_files** - Arquivos da empresa
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, not null) - FK para empresas
      - `nome` (text, not null)
      - `categoria` (text) - tipo de documento
      - `descricao` (text)
      - `file_path` (text) - caminho no storage
      - `file_type` (text) - tipo do arquivo
      - `file_size` (bigint) - tamanho em bytes
      - `uploaded_by` (uuid) - FK para profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz) - soft delete

  2. Storage Buckets
    - `company-files` - bucket para arquivos da empresa

  3. Security
    - Enable RLS em todas as tabelas
    - Policies para permitir acesso apenas aos dados da própria empresa
    - Policies de storage para company-files

  4. Índices
    - Índices em empresa_id para performance
    - Índices em status e data_lancamento para filtros rápidos
*/

-- Tabela de lançamentos de fluxo de caixa
CREATE TABLE IF NOT EXISTS company_cashflow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria text NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_lancamento date NOT NULL,
  forma_pagamento text,
  observacoes text,
  status text NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'realizado', 'vencido')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cashflow_empresa ON company_cashflow_entries(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_data ON company_cashflow_entries(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_cashflow_status ON company_cashflow_entries(status);
CREATE INDEX IF NOT EXISTS idx_cashflow_deleted ON company_cashflow_entries(deleted_at);

ALTER TABLE company_cashflow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cashflow entries from their company"
  ON company_cashflow_entries FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cashflow entries for their company"
  ON company_cashflow_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update cashflow entries from their company"
  ON company_cashflow_entries FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cashflow entries from their company"
  ON company_cashflow_entries FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS company_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  email text,
  telefone text,
  cargo_funcao text,
  tipo_vinculo text CHECK (tipo_vinculo IN ('CLT', 'PJ', 'Autonomo', 'Freelancer', 'Estagiario')),
  valor_mensal numeric DEFAULT 0,
  valor_diario numeric DEFAULT 0,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  observacoes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_employees_empresa ON company_employees(empresa_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON company_employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_deleted ON company_employees(deleted_at);

ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees from their company"
  ON company_employees FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employees for their company"
  ON company_employees FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update employees from their company"
  ON company_employees FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employees from their company"
  ON company_employees FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Tabela de pagamentos a colaboradores
CREATE TABLE IF NOT EXISTS company_employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES company_employees(id) ON DELETE CASCADE,
  data_pagamento date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  competencia text,
  observacao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_employee_payments_empresa ON company_employee_payments(empresa_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee ON company_employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_data ON company_employee_payments(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_employee_payments_deleted ON company_employee_payments(deleted_at);

ALTER TABLE company_employee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee payments from their company"
  ON company_employee_payments FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee payments for their company"
  ON company_employee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update employee payments from their company"
  ON company_employee_payments FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee payments from their company"
  ON company_employee_payments FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Tabela de arquivos da empresa
CREATE TABLE IF NOT EXISTS company_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  descricao text,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_company_files_empresa ON company_files(empresa_id);
CREATE INDEX IF NOT EXISTS idx_company_files_categoria ON company_files(categoria);
CREATE INDEX IF NOT EXISTS idx_company_files_deleted ON company_files(deleted_at);

ALTER TABLE company_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company files from their company"
  ON company_files FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company files for their company"
  ON company_files FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company files from their company"
  ON company_files FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company files from their company"
  ON company_files FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Criar bucket para arquivos da empresa
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage para company-files
CREATE POLICY "Users can view company files from their company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-files' 
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload company files for their company"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company files from their company"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company files from their company"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );
