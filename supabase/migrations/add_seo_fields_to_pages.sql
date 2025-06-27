-- Add high-priority SEO fields to pages table
DO $$ 
BEGIN 
  -- Add meta_title column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'meta_title') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN meta_title TEXT;
  END IF;

  -- Add og_title column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'og_title') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN og_title TEXT;
  END IF;

  -- Add og_description column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'og_description') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN og_description TEXT;
  END IF;

  -- Add og_image column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'og_image') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN og_image TEXT;
  END IF;

  -- Add canonical_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'canonical_url') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN canonical_url TEXT;
  END IF;

  -- Add robots_meta column if it doesn't exist
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pages' 
    AND column_name = 'robots_meta') 
  THEN
    ALTER TABLE pages 
    ADD COLUMN robots_meta TEXT DEFAULT 'index, follow';
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pages_meta_title ON pages(meta_title) WHERE meta_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_canonical_url ON pages(canonical_url) WHERE canonical_url IS NOT NULL; 