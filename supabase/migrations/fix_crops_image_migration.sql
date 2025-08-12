-- Fix crops image migration - handle both cases properly
-- This migration safely transitions from image_url to binary image storage

-- First, check if image_url column exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'crops' AND column_name = 'image_url'
    ) THEN
        -- Drop the index first if it exists
        DROP INDEX IF EXISTS idx_crops_image_url;
        -- Then drop the column
        ALTER TABLE crops DROP COLUMN image_url;
    END IF;
END $$;

-- Add new image columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'crops' AND column_name = 'image_data'
    ) THEN
        ALTER TABLE crops 
        ADD COLUMN image_data BYTEA,
        ADD COLUMN image_filename VARCHAR(255),
        ADD COLUMN image_content_type VARCHAR(100);
    END IF;
END $$;

-- Add comments to document the new fields
COMMENT ON COLUMN crops.image_data IS 'Binary image data stored in the database';
COMMENT ON COLUMN crops.image_filename IS 'Original filename of the uploaded image';
COMMENT ON COLUMN crops.image_content_type IS 'MIME type of the image (e.g., image/jpeg, image/png)';

-- Create index for better performance when searching by image content type
CREATE INDEX IF NOT EXISTS idx_crops_image_content_type ON crops(image_content_type);
