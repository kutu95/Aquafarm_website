-- Make volunteer-documents bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'volunteer-documents';

-- Ensure proper policies for public access
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'volunteer-documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'volunteer-documents' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (bucket_id = 'volunteer-documents' AND auth.role() = 'authenticated');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'volunteer-documents' AND auth.role() = 'authenticated'); 