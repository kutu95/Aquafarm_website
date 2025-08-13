-- Fix pages content field length to prevent truncation
-- The content field needs to be able to store large HTML documents

-- First, let's check the current column type
-- Then alter it to use TEXT without length limit or increase the limit significantly

-- Option 1: Change to TEXT (unlimited length)
ALTER TABLE pages 
ALTER COLUMN content TYPE TEXT;

-- Option 2: If the above doesn't work, try increasing VARCHAR limit to a very large number
-- ALTER TABLE pages 
-- ALTER COLUMN content TYPE VARCHAR(100000);

-- Add a comment to document the change
COMMENT ON COLUMN pages.content IS 'HTML content for the page - now unlimited length to prevent truncation';
