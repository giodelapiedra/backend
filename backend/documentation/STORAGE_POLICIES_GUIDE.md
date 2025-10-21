# Supabase Storage RLS Policies Guide

## Overview
This guide explains the Row Level Security (RLS) policies for Supabase storage buckets that control access to profile images and private folders.

## Storage Structure
```
physio/ (bucket)
├── profile-images/ (public folder)
│   ├── {user-id-1}/
│   │   └── profile.jpg
│   ├── {user-id-2}/
│   │   └── profile.png
│   └── ...
├── private/ (authenticated users only)
│   ├── documents/
│   ├── sensitive-files/
│   └── ...
```

## Policy Breakdown

### 1. Public Profile Images Read (`public_profile_images_read`)
```sql
FOR SELECT
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
);
```
**Purpose:** Allows anyone to view profile images (needed for avatar display)
**Access:** Public (no authentication required)

### 2. User Own Profile Upload (`user_own_profile_upload`)
```sql
FOR INSERT
WITH CHECK (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
);
```
**Purpose:** Allows authenticated users to upload to their own folder
**Access:** Authenticated users only
**Restriction:** Can only upload to their own user ID folder

### 3. User Own Profile Update (`user_own_profile_update`)
```sql
FOR UPDATE
USING (... user's own folder ...)
WITH CHECK (... user's own folder ...);
```
**Purpose:** Allows users to update their own profile images
**Access:** Authenticated users only
**Restriction:** Can only update files in their own folder

### 4. User Own Profile Delete (`user_own_profile_delete`)
```sql
FOR DELETE
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'profile-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND auth.role() = 'authenticated'
);
```
**Purpose:** Allows users to delete their own profile images
**Access:** Authenticated users only
**Restriction:** Can only delete from their own folder

### 5. Private Folder Access (`private_folder_authenticated_only`)
```sql
FOR ALL
USING (
    bucket_id = 'physio'
    AND (storage.foldername(name))[1] = 'private'
    AND auth.role() = 'authenticated'
);
```
**Purpose:** **This is your requested policy!** 
- Restricts private folder to authenticated users only
- No public access to anything in 'private' folder
- Users must be logged in to access these files

### 6. Service Role Full Access (`service_role_full_access`)
```sql
FOR ALL
USING (auth.role() = 'service_role');
```
**Purpose:** Allows backend service operations to work
**Access:** Service role only
**Restriction:** Only for backend API operations

## How to Apply These Policies

### Option 1: SQL Editor (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/scripts/profile-images-storage-policies.sql`
3. Paste and run the SQL script

### Option 2: Command Line
```bash
cd backend
node scripts/apply-storage-policies.js
```

### Option 3: Manual Dashboard
1. Go to Supabase Dashboard → Authentication → Policies
2. Select `storage.objects` table
3. Add each policy manually using the UI

## Testing Policies

### Test Public Profile Access
```javascript
// This should work for anyone (no auth required)
const { data } = await supabase.storage
  .from('physio')
  .getPublicUrl('profile-images/user-id/profile.jpg');
```

### Test Private Folder Access
```javascript
// This requires authentication
const { data, error } = await supabase.storage
  .from('physio')
  .list('private', {
    limit: 10
  });
```

### Test User-Specific Upload
```javascript
// This only works if uploading to your own folder
const { data, error } = await supabase.storage
  .from('physio')
  .upload('profile-images/' + auth.user.id + '/profile.jpg', file);
```

## Security Benefits

✅ **Public profiles readable** - Anyone can see profile images
✅ **User isolation** - Users can't access other users' upload folders  
✅ **Private documents secure** - Only authenticated users see private folder
✅ **Backend access** - Service role can perform admin operations
✅ **No unauthorized uploads** - Users can't upload to other users' folders

## Troubleshooting

**Issue:** "Policy violated" errors
**Solution:** Check if bucket is public and policies are correctly applied

**Issue:** 403 Forbidden on private folder
**Solution:** Ensure user is authenticated and policies allow access

**Issue:** Can't upload profile images
**Solution:** Verify user is uploading to their own folder path
