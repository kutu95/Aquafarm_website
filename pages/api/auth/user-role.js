import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('user-role API called');

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return req.cookies[name];
          },
          set(name, value, options) {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly`);
          },
          remove(name) {
            res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Max-Age=0`);
          },
        },
      }
    );

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session check:', { hasSession: !!session, hasUser: !!session?.user, sessionError });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!session?.user) {
      console.log('No session or user');
      return res.status(200).json({ role: null });
    }

    console.log('Fetching role for user:', session.user.id);
    
    // First, let's check if the user exists in profiles table
    const { data: allProfiles, error: listError } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(10);
    
    console.log('All profiles in table:', allProfiles);
    console.log('List error:', listError);
    
    // Fetch role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('Profile fetch result:', { profile, profileError });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Fallback: check user metadata for role
      const userRole = session.user.user_metadata?.role;
      console.log('Fallback to user metadata role:', userRole);
      return res.status(200).json({ role: userRole || null });
    }

    console.log('Returning role:', profile?.role);
    return res.status(200).json({ role: profile?.role || null });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 