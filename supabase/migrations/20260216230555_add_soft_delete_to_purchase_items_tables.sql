/*
  # Adicionar Soft Delete em Tabelas de Itens do Fluxo de Compras

  ## Objetivo
  Padronizar o soft delete (exclusão lógica) em TODAS as tabelas do fluxo de compras
  para permitir exclusão em cascata sem quebrar foreign keys.

  ## Tabelas Modificadas
  
  1. **purchase_request_items**
     - Adiciona `deleted_at` (timestamptz)
     - Adiciona `deleted_by` (uuid, referência ao usuário)
     - Adiciona `deletion_reason` (text)
  
  2. **quotation_items**
     - Adiciona `deleted_at` (timestamptz)
     - Adiciona `deleted_by` (uuid, referência ao usuário)
     - Adiciona `deletion_reason` (text)
  
  3. **budget_realized**
     - Adiciona `deleted_at` (timestamptz)
     - Adiciona `deleted_by` (uuid, referência ao usuário)
     - Adiciona `deletion_reason` (text)

  ## Padrão de Soft Delete
  - Todas as tabelas principais JÁ TÊM: purchase_requests, quotations, purchase_orders
  - Agora as tabelas de itens/filhas também terão o mesmo padrão
  - Permite excluir em cascata sem quebrar FKs
  - Mantém histórico completo de exclusões

  ## Impacto
  - Queries devem filtrar `deleted_at IS NULL` para buscar registros ativos
  - Exclusões se tornam UPDATEs com timestamp
  - Histórico preservado para auditoria
  
  ## Observação
  - purchase_orders armazena itens em JSONB, não há tabela order_items
*/

-- Adicionar colunas de soft delete em purchase_request_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_request_items' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE purchase_request_items 
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
    ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- Adicionar colunas de soft delete em quotation_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE quotation_items 
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
    ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- Adicionar colunas de soft delete em budget_realized
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_realized' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE budget_realized 
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_by uuid REFERENCES auth.users(id),
    ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- Criar índices para melhorar performance nas queries de filtragem
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_deleted_at 
  ON purchase_request_items(deleted_at) WHERE deleted_at IS NULL;
  
CREATE INDEX IF NOT EXISTS idx_quotation_items_deleted_at 
  ON quotation_items(deleted_at) WHERE deleted_at IS NULL;
  
CREATE INDEX IF NOT EXISTS idx_budget_realized_deleted_at 
  ON budget_realized(deleted_at) WHERE deleted_at IS NULL;
