/*
  # Adicionar coluna budget_id à tabela contracts

  1. Alterações
    - Adiciona coluna `budget_id` (uuid, opcional) à tabela `contracts`
    - Adiciona foreign key para `budgets(id)` com ON DELETE SET NULL
    - Permite vincular contratos a orçamentos específicos para apropriação
  
  2. Notas
    - Campo opcional: contratos podem existir sem orçamento vinculado
    - ON DELETE SET NULL: se orçamento for deletado, contrato mantém outros dados
*/

-- Adicionar coluna budget_id à tabela contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'budget_id'
  ) THEN
    ALTER TABLE contracts 
    ADD COLUMN budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice para melhorar performance de queries por budget_id
CREATE INDEX IF NOT EXISTS idx_contracts_budget_id ON contracts(budget_id);
