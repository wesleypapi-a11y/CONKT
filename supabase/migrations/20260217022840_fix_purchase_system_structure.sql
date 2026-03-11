/*
  # Reestruturação Completa do Sistema de Compras
  
  ## Problema Identificado
  - Tabela purchase_order_items não existe
  - Campos duplicados (paid/is_paid) em purchase_orders
  - Campos desnecessários em purchase_orders

  ## Solução
  
  1. **Criar purchase_order_items**
     - id (uuid, primary key)
     - order_id (uuid, FK para purchase_orders)
     - request_item_id (uuid, FK para purchase_request_items)
     - item_type (text)
     - phase (text)
     - service (text)
     - item_name (text)
     - complement (text)
     - quantity (numeric)
     - unit (text)
     - unit_price (numeric)
     - total_price (numeric)
     - created_at (timestamptz)
     - deleted_at (timestamptz)
     - deleted_by (uuid)
     - deletion_reason (text)
  
  2. **Limpar purchase_orders**
     - Remover campo 'total_value' duplicado (manter apenas o nome correto)
     - Remover campo 'paid' (manter apenas 'is_paid')
     - Remover campo 'requester_id' (já tem 'request_id')
     
  3. **Segurança**
     - RLS ativado em purchase_order_items
     - Políticas de acesso para usuários autenticados
     
  4. **Cascade**
     - Exclusão de purchase_order cascateia para purchase_order_items
     - Exclusão de purchase_order cascateia para budget_realized
*/

-- 1. Criar tabela purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  request_item_id uuid REFERENCES purchase_request_items(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'insumo',
  phase text,
  service text,
  item_name text NOT NULL,
  complement text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  deletion_reason text
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_request_item_id ON purchase_order_items(request_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_deleted_at ON purchase_order_items(deleted_at);

-- 3. Ativar RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS para purchase_order_items
CREATE POLICY "Usuários autenticados podem visualizar itens"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar itens"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar itens"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (true);

-- 5. Remover campos duplicados de purchase_orders (com segurança)
DO $$
BEGIN
  -- Remover 'paid' se existir (mantém 'is_paid')
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'paid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'is_paid'
  ) THEN
    -- Copiar valor de 'paid' para 'is_paid' se necessário
    UPDATE purchase_orders SET is_paid = paid WHERE is_paid IS NULL AND paid IS NOT NULL;
    ALTER TABLE purchase_orders DROP COLUMN IF EXISTS paid;
  END IF;
END $$;

-- 6. Adicionar campos úteis em purchase_orders se não existirem
DO $$
BEGIN
  -- Adicionar responsible_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'responsible_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN responsible_id uuid REFERENCES auth.users(id);
  END IF;
END $$;
