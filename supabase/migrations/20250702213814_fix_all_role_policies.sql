-- Fix all role-based policies to check profiles table instead of JWT or user metadata
-- This ensures consistency across all tables and policies

-- Fix pages table policies
DROP POLICY IF EXISTS "Enable read access based on security level" ON pages;
DROP POLICY IF EXISTS "Enable insert for authenticated admin users only" ON pages;
DROP POLICY IF EXISTS "Enable update for authenticated admin users only" ON pages;
DROP POLICY IF EXISTS "Enable delete for authenticated admin users only" ON pages;

-- Create new pages policies that check profiles table
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

CREATE POLICY "Enable insert for authenticated admin users only" 
  ON pages FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Enable update for authenticated admin users only" 
  ON pages FOR UPDATE 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Enable delete for authenticated admin users only" 
  ON pages FOR DELETE 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ); 