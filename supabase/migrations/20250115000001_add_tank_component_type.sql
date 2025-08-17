-- Add 'tank' component type to greenhouse_layout table
-- This migration updates the component_type constraint to allow 'tank' components

-- First, drop the existing constraint
ALTER TABLE greenhouse_layout DROP CONSTRAINT IF EXISTS greenhouse_layout_component_type_check;

-- Add the new constraint that includes 'tank'
ALTER TABLE greenhouse_layout ADD CONSTRAINT greenhouse_layout_component_type_check 
CHECK (component_type IN ('greenhouse', 'growbed', 'fishtank', 'tank', 'pump', 'sensor', 'pipe', 'valve', 'filter', 'other'));

-- Add comment to document the change
COMMENT ON COLUMN greenhouse_layout.component_type IS 'Component type: greenhouse, growbed, fishtank, tank, pump, sensor, pipe, valve, filter, or other';
