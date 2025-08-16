-- Fix RLS policies for water chemistry records table
-- This migration addresses issues with token-based authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own water chemistry records" ON water_chemistry_records;
DROP POLICY IF EXISTS "Users can insert their own water chemistry records" ON water_chemistry_records;
DROP POLICY IF EXISTS "Users can update their own water chemistry records" ON water_chemistry_records;
DROP POLICY IF EXISTS "Users can delete their own water chemistry records" ON water_chemistry_records;

-- Create more robust RLS policies that work with both cookie and token auth
CREATE POLICY "Users can view their own water chemistry records" ON water_chemistry_records
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid = user_id
  );

CREATE POLICY "Users can insert their own water chemistry records" ON water_chemistry_records
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid = user_id
  );

CREATE POLICY "Users can update their own water chemistry records" ON water_chemistry_records
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid = user_id
  );

CREATE POLICY "Users can delete their own water chemistry records" ON water_chemistry_records
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid = user_id
  );

-- Add a more permissive policy for development/testing
-- This allows the service role to bypass RLS if needed
CREATE POLICY "Service role bypass" ON water_chemistry_records
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Ensure the table has the correct permissions
GRANT ALL ON water_chemistry_records TO authenticated;
GRANT ALL ON water_chemistry_records TO service_role;
