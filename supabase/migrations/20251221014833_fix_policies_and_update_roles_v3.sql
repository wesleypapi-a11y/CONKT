/*
  # Corrigir políticas RLS e atualizar roles

  1. Alterações
    - Remover políticas antigas que causam recursão infinita
    - Atualizar valores possíveis de role para: colaborador, cliente, administrador
    - Criar novas políticas sem recursão usando subquery otimizada
    
  2. Segurança
    - Policies otimizadas para evitar recursão
    - Administradores podem gerenciar todos os perfis
    - Usuários podem ver apenas seu próprio perfil

  3. Notas Importantes
    - As políticas antigas serão removidas e substituídas
    - Roles existentes serão migrados automaticamente
    - user -> colaborador, admin -> administrador
*/

-- Remover políticas antigas que causam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own data" ON profiles;

-- Atualizar constraint de role para incluir todos os valores temporariamente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'colaborador', 'cliente', 'administrador'));

-- Migrar roles existentes
UPDATE profiles SET role = 'colaborador' WHERE role = 'user';
UPDATE profiles SET role = 'administrador' WHERE role = 'admin';

-- Atualizar constraint final (apenas novos valores)
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('colaborador', 'cliente', 'administrador'));

-- Alterar default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'colaborador';

-- Criar função helper no schema public para verificar role do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1),
    'colaborador'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Política simplificada para SELECT - usuários veem seu próprio perfil, admins veem todos
CREATE POLICY "Ver perfis autorizados"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.get_my_role() = 'administrador'
  );

-- Política para UPDATE - apenas admins
CREATE POLICY "Administradores atualizam perfis"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'administrador')
  WITH CHECK (public.get_my_role() = 'administrador');

-- Política para INSERT - apenas admins
CREATE POLICY "Administradores criam perfis"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'administrador');

-- Política para DELETE - apenas admins  
CREATE POLICY "Administradores deletam perfis"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'administrador');