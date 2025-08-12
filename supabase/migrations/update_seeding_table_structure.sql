-- Update seeding table structure to directly include crop information
-- This replaces the need for the crop_seeding junction table for basic seeding records

-- Add new columns to seeding table
ALTER TABLE seeding
ADD COLUMN crop_id INTEGER REFERENCES crops(id) ON DELETE RESTRICT,
ADD COLUMN seeds_per_pot INTEGER CHECK (seeds_per_pot > 0),
ADD COLUMN pots INTEGER CHECK (pots > 0);

-- Add comments to document the new fields
COMMENT ON COLUMN seeding.crop_id IS 'Reference to the specific crop being planted';
COMMENT ON COLUMN seeding.seeds_per_pot IS 'Number of seeds planted in each pot';
COMMENT ON COLUMN seeding.pots IS 'Total number of pots planted';

-- Create index for better performance when searching by crop
CREATE INDEX IF NOT EXISTS idx_seeding_crop_id ON seeding(crop_id);

-- Note: The crop_seeding table can remain for more complex seeding scenarios
-- but basic seeding records can now be managed directly in the seeding table
