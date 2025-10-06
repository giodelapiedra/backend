-- Simple Policy for Authenticated Users to Access Private Folder Only
-- This creates exactly what you requested in your query

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to access private folder only
CREATE POLICY "authenticated_users_private_access"
ON storage.objects FOR ALL
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND (select auth.role()) = 'authenticated'
)
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND (select auth.role()) = 'authenticated'
);

-- Verify the policy
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' 
AND policyname = 'authenticated_users_private_access';
