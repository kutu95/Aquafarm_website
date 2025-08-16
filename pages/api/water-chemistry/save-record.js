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
    
    let authenticatedUser = null;
    
    if (sessionError) {
      console.log('Session error:', sessionError);
      return res.status(401).json({ error: 'Authentication error', details: sessionError.message });
    }
    
    if (session && session.user) {
      // Cookie-based authentication successful
      authenticatedUser = session.user;
      console.log('Cookie-based authentication successful for user:', authenticatedUser.id);
    } else {
      console.log('No session found in API request');
      console.log('Available cookies:', req.cookies);
      
      // Try alternative authentication method - check for Authorization header
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
    console.log('User ID type:', typeof authenticatedUser.id);
    console.log('User ID value:', authenticatedUser.id);

    const { record_date, ph, ammonia, nitrite, nitrate, dissolved_oxygen, water_temperature, confidence, notes } = req.body;

    console.log('Extracted data from request body:', {
      record_date, ph, ammonia, nitrite, nitrate, dissolved_oxygen, water_temperature, confidence, notes
    });

    // Clean numeric fields - convert empty strings to null
    const cleanNumericField = (value) => {
      if (value === '' || value === undefined || value === null) {
        return null;
      }
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    const cleanData = {
      record_date,
      ph: cleanNumericField(ph),
      ammonia: cleanNumericField(ammonia),
      nitrite: cleanNumericField(nitrite),
      nitrate: cleanNumericField(nitrate),
      dissolved_oxygen: cleanNumericField(dissolved_oxygen),
      water_temperature: cleanNumericField(water_temperature),
      confidence: cleanNumericField(confidence),
      notes: notes || null
    };

    console.log('Cleaned data for database:', cleanData);

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
      .eq('user_id', authenticatedUser.id)
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
          ph: cleanData.ph,
          ammonia: cleanData.ammonia,
          nitrite: cleanData.nitrite,
          nitrate: cleanData.nitrate,
          dissolved_oxygen: cleanData.dissolved_oxygen,
          water_temperature: cleanData.water_temperature,
          confidence: cleanData.confidence,
          notes: cleanData.notes,
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
          user_id: authenticatedUser.id,
          record_date: cleanData.record_date,
          ph: cleanData.ph,
          ammonia: cleanData.ammonia,
          nitrite: cleanData.nitrite,
          nitrate: cleanData.nitrate,
          dissolved_oxygen: cleanData.dissolved_oxygen,
          water_temperature: cleanData.water_temperature,
          confidence: cleanData.confidence,
          notes: cleanData.notes
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
