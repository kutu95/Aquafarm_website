-- Alternative storage policy fix
-- This approach uses a different method to target the page-images bucket

-- First, drop any existing policies
DROP POLICY IF EXISTS "page-images-admin-access" ON storage.objects;
DROP POLICY IF EXISTS "page-images-full-access" ON storage.objects;

-- Get the actual bucket ID for page-images
SELECT id, name FROM storage.buckets WHERE name = 'page-images';

-- Create a policy that allows all operations for authenticated users
-- This policy will work regardless of the bucket ID
CREATE POLICY "page-images-universal-access" ON storage.objects
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE buckets.id = objects.bucket_id 
    AND buckets.name = 'page-images'
  ) AND 
  auth.role() = 'authenticated'
);

-- Alternative: Create a policy that allows all operations for admin users
-- This might be more secure if you want to restrict to admin users only
CREATE POLICY "page-images-admin-only" ON storage.objects
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE buckets.id = objects.bucket_id 
    AND buckets.name = 'page-images'
  ) AND 
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Check what policies we now have
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname; 