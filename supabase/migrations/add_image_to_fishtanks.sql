-- Add image support to fishtanks table
-- This migration adds image fields to store fishtank images

-- Add image columns
ALTER TABLE fishtanks 
ADD COLUMN image_data BYTEA,
ADD COLUMN image_filename VARCHAR(255),
ADD COLUMN image_content_type VARCHAR(100);

-- Add comments to document the new fields
COMMENT ON COLUMN fishtanks.image_data IS 'Binary image data stored in the database';
COMMENT ON COLUMN fishtanks.image_filename IS 'Original filename of the uploaded image';
COMMENT ON COLUMN fishtanks.image_content_type IS 'MIME type of the image (e.g., image/jpeg, image/png)';

-- Create index for better performance when searching by image content type
CREATE INDEX IF NOT EXISTS idx_fishtanks_image_content_type ON fishtanks(image_content_type);
