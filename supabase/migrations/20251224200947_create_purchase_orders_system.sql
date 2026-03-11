/*
  # Sistema de Pedidos de Compra

  1. Nova Tabela: purchase_orders
    - `id` (uuid, primary key)
    - `order_number` (text, número automático do pedido)
    - `quotation_id` (uuid, referência à cotação)
    - `work_id` (uuid, referência à obra)
    - `budget_area` (text, área do orçamento para alocar)
    - `supplier_id` (uuid, fornecedor escolhido)
    - `vendor_name` (text, nome do vendedor)
    - `status` (text, situação: pendente, enviada, recebida, cancelada)
    - `responsible_id` (uuid, responsável)
    - `description` (text, descrição)
    - `subtotal` (numeric, subtotal dos itens)
    - `discount` (numeric, desconto)
    - `discount_percent` (numeric, desconto em %)
    - `freight` (numeric, frete)
    - `total` (numeric, total do pedido)
    - `delivery_address` (text, endereço de entrega)
    - `notes` (text, observações)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Nova Tabela: purchase_order_items
    - `id` (uuid, primary key)
    - `order_id` (uuid, referência ao pedido)
    - `item_type` (text, tipo: insumo, servico)
    - `phase` (text, fase da obra)
    - `service` (text, serviço)
    - `item_name` (text, nome do insumo/serviço)
    - `brand` (text, marca)
    - `complement` (text, complemento)
    - `quantity` (numeric, quantidade)
    - `unit` (text, unidade)
    - `unit_price` (numeric, preço unitário)
    - `subtotal` (numeric, subtotal do item)
    - `created_at` (timestamp)

  3. Nova Tabela: purchase_order_payments
    - `id` (uuid, primary key)
    - `order_id` (uuid, referência ao pedido)
    - `payment_date` (date, data do pagamento)
    - `payment_method` (text, forma de pagamento)
    - `amount` (numeric, valor)
    - `status` (text, pago, pendente)
    - `notes` (text, observações)
    - `created_at` (timestamp)

  4. Storage
    - Bucket para anexos de pedidos

  5. Segurança
    - RLS habilitado em todas tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de pedidos de compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  budget_area text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  vendor_name text,
  status text NOT NULL DEFAULT 'pendente',
  responsible_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  freight numeric DEFAULT 0,
  total numeric DEFAULT 0,
  delivery_address text,
  notes text,
  approved_by_client boolean DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de itens dos pedidos
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL DEFAULT 'insumo',
  phase text,
  service text,
  item_name text NOT NULL,
  brand text,
  complement text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_price numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de pagamentos dos pedidos
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  payment_date date,
  payment_method text,
  amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Criar bucket para anexos de pedidos
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-order-attachments', 'purchase-order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para purchase_orders
CREATE POLICY "Users can view purchase_orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase_orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase_orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase_orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para purchase_order_items
CREATE POLICY "Users can view purchase_order_items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase_order_items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase_order_items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase_order_items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para purchase_order_payments
CREATE POLICY "Users can view purchase_order_payments"
  ON purchase_order_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase_order_payments"
  ON purchase_order_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase_order_payments"
  ON purchase_order_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase_order_payments"
  ON purchase_order_payments FOR DELETE
  TO authenticated
  USING (true);

-- Políticas de storage para anexos
CREATE POLICY "Users can upload purchase order attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'purchase-order-attachments');

CREATE POLICY "Users can view purchase order attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'purchase-order-attachments');

CREATE POLICY "Users can update purchase order attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'purchase-order-attachments')
  WITH CHECK (bucket_id = 'purchase-order-attachments');

CREATE POLICY "Users can delete purchase order attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'purchase-order-attachments');

-- Função para gerar número de pedido
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+') AS integer)), 0) + 1
  INTO next_num
  FROM purchase_orders;
  
  new_number := 'PED-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar o orçamento quando um pedido for vinculado
CREATE OR REPLACE FUNCTION update_budget_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um pedido é criado/atualizado com obra e área do orçamento
  -- atualizar o campo "realizado" no orçamento correspondente
  IF NEW.work_id IS NOT NULL AND NEW.budget_area IS NOT NULL AND NEW.approved_by_client = true THEN
    -- Aqui você pode adicionar lógica para atualizar budget_items
    -- baseado na área especificada
    NULL; -- Placeholder, será implementado quando tivermos a estrutura completa
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_on_purchase
  AFTER INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_on_purchase();
