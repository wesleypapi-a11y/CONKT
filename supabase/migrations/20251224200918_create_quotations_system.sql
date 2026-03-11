/*
  # Sistema de Cotações

  1. Nova Tabela: quotations
    - `id` (uuid, primary key)
    - `quotation_number` (text, número automático da cotação)
    - `request_id` (uuid, referência à solicitação)
    - `work_id` (uuid, referência à obra)
    - `status` (text, situação: nova_cotacao, enviada, recebida, aprovada, cancelada)
    - `responsible_id` (uuid, responsável)
    - `description` (text, descrição)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Nova Tabela: quotation_items
    - `id` (uuid, primary key)
    - `quotation_id` (uuid, referência à cotação)
    - `supplier_id` (uuid, fornecedor que cotou)
    - `item_type` (text, tipo: insumo, servico)
    - `phase` (text, fase da obra)
    - `service` (text, serviço)
    - `item_name` (text, nome do insumo/serviço)
    - `brand` (text, marca)
    - `complement` (text, complemento)
    - `quantity` (numeric, quantidade)
    - `unit` (text, unidade)
    - `unit_price` (numeric, preço unitário)
    - `total_price` (numeric, preço total)
    - `delivery_time` (text, prazo de entrega)
    - `created_at` (timestamp)

  3. Nova Tabela: quotation_suppliers
    - Lista de fornecedores vinculados à cotação

  4. Storage
    - Bucket para anexos de cotações

  5. Segurança
    - RLS habilitado em todas tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de cotações
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL,
  request_id uuid REFERENCES purchase_requests(id) ON DELETE SET NULL,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'nova_cotacao',
  responsible_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text,
  delivery_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de fornecedores da cotação
CREATE TABLE IF NOT EXISTS quotation_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de itens das cotações
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'insumo',
  phase text,
  service text,
  item_name text NOT NULL,
  brand text,
  complement text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  delivery_time text,
  created_at timestamptz DEFAULT now()
);

-- Criar bucket para anexos de cotações
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-attachments', 'quotation-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Políticas para quotations
CREATE POLICY "Users can view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete quotations"
  ON quotations FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para quotation_suppliers
CREATE POLICY "Users can view quotation_suppliers"
  ON quotation_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create quotation_suppliers"
  ON quotation_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quotation_suppliers"
  ON quotation_suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete quotation_suppliers"
  ON quotation_suppliers FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para quotation_items
CREATE POLICY "Users can view quotation_items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create quotation_items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quotation_items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete quotation_items"
  ON quotation_items FOR DELETE
  TO authenticated
  USING (true);

-- Políticas de storage para anexos
CREATE POLICY "Users can upload quotation attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quotation-attachments');

CREATE POLICY "Users can view quotation attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'quotation-attachments');

CREATE POLICY "Users can update quotation attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quotation-attachments')
  WITH CHECK (bucket_id = 'quotation-attachments');

CREATE POLICY "Users can delete quotation attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quotation-attachments');

-- Função para gerar número de cotação
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+') AS integer)), 0) + 1
  INTO next_num
  FROM quotations;
  
  new_number := 'COT-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := generate_quotation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quotation_number
  BEFORE INSERT ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_quotation_number();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
