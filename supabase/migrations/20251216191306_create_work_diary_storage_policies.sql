/*
  # Create storage policies for work diary files

  1. Storage Bucket
    - Create 'work-diary-files' bucket if not exists
    - Set bucket to public

  2. Security
    - Enable RLS policies for authenticated users
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('work-diary-files', 'work-diary-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload work diary files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-diary-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read work diary files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-diary-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update work diary files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'work-diary-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'work-diary-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete work diary files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-diary-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );