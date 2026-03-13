/*
  # Adicionar empresa_id às tabelas principais

  1. Alterações
    - Adicionar `empresa_id` a todas as tabelas principais do sistema
    - Criar índices para performance
    - Manter integridade referencial

  2. Tabelas afetadas
    - clients
    - works
    - budgets
    - suppliers
    - contracts
    - purchase_requests
    - quotations
    - purchase_orders
    - schedules
    - tasks
    - work_diaries
    - prospections
    - financial_accounts
    - financial_movements
    - bank_accounts
    - invoices
*/

-- Adicionar empresa_id à tabela clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_clients_empresa_id ON clients(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'works' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE works ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_works_empresa_id ON works(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_budgets_empresa_id ON budgets(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_suppliers_empresa_id ON suppliers(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_contracts_empresa_id ON contracts(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela purchase_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_purchase_requests_empresa_id ON purchase_requests(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_quotations_empresa_id ON quotations(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_purchase_orders_empresa_id ON purchase_orders(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE schedules ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_schedules_empresa_id ON schedules(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_tasks_empresa_id ON tasks(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela work_diaries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_work_diaries_empresa_id ON work_diaries(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela prospections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prospections' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE prospections ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_prospections_empresa_id ON prospections(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela financial_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_accounts' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE financial_accounts ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_financial_accounts_empresa_id ON financial_accounts(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela financial_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_movements' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE financial_movements ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_financial_movements_empresa_id ON financial_movements(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela bank_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_accounts' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE bank_accounts ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_bank_accounts_empresa_id ON bank_accounts(empresa_id);
  END IF;
END $$;

-- Adicionar empresa_id à tabela invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX idx_invoices_empresa_id ON invoices(empresa_id);
  END IF;
END $$;
