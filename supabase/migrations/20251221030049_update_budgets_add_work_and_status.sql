/*
  # Update Budgets System - Add Work Reference and New Status
  
  1. Changes
    - Add `work_id` column to reference works table
    - Update status check to include 'em_preenchimento'
    - Update default status to 'em_preenchimento'
    - Update default template to 'basico'
    - Add index for work_id
  
  2. Notes
    - Existing columns (descricao, valor_total, validade, observacoes) are kept for backward compatibility
    - work_id is optional to allow budgets without specific works
*/

-- Add work_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'work_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN work_id uuid REFERENCES works(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop existing status constraint and create new one
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_status_check;
ALTER TABLE budgets ADD CONSTRAINT budgets_status_check 
  CHECK (status IN ('em_preenchimento', 'rascunho', 'enviado', 'aprovado', 'rejeitado', 'cancelado'));

-- Update default values
ALTER TABLE budgets ALTER COLUMN status SET DEFAULT 'em_preenchimento';
ALTER TABLE budgets ALTER COLUMN template SET DEFAULT 'basico';

-- Add index for work_id
CREATE INDEX IF NOT EXISTS idx_budgets_work_id ON budgets(work_id);