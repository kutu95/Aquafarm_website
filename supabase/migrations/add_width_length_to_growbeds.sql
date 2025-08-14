-- Add width and length fields to growbeds table
-- This migration adds width and length fields in metres for automatic area calculation
-- Safe to run multiple times - checks if columns exist before adding

-- Check if width column exists, add if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'growbeds' AND column_name = 'width') THEN
        ALTER TABLE growbeds ADD COLUMN width DECIMAL(8,2);
    END IF;
END $$;

-- Check if length column exists, add if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'growbeds' AND column_name = 'length') THEN
        ALTER TABLE growbeds ADD COLUMN length DECIMAL(8,2);
    END IF;
END $$;

-- Add comments to document the new fields (safe to run multiple times)
COMMENT ON COLUMN growbeds.width IS 'Growbed width in metres';
COMMENT ON COLUMN growbeds.length IS 'Growbed length in metres';

-- Set default values for existing records (1m x 1m) if they don't have values
UPDATE growbeds SET width = 1.0 WHERE width IS NULL;
UPDATE growbeds SET length = 1.0 WHERE length IS NULL;

-- Make the fields required for future records (safe to run multiple times)
ALTER TABLE growbeds ALTER COLUMN width SET NOT NULL;
ALTER TABLE growbeds ALTER COLUMN length SET NOT NULL;

-- Create indexes for better performance when searching by dimensions (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_growbeds_width ON growbeds(width);
CREATE INDEX IF NOT EXISTS idx_growbeds_length ON growbeds(length);

-- Add check constraints if they don't exist (safe to run multiple times)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'growbeds_width_check') THEN
        ALTER TABLE growbeds ADD CONSTRAINT growbeds_width_check CHECK (width > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'growbeds_length_check') THEN
        ALTER TABLE growbeds ADD CONSTRAINT growbeds_length_check CHECK (length > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'growbeds_dimensions_check') THEN
        ALTER TABLE growbeds ADD CONSTRAINT growbeds_dimensions_check CHECK (width > 0 AND length > 0);
    END IF;
END $$;
