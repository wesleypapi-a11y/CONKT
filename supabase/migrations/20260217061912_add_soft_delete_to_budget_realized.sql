/*
  # Adicionar soft delete à tabela budget_realized

  1. Problema
    - O código tenta usar deleted_at na tabela budget_realized
    - Mas a coluna não existe, causando erros nas queries
    
  2. Solução
    - Adicionar deleted_at e deleted_by à tabela budget_realized
    - Permitir soft delete dos lançamentos realizados
    - Manter histórico de valores excluídos
    
  3. Notas
    - Soft delete permite reverter exclusões se necessário
    - deleted_at = NULL significa que o registro está ativo
    - deleted_at != NULL significa que o registro foi excluído
*/

-- Adicionar coluna deleted_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_realized' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE budget_realized ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Adicionar coluna deleted_by se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_realized' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE budget_realized ADD COLUMN deleted_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Adicionar coluna deletion_reason se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_realized' AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE budget_realized ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- Criar índice para queries que filtram por deleted_at
CREATE INDEX IF NOT EXISTS idx_budget_realized_deleted_at ON budget_realized(deleted_at);
