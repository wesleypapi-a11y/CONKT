/*
  # Add Storage Policies for Client Files Bucket

  1. Changes
    - Add policy to allow public read access to client files
    - Add policy to allow authenticated users to upload client files
    - Add policy to allow users to update client files
    - Add policy to allow users to delete client files

  2. Security
    - Public read access for all client files
    - Only authenticated users can upload
    - Users can manage their own uploaded files
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Client files are publicly accessible'
  ) THEN
    CREATE POLICY "Client files are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'client-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload client files'
  ) THEN
    CREATE POLICY "Authenticated users can upload client files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'client-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update their client files'
  ) THEN
    CREATE POLICY "Users can update their client files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'client-files')
      WITH CHECK (bucket_id = 'client-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their client files'
  ) THEN
    CREATE POLICY "Users can delete their client files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'client-files');
  END IF;
END $$;