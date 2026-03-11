/*
  # Sistema Completo de Compras - Purchase Requests, Quotations e Purchase Orders

  1. Novas Tabelas
    - purchase_requests: Solicitações de compra
    - purchase_request_items: Itens das solicitações
    - quotations: Cotações de fornecedores
    - quotation_items: Itens cotados
    - purchase_orders: Pedidos de compra
    - financial_entries: Lançamentos financeiros

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para usuários autenticados

  3. Triggers e Funções
    - Geração automática de números
    - Atualização de valores realizados
    - Integração financeira
*/

-- 0. Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Criar tabela de solicitações de compra
CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'aberta',
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  need_date date,
  description text,
  contact_name text,
  contact_whatsapp text,
  phase_id uuid REFERENCES budget_items(id),
  subphase_id uuid REFERENCES budget_items(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Criar tabela de itens das solicitações
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

-- 3. Criar tabela quotations (Cotações/Propostas dos Fornecedores)
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  total_value numeric NOT NULL DEFAULT 0,
  delivery_time text,
  payment_conditions text,
  observations text,
  status text NOT NULL DEFAULT 'pendente',
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  frozen boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Criar tabela quotation_items (Itens das Cotações)
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  request_item_id uuid NOT NULL REFERENCES purchase_request_items(id),
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. Criar tabela purchase_orders (Pedidos de Compra)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  request_id uuid NOT NULL REFERENCES purchase_requests(id),
  quotation_id uuid REFERENCES quotations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  total_value numeric NOT NULL DEFAULT 0,
  delivery_address text,
  delivery_date date,
  payment_conditions text,
  observations text,
  status text NOT NULL DEFAULT 'aberto',
  requester_id uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  frozen boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Criar tabela financial_entries (Lançamentos Financeiros)
CREATE TABLE IF NOT EXISTS financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subphase_id uuid NOT NULL REFERENCES budget_items(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  entry_type text NOT NULL DEFAULT 'debito',
  value numeric NOT NULL,
  description text,
  origin text NOT NULL DEFAULT 'Pedido de Compra',
  reference_number text,
  status text NOT NULL DEFAULT 'ativo',
  requester_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancellation_reason text
);

-- 7. Criar bucket para anexos de solicitações
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-request-attachments', 'purchase-request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Habilitar RLS em todas as tabelas
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

-- 9. Políticas para purchase_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Users can view purchase_requests') THEN
    CREATE POLICY "Users can view purchase_requests"
      ON purchase_requests FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Users can create purchase_requests') THEN
    CREATE POLICY "Users can create purchase_requests"
      ON purchase_requests FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Users can update purchase_requests') THEN
    CREATE POLICY "Users can update purchase_requests"
      ON purchase_requests FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Users can delete purchase_requests') THEN
    CREATE POLICY "Users can delete purchase_requests"
      ON purchase_requests FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 10. Políticas para purchase_request_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_items' AND policyname = 'Users can view purchase_request_items') THEN
    CREATE POLICY "Users can view purchase_request_items"
      ON purchase_request_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_items' AND policyname = 'Users can create purchase_request_items') THEN
    CREATE POLICY "Users can create purchase_request_items"
      ON purchase_request_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_items' AND policyname = 'Users can update purchase_request_items') THEN
    CREATE POLICY "Users can update purchase_request_items"
      ON purchase_request_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_items' AND policyname = 'Users can delete purchase_request_items') THEN
    CREATE POLICY "Users can delete purchase_request_items"
      ON purchase_request_items FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 11. Políticas para quotations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Users can view quotations') THEN
    CREATE POLICY "Users can view quotations"
      ON quotations FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Users can create quotations') THEN
    CREATE POLICY "Users can create quotations"
      ON quotations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Users can update quotations') THEN
    CREATE POLICY "Users can update quotations"
      ON quotations FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Users can delete quotations') THEN
    CREATE POLICY "Users can delete quotations"
      ON quotations FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 12. Políticas para quotation_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND policyname = 'Users can view quotation items') THEN
    CREATE POLICY "Users can view quotation items"
      ON quotation_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND policyname = 'Users can create quotation items') THEN
    CREATE POLICY "Users can create quotation items"
      ON quotation_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND policyname = 'Users can update quotation items') THEN
    CREATE POLICY "Users can update quotation items"
      ON quotation_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 13. Políticas para purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Users can view purchase orders') THEN
    CREATE POLICY "Users can view purchase orders"
      ON purchase_orders FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Users can create purchase orders') THEN
    CREATE POLICY "Users can create purchase orders"
      ON purchase_orders FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Users can update purchase orders') THEN
    CREATE POLICY "Users can update purchase orders"
      ON purchase_orders FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 14. Políticas para financial_entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_entries' AND policyname = 'Users can view financial entries') THEN
    CREATE POLICY "Users can view financial entries"
      ON financial_entries FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_entries' AND policyname = 'System can create financial entries') THEN
    CREATE POLICY "System can create financial entries"
      ON financial_entries FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_entries' AND policyname = 'System can update financial entries') THEN
    CREATE POLICY "System can update financial entries"
      ON financial_entries FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 15. Políticas de storage para anexos (só cria se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload purchase request attachments') THEN
    CREATE POLICY "Users can upload purchase request attachments"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'purchase-request-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can view purchase request attachments') THEN
    CREATE POLICY "Users can view purchase request attachments"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'purchase-request-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update purchase request attachments') THEN
    CREATE POLICY "Users can update purchase request attachments"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'purchase-request-attachments')
      WITH CHECK (bucket_id = 'purchase-request-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete purchase request attachments') THEN
    CREATE POLICY "Users can delete purchase request attachments"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'purchase-request-attachments');
  END IF;
END $$;

-- 16. Função para gerar número de solicitação
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+') AS integer)), 0) + 1
  INTO next_num
  FROM purchase_requests;
  
  new_number := 'SCP-' || LPAD(next_num::text, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 17. Trigger para gerar número de solicitação automaticamente
CREATE OR REPLACE FUNCTION set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_number ON purchase_requests;
CREATE TRIGGER trigger_set_request_number
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_number();

-- 18. Função para gerar número de pedido
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

-- 19. Trigger para gerar número de pedido automaticamente
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON purchase_orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- 20. Trigger para atualizar updated_at em purchase_requests
DROP TRIGGER IF EXISTS update_purchase_requests_updated_at ON purchase_requests;
CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 21. Trigger para atualizar updated_at em quotations
DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 22. Trigger para atualizar updated_at em purchase_orders
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();