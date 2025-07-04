-- Test script to verify storage policy is working
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check what policies exist
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 2. Check if the bucket exists and is accessible
SELECT 
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'page-images';

-- 3. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 4. Test the policy with a mock authenticated user (if you have one)
-- This will help verify the policy logic
SELECT 
  bucket_id,
  name,
  owner,
  created_at
FROM storage.objects 
WHERE bucket_id = 'page-images'
LIMIT 5; 