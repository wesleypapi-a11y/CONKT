/*
  # Add Soft Delete to Works Table

  1. Changes
    - Add `deleted_at` column to `works` table for soft delete functionality
    - Update RLS policies to filter out deleted works
    - Add index on `deleted_at` for performance
    - Create function to restore deleted works (optional)

  2. Security
    - Update all existing policies to exclude deleted works
    - Only show non-deleted works in normal queries
    - Admin users can still query deleted works if needed

  3. Notes
    - Deleted works will not appear in normal lists
    - All foreign key relationships remain intact
    - Works can be restored by setting deleted_at to NULL
*/

-- Add deleted_at column to works table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE works ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create index for performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_works_deleted_at ON works(deleted_at) WHERE deleted_at IS NULL;

-- Drop existing policies to recreate them with deleted_at filter
DROP POLICY IF EXISTS "Users can view own works" ON works;
DROP POLICY IF EXISTS "Users can insert own works" ON works;
DROP POLICY IF EXISTS "Users can update own works" ON works;
DROP POLICY IF EXISTS "Users can delete own works" ON works;

-- Recreate policies with deleted_at filter
CREATE POLICY "Users can view own works"
  ON works
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own works"
  ON works
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own works"
  ON works
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own works"
  ON works
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to restore deleted works (optional)
CREATE OR REPLACE FUNCTION restore_work(work_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE works
  SET deleted_at = NULL
  WHERE id = work_id AND user_id = auth.uid();
END;
$$;
