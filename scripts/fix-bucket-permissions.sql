-- Make physio bucket public and accessible
-- Run this in Supabase SQL Editor

-- First, ensure the bucket exists with public access
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'physio';

-- Make sure public access is enabled for the bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression)
VALUES 
  ('public-read-physio', 'physio', 'Public read access for physio bucket', 'true', 'true'),
  ('public-insert-physio', 'physio', 'Public insert access for physio bucket', 'true', 'true'),
  ('public-update-physio', 'physio', 'Public update access for physio bucket', 'true', 'true'),
  ('public-delete-physio', 'physio', 'Public delete access for physio bucket', 'true', 'true')
ON CONFLICT (id) DO NOTHING;

-- Verify the bucket is now public
SELECT id, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'physio';
