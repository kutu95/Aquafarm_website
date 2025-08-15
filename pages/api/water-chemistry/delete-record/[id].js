import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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
            if (domain) cookieString += `; Domain=${domain}`;
            if (secure) cookieString += '; Secure';
            
            res.setHeader('Set-Cookie', cookieString);
          },
        },
      }
    );

    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    // First verify the record belongs to the user
    const { data: existingRecord, error: fetchError } = await supabase
      .from('water_chemistry_records')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (existingRecord.user_id !== session.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('water_chemistry_records')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting water chemistry record:', deleteError);
      return res.status(500).json({ error: 'Failed to delete record' });
    }

    return res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting water chemistry record:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
