-- Clean up duplicate storage policies for page-images bucket
-- This migration removes duplicate policies and ensures only one policy per operation

-- First, drop all existing policies for the page-images bucket
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

-- Create separate policies for each operation (recommended approach)
-- This gives more granular control and is easier to debug

-- Policy for SELECT (list and read files)
CREATE POLICY "page-images-select-policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'page-images' AND 
  auth.role() = 'authenticated'
);

-- Policy for INSERT (upload files)
CREATE POLICY "page-images-insert-policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'page-images' AND 
  auth.role() = 'authenticated'
);

-- Policy for UPDATE (modify files)
CREATE POLICY "page-images-update-policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'page-images' AND 
  auth.role() = 'authenticated'
);

-- Policy for DELETE (remove files)
CREATE POLICY "page-images-delete-policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'page-images' AND 
  auth.role() = 'authenticated'
); 