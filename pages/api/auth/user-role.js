import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('user-role API called');

  try {
    console.log('Creating Supabase client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Environment check:', { 
      nodeEnv: process.env.NODE_ENV,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
    });
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return req.cookies[name];
          },
          set(name, value, options) {
            const isProduction = process.env.NODE_ENV === 'production';
            const domain = isProduction ? '.aquafarm.au' : undefined;
            const secure = isProduction;
            const sameSite = isProduction ? 'none' : 'lax';
            
            let cookieString = `${name}=${value}; Path=/; HttpOnly; SameSite=${sameSite}`;
            if (domain) cookieString += `; Domain=${domain}`;
            if (secure) cookieString += '; Secure';
            
            res.setHeader('Set-Cookie', cookieString);
          },
          remove(name) {
            const isProduction = process.env.NODE_ENV === 'production';
            const domain = isProduction ? '.aquafarm.au' : undefined;
            const secure = isProduction;
            const sameSite = isProduction ? 'none' : 'lax';
            
            let cookieString = `${name}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`;
            if (domain) cookieString += `; Domain=${domain}`;
            if (secure) cookieString += '; Secure';
            
            res.setHeader('Set-Cookie', cookieString);
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
    
    // Primary method: Get role from user metadata (most reliable)
    const userRole = session.user.user_metadata?.role;
    console.log('User metadata role:', userRole);
    
    if (userRole) {
      console.log('Returning role from metadata:', userRole);
      return res.status(200).json({ role: userRole });
    }
    
    // Fallback: Try to fetch from profiles table
    console.log('No role in metadata, trying profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('Profile fetch result:', { profile, profileError });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(200).json({ role: null });
    }

    console.log('Returning role from profiles:', profile?.role);
    return res.status(200).json({ role: profile?.role || null });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 