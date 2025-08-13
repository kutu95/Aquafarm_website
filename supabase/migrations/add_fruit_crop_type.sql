-- Add 'Fruit' crop type to crop_types table
-- This migration adds a new crop type for fruits

BEGIN;

-- Insert the new 'Fruit' crop type
INSERT INTO crop_types (name, description, created_at, updated_at)
VALUES (
  'Fruit',
  'Fruits are the mature ovaries of flowering plants, typically containing seeds. They are usually sweet and fleshy, providing essential nutrients and vitamins. Examples include tomatoes, peppers, cucumbers, and melons.',
  NOW(),
  NOW()
);

-- Only insert if it doesn't already exist (idempotent)
-- This prevents errors if the migration is run multiple times
INSERT INTO crop_types (name, description, created_at, updated_at)
SELECT 
  'Fruit',
  'Fruits are the mature ovaries of flowering plants, typically containing seeds. They are usually sweet and fleshy, providing essential nutrients and vitamins. Examples include tomatoes, peppers, cucumbers, and melons.',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM crop_types WHERE name = 'Fruit'
);

COMMIT;
