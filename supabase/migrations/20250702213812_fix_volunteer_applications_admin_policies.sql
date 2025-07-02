-- Fix volunteer_applications admin policies to check profiles table instead of auth.users.raw_user_meta_data
-- This aligns with how roles are actually stored in the application

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON volunteer_applications;

-- Create new admin policies that check the profiles table
CREATE POLICY "Admins can view all applications" ON volunteer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update all applications
CREATE POLICY "Admins can update all applications" ON volunteer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    ); 