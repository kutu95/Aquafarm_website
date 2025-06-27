-- Add meta_description column to pages table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'meta_description') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN meta_description TEXT;
  END IF;
END $$;

-- Add is_published column to pages table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'is_published') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN is_published BOOLEAN DEFAULT TRUE;
  END IF;
END $$; 