/*
  # Add recurrence and appropriation fields to contracts

  1. Changes
    - Add `recurrence_days` column to `contracts` table (integer, default 30)
      - Defines the number of days between installment due dates
    - Add `budget_phase_id` column to `contracts` table (uuid, nullable)
      - References a phase in the budget_items table for cost appropriation
    - Add `budget_subphase_id` column to `contracts` table (uuid, nullable)
      - References a subphase in the budget_items table for cost appropriation

  2. Purpose
    - Enable flexible installment generation with custom recurrence periods (7, 15, 30 days, etc.)
    - Allow contracts to be appropriated to specific budget phases and subphases
    - Improve financial tracking by linking contracts to budget structure
*/

-- Add recurrence_days column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'recurrence_days'
  ) THEN
    ALTER TABLE contracts ADD COLUMN recurrence_days integer DEFAULT 30;
  END IF;
END $$;

-- Add budget_phase_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'budget_phase_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN budget_phase_id uuid REFERENCES budget_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add budget_subphase_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'budget_subphase_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN budget_subphase_id uuid REFERENCES budget_items(id) ON DELETE SET NULL;
  END IF;
END $$;
