import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { record_date, ph, ammonia, nitrite, nitrate, dissolved_oxygen, water_temperature, confidence, notes } = req.body;

    // Validate required fields
    if (!record_date) {
      return res.status(400).json({ error: 'Record date is required' });
    }

    // Validate date format
    const dateObj = new Date(record_date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if record already exists for this date
    const { data: existingRecord } = await supabase
      .from('water_chemistry_records')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('record_date', record_date)
      .single();

    let result;
    
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from('water_chemistry_records')
        .update({
          ph,
          ammonia,
          nitrite,
          nitrate,
          dissolved_oxygen,
          water_temperature,
          confidence,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating water chemistry record:', error);
        return res.status(500).json({ error: 'Failed to update record' });
      }

      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('water_chemistry_records')
        .insert({
          user_id: session.user.id,
          record_date,
          ph,
          ammonia,
          nitrite,
          nitrate,
          dissolved_oxygen,
          water_temperature,
          confidence,
          notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting water chemistry record:', error);
        return res.status(500).json({ error: 'Failed to save record' });
      }

      result = data;
    }

    return res.status(200).json({
      success: true,
      message: existingRecord ? 'Record updated successfully' : 'Record saved successfully',
      data: result
    });

  } catch (error) {
    console.error('Error saving water chemistry record:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
