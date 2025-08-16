import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API Request method:', req.method);
    console.log('API Request URL:', req.url);
    console.log('API Request headers:', req.headers);
    console.log('API Request cookies:', req.cookies);
    console.log('Environment variables check:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Create Supabase client for authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => req.cookies[name],
          set: (name, value, options) => {
            const isProduction = process.env.NODE_ENV === 'production';
            const domain = isProduction ? '.aquafarm.au' : undefined;
            const secure = isProduction;
            const sameSite = isProduction ? 'none' : 'lax';
            
            let cookieString = `${name}=${value}; Path=/; HttpOnly; SameSite=${sameSite}`;
            if (domain) cookieString += `; Domain=${domain}`;
            if (secure) cookieString += '; Secure';
            
            res.setHeader('Set-Cookie', cookieString);
          },
          remove: (name) => {
            const isProduction = process.env.NODE_ENV === 'production';
            const domain = isProduction ? '.aquafarm.au' : undefined;
            const secure = isProduction;
            const sameSite = isProduction ? 'none' : 'lax';
            
            let cookieString = `${name}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`;
            if (domain) cookieString += '; Secure';
            
            res.setHeader('Set-Cookie', cookieString);
          },
        },
      }
    );

    // Create a service role client for database operations (bypasses RLS)
    const supabaseService = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get: (name) => req.cookies[name],
          set: (name, value, options) => {}, // No need to set cookies for service client
          remove: (name) => {}, // No need to remove cookies for service client
        },
      }
    );

    // Dual authentication: try cookie-based session first, then token-based
    let authenticatedUser = null;
    
    // Try cookie-based authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ error: 'Authentication error', details: sessionError.message });
    }
    
    if (session && session.user) {
      authenticatedUser = session.user;
      console.log('Cookie-based authentication successful for user:', authenticatedUser.id);
    } else {
      console.log('No session found in API request');
      // Try token-based authentication
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('Found Authorization header, attempting token-based auth...');
        const token = authHeader.substring(7);
        try {
          const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
          if (user && !tokenError) {
            authenticatedUser = user;
            console.log('Token-based authentication successful for user:', authenticatedUser.id);
          } else {
            console.error('Token-based authentication failed:', tokenError);
            return res.status(401).json({ error: 'Invalid token' });
          }
        } catch (tokenAuthError) {
          console.error('Token authentication error:', tokenAuthError);
          return res.status(401).json({ error: 'Token authentication failed' });
        }
      } else {
        console.log('No Authorization header found');
        return res.status(401).json({ error: 'Unauthorized - No valid session' });
      }
    }

    if (!authenticatedUser) {
      console.error('No authenticated user found after all authentication methods');
      return res.status(401).json({ error: 'Authentication failed - no valid user' });
    }

    console.log('API Request authenticated for user:', authenticatedUser.id);

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    // First verify the record belongs to the user using service role client
    const { data: existingRecord, error: fetchError } = await supabaseService
      .from('water_chemistry_records')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (existingRecord.user_id !== authenticatedUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the record using service role client
    const { error: deleteError } = await supabaseService
      .from('water_chemistry_records')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting water chemistry record:', deleteError);
      return res.status(500).json({ error: 'Failed to delete record', details: deleteError.message });
    }

    console.log('Successfully deleted record:', id);
    return res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting water chemistry record:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
