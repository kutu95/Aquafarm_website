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