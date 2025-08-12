-- Add area field to growbeds table
-- This migration adds an 'area' field to store the growbed area in square meters

-- Add the area column
ALTER TABLE growbeds 
ADD COLUMN area DECIMAL(8,2) CHECK (area > 0);

-- Add a comment to document the field
COMMENT ON COLUMN growbeds.area IS 'Growbed area in square meters';

-- Update existing records with a default value (optional)
-- You can modify this default value as needed
UPDATE growbeds SET area = 1.0 WHERE area IS NULL;

-- Make the field required for future records
ALTER TABLE growbeds ALTER COLUMN area SET NOT NULL;
