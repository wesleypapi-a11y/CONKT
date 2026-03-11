/*
  # Adicionar campos de pagamento em pedidos de compra

  1. Alterações
    - Adiciona campo `paid` (boolean) - indica se o pedido foi pago
    - Adiciona campo `payment_date` (date) - data do pagamento

  2. Valores padrão
    - `paid` DEFAULT false - por padrão, pedidos não estão pagos
    - `payment_date` aceita NULL - só preenchido quando pago

  3. Observações
    - Campos não afetam RLS existente
    - Campos opcionais para não quebrar pedidos existentes
*/

DO $$
BEGIN
  -- Adicionar campo paid se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'paid'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN paid boolean DEFAULT false;
  END IF;

  -- Adicionar campo payment_date se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN payment_date date;
  END IF;
END $$;
