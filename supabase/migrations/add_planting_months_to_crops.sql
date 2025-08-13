-- Add planting months to crops table
-- This migration adds 12 boolean columns to indicate which months are suitable for planting each crop

BEGIN;

-- Add planting month columns to the crops table
ALTER TABLE crops ADD COLUMN plant_jan BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_feb BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_mar BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_apr BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_may BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_jun BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_jul BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_aug BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_sep BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_oct BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_nov BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN plant_dec BOOLEAN DEFAULT FALSE;

-- Add comments to document the new fields
COMMENT ON COLUMN crops.plant_jan IS 'Indicates whether this crop can be planted in January';
COMMENT ON COLUMN crops.plant_feb IS 'Indicates whether this crop can be planted in February';
COMMENT ON COLUMN crops.plant_mar IS 'Indicates whether this crop can be planted in March';
COMMENT ON COLUMN crops.plant_apr IS 'Indicates whether this crop can be planted in April';
COMMENT ON COLUMN crops.plant_may IS 'Indicates whether this crop can be planted in May';
COMMENT ON COLUMN crops.plant_jun IS 'Indicates whether this crop can be planted in June';
COMMENT ON COLUMN crops.plant_jul IS 'Indicates whether this crop can be planted in July';
COMMENT ON COLUMN crops.plant_aug IS 'Indicates whether this crop can be planted in August';
COMMENT ON COLUMN crops.plant_sep IS 'Indicates whether this crop can be planted in September';
COMMENT ON COLUMN crops.plant_oct IS 'Indicates whether this crop can be planted in October';
COMMENT ON COLUMN crops.plant_nov IS 'Indicates whether this crop can be planted in November';
COMMENT ON COLUMN crops.plant_dec IS 'Indicates whether this crop can be planted in December';

-- Update existing records to have default values
UPDATE crops SET 
  plant_jan = FALSE, plant_feb = FALSE, plant_mar = FALSE, plant_apr = FALSE,
  plant_may = FALSE, plant_jun = FALSE, plant_jul = FALSE, plant_aug = FALSE,
  plant_sep = FALSE, plant_oct = FALSE, plant_nov = FALSE, plant_dec = FALSE
WHERE plant_jan IS NULL;

-- Make all columns NOT NULL after setting default values
ALTER TABLE crops ALTER COLUMN plant_jan SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_feb SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_mar SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_apr SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_may SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_jun SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_jul SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_aug SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_sep SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_oct SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_nov SET NOT NULL;
ALTER TABLE crops ALTER COLUMN plant_dec SET NOT NULL;

COMMIT;
