-- Add image field to crops table
-- This migration adds an 'image_url' field to store crop images

-- Add the image_url column
ALTER TABLE crops 
ADD COLUMN image_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN crops.image_url IS 'URL or path to the crop image';

-- Create an index for better performance when searching by image
CREATE INDEX IF NOT EXISTS idx_crops_image_url ON crops(image_url);
