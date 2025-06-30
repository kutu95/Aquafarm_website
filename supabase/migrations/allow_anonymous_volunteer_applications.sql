-- Allow anonymous insertions to volunteer_applications table
-- This enables non-logged-in users to submit volunteer applications

-- Drop existing policies for volunteer_applications table
DROP POLICY IF EXISTS "Users can view own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Users can insert own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Users can update own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON volunteer_applications;

-- Create new policies that allow anonymous insertions
-- Allow anyone to insert applications (for anonymous submissions)
CREATE POLICY "Allow anonymous application insertions" ON volunteer_applications
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own applications (when user_id is set)
CREATE POLICY "Users can view own application" ON volunteer_applications
    FOR SELECT USING (
        user_id IS NULL 
        OR auth.uid() = user_id
    );

-- Allow users to update their own applications (when user_id is set)
CREATE POLICY "Users can update own application" ON volunteer_applications
    FOR UPDATE USING (
        user_id IS NULL 
        OR auth.uid() = user_id
    );

-- Allow admins to view all applications
CREATE POLICY "Admins can view all applications" ON volunteer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Allow admins to update all applications
CREATE POLICY "Admins can update all applications" ON volunteer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    ); 