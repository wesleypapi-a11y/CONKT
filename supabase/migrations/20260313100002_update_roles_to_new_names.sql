/*
  # Atualizar perfis de usuário para novos nomes

  1. Alterações
    - Atualizar perfis existentes
    - master permanece como 'master'
    - admin vira 'administrador'
    - user vira 'colaborador'
  
  2. Novos perfis
    - administrador
    - financeiro
    - colaborador
    - cliente

  3. Segurança
    - Manter todas as políticas RLS
    - Adicionar suporte para novos perfis
*/

-- Atualizar perfis existentes
UPDATE profiles SET role = 'administrador' WHERE role = 'admin';
UPDATE profiles SET role = 'colaborador' WHERE role = 'user';

-- Atualizar funções helper para incluir novos perfis
CREATE OR REPLACE FUNCTION is_admin_or_higher()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('master', 'administrador', 'financeiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar acesso financeiro
CREATE OR REPLACE FUNCTION has_financial_access()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('master', 'administrador', 'financeiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se é cliente
CREATE OR REPLACE FUNCTION is_cliente()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cliente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas de profiles para considerar novos roles
DROP POLICY IF EXISTS "Master users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can insert profiles in their empresa" ON profiles;

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

CREATE POLICY "Admin users can insert profiles in their empresa"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'administrador')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Atualizar política de empresas para administradores
DROP POLICY IF EXISTS "Admin users can view their empresa" ON empresas;

CREATE POLICY "Admin users can view their empresa"
  ON empresas FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'financeiro')
    )
  );
