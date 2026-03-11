/*
  # Adicionar phase_id e subphase_id em request_items e quotation_items

  ## Mudanças
  
  1. **purchase_request_items**:
     - Adicionar `phase_id` (UUID, nullable) - referência ao budget_item de fase
     - Adicionar `subphase_id` (UUID, nullable) - referência ao budget_item de subfase
     - Migrar dados existentes de TEXT para UUID
     - Criar índices para performance
  
  2. **quotation_items**:
     - Adicionar `phase_id` (UUID, nullable) - referência ao budget_item de fase
     - Adicionar `subphase_id` (UUID, nullable) - referência ao budget_item de subfase
     - Criar índices para performance
  
  ## Razão
  
  O sistema precisa armazenar fase/subfase por ITEM desde a solicitação,
  propagando para cotação e pedido. Cada item pode ter centro de custo diferente.
  
  Atualmente apenas purchase_order_items tem esses campos, causando perda de dados
  no fluxo: solicitação → cotação → pedido → realizado.
*/

-- 1. Adicionar colunas em purchase_request_items
ALTER TABLE purchase_request_items
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subphase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;

-- 2. Migrar dados existentes (phase TEXT -> phase_id UUID)
UPDATE purchase_request_items
SET phase_id = phase::uuid
WHERE phase IS NOT NULL 
  AND phase ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND phase_id IS NULL;

-- 3. Migrar dados existentes (service TEXT -> subphase_id UUID)
UPDATE purchase_request_items
SET subphase_id = service::uuid
WHERE service IS NOT NULL 
  AND service ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND subphase_id IS NULL;

-- 4. Adicionar colunas em quotation_items
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subphase_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_request_items_phase_id 
ON purchase_request_items(phase_id) 
WHERE phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_items_subphase_id 
ON purchase_request_items(subphase_id) 
WHERE subphase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotation_items_phase_id 
ON quotation_items(phase_id) 
WHERE phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotation_items_subphase_id 
ON quotation_items(subphase_id) 
WHERE subphase_id IS NOT NULL;
