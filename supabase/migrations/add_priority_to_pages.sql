-- Only add priority column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'priority') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN priority smallint DEFAULT 0 CHECK (priority >= 0 AND priority <= 9);
  END IF;
END $$;

-- Update RLS policies
BEGIN;
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Enable read access for all users" ON pages;
  DROP POLICY IF EXISTS "Enable insert for authenticated admin users only" ON pages;
  DROP POLICY IF EXISTS "Enable update for authenticated admin users only" ON pages;
  DROP POLICY IF EXISTS "Enable delete for authenticated admin users only" ON pages;

  -- Recreate policies
  CREATE POLICY "Enable read access for all users" 
    ON pages FOR SELECT 
    USING (true);

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

-- Add index for faster menu queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pages_priority 
ON pages(priority) 
WHERE priority > 0; 