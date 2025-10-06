-- Comprehensive Storage Policies for Profile Images System
-- This creates policies that work with your current 'profile-images/{userId}/profile.ext' structure

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Allow public read access to profile images
-- Anyone can view profile images (needed for displaying avatars)
DROP POLICY IF EXISTS "public_profile_images_read" ON storage.objects;
CREATE POLICY "public_profile_images_read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
);

-- POLICY 2: Authenticated users can upload to their own profile folder
DROP POLICY IF EXISTS "user_own_profile_upload" ON storage.objects;
CREATE POLICY "user_own_profile_upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
);

-- POLICY 3: Users can update their own profile images
DROP POLICY IF EXISTS "user_own_profile_update" ON storage.objects;
CREATE POLICY "user_own_profile_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
);

-- POLICY 4: Users can delete their own profile images
DROP POLICY IF EXISTS "user_own_profile_delete" ON storage.objects;
CREATE POLICY "user_own_profile_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
);

-- POLICY 5: Private folder access (as per your request)
DROP POLICY IF EXISTS "private_folder_authenticated_only" ON storage.objects;
CREATE POLICY "private_folder_authenticated_only"
ON storage.objects FOR ALL
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated'
);

-- POLICY 6: Service role has full access (for backend operations)
DROP POLICY IF EXISTS "service_role_full_access" ON storage.objects;
CREATE POLICY "service_role_full_access"
ON storage.objects FOR ALL
USING (
    bucket_id = 'physio'
    AND auth.role() = 'service_role'
)
WITH CHECK (
    bucket_id = 'physio'
    AND auth.role() = 'service_role'
);

-- Show all created policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablenamename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
