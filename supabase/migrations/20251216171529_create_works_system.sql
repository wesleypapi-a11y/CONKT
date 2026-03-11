/*
  # Sistema de Obras

  ## Descrição
  Cria o sistema completo de gerenciamento de obras com todas as abas necessárias

  ## Novas Tabelas
  
  ### `works` - Tabela principal de obras
  - `id` (uuid, primary key) - ID único da obra
  - `user_id` (uuid, foreign key) - ID do usuário proprietário
  - `client_id` (uuid, foreign key) - ID do cliente relacionado
  - `name` (text) - Nome da obra
  - `category` (text) - Categoria da obra
  - `status` (text) - Status: 'pre_cadastro' ou 'ativo'
  - `observation` (text) - Observações gerais
  - `photo_url` (text) - URL da foto da obra
  
  ### Período
  - `start_date` (date) - Data de início
  - `duration` (integer) - Duração
  - `duration_unit` (text) - Unidade: 'meses', 'dias', etc
  - `end_date` (date) - Data fim
  
  ### Outras informações
  - `cno` (text) - CNO
  - `area` (numeric) - Área em m²
  - `contractor` (text) - Empreiteiro
  - `technical_manager` (text) - Responsável técnico
  - `art_number` (text) - Número da ART
  - `work_manager` (text) - Responsável pela obra
  
  ### Endereço da obra
  - `work_zip_code` (text)
  - `work_address` (text)
  - `work_number` (text)
  - `work_neighborhood` (text)
  - `work_complement` (text)
  - `work_state` (text)
  - `work_city` (text)
  
  ### Endereço de cobrança
  - `billing_address_type` (text) - 'obra', 'cliente', 'empresa', 'outro'
  - `billing_zip_code` (text)
  - `billing_address` (text)
  - `billing_number` (text)
  - `billing_neighborhood` (text)
  - `billing_complement` (text)
  - `billing_state` (text)
  - `billing_city` (text)
  
  ### Configurações
  - `billing_type` (text) - Tipo de faturamento
  - `billing_frequency` (text) - 'semanal', 'quinzenal', 'mensal'
  - `document_type` (text) - Tipo de documento
  - `planning_frequency` (text) - 'semanal', 'quinzenal', 'mensal'
  - `tracking_type` (text) - 'custo', 'valor_vendas', 'ambos'
  - `work_days` (jsonb) - Dias de expediente
  - `client_access` (boolean) - Acesso pelo cliente
  - `tax_admin_type` (text) - 'tipo_custo', 'fase_obra'
  
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### `work_contacts` - Contatos da obra
  - `id` (uuid, primary key)
  - `work_id` (uuid, foreign key) - ID da obra
  - `origin` (text) - Origem do contato
  - `name` (text) - Nome do contato
  - `phone` (text) - Telefone
  - `mobile` (text) - Celular
  - `email` (text) - E-mail
  - `observation` (text) - Observação
  - `created_at` (timestamptz)

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Usuários podem gerenciar apenas suas próprias obras
  - Políticas para SELECT, INSERT, UPDATE, DELETE
*/

-- Criar tabela de obras
CREATE TABLE IF NOT EXISTS works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  status text DEFAULT 'pre_cadastro' CHECK (status IN ('pre_cadastro', 'ativo')),
  observation text,
  photo_url text,
  
  start_date date,
  duration integer,
  duration_unit text DEFAULT 'meses',
  end_date date,
  
  cno text,
  area numeric(10,2),
  contractor text,
  technical_manager text,
  art_number text,
  work_manager text,
  
  work_zip_code text,
  work_address text,
  work_number text,
  work_neighborhood text,
  work_complement text,
  work_state text,
  work_city text,
  
  billing_address_type text DEFAULT 'obra' CHECK (billing_address_type IN ('obra', 'cliente', 'empresa', 'outro')),
  billing_zip_code text,
  billing_address text,
  billing_number text,
  billing_neighborhood text,
  billing_complement text,
  billing_state text,
  billing_city text,
  
  billing_type text,
  billing_frequency text CHECK (billing_frequency IN ('semanal', 'quinzenal', 'mensal')),
  document_type text,
  planning_frequency text CHECK (planning_frequency IN ('semanal', 'quinzenal', 'mensal')),
  tracking_type text CHECK (tracking_type IN ('custo', 'valor_vendas', 'ambos')),
  work_days jsonb DEFAULT '[]'::jsonb,
  client_access boolean DEFAULT false,
  tax_admin_type text CHECK (tax_admin_type IN ('tipo_custo', 'fase_obra')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de contatos da obra
CREATE TABLE IF NOT EXISTS work_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  origin text,
  name text NOT NULL,
  phone text,
  mobile text,
  email text,
  observation text,
  created_at timestamptz DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_client_id ON works(client_id);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_work_contacts_work_id ON work_contacts(work_id);

-- Habilitar RLS
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para works
CREATE POLICY "Users can view own works"
  ON works FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own works"
  ON works FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own works"
  ON works FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own works"
  ON works FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para work_contacts
CREATE POLICY "Users can view own work contacts"
  ON work_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_contacts.work_id
      AND works.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own work contacts"
  ON work_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_contacts.work_id
      AND works.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own work contacts"
  ON work_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_contacts.work_id
      AND works.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_contacts.work_id
      AND works.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own work contacts"
  ON work_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = work_contacts.work_id
      AND works.user_id = auth.uid()
    )
  );