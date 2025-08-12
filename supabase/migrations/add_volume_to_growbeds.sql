-- Add volume field to growbeds table
-- This field represents the water volume in litres for each growbed

ALTER TABLE growbeds
ADD COLUMN volume DECIMAL(8,2) CHECK (volume >= 0);

COMMENT ON COLUMN growbeds.volume IS 'Water volume in litres for this growbed';

-- Set a default value for existing records
UPDATE growbeds SET volume = 0 WHERE volume IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE growbeds ALTER COLUMN volume SET NOT NULL;

-- Create index for better performance when searching by volume
CREATE INDEX IF NOT EXISTS idx_growbeds_volume ON growbeds(volume);
