-- Create Policy Only (Skip table alteration)
-- This should work in most Supabase instances

CREATE POLICY "Give users authenticated access to folder 1iofz5k_1"
ON storage.objects FOR SELECT 
TO authenticated, service_role 
USING (
    bucket_id = 'physio' 
    AND (storage.foldername(name))[1] = 'private' 
    AND auth.role() = 'authenticated'
);
