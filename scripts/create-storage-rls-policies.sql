-- Supabase Storage RLS Policies for Profile Images
-- This script creates policies that grant different levels of access

-- First, make sure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Public read access for profile images in public folders
-- This allows anyone to view images in 'public' subfolder
CREATE POLICY "public_read_profile_images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] IS NOT NULL -- Ensure there's a user folder
);

-- POLICY 2: Authenticated users can upload their own profile images
-- Users can only upload to their own user folder
CREATE POLICY "users_can_upload_profile_images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (select auth.role()) = 'authenticated'
);

-- POLICY 3: Users can update their own profile images
-- Users can only update images in their own folder
CREATE POLICY "users_can_update_own_profile_images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (select auth.role()) = 'authenticated'
)
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (select auth.role()) = 'authenticated'
);

-- POLICY 4: Users can delete their own profile images
-- Users can only delete images from their own folder
CREATE POLICY "users_can_delete_own_profile_images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (select auth.role()) = 'authenticated'
);

-- POLICY 5: Private folder access for authenticated users only (as requested)
-- This is for any files in the 'private' subfolder
CREATE POLICY "authenticated_users_can_access_private_folder"
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

-- OPTIONAL: Admin/service role policies for full access
-- This allows service role to access everything (for backend operations)
CREATE POLICY "service_role_full_access"
ON storage.objects FOR ALL
USING (
    bucket_id = 'physio'
    AND (select auth.role()) = 'service_role'
)
WITH CHECK (
    bucket_id = 'physio'
    AND (select auth.role()) = 'service_role'
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
