-- Allow zero holes in growbeds table
-- This migration updates the constraint to allow 0 holes and sets default for media beds

-- Drop the existing constraint
ALTER TABLE growbeds DROP CONSTRAINT IF EXISTS growbeds_holes_check;

-- Add new constraint allowing 0 or more holes
ALTER TABLE growbeds ADD CONSTRAINT growbeds_holes_check CHECK (holes >= 0);

-- Update existing media beds to have 0 holes if they currently have 1
UPDATE growbeds SET holes = 0 WHERE type = 'Media bed' AND holes = 1;

-- Add comment explaining the change
COMMENT ON COLUMN growbeds.holes IS 'Number of holes (0 for media beds, >0 for other types)';
