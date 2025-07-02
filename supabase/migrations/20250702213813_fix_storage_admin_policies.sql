-- Fix storage admin policies to check profiles table instead of auth.users.raw_user_meta_data
-- This aligns with how roles are actually stored in the application

-- Drop existing admin policies for storage
DROP POLICY IF EXISTS "Admins can manage all volunteer documents" ON storage.objects;

-- Create new admin policy that checks the profiles table
CREATE POLICY "Admins can manage all volunteer documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'volunteer-documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    ); 