-- Fix storage list policy to allow listing files in page-images bucket
-- The issue is that the list operation needs to be more permissive than the file operations

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Public read access for page-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to page-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own page-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own page-images" ON storage.objects;

-- Create a more permissive policy for listing files in page-images
-- This allows authenticated users to list all files in the bucket
CREATE POLICY "Authenticated users can list page-images"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to upload to page-images
CREATE POLICY "Authenticated users can upload to page-images"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files in page-images
CREATE POLICY "Authenticated users can update page-images"
  ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files in page-images
CREATE POLICY "Authenticated users can delete page-images"
  ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Also ensure the admin policy covers all operations
-- This should already exist from the previous migration, but let's make sure
CREATE POLICY "Admins can manage all storage buckets"
  ON storage.objects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ); 