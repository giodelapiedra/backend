-- Exact Policy as Requested
-- Policy: "Give users authenticated access to folder 1iofz5k_1"

-- First, enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create the exact policy as specified
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
