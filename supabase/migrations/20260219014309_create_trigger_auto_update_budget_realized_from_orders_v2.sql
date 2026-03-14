/*
  # Create trigger to automatically update budget_realized from purchase orders

  1. Function Created
    - `sync_budget_realized_from_purchase_order_items()`: Automatically creates/updates budget_realized entries
    
  2. Business Logic
    - When purchase_order_items are inserted: create budget_realized entries
    - Each item with phase_id creates one entry in budget_realized
    - Groups by: budget_id, work_id, phase_id, subphase_id
    - Updates the 'realized_value' for the corresponding budget phase
    
  3. Triggers
    - After INSERT on purchase_order_items
    - After UPDATE on purchase_order_items (if values change)
    - After DELETE on purchase_order_items (removes budget_realized)
*/

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS trigger_sync_budget_realized_on_order_item_insert ON purchase_order_items;
DROP TRIGGER IF EXISTS trigger_sync_budget_realized_on_order_item_update ON purchase_order_items;
DROP TRIGGER IF EXISTS trigger_sync_budget_realized_on_order_item_delete ON purchase_order_items;
DROP FUNCTION IF EXISTS sync_budget_realized_from_purchase_order_items();

-- Function to sync budget_realized from purchase_order_items
CREATE OR REPLACE FUNCTION sync_budget_realized_from_purchase_order_items()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id uuid;
  v_work_id uuid;
  v_responsible_id uuid;
  v_phase_id uuid;
  v_subphase_id uuid;
  v_realized_value numeric;
BEGIN
  -- For DELETE operation
  IF TG_OP = 'DELETE' THEN
    -- Get order info from OLD record
    SELECT po.budget_id, po.work_id, po.responsible_id
    INTO v_budget_id, v_work_id, v_responsible_id
    FROM purchase_orders po
    WHERE po.id = OLD.order_id;

    -- If this was the last item for this phase/subphase, remove budget_realized
    IF OLD.phase_id IS NOT NULL THEN
      -- Check if there are other items with same phase/subphase
      IF NOT EXISTS (
        SELECT 1 FROM purchase_order_items poi
        WHERE poi.order_id = OLD.order_id
          AND poi.phase_id = OLD.phase_id
          AND COALESCE(poi.subphase_id::text, '') = COALESCE(OLD.subphase_id::text, '')
          AND poi.id != OLD.id
      ) THEN
        -- Remove budget_realized entry
        DELETE FROM budget_realized
        WHERE purchase_order_id = OLD.order_id
          AND phase_id = OLD.phase_id
          AND COALESCE(subphase_id::text, '') = COALESCE(OLD.subphase_id::text, '');
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- For INSERT or UPDATE operations
  -- Get order information
  SELECT po.budget_id, po.work_id, po.responsible_id
  INTO v_budget_id, v_work_id, v_responsible_id
  FROM purchase_orders po
  WHERE po.id = NEW.order_id;

  -- If budget_id is null, try to fetch from work_id
  IF v_budget_id IS NULL AND v_work_id IS NOT NULL THEN
    SELECT b.id INTO v_budget_id
    FROM budgets b
    WHERE b.work_id = v_work_id
    ORDER BY b.created_at DESC
    LIMIT 1;
  END IF;

  -- Only proceed if we have budget_id and phase_id
  IF v_budget_id IS NULL OR NEW.phase_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_phase_id := NEW.phase_id;
  v_subphase_id := NEW.subphase_id;

  -- Calculate total realized value for this phase/subphase in this order
  SELECT COALESCE(SUM(poi.total_price), 0)
  INTO v_realized_value
  FROM purchase_order_items poi
  WHERE poi.order_id = NEW.order_id
    AND poi.phase_id = v_phase_id
    AND COALESCE(poi.subphase_id::text, '') = COALESCE(v_subphase_id::text, '')
    AND poi.deleted_at IS NULL;

  -- Insert or update budget_realized
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
  )
  VALUES (
    v_budget_id,
    v_phase_id,
    v_subphase_id,
    NEW.order_id,
    NEW.id,
    NEW.total_price,
    NEW.item_name,
    v_responsible_id,
    NOW()
  )
  ON CONFLICT (budget_id, phase_id, COALESCE(subphase_id, '00000000-0000-0000-0000-000000000000'::uuid), purchase_order_id)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    created_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
CREATE TRIGGER trigger_sync_budget_realized_on_order_item_insert
AFTER INSERT ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION sync_budget_realized_from_purchase_order_items();

-- Trigger on UPDATE
CREATE TRIGGER trigger_sync_budget_realized_on_order_item_update
AFTER UPDATE ON purchase_order_items
FOR EACH ROW
WHEN (
  OLD.total_price IS DISTINCT FROM NEW.total_price OR
  OLD.phase_id IS DISTINCT FROM NEW.phase_id OR
  OLD.subphase_id IS DISTINCT FROM NEW.subphase_id OR
  OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
)
EXECUTE FUNCTION sync_budget_realized_from_purchase_order_items();

-- Trigger on DELETE
CREATE TRIGGER trigger_sync_budget_realized_on_order_item_delete
AFTER DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION sync_budget_realized_from_purchase_order_items();
