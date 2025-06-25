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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** The service role key has full admin access to your database. Never expose it in client-side code or commit it to version control.

### 2. Resend Email Configuration

For automatic email sending, you need to configure Resend:

**To get your Resend API key:**

1. Go to your Resend dashboard: https://resend.com/dashboard
2. Navigate to API Keys
3. Create a new API key or copy an existing one
4. Add it to your `.env.local` file:

```
RESEND_API_KEY=your_resend_api_key
```

**Configure your sender email:**

Add your verified sender email address:

```
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Note:** The sender email must be verified in your Resend account. You can verify domains or individual email addresses in the Resend dashboard.

### 3. Site URL (Optional)

For production deployments, add your site URL:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 4. Complete Environment Variables List

Your `.env.local` file should contain:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_TINYMCE_API_KEY=your_tinymce_api_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com (optional)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
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

## Email Flow

When an admin creates a new user:

1. User is created in Supabase Auth
2. Profile is automatically created via database trigger
3. Invitation link is generated
4. Email is sent via Resend with the invitation link
5. User receives email and can complete their account setup

## Troubleshooting

### Email Not Sending
- Check that `RESEND_API_KEY` is correct
- Verify that `RESEND_FROM_EMAIL` is verified in Resend
- Check the server logs for email errors
- Ensure your Resend account has sufficient credits

### User Creation Fails
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that the service role key has admin privileges
- Ensure the profiles table and triggers exist

### Invitation Links Not Working
- Verify `NEXT_PUBLIC_SITE_URL` is correct for production
- Check that the complete-account page exists
- Ensure the redirect URL is properly configured 