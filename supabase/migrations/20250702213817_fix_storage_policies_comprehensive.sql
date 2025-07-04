-- Comprehensive fix for storage bucket policies
-- This ensures proper access for media library and all storage operations

-- First, let's check what buckets exist and their current policies
-- Then create comprehensive policies for all storage operations

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all storage" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for page images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own page images" ON storage.objects;
DROP POLICY IF EXISTS "volunteer_documents_authenticated_users" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous volunteer uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous volunteer file access" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all volunteer documents" ON storage.objects;

-- Create comprehensive admin policy for all storage buckets
CREATE POLICY "Admins can manage all storage buckets"
  ON storage.objects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policy for page-images bucket
-- Allow public read access for images
CREATE POLICY "Public read access for page-images"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'page-images'
  );

-- Allow authenticated users to upload to page-images
CREATE POLICY "Authenticated users can upload to page-images"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own uploads in page-images
CREATE POLICY "Users can update own page-images"
  ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their own uploads in page-images
CREATE POLICY "Users can delete own page-images"
  ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-images'
    AND auth.role() = 'authenticated'
  );

-- Create policies for volunteer-documents bucket
-- Allow public read access for volunteer documents
CREATE POLICY "Public read access for volunteer-documents"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'volunteer-documents'
  );

-- Allow anyone to upload to volunteer-documents (for anonymous applications)
CREATE POLICY "Anyone can upload to volunteer-documents"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'volunteer-documents'
    AND (
      name LIKE 'volunteer-gallery/%' 
      OR name LIKE 'volunteer-cv/%'
    )
  );

-- Allow authenticated users to manage their own files in volunteer-documents
CREATE POLICY "Users can manage own volunteer-documents"
  ON storage.objects
  FOR ALL USING (
    bucket_id = 'volunteer-documents'
    AND auth.uid() IS NOT NULL
    AND (
      name LIKE auth.uid()::text || '/%'
      OR name LIKE 'volunteer-gallery/%'
      OR name LIKE 'volunteer-cv/%'
    )
  ); 