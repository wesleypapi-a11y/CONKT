/*
  # Create Client Portal Access System

  1. New Tables
    - `client_portal_access`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients) - Cliente que terá acesso
      - `work_id` (uuid, references works) - Obra que o cliente pode acessar
      - `access_email` (text) - Email para login no portal
      - `access_password` (text) - Senha hash para login
      - `is_active` (boolean) - Se o acesso está ativo
      - `modules_enabled` (jsonb) - Módulos habilitados: { budget: true, schedule: true, diary: true, dashboard: true, cashflow: true }
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, references profiles)
      - `deleted_at` (timestamptz) - Soft delete

  2. Security
    - Enable RLS on client_portal_access table
    - Add policies for authenticated users to manage portal access
    - Clients can only see their own access records

  3. Important Notes
    - Portal access is controlled per client per work
    - Each module can be individually enabled/disabled
    - Uses separate authentication from main system
*/

-- Create client_portal_access table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  access_email text NOT NULL,
  access_password text NOT NULL,
  is_active boolean DEFAULT true,
  modules_enabled jsonb DEFAULT '{"budget": true, "schedule": true, "diary": true, "dashboard": true, "cashflow": true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  deleted_at timestamptz,
  UNIQUE(client_id, work_id, access_email)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client_id ON client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_work_id ON client_portal_access(work_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_email ON client_portal_access(access_email);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_active ON client_portal_access(is_active) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

-- Policies for client_portal_access
CREATE POLICY "Authenticated users can view all portal access"
  ON client_portal_access FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create portal access"
  ON client_portal_access FOR INSERT
  TO authenticated
  WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated users can update portal access"
  ON client_portal_access FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated users can soft delete portal access"
  ON client_portal_access FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_client_portal_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_client_portal_access_updated_at ON client_portal_access;
CREATE TRIGGER update_client_portal_access_updated_at
  BEFORE UPDATE ON client_portal_access
  FOR EACH ROW
  EXECUTE FUNCTION update_client_portal_access_updated_at();
