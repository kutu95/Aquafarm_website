# Environment Variables Setup

## Required Environment Variables

For the user management system to work properly, you need to add the following environment variables:

### 1. Supabase Service Role Key

You need to add the `SUPABASE_SERVICE_ROLE_KEY` to your environment variables. This key has admin privileges and is required for user creation and deletion.

**To get the service role key:**

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (NOT the anon key)
4. Add it to your `.env.local` file:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The service role key has full admin access to your database. Never expose it in client-side code or commit it to version control.

### 2. Site URL (Optional)

For production, you may want to set the site URL for invitation links:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 3. Complete Environment Variables List

Your `.env.local` file should contain:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_TINYMCE_API_KEY=your_tinymce_api_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com (optional)
```

## Security Notes

- The service role key bypasses Row Level Security (RLS) policies
- Only use it in server-side API routes, never in client-side code
- Keep it secure and don't share it publicly
- The API routes include proper error handling and validation

## Testing

After adding the service role key:

1. Restart your development server
2. Go to the admin dashboard
3. Try creating a new user
4. Check that the user appears in the list
5. Try deleting a user (except yourself)

The user management system should now work properly with admin privileges. 