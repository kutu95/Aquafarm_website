-- Allow anonymous uploads to volunteer-documents bucket for volunteer applications
-- This enables non-logged-in users to upload files during the application process

-- Drop existing policies for volunteer-documents bucket
DROP POLICY IF EXISTS "volunteer_documents_authenticated_users" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all volunteer documents" ON storage.objects;

-- Create new policies that allow anonymous uploads for volunteer application files
-- Allow anyone to upload to volunteer-gallery and volunteer-cv folders
CREATE POLICY "Allow anonymous volunteer uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'volunteer-documents' 
        AND (
            name LIKE 'volunteer-gallery/%' 
            OR name LIKE 'volunteer-cv/%'
        )
    );

-- Allow anyone to view files in volunteer-gallery and volunteer-cv folders
CREATE POLICY "Allow anonymous volunteer file access" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' 
        AND (
            name LIKE 'volunteer-gallery/%' 
            OR name LIKE 'volunteer-cv/%'
        )
    );

-- Allow authenticated users to manage their own files (for user-specific folders)
CREATE POLICY "Users can manage own volunteer documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
        AND (
            name LIKE auth.uid()::text || '/%'
            OR name LIKE 'volunteer-gallery/%'
            OR name LIKE 'volunteer-cv/%'
        )
    );

-- Allow admins to manage all volunteer documents
CREATE POLICY "Admins can manage all volunteer documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'volunteer-documents' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    ); 