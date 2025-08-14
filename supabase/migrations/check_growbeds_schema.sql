-- Check current growbeds table schema
-- This script shows the current state of the growbeds table

-- Show all columns in the growbeds table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'growbeds' 
ORDER BY ordinal_position;

-- Show any existing constraints
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%growbeds%';

-- Show any existing indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'growbeds';

-- Show sample data to verify width/length columns
SELECT 
    id,
    name,
    width,
    length,
    area,
    holes,
    volume,
    type,
    status
FROM growbeds 
LIMIT 5;

