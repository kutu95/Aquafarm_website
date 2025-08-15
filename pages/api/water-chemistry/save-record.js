import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== SAVE RECORD API DEBUG START ===');
  console.log('Request method:', req.method);
  console.log('Request body:', req.body);
  console.log('Request cookies:', req.cookies);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

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
            if (domain) cookieString += `; Secure`;
            
            res.setHeader('Set-Cookie', cookieString);
          },
        },
      }
    );

    console.log('Supabase client created successfully');

    // Get user session
    console.log('Getting user session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session result:', { session: !!session, error: sessionError, userId: session?.user?.id });
    
    if (sessionError || !session) {
      console.log('Session error or no session:', { sessionError, hasSession: !!session });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { record_date, ph, ammonia, nitrite, nitrate, dissolved_oxygen, water_temperature, confidence, notes } = req.body;

    console.log('Extracted data from request body:', {
      record_date, ph, ammonia, nitrite, nitrate, dissolved_oxygen, water_temperature, confidence, notes
    });

    // Validate required fields
    if (!record_date) {
      console.log('Validation failed: No record_date');
      return res.status(400).json({ error: 'Record date is required' });
    }

    // Validate date format
    const dateObj = new Date(record_date);
    if (isNaN(dateObj.getTime())) {
      console.log('Validation failed: Invalid date format:', record_date);
      return res.status(400).json({ error: 'Invalid date format' });
    }

    console.log('Date validation passed:', { record_date, dateObj: dateObj.toISOString() });

    // Check if record already exists for this date
    console.log('Checking for existing record...');
    const { data: existingRecord, error: checkError } = await supabase
      .from('water_chemistry_records')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('record_date', record_date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.log('Error checking existing record:', checkError);
      return res.status(500).json({ error: 'Failed to check existing record' });
    }

    console.log('Existing record check result:', { existingRecord, checkError });

    let result;
    
    if (existingRecord) {
      // Update existing record
      console.log('Updating existing record with ID:', existingRecord.id);
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
        return res.status(500).json({ error: 'Failed to update record', details: error.message });
      }

      result = data;
      console.log('Record updated successfully:', result);
    } else {
      // Insert new record
      console.log('Inserting new record...');
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
        return res.status(500).json({ error: 'Failed to save record', details: error.message });
      }

      result = data;
      console.log('Record inserted successfully:', result);
    }

    console.log('=== SAVE RECORD API DEBUG END ===');
    return res.status(200).json({
      success: true,
      message: existingRecord ? 'Record updated successfully' : 'Record saved successfully',
      data: result
    });

  } catch (error) {
    console.error('=== SAVE RECORD API ERROR ===');
    console.error('Error saving water chemistry record:', error);
    console.error('Error stack:', error.stack);
    console.error('=== SAVE RECORD API ERROR END ===');
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
