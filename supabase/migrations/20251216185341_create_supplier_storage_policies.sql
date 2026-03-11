/*
  # Create storage policies for supplier files

  1. Storage Bucket
    - Create 'supplier-files' bucket if not exists
    - Set bucket to public

  2. Security
    - Enable RLS policies for authenticated users
    - Users can upload files to their own folder
    - Users can read their own files
    - Users can delete their own files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-files', 'supplier-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload supplier files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read supplier files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update supplier files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'supplier-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'supplier-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete supplier files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'supplier-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );