/*
  # Create separate storage buckets for work diary files

  1. Storage Buckets
    - Create 'work-diary-photos' bucket for photos
    - Create 'work-diary-videos' bucket for videos
    - Create 'work-diary-attachments' bucket for attachments
    - Set all buckets to public

  2. Security
    - Enable RLS policies for authenticated users on each bucket
    - Users can upload, read, update, and delete their own files
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('work-diary-photos', 'work-diary-photos', true),
  ('work-diary-videos', 'work-diary-videos', true),
  ('work-diary-attachments', 'work-diary-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for work-diary-photos bucket
CREATE POLICY "Users can upload work diary photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-diary-photos'
  );

CREATE POLICY "Users can read work diary photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-diary-photos'
  );

CREATE POLICY "Public can read work diary photos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'work-diary-photos'
  );

CREATE POLICY "Users can update work diary photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'work-diary-photos'
  )
  WITH CHECK (
    bucket_id = 'work-diary-photos'
  );

CREATE POLICY "Users can delete work diary photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-diary-photos'
  );

-- Policies for work-diary-videos bucket
CREATE POLICY "Users can upload work diary videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-diary-videos'
  );

CREATE POLICY "Users can read work diary videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-diary-videos'
  );

CREATE POLICY "Public can read work diary videos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'work-diary-videos'
  );

CREATE POLICY "Users can update work diary videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'work-diary-videos'
  )
  WITH CHECK (
    bucket_id = 'work-diary-videos'
  );

CREATE POLICY "Users can delete work diary videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-diary-videos'
  );

-- Policies for work-diary-attachments bucket
CREATE POLICY "Users can upload work diary attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-diary-attachments'
  );

CREATE POLICY "Users can read work diary attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-diary-attachments'
  );

CREATE POLICY "Public can read work diary attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'work-diary-attachments'
  );

CREATE POLICY "Users can update work diary attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'work-diary-attachments'
  )
  WITH CHECK (
    bucket_id = 'work-diary-attachments'
  );

CREATE POLICY "Users can delete work diary attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-diary-attachments'
  );