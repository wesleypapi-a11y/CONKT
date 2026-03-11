/*
  # Adicionar template_id à tabela budgets

  1. Alterações
    - Adicionar coluna `template_id` na tabela `budgets`
    - Adicionar foreign key para `budget_templates`
*/

-- Adicionar coluna template_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN template_id uuid REFERENCES budget_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_budgets_template_id ON budgets(template_id);