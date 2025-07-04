-- Add page_type field to pages table
DO $$ 
BEGIN 
  -- Add page_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'page_type') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN page_type TEXT DEFAULT 'page' NOT NULL;
  END IF;
END $$;

-- Add check constraint to ensure valid page_type values
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pages_page_type_check'
  ) THEN
    ALTER TABLE pages DROP CONSTRAINT pages_page_type_check;
  END IF;
  
  -- Add new constraint
  ALTER TABLE pages 
  ADD CONSTRAINT pages_page_type_check 
  CHECK (page_type IN ('page', 'document', 'product'));
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_pages_page_type ON pages(page_type);

-- Update existing pages to have 'page' as default if they don't have a page_type
UPDATE pages SET page_type = 'page' WHERE page_type IS NULL; 