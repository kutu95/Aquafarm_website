-- Create greenhouse management tables
-- This migration creates all necessary tables for managing the greenhouse system

-- Create crop_types table for vegetable types
CREATE TABLE IF NOT EXISTS crop_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fish_types table for fish species
CREATE TABLE IF NOT EXISTS fish_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create growbeds table
CREATE TABLE IF NOT EXISTS growbeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holes INTEGER NOT NULL CHECK (holes > 0),
    flowrate DECIMAL(8,2) NOT NULL CHECK (flowrate >= 0), -- litres per hour
    type VARCHAR(20) NOT NULL CHECK (type IN ('DWC', 'Media bed', 'Wicking bed')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fishtanks table
CREATE TABLE IF NOT EXISTS fishtanks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    volume DECIMAL(8,2) NOT NULL CHECK (volume > 0), -- litres
    flowrate DECIMAL(8,2) NOT NULL CHECK (flowrate >= 0), -- litres per hour
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crops table
CREATE TABLE IF NOT EXISTS crops (
    id SERIAL PRIMARY KEY,
    vegetable_name VARCHAR(100) NOT NULL,
    crop_type_id INTEGER NOT NULL REFERENCES crop_types(id) ON DELETE RESTRICT,
    seeds_per_pot INTEGER NOT NULL CHECK (seeds_per_pot > 0),
    time_to_harvest INTEGER NOT NULL CHECK (time_to_harvest > 0), -- weeks
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fish table
CREATE TABLE IF NOT EXISTS fish (
    id SERIAL PRIMARY KEY,
    fish_type_id INTEGER NOT NULL REFERENCES fish_types(id) ON DELETE RESTRICT,
    fishtank_id INTEGER REFERENCES fishtanks(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sick', 'deceased')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seeding table
CREATE TABLE IF NOT EXISTS seeding (
    id SERIAL PRIMARY KEY,
    seeding_date DATE NOT NULL,
    growbed_id INTEGER REFERENCES growbeds(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crop_seeding table (junction table)
CREATE TABLE IF NOT EXISTS crop_seeding (
    id SERIAL PRIMARY KEY,
    seeding_id INTEGER NOT NULL REFERENCES seeding(id) ON DELETE CASCADE,
    crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    seeds_per_pot INTEGER NOT NULL CHECK (seeds_per_pot > 0),
    pots INTEGER NOT NULL CHECK (pots > 0),
    status VARCHAR(20) DEFAULT 'planted' CHECK (status IN ('planted', 'germinated', 'growing', 'harvested')),
    harvest_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default crop types
INSERT INTO crop_types (name, description) VALUES
    ('Leafy Greens', 'Lettuce, spinach, kale, and other leafy vegetables'),
    ('Herbs', 'Basil, mint, parsley, and other herbs'),
    ('Root Vegetables', 'Carrots, radishes, and other root crops'),
    ('Fruiting Vegetables', 'Tomatoes, peppers, cucumbers, and other fruiting crops'),
    ('Microgreens', 'Young vegetable greens harvested just after germination')
ON CONFLICT (name) DO NOTHING;

-- Insert some default fish types
INSERT INTO fish_types (name, description) VALUES
    ('Tilapia', 'Common warm-water fish, good for aquaponics'),
    ('Catfish', 'Hardy fish that tolerates various water conditions'),
    ('Koi', 'Ornamental fish, good for smaller systems'),
    ('Goldfish', 'Hardy fish suitable for beginners'),
    ('Bass', 'Game fish that grows well in aquaponics')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_growbeds_type ON growbeds(type);
CREATE INDEX IF NOT EXISTS idx_fishtanks_status ON fishtanks(status);
CREATE INDEX IF NOT EXISTS idx_crops_type_id ON crops(crop_type_id);
CREATE INDEX IF NOT EXISTS idx_fish_fishtank_id ON fish(fishtank_id);
CREATE INDEX IF NOT EXISTS idx_fish_type_id ON fish(fish_type_id);
CREATE INDEX IF NOT EXISTS idx_seeding_date ON seeding(seeding_date);
CREATE INDEX IF NOT EXISTS idx_crop_seeding_seeding_id ON crop_seeding(seeding_id);
CREATE INDEX IF NOT EXISTS idx_crop_seeding_crop_id ON crop_seeding(crop_id);

-- Enable Row Level Security
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE growbeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishtanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeding ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_seeding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
-- Using auth.uid() to check if user exists and then checking role in profiles table
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_crop_types_updated_at BEFORE UPDATE ON crop_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fish_types_updated_at BEFORE UPDATE ON fish_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growbeds_updated_at BEFORE UPDATE ON growbeds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fishtanks_updated_at BEFORE UPDATE ON fishtanks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON crops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fish_updated_at BEFORE UPDATE ON fish
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seeding_updated_at BEFORE UPDATE ON seeding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crop_seeding_updated_at BEFORE UPDATE ON crop_seeding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
