/*
  # Add Soft Delete to Contract Installments

  1. Changes
    - Add `deleted_at` (timestamptz, nullable) to `contract_installments` table
    - Add `deleted_by` (uuid, nullable, FK to auth.users) to track who deleted
    - Add `deletion_reason` (text, nullable) for audit trail

  2. Security
    - No policy changes needed (inherits from existing RLS)
*/

-- Add soft delete columns to contract_installments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_installments' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE contract_installments ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_installments' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE contract_installments ADD COLUMN deleted_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_installments' AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE contract_installments ADD COLUMN deletion_reason text;
  END IF;
END $$;
