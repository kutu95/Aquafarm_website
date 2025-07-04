-- Complete storage policy fix for page-images bucket
-- This script will completely reset and recreate all policies

-- First, enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for the page-images bucket
DROP POLICY IF EXISTS "All authenticated users can do ptqu0m_1" ON storage.objects;
DROP POLICY IF EXISTS "Enable uploads for authenticated users ptqu0m_1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to page-images" ON storage.objects;
DROP POLICY IF EXISTS "Enable reads for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable updates for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable deletes for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable listing for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list page-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for page-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own page-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own page-images" ON storage.objects;
DROP POLICY IF EXISTS "page-images-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "page-images-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "page-images-update-policy" ON storage.objects;
DROP POLICY IF EXISTS "page-images-delete-policy" ON storage.objects;

-- Create a single comprehensive policy that allows all operations for authenticated users
CREATE POLICY "page-images-full-access" ON storage.objects
FOR ALL USING (
  bucket_id = 'page-images' AND 
  auth.role() = 'authenticated'
);

-- Verify the bucket exists and is accessible
SELECT 
  id, 
  name, 
  public 
FROM storage.buckets 
WHERE name = 'page-images';

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'; 