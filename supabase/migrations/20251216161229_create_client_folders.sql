/*
  # Create Client Folders System

  1. New Tables
    - `client_folders`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `name` (text) - folder name
      - `created_at` (timestamptz)
  
  2. Changes to existing tables
    - Add `folder_id` column to `client_attachments` table to link attachments to folders
  
  3. Security
    - Enable RLS on `client_folders` table
    - Add policies for authenticated users to manage folders of their own clients
    - Update policies for client_attachments to include folder access
*/

CREATE TABLE IF NOT EXISTS client_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders of their own clients"
  ON client_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_folders.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folders for their own clients"
  ON client_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_folders.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders of their own clients"
  ON client_folders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_folders.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_folders.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders of their own clients"
  ON client_folders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_folders.client_id
      AND clients.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_attachments' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE client_attachments ADD COLUMN folder_id uuid REFERENCES client_folders(id) ON DELETE CASCADE;
  END IF;
END $$;