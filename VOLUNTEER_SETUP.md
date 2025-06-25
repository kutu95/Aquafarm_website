# Volunteer Application System Setup

This document contains the manual setup steps for the volunteer application system.

## Database Setup

You need to run the following SQL commands in your Supabase dashboard SQL editor:

### 1. Create Volunteer Applications Table

Run this SQL in your Supabase dashboard:

```sql
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
```

### 2. Create Storage Bucket

Run this SQL in your Supabase dashboard:

```sql
-- Create volunteer-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volunteer-documents',
    'volunteer-documents',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Policy for users to upload their own documents
CREATE POLICY "Users can upload volunteer documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'volunteer-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for users to view their own documents
CREATE POLICY "Users can view own volunteer documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for users to update their own documents
CREATE POLICY "Users can update own volunteer documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for users to delete their own documents
CREATE POLICY "Users can delete own volunteer documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for admins to view all volunteer documents
CREATE POLICY "Admins can view all volunteer documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy for admins to update all volunteer documents
CREATE POLICY "Admins can update all volunteer documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'volunteer-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for admins to delete all volunteer documents
CREATE POLICY "Admins can delete all volunteer documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'volunteer-documents' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
```

## Features

Once the database is set up, the volunteer application system includes:

### For Users:
- **Volunteer Application Form** (`/volunteer-application`)
  - Upload passport image
  - Personal information (name, nationality, date of birth)
  - Contact details (phone with country code, WhatsApp option, email)
  - Health insurance details
  - Next of kin information
  - Additional notes
  - Save and update functionality

### For Admins:
- **Volunteer Applications Dashboard** (`/volunteer-applications`)
  - View all submitted applications
  - Detailed view of each application
  - Passport image viewer
  - Application status tracking

### Navigation:
- "Volunteer Application" link appears in navigation for authenticated users
- "View Volunteer Applications" button in admin dashboard

## Access Control

- **Open pages**: Anyone can view
- **User pages**: Requires login (any authenticated user)
- **Admin pages**: Requires admin role

The volunteer application page is accessible to both regular users and admins, but the applications dashboard is admin-only.

## File Storage

- Passport images are stored in the `volunteer-documents` bucket
- Files are private and accessible only to the user who uploaded them and admins
- 5MB file size limit
- Supports: JPEG, PNG, GIF, WebP, PDF 