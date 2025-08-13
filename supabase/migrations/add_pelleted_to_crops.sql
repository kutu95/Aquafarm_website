-- Add pelleted field to crops table
-- This field indicates whether the crop uses pelleted seeds or not

BEGIN;

-- Add the pelleted column to the crops table
ALTER TABLE crops 
ADD COLUMN pelleted BOOLEAN DEFAULT FALSE;

-- Add a comment to document the new field
COMMENT ON COLUMN crops.pelleted IS 'Indicates whether this crop uses pelleted seeds (true) or raw seeds (false)';

-- Update existing records to have a default value (you can modify this based on your needs)
UPDATE crops SET pelleted = FALSE WHERE pelleted IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE crops ALTER COLUMN pelleted SET NOT NULL;

COMMIT;
