/*
  # Create work diaries (RDO) system

  1. New Tables
    - `work_diaries` - Main RDO table
    - `work_diary_labor` - Labor/workforce entries
    - `work_diary_equipment` - Equipment entries
    - `work_diary_activities` - Activities/tasks
    - `work_diary_occurrences` - Occurrences/incidents
    - `work_diary_checklist` - Checklist items
    - `work_diary_comments` - Comments
    - `work_diary_photos` - Photos
    - `work_diary_videos` - Videos
    - `work_diary_attachments` - Other attachments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS work_diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  work_id uuid REFERENCES works ON DELETE CASCADE NOT NULL,
  report_number integer NOT NULL DEFAULT 1,
  report_date date NOT NULL,
  day_of_week text NOT NULL,
  contract_number text,
  contractor text,
  responsible text,
  contracted_days integer,
  elapsed_days integer,
  remaining_days integer,
  morning_weather text DEFAULT 'claro' CHECK (morning_weather IN ('claro', 'nublado', 'chuvoso')),
  morning_condition text DEFAULT 'praticavel' CHECK (morning_condition IN ('praticavel', 'impraticavel')),
  afternoon_weather text DEFAULT 'claro' CHECK (afternoon_weather IN ('claro', 'nublado', 'chuvoso')),
  afternoon_condition text DEFAULT 'praticavel' CHECK (afternoon_condition IN ('praticavel', 'impraticavel')),
  night_weather text DEFAULT 'claro' CHECK (night_weather IN ('claro', 'nublado', 'chuvoso')),
  night_condition text DEFAULT 'praticavel' CHECK (night_condition IN ('praticavel', 'impraticavel')),
  rainfall_index text,
  status text DEFAULT 'preenchendo' CHECK (status IN ('preenchendo', 'revisar', 'aprovado')),
  manual_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  observation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  observation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  progress integer DEFAULT 0,
  observation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  type text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  item text NOT NULL,
  checked boolean DEFAULT false,
  observation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_diary_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_diary_id uuid REFERENCES work_diaries ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_diary_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for work_diaries
CREATE POLICY "Users can view own work diaries"
  ON work_diaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work diaries"
  ON work_diaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work diaries"
  ON work_diaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own work diaries"
  ON work_diaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for work_diary_labor
CREATE POLICY "Users can view work diary labor"
  ON work_diary_labor FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_labor.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary labor"
  ON work_diary_labor FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_labor.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary labor"
  ON work_diary_labor FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_labor.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary labor"
  ON work_diary_labor FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_labor.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_equipment
CREATE POLICY "Users can view work diary equipment"
  ON work_diary_equipment FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_equipment.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary equipment"
  ON work_diary_equipment FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_equipment.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary equipment"
  ON work_diary_equipment FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_equipment.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary equipment"
  ON work_diary_equipment FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_equipment.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_activities
CREATE POLICY "Users can view work diary activities"
  ON work_diary_activities FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_activities.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary activities"
  ON work_diary_activities FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_activities.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary activities"
  ON work_diary_activities FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_activities.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary activities"
  ON work_diary_activities FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_activities.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_occurrences
CREATE POLICY "Users can view work diary occurrences"
  ON work_diary_occurrences FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_occurrences.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary occurrences"
  ON work_diary_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_occurrences.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary occurrences"
  ON work_diary_occurrences FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_occurrences.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary occurrences"
  ON work_diary_occurrences FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_occurrences.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_checklist
CREATE POLICY "Users can view work diary checklist"
  ON work_diary_checklist FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_checklist.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary checklist"
  ON work_diary_checklist FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_checklist.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary checklist"
  ON work_diary_checklist FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_checklist.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary checklist"
  ON work_diary_checklist FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_checklist.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_comments
CREATE POLICY "Users can view work diary comments"
  ON work_diary_comments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_comments.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert work diary comments"
  ON work_diary_comments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_comments.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can update work diary comments"
  ON work_diary_comments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_comments.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete work diary comments"
  ON work_diary_comments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM work_diaries WHERE work_diaries.id = work_diary_comments.work_diary_id AND work_diaries.user_id = auth.uid()
  ));

-- Policies for work_diary_photos
CREATE POLICY "Users can view work diary photos"
  ON work_diary_photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert work diary photos"
  ON work_diary_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update work diary photos"
  ON work_diary_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete work diary photos"
  ON work_diary_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for work_diary_videos
CREATE POLICY "Users can view work diary videos"
  ON work_diary_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert work diary videos"
  ON work_diary_videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update work diary videos"
  ON work_diary_videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete work diary videos"
  ON work_diary_videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for work_diary_attachments
CREATE POLICY "Users can view work diary attachments"
  ON work_diary_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert work diary attachments"
  ON work_diary_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update work diary attachments"
  ON work_diary_attachments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete work diary attachments"
  ON work_diary_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);