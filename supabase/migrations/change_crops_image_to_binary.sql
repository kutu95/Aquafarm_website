-- Change crops image field from URL to binary data
-- This migration converts the image_url field to store actual image files

-- First, drop the existing image_url column and its index
DROP INDEX IF EXISTS idx_crops_image_url;
ALTER TABLE crops DROP COLUMN IF EXISTS image_url;

-- Add new image_data column for storing binary image data
ALTER TABLE crops 
ADD COLUMN image_data BYTEA,
ADD COLUMN image_filename VARCHAR(255),
ADD COLUMN image_content_type VARCHAR(100);

-- Add comments to document the new fields
COMMENT ON COLUMN crops.image_data IS 'Binary image data stored in the database';
COMMENT ON COLUMN crops.image_filename IS 'Original filename of the uploaded image';
COMMENT ON COLUMN crops.image_content_type IS 'MIME type of the image (e.g., image/jpeg, image/png)';

-- Create index for better performance when searching by image content type
CREATE INDEX IF NOT EXISTS idx_crops_image_content_type ON crops(image_content_type);
