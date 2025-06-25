# Three-Tier Security System

## Overview
Your Aquafarm website now has a three-tier security system that controls access to pages based on user authentication and role levels.

## Security Levels

### 1. **Open** (Public)
- **Access**: Anyone can view these pages
- **Use case**: Public information, general content
- **Example**: Home page, about us, public announcements

### 2. **User** (Logged-in Users)
- **Access**: Only authenticated users can view these pages
- **Use case**: Member-only content, user resources
- **Example**: Member directory, user guides, internal communications

### 3. **Admin** (Admin Only)
- **Access**: Only users with admin role can view these pages
- **Use case**: Administrative content, sensitive information
- **Example**: Admin guides, internal policies, sensitive data

## Implementation Details

### Database Changes
- Added `security` column to `pages` table
- Values: `'open'`, `'user'`, `'admin'`
- Default value: `'open'`

### Row Level Security (RLS) Policies
The database now enforces access control at the database level:
- **Open pages**: Visible to everyone
- **User pages**: Only visible to authenticated users
- **Admin pages**: Only visible to authenticated admin users

### Frontend Changes

#### Dashboard
- Added security level selector when creating/editing pages
- Security column in the pages table with color-coded badges
- Form includes security field in all operations

#### Navigation
- Dynamic menu that only shows pages the user has access to
- Non-logged users: Only see "Open" pages
- Logged users: See "Open" and "User" pages
- Admin users: See all pages

#### Page Access Control
- Server-side validation prevents unauthorized access
- Redirects to login for user-only pages
- Redirects to home for admin-only pages

## Setup Instructions

### 1. Run Database Migration
Copy and paste the contents of `database_migration.sql` into your Supabase SQL Editor and run it.

### 2. Test the System
1. Create pages with different security levels
2. Test access as different user types:
   - Non-logged user
   - Regular logged user
   - Admin user

### 3. Verify Navigation
- Check that the menu only shows appropriate pages for each user type
- Verify that direct URL access is properly restricted

## Usage

### Creating Pages with Security Levels
1. Go to Dashboard
2. Fill in page details
3. Select security level from dropdown:
   - **Open (Anyone)**: Public access
   - **User (Logged in users)**: Member access
   - **Admin (Admin only)**: Admin access
4. Save the page

### Managing Existing Pages
- Edit any page to change its security level
- The security level is displayed in the dashboard table
- Color-coded badges make it easy to identify access levels

## Security Features

- **Database-level enforcement**: RLS policies prevent unauthorized access
- **Server-side validation**: Additional checks in page routes
- **Dynamic navigation**: Menu adapts to user permissions
- **Graceful redirects**: Users are redirected appropriately when access is denied

## Files Modified
- `pages/dashboard.js` - Added security field to forms and table
- `pages/[slug].js` - Added server-side access control
- `components/NavBar.js` - Dynamic menu filtering
- `database_migration.sql` - Database schema changes
- `supabase/migrations/add_security_to_pages.sql` - Migration file 