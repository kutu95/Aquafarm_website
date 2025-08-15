-- Create water chemistry records table
CREATE TABLE IF NOT EXISTS water_chemistry_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL,
  ph DECIMAL(3,1),
  ammonia DECIMAL(4,2),
  nitrite DECIMAL(4,2),
  nitrate DECIMAL(5,1),
  dissolved_oxygen DECIMAL(4,2),
  water_temperature DECIMAL(4,1),
  confidence DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one record per user per day
  UNIQUE(user_id, record_date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_water_chemistry_records_user_date ON water_chemistry_records(user_id, record_date);

-- Enable RLS
ALTER TABLE water_chemistry_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own water chemistry records" ON water_chemistry_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water chemistry records" ON water_chemistry_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water chemistry records" ON water_chemistry_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water chemistry records" ON water_chemistry_records
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_water_chemistry_records_updated_at
  BEFORE UPDATE ON water_chemistry_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
