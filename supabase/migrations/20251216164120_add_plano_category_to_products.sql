/*
  # Add plano_category field to client_products

  1. Changes
    - Add `plano_category` column to `client_products` table
    - This field stores the subcategory when product_type is 'Plano Start'
    - Options: Bronze, Prata, Ouro, Diamante, Personalizado
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_products' AND column_name = 'plano_category'
  ) THEN
    ALTER TABLE client_products ADD COLUMN plano_category text;
  END IF;
END $$;