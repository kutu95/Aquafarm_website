# Database Migration Guide

## Current Status
The security features are temporarily disabled until you run the database migration. Your pages should now work correctly for creation and viewing.

## To Enable Security Features

### Step 1: Run the Database Migration
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the entire contents of `database_migration.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

### Step 2: Re-enable Security Features
After running the migration, you'll need to uncomment the security features in the code:

#### In `pages/dashboard.js`:
1. Uncomment the security selector in the form (around line 620)
2. Uncomment the security column in the table (around line 650)
3. Uncomment the security field in `pageData` (around line 460)
4. Uncomment the security field in `handleEdit` (around line 480)
5. Add `security: 'open'` back to form resets

#### In `pages/[slug].js`:
1. Uncomment the access control logic (around line 80)

#### In `components/NavBar.js`:
1. Uncomment the security filtering logic (around line 15)

### Step 3: Test the Security System
1. Create pages with different security levels
2. Test access as different user types
3. Verify the navigation menu adapts correctly

## What the Migration Does
- Adds `security` column to `pages` table
- Updates RLS policies for access control
- Sets default security to 'open' for existing pages
- Creates index for security-based queries

## Current Behavior (Before Migration)
- All pages are accessible to everyone
- No security restrictions
- Pages work normally for creation and viewing

## After Migration
- Three-tier security system will be active
- Navigation will filter based on user access
- Server-side access control will be enforced 