/*
  # Add media array fields to work_diaries table

  This migration adds three new array fields to store URLs:
  - photos: text[] - Array of photo URLs
  - videos: text[] - Array of video URLs  
  - attachments: text[] - Array of attachment URLs
  
  These fields complement the existing separate tables (work_diary_photos, 
  work_diary_videos, work_diary_attachments) and can be used for quick 
  access to media URLs without joins.
*/

-- Add media array fields to work_diaries table
ALTER TABLE work_diaries 
ADD COLUMN IF NOT EXISTS photos text[],
ADD COLUMN IF NOT EXISTS videos text[],
ADD COLUMN IF NOT EXISTS attachments text[];