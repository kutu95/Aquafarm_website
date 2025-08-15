import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => req.cookies[name],
          set: (name, value, options) => res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`),
          remove: (name) => res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`),
        },
      }
    );

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get query parameters for filtering
    const { date, parameter, search } = req.query;

    // Build query
    let query = supabase
      .from('water_chemistry_records')
      .select('*')
      .eq('user_id', session.user.id)
      .order('record_date', { ascending: false });

    // Apply filters
    if (date) {
      query = query.eq('record_date', date);
    }

    if (parameter) {
      query = query.or(`ph.ilike.%${parameter}%,ammonia.ilike.%${parameter}%,nitrite.ilike.%${parameter}%,nitrate.ilike.%${parameter}%`);
    }

    if (search) {
      query = query.or(`notes.ilike.%${search}%,record_date.ilike.%${search}%`);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching water chemistry records:', error);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }

    return res.status(200).json({
      success: true,
      records: records || []
    });

  } catch (error) {
    console.error('Error fetching water chemistry records:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
