/*
  # Adicionar Soft Delete ao Sistema de Compras

  ## Mudanças

  1. **Adicionar deleted_at às tabelas principais**
     - `purchase_requests.deleted_at` (timestamptz, nullable)
     - `quotations.deleted_at` (timestamptz, nullable)
     - `purchase_orders.deleted_at` (timestamptz, nullable)
     - `deleted_by` (uuid, referência a auth.users)
     - `deletion_reason` (text, nullable)

  2. **Criar índices para performance**
     - Índices em deleted_at para queries mais rápidas

  3. **Adicionar campo de status de pagamento**
     - `purchase_orders.is_paid` (boolean, default false)
     - Campo para controlar se pedido foi pago

  ## Notas Importantes
  - Soft delete permite manter histórico e auditoria
  - Queries devem filtrar deleted_at IS NULL
  - Pedidos pagos exigem cancelamento antes de exclusão
  - Ao excluir solicitação, cotações e pedidos também são marcados como deletados
*/

-- 1. Adicionar deleted_at, deleted_by e deletion_reason em purchase_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requests' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE purchase_requests 
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
      ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- 2. Adicionar deleted_at, deleted_by e deletion_reason em quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE quotations 
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
      ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- 3. Adicionar deleted_at, deleted_by, deletion_reason e is_paid em purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE purchase_orders 
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
      ADD COLUMN deletion_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'is_paid'
  ) THEN
    ALTER TABLE purchase_orders 
      ADD COLUMN is_paid boolean DEFAULT false;
  END IF;
END $$;

-- 4. Criar índices para performance em queries com soft delete
CREATE INDEX IF NOT EXISTS idx_purchase_requests_deleted_at 
  ON purchase_requests(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_deleted_at 
  ON quotations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at 
  ON purchase_orders(deleted_at) WHERE deleted_at IS NULL;

-- 5. Criar função para soft delete em cascata de solicitações
CREATE OR REPLACE FUNCTION soft_delete_purchase_request_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete em todas as cotações vinculadas
  UPDATE quotations 
  SET 
    deleted_at = NEW.deleted_at,
    deleted_by = NEW.deleted_by,
    deletion_reason = 'Solicitação excluída'
  WHERE request_id = NEW.id 
    AND deleted_at IS NULL;

  -- Soft delete em todos os pedidos vinculados (através das cotações)
  UPDATE purchase_orders 
  SET 
    deleted_at = NEW.deleted_at,
    deleted_by = NEW.deleted_by,
    deletion_reason = 'Solicitação excluída'
  WHERE request_id = NEW.id 
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para soft delete em cascata de solicitações
DROP TRIGGER IF EXISTS trigger_soft_delete_purchase_request_cascade ON purchase_requests;
CREATE TRIGGER trigger_soft_delete_purchase_request_cascade
  AFTER UPDATE OF deleted_at ON purchase_requests
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete_purchase_request_cascade();

-- 7. Criar função para soft delete em cascata de cotações
CREATE OR REPLACE FUNCTION soft_delete_quotation_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete em todos os pedidos vinculados a esta cotação
  UPDATE purchase_orders 
  SET 
    deleted_at = NEW.deleted_at,
    deleted_by = NEW.deleted_by,
    deletion_reason = 'Cotação excluída'
  WHERE quotation_id = NEW.id 
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para soft delete em cascata de cotações
DROP TRIGGER IF EXISTS trigger_soft_delete_quotation_cascade ON quotations;
CREATE TRIGGER trigger_soft_delete_quotation_cascade
  AFTER UPDATE OF deleted_at ON quotations
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete_quotation_cascade();

-- 9. Criar função para remover budget_realized ao soft delete de pedidos
CREATE OR REPLACE FUNCTION remove_budget_realized_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Remover entradas de budget_realized quando pedido for soft deleted
  DELETE FROM budget_realized 
  WHERE purchase_order_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar trigger para remover budget_realized
DROP TRIGGER IF EXISTS trigger_remove_budget_realized_on_delete ON purchase_orders;
CREATE TRIGGER trigger_remove_budget_realized_on_delete
  AFTER UPDATE OF deleted_at ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION remove_budget_realized_on_delete();