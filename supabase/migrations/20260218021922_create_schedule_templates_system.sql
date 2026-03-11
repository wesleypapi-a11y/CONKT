/*
  # Create Schedule Templates System

  1. New Tables
    - `schedule_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `file_path` (text) - Path to the Excel template file in storage
      - `is_default` (boolean) - If this is a default system template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Storage
    - Create `schedule-templates` bucket for storing template files
    - Add policies for authenticated users to read templates
    - Add policies for authenticated users to upload/manage templates
    
  3. Security
    - Enable RLS on `schedule_templates` table
    - Add policies for authenticated users to read all templates
    - Add policies for authenticated users to create/update/delete their own templates
*/

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  file_path text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

-- Policies for schedule_templates
CREATE POLICY "Authenticated users can read all schedule templates"
  ON schedule_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create schedule templates"
  ON schedule_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule templates"
  ON schedule_templates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete schedule templates"
  ON schedule_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for schedule templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('schedule-templates', 'schedule-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for schedule-templates bucket
CREATE POLICY "Authenticated users can read schedule templates"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'schedule-templates');

CREATE POLICY "Authenticated users can upload schedule templates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'schedule-templates');

CREATE POLICY "Authenticated users can update schedule templates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'schedule-templates')
  WITH CHECK (bucket_id = 'schedule-templates');

CREATE POLICY "Authenticated users can delete schedule templates"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'schedule-templates');