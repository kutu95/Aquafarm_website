-- Fix storage RLS policies to use profiles table instead of JWT for admin role checks
-- This affects all storage buckets including page-images, volunteer-documents, etc.

-- Drop existing admin policies for storage
DROP POLICY IF EXISTS "Admins can manage all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all storage" ON storage.objects;

-- Create new admin policy that checks the profiles table for all storage buckets
CREATE POLICY "Admins can manage all storage"
  ON storage.objects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Ensure public read access for page-images bucket (for public images)
CREATE POLICY "Public read access for page images"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'page-images'
  );

-- Allow authenticated users to upload to page-images
CREATE POLICY "Authenticated users can upload page images"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow users to manage their own uploads to page-images
CREATE POLICY "Users can manage own page images"
  ON storage.objects
  FOR ALL USING (
    bucket_id = 'page-images'
    AND auth.uid() IS NOT NULL
  ); 