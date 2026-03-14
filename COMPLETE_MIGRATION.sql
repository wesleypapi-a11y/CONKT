-- ============================================================================
-- ARCO MANAGER - SCRIPT DE MIGRAÇÃO COMPLETO
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- PARTE 1: PROFILES E AUTENTICAÇÃO
-- ============================================================================

-- Criar tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  email text,
  telefone text,
  avatar_url text,
  funcao text DEFAULT 'user',
  role text DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Função para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Criar usuário admin padrão
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Inserir usuário na tabela auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@arco.com.br',
    crypt('Admin@123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"admin"}',
    '{"nome":"Administrador","role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_user_id;

  -- Inserir profile (se o usuário foi criado)
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, nome, email, role, funcao)
    VALUES (
      admin_user_id,
      'Administrador',
      'admin@arco.com.br',
      'admin',
      'Administrador'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- PARTE 2: APPEARANCE PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.appearance_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  primary_color text DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.appearance_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.appearance_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.appearance_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.appearance_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PARTE 3: STORAGE - AVATARS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- PARTE 4: CLIENTS (CLIENTES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_razao_social text NOT NULL,
  tipo_pessoa text NOT NULL CHECK (tipo_pessoa IN ('Física', 'Jurídica')),
  cpf_cnpj text UNIQUE,
  inscricao_estadual text,
  inscricao_municipal text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Client contacts
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client contacts" ON public.client_contacts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Client folders
CREATE TABLE IF NOT EXISTS public.client_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome text NOT NULL,
  parent_id uuid REFERENCES public.client_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client folders" ON public.client_folders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Client products
CREATE TABLE IF NOT EXISTS public.client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  tipo text NOT NULL,
  plano_categoria text,
  descricao text,
  valor numeric(15,2),
  data_aquisicao date,
  data_vencimento date,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client products" ON public.client_products
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Client storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view client files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can upload client files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update client files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-files');

-- PARTE 5: WORKS (OBRAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  codigo text UNIQUE,
  tipo_obra text,
  status text DEFAULT 'Planejamento' CHECK (status IN (
    'Planejamento', 'Em Andamento', 'Pausada', 'Concluída', 'Cancelada'
  )),
  data_inicio date,
  data_previsao_termino date,
  data_termino_real date,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  area_total numeric(15,2),
  area_construida numeric(15,2),
  observacoes text,
  responsavel_obra text,
  telefone_responsavel text,
  email_responsavel text,
  engenheiro_responsavel text,
  crea_engenheiro text,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active works" ON public.works
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert works" ON public.works
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update works" ON public.works
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete works" ON public.works
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Work contacts
CREATE TABLE IF NOT EXISTS public.work_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage work contacts" ON public.work_contacts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 6: SUPPLIERS (FORNECEDORES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_razao_social text NOT NULL,
  nome_fantasia text,
  tipo_pessoa text NOT NULL CHECK (tipo_pessoa IN ('Física', 'Jurídica')),
  cpf_cnpj text UNIQUE,
  inscricao_estadual text,
  inscricao_municipal text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  site text,
  observacoes text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  pix text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Supplier categories
CREATE TABLE IF NOT EXISTS public.supplier_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  subcategoria text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage supplier categories" ON public.supplier_categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier certifications
CREATE TABLE IF NOT EXISTS public.supplier_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  certificacao text NOT NULL,
  orgao_emissor text,
  numero text,
  data_emissao date,
  data_validade date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage supplier certifications" ON public.supplier_certifications
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier vendors
CREATE TABLE IF NOT EXISTS public.supplier_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage supplier vendors" ON public.supplier_vendors
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier quality
CREATE TABLE IF NOT EXISTS public.supplier_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  avaliacao integer CHECK (avaliacao BETWEEN 1 AND 5),
  data_avaliacao date NOT NULL,
  avaliador text,
  criterios jsonb,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage supplier quality" ON public.supplier_quality
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier folders
CREATE TABLE IF NOT EXISTS public.supplier_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  nome text NOT NULL,
  parent_id uuid REFERENCES public.supplier_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supplier_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage supplier folders" ON public.supplier_folders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-files', 'supplier-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can manage supplier files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'supplier-files')
  WITH CHECK (bucket_id = 'supplier-files');

-- PARTE 7: WORK DIARIES (RDO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.work_diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  clima text,
  temperatura numeric(5,2),
  atividades_realizadas text,
  servicos_executados jsonb DEFAULT '[]',
  mao_de_obra jsonb DEFAULT '[]',
  equipamentos jsonb DEFAULT '[]',
  materiais_utilizados jsonb DEFAULT '[]',
  ocorrencias text,
  observacoes text,
  fotos text[] DEFAULT ARRAY[]::text[],
  videos text[] DEFAULT ARRAY[]::text[],
  assinaturas jsonb DEFAULT '[]',
  responsavel_nome text,
  responsavel_cargo text,
  checklist_seguranca jsonb DEFAULT '[]',
  notas_gerais text,
  notas_materiais text,
  notas_equipamentos text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(work_id, data)
);

ALTER TABLE public.work_diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view work diaries" ON public.work_diaries
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert work diaries" ON public.work_diaries
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work diaries" ON public.work_diaries
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete work diaries" ON public.work_diaries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Work diary storage
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('work-diary-photos', 'work-diary-photos', true),
  ('work-diary-videos', 'work-diary-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can manage work diary photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'work-diary-photos')
  WITH CHECK (bucket_id = 'work-diary-photos');

CREATE POLICY "Authenticated users can manage work diary videos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'work-diary-videos')
  WITH CHECK (bucket_id = 'work-diary-videos');

-- PARTE 8: CONTRACTS (CONTRATOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  budget_id uuid,
  numero_contrato text UNIQUE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Empreitada', 'Administração', 'Fornecimento', 'Serviço', 'Outro')),
  vinculo text CHECK (vinculo IN ('Receita', 'Despesa')),
  objeto text NOT NULL,
  valor_total numeric(15,2) NOT NULL,
  data_assinatura date NOT NULL,
  data_inicio date,
  data_termino date,
  prazo_dias integer,
  forma_pagamento text,
  condicoes_pagamento text,
  reajuste text,
  garantias text,
  multas text,
  observacoes text,
  status text DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Suspenso', 'Concluído', 'Cancelado')),
  arquivo_url text,
  primeira_parcela_data date,
  recorrencia_tipo text CHECK (recorrencia_tipo IN ('Mensal', 'Trimestral', 'Semestral', 'Anual', 'Única')),
  recorrencia_dia_vencimento integer CHECK (recorrencia_dia_vencimento BETWEEN 1 AND 31),
  apropriacao_automatica boolean DEFAULT false,
  apropriacao_dia integer CHECK (apropriacao_dia BETWEEN 1 AND 31),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete contracts" ON public.contracts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contract installments
CREATE TABLE IF NOT EXISTS public.contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL,
  valor numeric(15,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
  observacoes text,
  ordem_compra_numero text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contract installments" ON public.contract_installments
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Contract storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-files', 'contract-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can manage contract files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'contract-files')
  WITH CHECK (bucket_id = 'contract-files');

-- PARTE 9: TASKS (TAREFAS KANBAN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  cor text DEFAULT '#3b82f6',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task boards" ON public.task_boards
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES public.task_boards(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status text DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'em_progresso', 'concluido')),
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  responsavel_id uuid REFERENCES auth.users(id),
  obra_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  obra_nome text,
  prazo date,
  ordem integer DEFAULT 0,
  tags text[] DEFAULT ARRAY[]::text[],
  anexos jsonb DEFAULT '[]',
  comentarios jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 10: BUDGETS (ORÇAMENTOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  arquivo_url text,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage budget templates" ON public.budget_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default template
INSERT INTO public.budget_templates (nome, descricao, is_default, arquivo_url)
VALUES ('Template Padrão', 'Template padrão do sistema', true, '')
ON CONFLICT DO NOTHING;

-- Budget templates storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-templates', 'budget-templates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can manage budget templates" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'budget-templates')
  WITH CHECK (bucket_id = 'budget-templates');

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.budget_templates(id) ON DELETE SET NULL,
  numero text UNIQUE NOT NULL,
  titulo text NOT NULL,
  descricao text,
  data_elaboracao date NOT NULL,
  validade_dias integer DEFAULT 30,
  status text DEFAULT 'Elaboração' CHECK (status IN (
    'Elaboração', 'Em Análise', 'Aprovado', 'Reprovado', 'Expirado'
  )),
  valor_total numeric(15,2) DEFAULT 0,
  valor_bdi numeric(15,2) DEFAULT 0,
  percentual_bdi numeric(5,2) DEFAULT 0,
  observacoes text,
  revisao integer DEFAULT 1,
  areas jsonb DEFAULT '[]',
  fotos text[] DEFAULT ARRAY[]::text[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add foreign key to contracts after budgets table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contracts_budget_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
    ADD CONSTRAINT contracts_budget_id_fkey
    FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.budget_items(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('fase', 'subfase', 'item')),
  codigo text,
  descricao text NOT NULL,
  unidade text,
  quantidade numeric(15,4),
  preco_unitario numeric(15,2),
  preco_total numeric(15,2),
  area_id text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage budget items" ON public.budget_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Budget photos storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-photos', 'budget-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload budget photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-photos');

CREATE POLICY "Authenticated users can view budget photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'budget-photos');

CREATE POLICY "Authenticated users can update budget photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'budget-photos');

CREATE POLICY "Authenticated users can delete budget photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'budget-photos');

-- Budget realized (orçamento realizado)
CREATE TABLE IF NOT EXISTS public.budget_realized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  budget_item_id uuid NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
  purchase_order_id uuid,
  quantidade_realizada numeric(15,4) NOT NULL DEFAULT 0,
  valor_realizado numeric(15,2) NOT NULL DEFAULT 0,
  data_realizacao date DEFAULT CURRENT_DATE,
  observacoes text,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Execução', 'Concluído')),
  responsible_id uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.budget_realized ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage budget realized" ON public.budget_realized
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- PARTE 11: PROSPECTIONS (PROSPECÇÕES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  nome_cliente text NOT NULL,
  contato text,
  telefone text,
  email text,
  tipo_obra text,
  localizacao text,
  area_estimada numeric(15,2),
  valor_estimado numeric(15,2),
  data_contato date NOT NULL,
  data_followup date,
  status text DEFAULT 'Novo' CHECK (status IN (
    'Novo', 'Contato Realizado', 'Proposta Enviada',
    'Negociação', 'Ganho', 'Perdido', 'Arquivado'
  )),
  probabilidade integer CHECK (probabilidade BETWEEN 0 AND 100),
  origem text,
  observacoes text,
  motivo_perda text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.prospections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage prospections" ON public.prospections
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 12: SCHEDULES (CRONOGRAMAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage schedule templates" ON public.schedule_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.schedule_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.schedule_templates(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_dias integer NOT NULL,
  predecessoras text[] DEFAULT ARRAY[]::text[],
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.schedule_template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage schedule template tasks" ON public.schedule_template_tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim_prevista date NOT NULL,
  data_fim_real date,
  status text DEFAULT 'Planejamento' CHECK (status IN (
    'Planejamento', 'Em Execução', 'Atrasado', 'Concluído', 'Cancelado'
  )),
  progresso_geral numeric(5,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim_prevista date NOT NULL,
  data_inicio_real date,
  data_fim_real date,
  duracao_dias integer NOT NULL,
  progresso numeric(5,2) DEFAULT 0,
  status text DEFAULT 'Não Iniciada' CHECK (status IN (
    'Não Iniciada', 'Em Execução', 'Concluída', 'Atrasada', 'Cancelada'
  )),
  predecessoras text[] DEFAULT ARRAY[]::text[],
  responsavel_id uuid REFERENCES auth.users(id),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage schedule tasks" ON public.schedule_tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 13: PURCHASES (COMPRAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  request_number text UNIQUE NOT NULL,
  base_number integer,
  titulo text NOT NULL,
  descricao text,
  data_solicitacao date NOT NULL DEFAULT CURRENT_DATE,
  data_necessidade date,
  solicitante_id uuid REFERENCES auth.users(id),
  solicitante_nome text,
  solicitante_email text,
  solicitante_telefone text,
  status text DEFAULT 'Pendente' CHECK (status IN (
    'Pendente', 'Aprovada', 'Em Cotação', 'Cotada', 'Cancelada'
  )),
  prioridade text DEFAULT 'Normal' CHECK (prioridade IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
  observacoes text,
  frozen boolean DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage purchase requests" ON public.purchase_requests
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  unidade text NOT NULL,
  quantidade numeric(15,4) NOT NULL,
  observacoes text,
  budget_phase_id uuid,
  budget_subphase_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage purchase request items" ON public.purchase_request_items
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  quotation_number text UNIQUE NOT NULL,
  data_cotacao date NOT NULL DEFAULT CURRENT_DATE,
  validade_dias integer DEFAULT 30,
  prazo_entrega_dias integer,
  condicoes_pagamento text,
  frete numeric(15,2) DEFAULT 0,
  desconto numeric(15,2) DEFAULT 0,
  observacoes text,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovada', 'Reprovada', 'Expirada')),
  frozen boolean DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage quotations" ON public.quotations
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  request_item_id uuid REFERENCES public.purchase_request_items(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  unidade text NOT NULL,
  quantidade numeric(15,4) NOT NULL,
  preco_unitario numeric(15,2) NOT NULL,
  preco_total numeric(15,2) NOT NULL,
  observacoes text,
  budget_phase_id uuid,
  budget_subphase_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage quotation items" ON public.quotation_items
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_number text UNIQUE NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista date,
  data_entrega_real date,
  prazo_entrega_dias integer,
  condicoes_pagamento text,
  forma_pagamento text,
  frete numeric(15,2) DEFAULT 0,
  desconto numeric(15,2) DEFAULT 0,
  valor_total numeric(15,2) NOT NULL,
  observacoes text,
  status text DEFAULT 'Emitida' CHECK (status IN (
    'Emitida', 'Confirmada', 'Em Trânsito', 'Entregue', 'Parcialmente Entregue', 'Cancelada'
  )),
  frozen boolean DEFAULT false,
  origem text CHECK (origem IN ('Solicitação de Compra', 'Orçamento Aprovado')),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert purchase orders" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can delete purchase orders" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  quotation_item_id uuid REFERENCES public.quotation_items(id) ON DELETE SET NULL,
  budget_item_id uuid REFERENCES public.budget_items(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  unidade text NOT NULL,
  quantidade numeric(15,4) NOT NULL,
  preco_unitario numeric(15,2) NOT NULL,
  preco_total numeric(15,2) NOT NULL,
  quantidade_entregue numeric(15,4) DEFAULT 0,
  observacoes text,
  budget_phase_id uuid,
  budget_subphase_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage purchase order items" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Add foreign key to budget_realized after purchase_orders table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'budget_realized_purchase_order_id_fkey'
  ) THEN
    ALTER TABLE public.budget_realized
    ADD CONSTRAINT budget_realized_purchase_order_id_fkey
    FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- PARTE 14: FINANCIAL MODULE (MÓDULO FINANCEIRO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  categoria text,
  parent_id uuid REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage financial accounts" ON public.financial_accounts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  banco text NOT NULL,
  agencia text,
  conta text,
  tipo text CHECK (tipo IN ('Corrente', 'Poupança', 'Aplicação')),
  saldo_inicial numeric(15,2) DEFAULT 0,
  saldo_atual numeric(15,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bank accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  valor numeric(15,2) NOT NULL,
  recorrencia text CHECK (recorrencia IN ('Mensal', 'Trimestral', 'Semestral', 'Anual')),
  dia_vencimento integer CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio date NOT NULL,
  data_fim date,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage billing rules" ON public.billing_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.financial_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Receita', 'Despesa', 'Transferência')),
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
  forma_pagamento text,
  categoria text,
  observacoes text,
  documento_numero text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage financial movements" ON public.financial_movements
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  numero_nota text UNIQUE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
  data_emissao date NOT NULL,
  valor numeric(15,2) NOT NULL,
  xml_url text,
  pdf_url text,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovada', 'Rejeitada', 'Cancelada')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 15: CLIENT PORTAL ACCESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  ultimo_acesso timestamptz,
  modulos_acesso jsonb DEFAULT '{"dashboard": true, "orcamento": true, "cronograma": true, "rdo": true, "financeiro": true}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, email)
);

ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage portal access" ON public.client_portal_access
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PARTE 16: TRIGGERS E FUNÇÕES
-- ============================================================================

-- Trigger: Soft delete budget_realized when purchase order is deleted
CREATE OR REPLACE FUNCTION soft_delete_budget_realized_on_order_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.budget_realized
  SET deleted_at = now()
  WHERE purchase_order_id = OLD.id AND deleted_at IS NULL;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soft_delete_budget_realized ON public.purchase_orders;
CREATE TRIGGER trigger_soft_delete_budget_realized
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION soft_delete_budget_realized_on_order_delete();

-- Trigger: Auto insert/update budget_realized from purchase_order_items
CREATE OR REPLACE FUNCTION auto_update_budget_realized_from_order_items()
RETURNS TRIGGER AS $$
DECLARE
  v_order_record RECORD;
  v_budget_id uuid;
BEGIN
  -- Get order details
  SELECT po.*, w.id as work_id
  INTO v_order_record
  FROM public.purchase_orders po
  JOIN public.works w ON po.work_id = w.id
  WHERE po.id = NEW.order_id;

  -- Get budget_id (try from order first, then from work's latest budget)
  v_budget_id := v_order_record.budget_id;

  IF v_budget_id IS NULL THEN
    SELECT id INTO v_budget_id
    FROM public.budgets
    WHERE work_id = v_order_record.work_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Only proceed if we have a budget
  IF v_budget_id IS NOT NULL AND NEW.budget_item_id IS NOT NULL THEN
    -- Insert or update budget_realized
    INSERT INTO public.budget_realized (
      budget_id,
      budget_item_id,
      purchase_order_id,
      quantidade_realizada,
      valor_realizado,
      data_realizacao,
      status,
      responsible_id
    )
    VALUES (
      v_budget_id,
      NEW.budget_item_id,
      NEW.order_id,
      NEW.quantidade,
      NEW.preco_total,
      CURRENT_DATE,
      'Pendente',
      v_order_record.created_by
    )
    ON CONFLICT (id) DO UPDATE
    SET
      quantidade_realizada = NEW.quantidade,
      valor_realizado = NEW.preco_total,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_budget_realized_from_items ON public.purchase_order_items;
CREATE TRIGGER trigger_auto_budget_realized_from_items
  AFTER INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION auto_update_budget_realized_from_order_items();

-- Trigger: Propagate phase/subphase/budget from request to quotation and order
CREATE OR REPLACE FUNCTION propagate_request_data_to_quotation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quotation with work_id and budget_id from request
  UPDATE public.quotations
  SET
    work_id = (SELECT work_id FROM public.purchase_requests WHERE id = NEW.request_id),
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_request_to_quotation ON public.quotations;
CREATE TRIGGER trigger_propagate_request_to_quotation
  AFTER INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION propagate_request_data_to_quotation();

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migração completa executada com sucesso!';
  RAISE NOTICE '📊 Todas as tabelas, políticas RLS e triggers foram criados';
  RAISE NOTICE '👤 Usuário admin criado: admin@arco.com.br / Admin@123';
END $$;
