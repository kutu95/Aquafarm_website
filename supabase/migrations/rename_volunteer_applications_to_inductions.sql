-- Rename volunteer_applications table to volunteer_inductions
-- This migration renames the table and updates all related objects

-- Rename the table
ALTER TABLE volunteer_applications RENAME TO volunteer_inductions;

-- Rename the index
ALTER INDEX idx_volunteer_applications_user_id RENAME TO idx_volunteer_inductions_user_id;

-- Drop and recreate the trigger with the new table name
DROP TRIGGER IF EXISTS update_volunteer_applications_updated_at ON volunteer_inductions;
CREATE TRIGGER update_volunteer_inductions_updated_at 
    BEFORE UPDATE ON volunteer_inductions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own application" ON volunteer_inductions;
DROP POLICY IF EXISTS "Users can insert own application" ON volunteer_inductions;
DROP POLICY IF EXISTS "Users can update own application" ON volunteer_inductions;
DROP POLICY IF EXISTS "Admins can view all applications" ON volunteer_inductions;
DROP POLICY IF EXISTS "Admins can update all applications" ON volunteer_inductions;

-- Recreate policies with new table name
-- Users can only see their own application
CREATE POLICY "Users can view own induction" ON volunteer_inductions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own application
CREATE POLICY "Users can insert own induction" ON volunteer_inductions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own application
CREATE POLICY "Users can update own induction" ON volunteer_inductions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all inductions" ON volunteer_inductions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can update all applications
CREATE POLICY "Admins can update all inductions" ON volunteer_inductions
    FOR UPDATE USING (auth.uid() IS NOT NULL); 