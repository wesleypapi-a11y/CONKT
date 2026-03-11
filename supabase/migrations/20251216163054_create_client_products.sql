/*
  # Create Client Products System

  1. New Tables
    - `client_products`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `product_type` (text) - tipo de produto
      - `value` (decimal) - valor total
      - `payment_method` (text) - forma de pagamento
      - `installments` (integer) - número de parcelas
      - `contract_date` (date) - data de contratação
      - `start_date` (date) - data de início
      - `estimated_end_date` (date) - data prevista de término
      - `actual_end_date` (date) - data real de término
      - `duration_months` (integer) - prazo em meses
      - `obra_address` (text) - endereço da obra
      - `status` (text) - status do produto
      - `observations` (text) - observações
      - `contract_data` (jsonb) - dados adicionais do contrato
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `client_products` table
    - Add policies for authenticated users to manage products of their own clients
*/

CREATE TABLE IF NOT EXISTS client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_type text NOT NULL,
  value decimal(15,2),
  payment_method text,
  installments integer DEFAULT 1,
  contract_date date,
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  duration_months integer,
  obra_address text,
  status text DEFAULT 'ativo',
  observations text,
  contract_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products of their own clients"
  ON client_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_products.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create products for their own clients"
  ON client_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_products.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products of their own clients"
  ON client_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_products.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_products.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products of their own clients"
  ON client_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_products.client_id
      AND clients.user_id = auth.uid()
    )
  );