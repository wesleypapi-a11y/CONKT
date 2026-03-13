/*
  # Criar estrutura Multi-Empresa (Multi-Tenant)

  1. Nova Tabela
    - `empresas`
      - `id` (uuid, primary key)
      - `razao_social` (text)
      - `nome_fantasia` (text)
      - `cnpj` (text, unique)
      - `telefone` (text)
      - `email` (text)
      - `data_inicio_vigencia` (date)
      - `data_fim_vigencia` (date)
      - `status` (text - ativa, inativa, bloqueada)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Alterações
    - Adicionar `empresa_id` à tabela `profiles`
    - Adicionar role 'master' ao sistema
    - Criar índices para performance

  3. Segurança
    - Enable RLS na tabela empresas
    - Criar políticas para usuários master
    - Criar políticas para administradores de empresa
*/

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  telefone text,
  email text,
  data_inicio_vigencia date NOT NULL DEFAULT CURRENT_DATE,
  data_fim_vigencia date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'bloqueada')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar empresa_id à tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_vigencia ON empresas(data_fim_vigencia);

-- Atualizar função de atualização de timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Política para usuários master: acesso total
CREATE POLICY "Master users can view all empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Master users can insert empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Master users can update empresas"
  ON empresas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Master users can delete empresas"
  ON empresas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Política para administradores: podem ver apenas sua própria empresa
CREATE POLICY "Admin users can view their empresa"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Atualizar políticas de profiles para considerar empresa_id
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Master pode ver todos os perfis
CREATE POLICY "Master users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'master'
    )
  );

-- Usuários podem ver perfis da mesma empresa
CREATE POLICY "Users can view profiles from same empresa"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'master'
    )
  );

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Master pode criar qualquer perfil
CREATE POLICY "Master users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Admins podem criar perfis na sua empresa
CREATE POLICY "Admin users can insert profiles in their empresa"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
