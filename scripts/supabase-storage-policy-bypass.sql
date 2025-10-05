-- Alternative approach: Create policies without altering the table directly
-- This works even without being the table owner

-- Check current RLS status first
SELECT table_name, row_security 
FROM information_schema.tables 
WHERE table_schema = 'storage' 
AND table_name = 'objects';

-- Create the policy directly (skip the ALTER TABLE if RLS is already enabled)
-- Most Supabase instances have RLS enabled by default on storage.objects
CREATE POLICY "Give users authenticated access to folder 1iofz5k_1"
ON storage.objects FOR SELECT 
TO authenticated, service_role 
USING (
    bucket_id = 'physio' 
    AND (storage.foldername(name))[1] = 'private' 
    AND auth.role() = 'authenticated'
);

-- Verify the policy was created
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname = 'Give users authenticated access to folder 1iofz5k_1';
