/*
  # Corrigir trigger budget_realized - usar responsible_id ao invés de created_by
  
  ## Problema
  
  A tabela purchase_orders usa `responsible_id` e não `created_by`,
  causando erro ao tentar inserir no budget_realized.
  
  ## Solução
  
  - Usar responsible_id do purchase_order
  - Se não houver responsible_id, usar auth.uid() como fallback
*/

CREATE OR REPLACE FUNCTION auto_insert_budget_realized_on_order_item()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id uuid;
  v_work_id uuid;
  v_responsible_id uuid;
BEGIN
  -- Buscar work_id e responsible_id do pedido
  SELECT work_id, responsible_id INTO v_work_id, v_responsible_id
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
    COALESCE(v_responsible_id, auth.uid()),
    NOW()
  );
  
  RAISE NOTICE 'Budget realized inserido automaticamente para item %', NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
