/*
  # Fix Budget Photos Upload Policy

  1. Changes
    - Add new INSERT policy for budget-photos folder in client-files bucket
    - Allow authenticated users to upload to budget-photos folder without user ID restriction
    - Add UPDATE policy to allow replacing photos
    
  2. Security
    - Only authenticated users can upload
    - Restricted to budget-photos folder only
*/

-- Drop existing restrictive policy for client-files if it conflicts
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;

-- Create new policy for general client files (with user folder structure)
CREATE POLICY "Authenticated users can upload client files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-files' 
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Create specific policy for budget photos (no user folder restriction)
CREATE POLICY "Authenticated users can upload budget photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-files' 
    AND (storage.foldername(name))[1] = 'budget-photos'
  );

-- Allow updating budget photos
CREATE POLICY "Authenticated users can update budget photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-files' 
    AND (storage.foldername(name))[1] = 'budget-photos'
  )
  WITH CHECK (
    bucket_id = 'client-files' 
    AND (storage.foldername(name))[1] = 'budget-photos'
  );

-- Allow deleting budget photos
CREATE POLICY "Authenticated users can delete budget photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-files' 
    AND (storage.foldername(name))[1] = 'budget-photos'
  );