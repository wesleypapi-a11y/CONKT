/*
  # Adicionar phase_id e subphase_id em purchase_order_items

  ## Mudanças
  
  1. **Adicionar colunas UUID**:
     - `phase_id` (UUID, nullable) - referência ao budget_item de fase (macro sem parent_id)
     - `subphase_id` (UUID, nullable) - referência ao budget_item de subfase (macro com parent_id)
  
  2. **Migrar dados existentes**:
     - Converter valores TEXT de `phase` para `phase_id` (UUID)
     - Converter valores TEXT de `service` para `subphase_id` (UUID)
     - Manter colunas antigas temporariamente para compatibilidade
  
  3. **Adicionar foreign keys**:
     - `phase_id` → `budget_items(id)`
     - `subphase_id` → `budget_items(id)`
  
  ## Razão
  
  O sistema precisa vincular itens de pedido diretamente às fases/subfases do orçamento
  para lançar valores corretamente no "Realizado" por centro de custo.
  
  Atualmente, os campos `phase` e `service` armazenam UUIDs como TEXT, o que impede
  foreign keys e dificulta queries corretas.
*/

-- 1. Adicionar novas colunas UUID
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subphase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;

-- 2. Migrar dados existentes (phase TEXT -> phase_id UUID)
-- Só migra se o valor TEXT for um UUID válido
UPDATE purchase_order_items
SET phase_id = phase::uuid
WHERE phase IS NOT NULL 
  AND phase ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND phase_id IS NULL;

-- 3. Migrar dados existentes (service TEXT -> subphase_id UUID)
UPDATE purchase_order_items
SET subphase_id = service::uuid
WHERE service IS NOT NULL 
  AND service ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND subphase_id IS NULL;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_phase_id 
ON purchase_order_items(phase_id) 
WHERE phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_subphase_id 
ON purchase_order_items(subphase_id) 
WHERE subphase_id IS NOT NULL;

-- Nota: Mantemos as colunas 'phase' e 'service' (TEXT) por enquanto para compatibilidade.
-- Elas podem ser removidas em migration futura após garantir que todo código usa phase_id/subphase_id.
