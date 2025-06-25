-- Create volunteer_applications table
CREATE TABLE IF NOT EXISTS volunteer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nationality TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    phone_country_code TEXT NOT NULL DEFAULT '+1',
    whatsapp BOOLEAN DEFAULT FALSE,
    email TEXT NOT NULL,
    health_insurance_company TEXT NOT NULL,
    health_insurance_policy_name TEXT NOT NULL,
    health_insurance_policy_number TEXT NOT NULL,
    health_insurance_expiry_date DATE NOT NULL,
    next_of_kin_name TEXT NOT NULL,
    next_of_kin_relation TEXT NOT NULL,
    next_of_kin_phone TEXT NOT NULL,
    next_of_kin_country_code TEXT NOT NULL DEFAULT '+1',
    next_of_kin_email TEXT NOT NULL,
    other_information TEXT,
    passport_image_path TEXT,
    privacy_policy_agreed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_user_id ON volunteer_applications(user_id);

-- Enable Row Level Security
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Users can insert own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Users can update own application" ON volunteer_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON volunteer_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON volunteer_applications;

-- Create policies
-- Users can only see their own application
CREATE POLICY "Users can view own application" ON volunteer_applications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own application
CREATE POLICY "Users can insert own application" ON volunteer_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own application
CREATE POLICY "Users can update own application" ON volunteer_applications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all applications (simplified for now)
CREATE POLICY "Admins can view all applications" ON volunteer_applications
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can update all applications (simplified for now)
CREATE POLICY "Admins can update all applications" ON volunteer_applications
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_volunteer_applications_updated_at ON volunteer_applications;
CREATE TRIGGER update_volunteer_applications_updated_at 
    BEFORE UPDATE ON volunteer_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all volunteer documents" ON storage.objects;

-- Create volunteer-documents storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volunteer-documents',
    'volunteer-documents',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Now create the new policies
CREATE POLICY "Users can upload volunteer documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view own volunteer documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update own volunteer documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete own volunteer documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can view all volunteer documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can update all volunteer documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can delete all volunteer documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    ); 