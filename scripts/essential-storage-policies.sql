-- ESSENTIAL STORAGE POLICIES
-- These are the minimum policies needed for profile images to work

-- Policy 1: Allow public read access to profile images
-- This will fix the 400 errors and make profile images visible
CREATE POLICY "public_profile_images_read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
);

-- Policy 2: Allow authenticated users to upload to their own folder
CREATE POLICY "users_upload_own_profile"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to update their own profile images
CREATE POLICY "users_update_own_profile"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to delete their own profile images
CREATE POLICY "users_delete_own_profile"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 5: Your requested private folder policy
CREATE POLICY "Give users authenticated access to folder 1iofz5k_1"
ON storage.objects FOR SELECT
TO authenticated, service_role
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated'
);

-- Check if policies were created successfully
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
