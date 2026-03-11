/*
  # Create triggers to propagate phase/subphase/budget through purchase flow

  1. Triggers Created
    - When quotation is created from request: copy phase_id, subphase_id, budget_id, work_id
    - When quotation items are created: copy phase_id, subphase_id from request items
    - This ensures the cost center (phase/subphase) flows through the entire purchase process

  2. Business Logic
    - Request defines the cost center (phase + subphase) and links to budget
    - Quotation inherits these links automatically
    - Purchase Order will inherit from quotation (handled in edge function)
    - Budget realized gets updated with correct phase/subphase allocation
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_propagate_request_data_to_quotation ON quotations;
DROP FUNCTION IF EXISTS propagate_request_data_to_quotation();

DROP TRIGGER IF EXISTS trigger_propagate_request_items_to_quotation_items ON quotation_items;
DROP FUNCTION IF EXISTS propagate_request_items_to_quotation_items();

-- Function to propagate request-level data to quotation
CREATE OR REPLACE FUNCTION propagate_request_data_to_quotation()
RETURNS TRIGGER AS $$
BEGIN
  -- If quotation has a request_id, copy phase_id, subphase_id, budget_id, work_id from request
  IF NEW.request_id IS NOT NULL THEN
    UPDATE quotations
    SET
      phase_id = COALESCE(NEW.phase_id, pr.phase_id),
      subphase_id = COALESCE(NEW.subphase_id, pr.subphase_id),
      work_id = COALESCE(NEW.work_id, pr.work_id)
    FROM purchase_requests pr
    WHERE quotations.id = NEW.id
      AND pr.id = NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to copy request data to quotation on insert
CREATE TRIGGER trigger_propagate_request_data_to_quotation
AFTER INSERT ON quotations
FOR EACH ROW
EXECUTE FUNCTION propagate_request_data_to_quotation();

-- Function to propagate request item data to quotation items
CREATE OR REPLACE FUNCTION propagate_request_items_to_quotation_items()
RETURNS TRIGGER AS $$
BEGIN
  -- If quotation item has a request_item_id, copy phase_id and subphase_id
  IF NEW.request_item_id IS NOT NULL THEN
    UPDATE quotation_items
    SET
      phase_id = COALESCE(NEW.phase_id, ri.phase_id),
      subphase_id = COALESCE(NEW.subphase_id, ri.subphase_id)
    FROM purchase_request_items ri
    WHERE quotation_items.id = NEW.id
      AND ri.id = NEW.request_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to copy request item data to quotation items on insert
CREATE TRIGGER trigger_propagate_request_items_to_quotation_items
AFTER INSERT ON quotation_items
FOR EACH ROW
EXECUTE FUNCTION propagate_request_items_to_quotation_items();
