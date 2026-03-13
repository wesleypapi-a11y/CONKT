/*
  # Fix Cascade Delete for Empresas

  1. Changes
    - Drop and recreate profiles.empresa_id foreign key with CASCADE DELETE
    - This allows deleting empresas and automatically removing associated profiles
  
  2. Security
    - No changes to RLS policies
*/

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_empresa_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_empresa_id_fkey
  FOREIGN KEY (empresa_id)
  REFERENCES empresas(id)
  ON DELETE CASCADE;
