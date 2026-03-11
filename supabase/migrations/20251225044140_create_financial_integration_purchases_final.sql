/*
  # Integração Financeira - Compras com Planejamento por Fase/Subfase

  ## Resumo
  Esta migração cria a estrutura completa para integração entre o módulo de Compras 
  e o Planejamento Financeiro por Fases/Subfases.

  ## 1. Novas Colunas
  
  ### budget_items (Fases e Subfases)
    - `valor_realizado` (numeric) - Armazena o valor realizado da fase/subfase
    - Será atualizado automaticamente quando Pedidos de Compra forem gerados
  
  ### purchase_requests (Solicitações de Compra)
    - `phase_id` (uuid) - Vínculo com Fase (budget_item tipo='macro')
    - `subphase_id` (uuid) - Vínculo com Subfase (budget_item tipo='item')

  ## 2. Novas Tabelas
  
  ### quotations (Cotações/Propostas)
    - Armazena propostas de fornecedores
    
  ### quotation_items (Itens das Cotações)
    - Preços por item de cada cotação
  
  ### purchase_orders (Pedidos de Compra)
    - Armazena os pedidos de compra gerados
    - Campos principais: número, fornecedor, valor_total, status
    - Vinculado à solicitação de compra
  
  ### financial_entries (Lançamentos Financeiros)
    - Rastreia todos os lançamentos no Realizado
    - Origem: Pedido de Compra
    - Permite estorno e ajuste
  
  ## 3. Triggers Automáticos
  
  ### Ao criar Pedido de Compra:
    - Lança automaticamente valor no Realizado da Subfase
    - Atualiza o Realizado da Fase (soma das subfases)
    - Cria registro em financial_entries
  
  ### Ao cancelar Pedido:
    - Estorna o valor do Realizado
    - Marca lançamento como cancelado
  
  ### Ao editar valor do Pedido:
    - Ajusta o valor do Realizado
    - Atualiza o lançamento

  ## 4. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas restritivas por usuário autenticado
*/

-- 1. Adicionar coluna valor_realizado em budget_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_items' AND column_name = 'valor_realizado'
  ) THEN
    ALTER TABLE budget_items ADD COLUMN valor_realizado numeric DEFAULT 0;
  END IF;
END $$;

-- 2. Adicionar colunas phase_id e subphase_id em purchase_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requests' AND column_name = 'phase_id'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN phase_id uuid REFERENCES budget_items(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requests' AND column_name = 'subphase_id'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN subphase_id uuid REFERENCES budget_items(id);
  END IF;
END $$;

-- 3. Criar tabela quotations (Cotações/Propostas dos Fornecedores)
CREATE TABLE quotations (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

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

-- 4. Criar tabela quotation_items (Itens das Cotações)
CREATE TABLE quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  request_item_id uuid NOT NULL REFERENCES purchase_request_items(id),
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotation items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create quotation items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quotation items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Criar tabela purchase_orders (Pedidos de Compra)
CREATE TABLE purchase_orders (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Criar tabela financial_entries (Lançamentos Financeiros)
CREATE TABLE financial_entries (
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

ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial entries"
  ON financial_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create financial entries"
  ON financial_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update financial entries"
  ON financial_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Criar função para atualizar valor realizado da subfase
CREATE OR REPLACE FUNCTION update_subphase_realized_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE budget_items
  SET valor_realizado = (
    SELECT COALESCE(SUM(value), 0)
    FROM financial_entries
    WHERE subphase_id = NEW.subphase_id
    AND status = 'ativo'
  )
  WHERE id = NEW.subphase_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar realizado ao criar/atualizar lançamento
CREATE TRIGGER trigger_update_subphase_realized
  AFTER INSERT OR UPDATE ON financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_subphase_realized_value();

-- 9. Criar função para atualizar valor realizado da fase (soma das subfases)
CREATE OR REPLACE FUNCTION update_phase_realized_value()
RETURNS TRIGGER AS $$
DECLARE
  v_phase_id uuid;
BEGIN
  SELECT parent_id INTO v_phase_id
  FROM budget_items
  WHERE id = NEW.id;
  
  IF v_phase_id IS NOT NULL THEN
    UPDATE budget_items
    SET valor_realizado = (
      SELECT COALESCE(SUM(valor_realizado), 0)
      FROM budget_items
      WHERE parent_id = v_phase_id
    )
    WHERE id = v_phase_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar trigger para atualizar fase ao atualizar subfase
CREATE TRIGGER trigger_update_phase_realized
  AFTER UPDATE OF valor_realizado ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_realized_value();

-- 11. Criar função para criar lançamento financeiro ao gerar pedido
CREATE OR REPLACE FUNCTION create_financial_entry_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_subphase_id uuid;
  v_request_id uuid;
BEGIN
  SELECT subphase_id, id INTO v_subphase_id, v_request_id
  FROM purchase_requests
  WHERE id = NEW.request_id;
  
  IF NEW.status IN ('aberto', 'aprovado') AND v_subphase_id IS NOT NULL THEN
    INSERT INTO financial_entries (
      subphase_id,
      purchase_order_id,
      entry_type,
      value,
      description,
      origin,
      reference_number,
      status,
      requester_id
    ) VALUES (
      v_subphase_id,
      NEW.id,
      'debito',
      NEW.total_value,
      'Lançamento automático - Pedido de Compra',
      'Pedido de Compra',
      NEW.order_number,
      'ativo',
      NEW.requester_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Criar trigger para criar lançamento ao gerar pedido
CREATE TRIGGER trigger_create_financial_entry
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_financial_entry_on_order();

-- 13. Criar função para estornar lançamento ao cancelar pedido
CREATE OR REPLACE FUNCTION cancel_financial_entry_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    UPDATE financial_entries
    SET 
      status = 'cancelado',
      cancelled_at = now(),
      cancelled_by = NEW.cancelled_by,
      cancellation_reason = NEW.cancellation_reason
    WHERE purchase_order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Criar trigger para cancelar lançamento ao cancelar pedido
CREATE TRIGGER trigger_cancel_financial_entry
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelado' AND OLD.status != 'cancelado')
  EXECUTE FUNCTION cancel_financial_entry_on_order_cancel();

-- 15. Criar função para ajustar lançamento ao editar valor do pedido
CREATE OR REPLACE FUNCTION adjust_financial_entry_on_order_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_value != OLD.total_value AND NEW.status != 'cancelado' THEN
    UPDATE financial_entries
    SET value = NEW.total_value
    WHERE purchase_order_id = NEW.id
    AND status = 'ativo';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Criar trigger para ajustar lançamento ao editar pedido
CREATE TRIGGER trigger_adjust_financial_entry
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.total_value != OLD.total_value AND NEW.status != 'cancelado')
  EXECUTE FUNCTION adjust_financial_entry_on_order_update();

-- 17. Criar índices para performance
CREATE INDEX idx_quotations_request_id ON quotations(request_id);
CREATE INDEX idx_quotations_supplier_id ON quotations(supplier_id);
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_purchase_orders_request_id ON purchase_orders(request_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_financial_entries_subphase_id ON financial_entries(subphase_id);
CREATE INDEX idx_financial_entries_purchase_order_id ON financial_entries(purchase_order_id);
CREATE INDEX idx_purchase_requests_phase_id ON purchase_requests(phase_id);
CREATE INDEX idx_purchase_requests_subphase_id ON purchase_requests(subphase_id);
