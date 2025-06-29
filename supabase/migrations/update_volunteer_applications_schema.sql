-- Update volunteer_applications table to match the refined form specification
-- First, drop the existing table and recreate it with the new schema

DROP TABLE IF EXISTS volunteer_applications CASCADE;

-- Create volunteer_applications table with the refined schema
CREATE TABLE volunteer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 1. Personal Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_country_code TEXT NOT NULL DEFAULT '+61',
    phone_number TEXT NOT NULL,
    current_city TEXT NOT NULL,
    current_country TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    
    -- 2. Availability & Stay Preferences
    preferred_start_date DATE NOT NULL,
    stay_details TEXT NOT NULL,
    
    -- 3. Skills & Experience
    relevant_skills TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    languages_spoken TEXT NOT NULL,
    
    -- 4. Motivation & Expectations
    why_applying TEXT NOT NULL,
    previous_experience TEXT,
    
    -- 5. Work Preferences
    preferred_work_areas TEXT NOT NULL,
    physical_limitations TEXT NOT NULL,
    comfortable_shared_chores TEXT NOT NULL,
    
    -- 6. Practical Details
    transport_ownership TEXT NOT NULL,
    visa_status TEXT NOT NULL,
    
    -- 7. Community & Cultural Fit
    cultural_exchange_meaning TEXT NOT NULL,
    comfortable_shared_household TEXT NOT NULL,
    handle_challenges TEXT NOT NULL,
    
    -- 8. References & Agreement
    references TEXT NOT NULL,
    
    -- 9. Attachments
    gallery_images TEXT[], -- Array of file paths
    cv_file TEXT, -- Single file path
    
    -- Status and metadata
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_volunteer_applications_user_id ON volunteer_applications(user_id);
CREATE INDEX idx_volunteer_applications_status ON volunteer_applications(status);

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
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can update all applications
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
CREATE TRIGGER update_volunteer_applications_updated_at 
    BEFORE UPDATE ON volunteer_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 