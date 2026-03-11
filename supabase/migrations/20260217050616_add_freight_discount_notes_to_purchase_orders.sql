/*
  # Adicionar campos de frete, desconto e notas em purchase_orders

  ## Mudanças
  1. **Adicionar campos em purchase_orders**
     - freight_value (numeric) - Valor do frete
     - discount_value (numeric) - Valor do desconto
     - notes (text) - Observações/notas adicionais
*/

-- Adicionar campos se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'freight_value'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN freight_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN discount_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN notes text;
  END IF;
END $$;
