/*
  # Corrigir cascade de pedidos e criar integração com orçamento realizado

  ## Mudanças

  1. **Ajuste de Constraints**
     - Corrigir foreign key de `financial_entries.purchase_order_id` para CASCADE
     - Garantir que ao excluir pedido, lançamentos financeiros sejam removidos automaticamente

  2. **Nova Tabela: budget_realized**
     - `id` (uuid, primary key)
     - `budget_id` (uuid, referência a budgets)
     - `phase_id` (uuid, referência a budget_items - fase)
     - `subphase_id` (uuid, referência a budget_items - subfase, nullable)
     - `purchase_order_id` (uuid, referência a purchase_orders)
     - `order_item_index` (int, índice do item no array JSONB)
     - `amount` (numeric, valor realizado)
     - `description` (text, descrição do item)
     - `created_at` (timestamptz)
     - `created_by` (uuid, referência a auth.users)

  3. **Segurança**
     - RLS habilitado em budget_realized
     - Políticas para usuários autenticados

  ## Notas Importantes
  - Ao gerar pedido, registros serão criados em budget_realized
  - Ao excluir pedido, registros em budget_realized serão removidos automaticamente (CASCADE)
  - Coluna "Realizado" do orçamento = SUM(budget_realized.amount) por fase/subfase
*/

-- 1. Remover constraint antiga de financial_entries
ALTER TABLE financial_entries 
  DROP CONSTRAINT IF EXISTS financial_entries_purchase_order_id_fkey;

-- 2. Recriar constraint com CASCADE
ALTER TABLE financial_entries
  ADD CONSTRAINT financial_entries_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id)
  REFERENCES purchase_orders(id)
  ON DELETE CASCADE;

-- 3. Criar tabela budget_realized para integração pedidos <-> orçamento
CREATE TABLE IF NOT EXISTS budget_realized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  subphase_id uuid REFERENCES budget_items(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  order_item_index int NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_budget_realized_budget_id ON budget_realized(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_realized_phase_id ON budget_realized(phase_id);
CREATE INDEX IF NOT EXISTS idx_budget_realized_subphase_id ON budget_realized(subphase_id);
CREATE INDEX IF NOT EXISTS idx_budget_realized_purchase_order_id ON budget_realized(purchase_order_id);

-- 5. Habilitar RLS
ALTER TABLE budget_realized ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar realizados"
  ON budget_realized FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir realizados"
  ON budget_realized FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar realizados"
  ON budget_realized FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem excluir realizados"
  ON budget_realized FOR DELETE
  TO authenticated
  USING (true);
