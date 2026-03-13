/*
  # Criar políticas RLS para isolamento Multi-Tenant

  1. Políticas
    - Master users: acesso a todos os dados
    - Regular users: acesso apenas aos dados da sua empresa
    - Isolamento completo entre empresas

  2. Segurança
    - Garantir que usuários não vejam dados de outras empresas
    - Permitir acesso total para master
    - Verificar vigência da empresa
*/

-- Função helper para verificar se usuário é master
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper para pegar empresa_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT empresa_id FROM profiles
    WHERE profiles.id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper para verificar se empresa está ativa
CREATE OR REPLACE FUNCTION is_empresa_active(empresa_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM empresas
    WHERE id = empresa_uuid
    AND status = 'ativa'
    AND data_fim_vigencia >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS PARA CLIENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view clients from same empresa" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

CREATE POLICY "Users can view clients from same empresa"
  ON clients FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

-- ============================================
-- POLÍTICAS PARA WORKS
-- ============================================
DROP POLICY IF EXISTS "Users can view works from same empresa" ON works;
DROP POLICY IF EXISTS "Users can insert works" ON works;
DROP POLICY IF EXISTS "Users can update works" ON works;
DROP POLICY IF EXISTS "Users can delete works" ON works;

CREATE POLICY "Users can view works from same empresa"
  ON works FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can insert works"
  ON works FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can update works"
  ON works FOR UPDATE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can delete works"
  ON works FOR DELETE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

-- ============================================
-- POLÍTICAS PARA BUDGETS
-- ============================================
DROP POLICY IF EXISTS "Users can view budgets from same empresa" ON budgets;
DROP POLICY IF EXISTS "Users can insert budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete budgets" ON budgets;

CREATE POLICY "Users can view budgets from same empresa"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can insert budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

-- ============================================
-- POLÍTICAS PARA SUPPLIERS
-- ============================================
DROP POLICY IF EXISTS "Users can view suppliers from same empresa" ON suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers" ON suppliers;

CREATE POLICY "Users can view suppliers from same empresa"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

-- ============================================
-- POLÍTICAS PARA CONTRACTS
-- ============================================
DROP POLICY IF EXISTS "Users can view contracts from same empresa" ON contracts;
DROP POLICY IF EXISTS "Users can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete contracts" ON contracts;

CREATE POLICY "Users can view contracts from same empresa"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can insert contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

CREATE POLICY "Users can delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );

-- Continuar para todas as outras tabelas com o mesmo padrão...
-- purchase_requests, quotations, purchase_orders, schedules, tasks, work_diaries, prospections, 
-- financial_accounts, financial_movements, bank_accounts, invoices
