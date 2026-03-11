/*
  # Create supplier folders and attachments

  1. New Tables
    - `supplier_folders`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - Timestamps

    - `supplier_attachments`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `folder_id` (uuid, references supplier_folders)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - Timestamps

    - `supplier_certifications`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `expiration_date` (date)
      - Timestamps

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create supplier_folders table
CREATE TABLE IF NOT EXISTS supplier_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_attachments table
CREATE TABLE IF NOT EXISTS supplier_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES supplier_folders ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_certifications table
CREATE TABLE IF NOT EXISTS supplier_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  expiration_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE supplier_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_certifications ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_folders
CREATE POLICY "Users can view own supplier folders"
  ON supplier_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplier folders"
  ON supplier_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplier folders"
  ON supplier_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplier folders"
  ON supplier_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for supplier_attachments
CREATE POLICY "Users can view own supplier attachments"
  ON supplier_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplier attachments"
  ON supplier_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplier attachments"
  ON supplier_attachments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplier attachments"
  ON supplier_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for supplier_certifications
CREATE POLICY "Users can view own supplier certifications"
  ON supplier_certifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplier certifications"
  ON supplier_certifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplier certifications"
  ON supplier_certifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplier certifications"
  ON supplier_certifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);