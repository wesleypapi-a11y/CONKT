/*
  # Trigger automático para inserir no budget_realized ao criar item de pedido
  
  ## Descrição
  
  Este migration cria um trigger que automaticamente insere registros em `budget_realized`
  sempre que um item de pedido (purchase_order_items) for criado.
  
  ## Regra de negócio
  
  - **PC (Contrato)** e **PCO (Ordem de Compra)** devem alimentar o Realizado
  - Ao criar item de pedido com phase_id válido → inserir automaticamente no budget_realized
  - Ao criar item de pedido sem phase_id → não inserir (item sem vinculação de orçamento)
  
  ## Comportamento
  
  1. Quando purchase_order_items é inserido:
     - Se tem phase_id e purchase_order tem budget válido → inserir em budget_realized
     - Valor = total_price do item
     - Descrição = automática baseada no pedido
  
  2. Quando purchase_order_items é atualizado (valor muda):
     - Atualizar o valor correspondente em budget_realized
  
  3. Quando purchase_order_items é excluído (soft delete):
     - Marcar como excluído em budget_realized automaticamente
  
  ## Notas
  
  - Elimina duplicação de código entre PC e PCO
  - Garante que TODOS os pedidos alimentam o Realizado
  - Mantém consistência mesmo se código frontend falhar
  - Funciona para operações SQL diretas também
*/

-- ============================================================================
-- FUNÇÃO: Inserir automaticamente em budget_realized ao criar item de pedido
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_insert_budget_realized_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id uuid;
  v_work_id uuid;
BEGIN
  -- Buscar budget_id e work_id do pedido
  SELECT work_id INTO v_work_id
  FROM purchase_orders
  WHERE id = NEW.order_id;
  
  -- Se não tem phase_id, não precisa inserir no realizado
  IF NEW.phase_id IS NULL THEN
    RAISE NOTICE 'Item sem phase_id, pulando inserção no budget_realized';
    RETURN NEW;
  END IF;
  
  -- Buscar budget_id da obra (se houver)
  IF v_work_id IS NOT NULL THEN
    SELECT id INTO v_budget_id
    FROM budgets
    WHERE work_id = v_work_id
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Se não encontrou budget, não insere
  IF v_budget_id IS NULL THEN
    RAISE NOTICE 'Nenhum budget encontrado para work_id %, pulando inserção', v_work_id;
    RETURN NEW;
  END IF;
  
  -- Inserir no budget_realized
  INSERT INTO budget_realized (
    budget_id,
    phase_id,
    subphase_id,
    purchase_order_id,
    purchase_order_item_id,
    amount,
    description,
    created_by,
    created_at
  ) VALUES (
    v_budget_id,
    NEW.phase_id,
    NEW.subphase_id,
    NEW.order_id,
    NEW.id,
    NEW.total_price,
    COALESCE(NEW.item_name, 'Item de pedido'),
    NEW.created_by,
    NOW()
  );
  
  RAISE NOTICE 'Budget realized inserido automaticamente para item %', NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Executar após INSERT em purchase_order_items
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_insert_budget_realized ON purchase_order_items;

CREATE TRIGGER trigger_auto_insert_budget_realized
  AFTER INSERT ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_budget_realized_on_order_item();

-- ============================================================================
-- FUNÇÃO: Atualizar budget_realized quando item de pedido é atualizado
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_update_budget_realized_on_order_item_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o valor mudou, atualizar budget_realized
  IF OLD.total_price != NEW.total_price THEN
    UPDATE budget_realized
    SET 
      amount = NEW.total_price,
      updated_at = NOW()
    WHERE purchase_order_item_id = NEW.id
      AND deleted_at IS NULL;
      
    RAISE NOTICE 'Budget realized atualizado para item %', NEW.id;
  END IF;
  
  -- Se mudou phase_id ou subphase_id, atualizar também
  IF (OLD.phase_id IS DISTINCT FROM NEW.phase_id) OR (OLD.subphase_id IS DISTINCT FROM NEW.subphase_id) THEN
    UPDATE budget_realized
    SET 
      phase_id = NEW.phase_id,
      subphase_id = NEW.subphase_id,
      updated_at = NOW()
    WHERE purchase_order_item_id = NEW.id
      AND deleted_at IS NULL;
      
    RAISE NOTICE 'Fase/subfase atualizada no budget realized para item %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Executar após UPDATE em purchase_order_items
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_update_budget_realized ON purchase_order_items;

CREATE TRIGGER trigger_auto_update_budget_realized
  AFTER UPDATE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_budget_realized_on_order_item_update();

-- ============================================================================
-- FUNÇÃO: Marcar budget_realized como excluído quando item é excluído
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_soft_delete_budget_realized_on_item_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando item é marcado como excluído (soft delete)
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE budget_realized
    SET 
      deleted_at = NEW.deleted_at,
      deleted_by = NEW.deleted_by,
      deletion_reason = 'Item de pedido excluído'
    WHERE purchase_order_item_id = NEW.id
      AND deleted_at IS NULL;
      
    RAISE NOTICE 'Budget realized marcado como excluído para item %', NEW.id;
  END IF;
  
  -- Quando item é restaurado
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE budget_realized
    SET 
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL
    WHERE purchase_order_item_id = NEW.id
      AND deletion_reason = 'Item de pedido excluído';
      
    RAISE NOTICE 'Budget realized restaurado para item %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Executar após UPDATE de deleted_at em purchase_order_items
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_soft_delete_budget_realized_on_item ON purchase_order_items;

CREATE TRIGGER trigger_auto_soft_delete_budget_realized_on_item
  AFTER UPDATE OF deleted_at ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_soft_delete_budget_realized_on_item_delete();

-- ============================================================================
-- Criar índices para otimizar as queries dos triggers
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_phase 
  ON purchase_order_items(order_id, phase_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_budget_realized_item_id_deleted 
  ON budget_realized(purchase_order_item_id, deleted_at);
