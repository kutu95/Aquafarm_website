-- Greenhouse Layout System Setup
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create the main layout table for positioning greenhouse components
CREATE TABLE IF NOT EXISTS greenhouse_layout (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('greenhouse', 'growbed', 'fishtank', 'pump', 'sensor', 'pipe', 'valve', 'filter')),
  parent_id INTEGER REFERENCES greenhouse_layout(id),
  x_position DECIMAL(10,2) NOT NULL DEFAULT 0,
  y_position DECIMAL(10,2) NOT NULL DEFAULT 0,
  width DECIMAL(10,2) NOT NULL DEFAULT 100,
  height DECIMAL(10,2) NOT NULL DEFAULT 100,
  rotation DECIMAL(5,2) DEFAULT 0,
  layer_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#4CAF50',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitoring data table for real-time sensor readings
CREATE TABLE IF NOT EXISTS component_monitoring (
  id SERIAL PRIMARY KEY,
  component_id INTEGER NOT NULL REFERENCES greenhouse_layout(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('flow_rate', 'power', 'temperature', 'ph', 'ec', 'water_level', 'pressure', 'humidity')),
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  alert_threshold_min DECIMAL(10,4),
  alert_threshold_max DECIMAL(10,4),
  is_alert BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_greenhouse_layout_component_type ON greenhouse_layout(component_type);
CREATE INDEX IF NOT EXISTS idx_greenhouse_layout_status ON greenhouse_layout(status);
CREATE INDEX IF NOT EXISTS idx_component_monitoring_component_id ON component_monitoring(component_id);
CREATE INDEX IF NOT EXISTS idx_component_monitoring_timestamp ON component_monitoring(timestamp);
CREATE INDEX IF NOT EXISTS idx_component_monitoring_metric_type ON component_monitoring(metric_type);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_greenhouse_layout_updated_at 
  BEFORE UPDATE ON greenhouse_layout 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample greenhouse outline (adjust dimensions based on your actual greenhouse)
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Main Greenhouse', 'greenhouse', 0, 0, 1000, 800, '#E8F5E8', 
        '{"shape": "rectangle", "walls": true, "door_position": "south", "description": "Main aquaponics greenhouse"}', 0);

-- Insert sample growbeds (adjust positions and sizes based on your actual layout)
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Growbed A', 'growbed', 50, 100, 200, 150, '#4CAF50', 
        '{"type": "media_bed", "status": "active", "crop_count": 12, "area": "3m²", "volume": "450L"}', 1);

INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Growbed B', 'growbed', 300, 100, 200, 150, '#4CAF50', 
        '{"type": "dwc", "status": "active", "crop_count": 8, "area": "3m²", "volume": "300L"}', 1);

INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Growbed C', 'growbed', 550, 100, 200, 150, '#4CAF50', 
        '{"type": "media_bed", "status": "active", "crop_count": 10, "area": "3m²", "volume": "450L"}', 1);

-- Insert sample fish tanks
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Fish Tank 1', 'fishtank', 50, 400, 120, 80, '#2196F3', 
        '{"capacity": "1000L", "fish_count": 45, "water_level": 85, "fish_type": "tilapia"}', 1);

INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Fish Tank 2', 'fishtank', 200, 400, 120, 80, '#2196F3', 
        '{"capacity": "1000L", "fish_count": 38, "water_level": 90, "fish_type": "tilapia"}', 1);

-- Insert sample pumps
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Main Pump', 'pump', 600, 350, 40, 40, '#FF9800', 
        '{"type": "submersible", "flow_rate": "2000L/h", "power": "45W", "status": "active"}', 2);

INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Aeration Pump', 'pump', 650, 350, 30, 30, '#FF9800', 
        '{"type": "air_pump", "flow_rate": "100L/h", "power": "15W", "status": "active"}', 2);

-- Insert sample pipes/plumbing
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Main Water Line', 'pipe', 100, 300, 400, 10, '#795548', 
        '{"type": "pvc", "diameter": "50mm", "flow_direction": "east"}', 1);

INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Return Line', 'pipe', 100, 500, 400, 10, '#795548', 
        '{"type": "pvc", "diameter": "50mm", "flow_direction": "west"}', 1);

-- Insert sample sensors
INSERT INTO greenhouse_layout (name, component_type, x_position, y_position, width, height, color, metadata, layer_order) 
VALUES ('Water Quality Sensor', 'sensor', 700, 200, 20, 20, '#9C27B0', 
        '{"type": "multi_parameter", "measures": ["ph", "ec", "temperature"], "status": "active"}', 3);

-- Add comments for documentation
COMMENT ON TABLE greenhouse_layout IS 'Stores the visual layout and positioning of greenhouse components';
COMMENT ON TABLE component_monitoring IS 'Stores real-time monitoring data from sensors and devices';
COMMENT ON COLUMN greenhouse_layout.metadata IS 'JSON object containing component-specific properties and configuration';
COMMENT ON COLUMN component_monitoring.metadata IS 'Additional monitoring data and alert configuration';

-- Grant permissions (adjust as needed for your setup)
-- ALTER TABLE greenhouse_layout ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE component_monitoring ENABLE ROW LEVEL SECURITY;
