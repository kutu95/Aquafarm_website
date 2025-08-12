-- Add SOP page type to pages table constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pages_page_type_check'
  ) THEN
    ALTER TABLE pages DROP CONSTRAINT pages_page_type_check;
  END IF;
  
  -- Add new constraint with SOP included
  ALTER TABLE pages 
  ADD CONSTRAINT pages_page_type_check 
  CHECK (page_type IN ('page', 'document', 'product', 'sop'));
END $$;
