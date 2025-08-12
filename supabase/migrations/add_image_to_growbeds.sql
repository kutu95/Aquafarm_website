-- Add image support to growbeds table
-- This migration adds image fields to store growbed images

-- Add image columns
ALTER TABLE growbeds 
ADD COLUMN image_data BYTEA,
ADD COLUMN image_filename VARCHAR(255),
ADD COLUMN image_content_type VARCHAR(100);

-- Add comments to document the new fields
COMMENT ON COLUMN growbeds.image_data IS 'Binary image data stored in the database';
COMMENT ON COLUMN growbeds.image_filename IS 'Original filename of the uploaded image';
COMMENT ON COLUMN growbeds.image_content_type IS 'MIME type of the image (e.g., image/jpeg, image/png)';

-- Create index for better performance when searching by image content type
CREATE INDEX IF NOT EXISTS idx_growbeds_image_content_type ON growbeds(image_content_type);
