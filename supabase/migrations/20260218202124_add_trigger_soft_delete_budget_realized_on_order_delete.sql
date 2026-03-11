/*
  # Adicionar trigger para soft delete automático de budget_realized

  ## Problema
  - Quando um pedido é marcado como excluído (soft delete), as entradas em budget_realized permanecem ativas
  - Isso causa valores incorretos na coluna "Realizado" do orçamento
  - O valor realizado deve ser sempre 0 quando não há pedidos ativos

  ## Solução
  - Criar trigger que automaticamente marca entradas de budget_realized como excluídas
  - Quando purchase_orders.deleted_at é atualizado para NOT NULL
  - As entradas correspondentes em budget_realized também recebem deleted_at

  ## Comportamento
  - Realizado = SUM(budget_realized.amount WHERE deleted_at IS NULL)
  - Se todos os pedidos forem excluídos, Realizado = 0
  - Mantém histórico mas não afeta cálculos

  ## Notas
  - Este trigger garante consistência dos dados
  - Elimina necessidade de chamada manual no código
  - Funciona mesmo se o usuário usar SQL diretamente
*/

-- Criar função que marca budget_realized como excluído quando pedido é excluído
CREATE OR REPLACE FUNCTION soft_delete_budget_realized_on_order_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um pedido é marcado como excluído (deleted_at NOT NULL)
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Marcar todas as entradas de budget_realized como excluídas
    UPDATE budget_realized
    SET 
      deleted_at = NEW.deleted_at,
      deletion_reason = 'Pedido excluído automaticamente'
    WHERE purchase_order_id = NEW.id
      AND deleted_at IS NULL;
      
    RAISE NOTICE 'Budget realized entries soft-deleted for purchase order %', NEW.id;
  END IF;
  
  -- Quando um pedido é restaurado (deleted_at volta para NULL)
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    -- Restaurar as entradas de budget_realized
    UPDATE budget_realized
    SET 
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL
    WHERE purchase_order_id = NEW.id
      AND deletion_reason = 'Pedido excluído automaticamente';
      
    RAISE NOTICE 'Budget realized entries restored for purchase order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para purchase_orders
DROP TRIGGER IF EXISTS trigger_soft_delete_budget_realized ON purchase_orders;

CREATE TRIGGER trigger_soft_delete_budget_realized
  AFTER UPDATE OF deleted_at ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_budget_realized_on_order_delete();

-- Criar índice composto para otimizar as queries do trigger
CREATE INDEX IF NOT EXISTS idx_budget_realized_order_deleted 
  ON budget_realized(purchase_order_id, deleted_at);
