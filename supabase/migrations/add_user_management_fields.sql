-- Add user management fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE;

-- Update existing profiles to mark them as complete if they have names
UPDATE profiles 
SET is_complete = TRUE 
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_complete ON profiles(is_complete);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role); 