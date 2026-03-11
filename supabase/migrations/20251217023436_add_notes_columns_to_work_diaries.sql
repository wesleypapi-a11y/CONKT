/*
  # Add Notes Columns to Work Diaries

  1. Changes
    - Add labor_notes column for general labor notes
    - Add activities_notes column for general activities notes
    - Add occurrences_notes column for general occurrences notes
    - Add comments_notes column for general comments notes
    - Add photos_notes column for general photos notes
    - Add videos_notes column for general videos notes
    - Add attachments_notes column for general attachments notes
    
  2. Purpose
    - Allow users to write general observations/notes for each RDO tab
    - Each field is a text area that can store multiple lines
*/

-- Add notes columns to work_diaries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'labor_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN labor_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'activities_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN activities_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'occurrences_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN occurrences_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'comments_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN comments_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'photos_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN photos_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'videos_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN videos_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_diaries' AND column_name = 'attachments_notes'
  ) THEN
    ALTER TABLE work_diaries ADD COLUMN attachments_notes text;
  END IF;
END $$;
