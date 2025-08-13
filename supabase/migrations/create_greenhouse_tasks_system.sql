-- Create Greenhouse Tasks System
-- This migration sets up a comprehensive task management system for greenhouse operations

BEGIN;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL DEFAULT 'recurring', -- 'recurring', 'one_off', 'seasonal'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    estimated_duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create task_schedules table for recurring and one-off tasks
CREATE TABLE IF NOT EXISTS task_schedules (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'one_off', 'seasonal'
    
    -- For recurring tasks
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
    day_of_month INTEGER, -- 1-31
    month_of_year INTEGER, -- 1-12
    week_of_month INTEGER, -- 1-5 (first week, second week, etc.)
    
    -- For one-off tasks
    specific_date DATE,
    
    -- For seasonal tasks
    season_start_month INTEGER, -- 1-12
    season_end_month INTEGER, -- 1-12
    
    -- Time settings
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '17:00:00',
    
    -- Recurrence settings
    repeat_every INTEGER DEFAULT 1, -- every X days/weeks/months
    max_occurrences INTEGER, -- NULL for infinite
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL for no end date
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create task_sop_links table for linking tasks to SOPs
CREATE TABLE IF NOT EXISTS task_sop_links (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    sop_id INTEGER REFERENCES sops(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, sop_id)
);

-- Create task_assignments table for tracking who's responsible
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'backup', 'supervisor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Create task_instances table for tracking actual task executions
CREATE TABLE IF NOT EXISTS task_instances (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped', 'cancelled'
    completed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_task_schedules_task_id ON task_schedules(task_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_active ON task_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_task_sop_links_task_id ON task_sop_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_scheduled_date ON task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Core tasks for greenhouse operations';
COMMENT ON TABLE task_schedules IS 'Scheduling information for recurring and one-off tasks';
COMMENT ON TABLE task_sop_links IS 'Links between tasks and Standard Operating Procedures';
COMMENT ON TABLE task_assignments IS 'User assignments and responsibilities for tasks';
COMMENT ON TABLE task_instances IS 'Actual execution records of scheduled tasks';

-- Insert some sample tasks
INSERT INTO tasks (title, description, task_type, priority, estimated_duration_minutes) VALUES
('Seeding', 'Plant seeds in grow beds according to planting schedule', 'recurring', 'high', 120),
('Plasticware Cleanup', 'Clean and sanitize all plastic containers and tools', 'recurring', 'medium', 90),
('Prepare Fish Tanks', 'Clean and prepare fish tanks for new season', 'seasonal', 'high', 180),
('Water Quality Check', 'Test pH, ammonia, and nitrate levels in all systems', 'recurring', 'critical', 45),
('Harvest Crops', 'Harvest mature crops and prepare for storage/sale', 'recurring', 'high', 120),
('System Maintenance', 'Check and maintain all greenhouse systems', 'recurring', 'medium', 240),
('Inventory Check', 'Audit supplies and equipment inventory', 'recurring', 'medium', 60),
('Training Session', 'Conduct safety and procedure training for team', 'recurring', 'high', 180);

-- Insert sample schedules
INSERT INTO task_schedules (task_id, schedule_type, day_of_week, start_time, end_time) VALUES
((SELECT id FROM tasks WHERE title = 'Seeding'), 'weekly', 2, '08:00:00', '10:00:00'), -- Tuesday
((SELECT id FROM tasks WHERE title = 'Plasticware Cleanup'), 'weekly', 1, '14:00:00', '15:30:00'), -- Monday
((SELECT id FROM tasks WHERE title = 'Water Quality Check'), 'weekly', 3, '09:00:00', '09:45:00'), -- Wednesday
((SELECT id FROM tasks WHERE title = 'Harvest Crops'), 'weekly', 5, '07:00:00', '09:00:00'), -- Friday
((SELECT id FROM tasks WHERE title = 'System Maintenance'), 'weekly', 6, '10:00:00', '14:00:00'), -- Saturday
((SELECT id FROM tasks WHERE title = 'Inventory Check'), 'monthly', NULL, '13:00:00', '14:00:00'), -- Monthly
((SELECT id FROM tasks WHERE title = 'Training Session'), 'monthly', NULL, '15:00:00', '18:00:00'); -- Monthly

-- Insert seasonal task schedule
INSERT INTO task_schedules (task_id, schedule_type, season_start_month, season_end_month, specific_date) VALUES
((SELECT id FROM tasks WHERE title = 'Prepare Fish Tanks'), 'seasonal', 4, 4, '2025-04-01'); -- April only

-- Insert sample task assignments (assuming some users exist)
-- INSERT INTO task_assignments (task_id, user_id, role) VALUES
-- ((SELECT id FROM tasks WHERE title = 'Seeding'), 'user-uuid-here', 'assigned'),
-- ((SELECT id FROM tasks WHERE title = 'Water Quality Check'), 'user-uuid-here', 'assigned');

COMMIT;
