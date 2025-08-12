-- Fix RLS policies for greenhouse tables
-- This migration updates the RLS policies to use the profiles table instead of JWT role extraction

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can manage crop_types" ON crop_types;
DROP POLICY IF EXISTS "Admin users can manage fish_types" ON fish_types;
DROP POLICY IF EXISTS "Admin users can manage growbeds" ON growbeds;
DROP POLICY IF EXISTS "Admin users can manage fishtanks" ON fishtanks;
DROP POLICY IF EXISTS "Admin users can manage crops" ON crops;
DROP POLICY IF EXISTS "Admin users can manage fish" ON fish;
DROP POLICY IF EXISTS "Admin users can manage seeding" ON seeding;
DROP POLICY IF EXISTS "Admin users can manage crop_seeding" ON crop_seeding;

-- Create new RLS policies using profiles table
CREATE POLICY "Admin users can manage crop_types" ON crop_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage fish_types" ON fish_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage growbeds" ON growbeds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage fishtanks" ON fishtanks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage crops" ON crops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage fish" ON fish
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage seeding" ON seeding
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage crop_seeding" ON crop_seeding
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
