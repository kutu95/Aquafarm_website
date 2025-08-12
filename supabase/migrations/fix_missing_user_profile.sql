-- Fix missing user profile for existing admin user
-- This migration creates a profile record for the user who is missing from the profiles table

-- Insert the missing profile for the admin user
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES (
  'e0dd83d7-6a51-47f0-93ad-973d28fadf67',
  'john@streamtime.com.au',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the profile was created
SELECT id, email, role, created_at, updated_at 
FROM profiles 
WHERE id = 'e0dd83d7-6a51-47f0-93ad-973d28fadf67';
