/*
  # Add first_due_date to contracts table

  1. Changes
    - Add `first_due_date` column to `contracts` table to store the due date of the first installment
    - This field will be used to calculate exact due dates for all installments in the "Parcelas" tab
  
  2. Notes
    - The field is optional (nullable) to maintain compatibility with existing contracts
    - When creating new installments, the system will use this date as the base for calculating subsequent due dates
*/

-- Add first_due_date column to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS first_due_date date;
