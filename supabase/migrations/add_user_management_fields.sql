-- Add user management fields to profiles table (if they don't exist)
DO $$ 
BEGIN
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add is_complete column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_complete') THEN
        ALTER TABLE profiles ADD COLUMN is_complete BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing profiles to mark them as complete if they have names
UPDATE profiles 
SET is_complete = TRUE 
WHERE first_name IS NOT NULL AND last_name IS NOT NULL AND is_complete = FALSE;

-- Add indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_is_complete ON profiles(is_complete);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role); 