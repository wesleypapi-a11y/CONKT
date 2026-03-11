/*
  # Sistema de Clientes

  ## Descrição
  Sistema completo para gerenciamento de clientes com dados pessoais, contatos, anexos e acessos.

  ## Novas Tabelas
  
  ### `clients`
  Tabela principal de clientes com dados pessoais e de contato
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - usuário que criou o cliente
  - `name` (text) - nome completo do cliente
  - `type` (text) - tipo: 'fisica' ou 'juridica'
  - `category` (text) - categoria do cliente
  - `cpf_cnpj` (text) - CPF ou CNPJ
  - `rg_ie` (text) - RG ou Inscrição Estadual
  - `birth_date` (date) - data de nascimento
  - `nationality` (text) - nacionalidade
  - `marital_status` (text) - estado civil
  - `profession` (text) - profissão
  - `observation` (text) - observações gerais
  - `phone` (text) - telefone
  - `mobile` (text) - celular
  - `email` (text) - e-mail
  - `zip_code` (text) - CEP
  - `address` (text) - logradouro
  - `number` (text) - número
  - `neighborhood` (text) - bairro
  - `complement` (text) - complemento
  - `state` (text) - estado
  - `city` (text) - cidade
  - `photo_url` (text) - URL da foto do cliente
  - `active` (boolean) - se o cliente está ativo
  - `created_at` (timestamptz) - data de criação
  - `updated_at` (timestamptz) - data de atualização

  ### `client_contacts`
  Contatos adicionais do cliente
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to clients)
  - `name` (text) - nome do contato
  - `phone` (text) - telefone
  - `mobile` (text) - celular
  - `email` (text) - e-mail
  - `observation` (text) - observações
  - `is_main` (boolean) - se é o contato principal
  - `has_access` (boolean) - se tem acesso ao sistema
  - `created_at` (timestamptz)

  ### `client_attachments`
  Anexos do cliente
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to clients)
  - `file_name` (text) - nome do arquivo
  - `file_url` (text) - URL do arquivo
  - `file_size` (integer) - tamanho do arquivo em bytes
  - `file_type` (text) - tipo MIME do arquivo
  - `uploaded_at` (timestamptz)

  ### `client_permissions`
  Permissões de acesso do cliente ao portal/app
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to clients)
  - `module_name` (text) - nome do módulo
  - `portal_access` (boolean) - acesso ao portal
  - `mobile_access` (boolean) - acesso ao app móvel
  - `created_at` (timestamptz)

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Usuários autenticados podem gerenciar seus próprios clientes
*/

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'fisica' CHECK (type IN ('fisica', 'juridica')),
  category text,
  cpf_cnpj text,
  rg_ie text,
  birth_date date,
  nationality text,
  marital_status text,
  profession text,
  observation text,
  phone text,
  mobile text,
  email text,
  zip_code text,
  address text,
  number text,
  neighborhood text,
  complement text,
  state text,
  city text,
  photo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de contatos do cliente
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  mobile text,
  email text,
  observation text,
  is_main boolean DEFAULT false,
  has_access boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabela de anexos do cliente
CREATE TABLE IF NOT EXISTS client_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_at timestamptz DEFAULT now()
);

-- Tabela de permissões do cliente
CREATE TABLE IF NOT EXISTS client_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  module_name text NOT NULL,
  portal_access boolean DEFAULT false,
  mobile_access boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, module_name)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_client_id ON client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_permissions_client_id ON client_permissions(client_id);

-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para clients
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para client_contacts
CREATE POLICY "Users can view contacts of own clients"
  ON client_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts for own clients"
  ON client_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts of own clients"
  ON client_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts of own clients"
  ON client_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Políticas para client_attachments
CREATE POLICY "Users can view attachments of own clients"
  ON client_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_attachments.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for own clients"
  ON client_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_attachments.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of own clients"
  ON client_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_attachments.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Políticas para client_permissions
CREATE POLICY "Users can view permissions of own clients"
  ON client_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert permissions for own clients"
  ON client_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update permissions of own clients"
  ON client_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete permissions of own clients"
  ON client_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_permissions.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Bucket para fotos e anexos de clientes (será criado via código)
-- Políticas de storage serão aplicadas separadamente