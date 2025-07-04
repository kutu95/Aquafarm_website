-- Fix pages table RLS policy to allow anonymous access to open pages
-- This is needed for the navigation menu to work without authentication

-- Drop the existing policy
DROP POLICY IF EXISTS "Enable read access based on security level" ON pages;

-- Create new policy that allows anonymous access to open pages
CREATE POLICY "Enable read access based on security level" 
  ON pages FOR SELECT 
  USING (
    security = 'open' OR 
    (security = 'user' AND auth.role() = 'authenticated') OR 
    (security = 'admin' AND auth.role() = 'authenticated' AND 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );

-- Ensure all existing pages have security = 'open' by default
UPDATE pages SET security = 'open' WHERE security IS NULL; 