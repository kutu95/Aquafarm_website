-- Create volunteer-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volunteer-documents',
    'volunteer-documents',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop any existing policies for this bucket
DROP POLICY IF EXISTS "Users can upload volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "volunteer_documents_authenticated_users" ON storage.objects;

-- Create a simple policy that allows authenticated users to upload/view/update/delete
CREATE POLICY "volunteer_documents_authenticated_users" ON storage.objects
    FOR ALL USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    ); 