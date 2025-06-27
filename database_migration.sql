-- Add security column to pages table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'security') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN security text DEFAULT 'open' CHECK (security IN ('open', 'user', 'admin'));
  END IF;
END $$;

-- Update RLS policies to include security-based access control
BEGIN;
  -- Drop existing policies
  DROP POLICY IF EXISTS "Enable read access for all users" ON pages;
  DROP POLICY IF EXISTS "Enable insert for authenticated admin users only" ON pages;
  DROP POLICY IF EXISTS "Enable update for authenticated admin users only" ON pages;
  DROP POLICY IF EXISTS "Enable delete for authenticated admin users only" ON pages;

  -- Create new security-based policies
  CREATE POLICY "Enable read access based on security level" 
    ON pages FOR SELECT 
    USING (
      security = 'open' OR 
      (security = 'user' AND auth.role() = 'authenticated') OR 
      (security = 'admin' AND auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin')
    );

  CREATE POLICY "Enable insert for authenticated admin users only" 
    ON pages FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');

  CREATE POLICY "Enable update for authenticated admin users only" 
    ON pages FOR UPDATE 
    USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');

  CREATE POLICY "Enable delete for authenticated admin users only" 
    ON pages FOR DELETE 
    USING (auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin');
COMMIT;

-- Add index for security-based queries
CREATE INDEX IF NOT EXISTS idx_pages_security 
ON pages(security);

-- Update existing pages to have 'open' security by default
UPDATE pages SET security = 'open' WHERE security IS NULL;

-- Create volunteer-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volunteer-documents',
    'volunteer-documents',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Remove any existing policies for this bucket
DELETE FROM storage.policies 
WHERE bucket_id = 'volunteer-documents';

-- Create a simple policy that allows authenticated users to upload/view/update/delete
CREATE POLICY "volunteer_documents_authenticated_users" ON storage.objects
    FOR ALL USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid() IS NOT NULL
    );

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

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" ON volunteer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admins can update all applications
CREATE POLICY "Admins can update all applications" ON volunteer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_volunteer_applications_updated_at 
    BEFORE UPDATE ON volunteer_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add code_of_conduct_agreed column to volunteer_applications table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'volunteer_applications' 
    AND column_name = 'code_of_conduct_agreed') 
  THEN
    ALTER TABLE volunteer_applications 
    ADD COLUMN code_of_conduct_agreed BOOLEAN DEFAULT FALSE;
  END IF;
END $$; 