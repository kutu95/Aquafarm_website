-- Create water chemistry analyses table
-- This table stores the results of AI-powered water chemistry test analysis

CREATE TABLE IF NOT EXISTS water_chemistry_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE water_chemistry_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view their own water chemistry analyses" ON water_chemistry_analyses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert their own water chemistry analyses" ON water_chemistry_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update their own water chemistry analyses" ON water_chemistry_analyses
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete their own water chemistry analyses" ON water_chemistry_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_water_chemistry_analyses_user_id ON water_chemistry_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_water_chemistry_analyses_created_at ON water_chemistry_analyses(created_at);

-- Add comments
COMMENT ON TABLE water_chemistry_analyses IS 'Stores AI-powered water chemistry test analysis results';
COMMENT ON COLUMN water_chemistry_analyses.results IS 'JSON object containing analysis results, confidence scores, and recommendations';
COMMENT ON COLUMN water_chemistry_analyses.filename IS 'Original filename of the uploaded test kit image';
