/*
  # Sistema de Solicitações de Compra

  1. Nova Tabela: purchase_requests
    - `id` (uuid, primary key)
    - `request_number` (text, número automático da solicitação)
    - `work_id` (uuid, referência à obra)
    - `status` (text, situação: aberta, cotando, aprovada, cancelada)
    - `requester_id` (uuid, quem solicitou)
    - `need_date` (date, data de necessidade)
    - `description` (text, descrição)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Nova Tabela: purchase_request_items
    - `id` (uuid, primary key)
    - `request_id` (uuid, referência à solicitação)
    - `item_type` (text, tipo: item_livre, insumo, servico)
    - `phase` (text, fase da obra)
    - `service` (text, serviço)
    - `item_name` (text, nome do item)
    - `complement` (text, complemento)
    - `quantity` (numeric, quantidade)
    - `unit` (text, unidade)
    - `created_at` (timestamp)

  3. Storage
    - Bucket para anexos de solicitações

  4. Segurança
    - RLS habilitado em ambas tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de solicitações de compra
CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'aberta',
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  need_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de itens das solicitações
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES purchase_requests(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL DEFAULT 'item_livre',
  phase text,
  service text,
  item_name text NOT NULL,
  complement text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  created_at timestamptz DEFAULT now()
);

-- Criar bucket para anexos de solicitações
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-request-attachments', 'purchase-request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;

-- Políticas para purchase_requests
CREATE POLICY "Users can view purchase_requests"
  ON purchase_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase_requests"
  ON purchase_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase_requests"
  ON purchase_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase_requests"
  ON purchase_requests FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para purchase_request_items
CREATE POLICY "Users can view purchase_request_items"
  ON purchase_request_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase_request_items"
  ON purchase_request_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase_request_items"
  ON purchase_request_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase_request_items"
  ON purchase_request_items FOR DELETE
  TO authenticated
  USING (true);

-- Políticas de storage para anexos
CREATE POLICY "Users can upload purchase request attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'purchase-request-attachments');

CREATE POLICY "Users can view purchase request attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'purchase-request-attachments');

CREATE POLICY "Users can update purchase request attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'purchase-request-attachments')
  WITH CHECK (bucket_id = 'purchase-request-attachments');

CREATE POLICY "Users can delete purchase request attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'purchase-request-attachments');

-- Função para gerar número de solicitação
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+') AS integer)), 0) + 1
  INTO next_num
  FROM purchase_requests;
  
  new_number := 'SOL-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente
CREATE OR REPLACE FUNCTION set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_request_number
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_number();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
