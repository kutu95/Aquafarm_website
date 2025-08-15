import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== TEST DB API DEBUG START ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
    console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

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

    // Test basic connection
    console.log('Testing basic connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('water_chemistry_records')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('Connection test failed:', connectionError);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: connectionError.message,
        code: connectionError.code 
      });
    }

    console.log('Connection test successful:', connectionTest);

    // Test table structure
    console.log('Testing table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'water_chemistry_records' })
      .single();

    if (tableError) {
      console.log('Table info RPC failed (this is normal):', tableError.message);
      // Try a different approach - just check if we can select from the table
      const { data: sampleData, error: sampleError } = await supabase
        .from('water_chemistry_records')
        .select('*')
        .limit(0);

      if (sampleError) {
        console.error('Sample select failed:', sampleError);
        return res.status(500).json({ 
          error: 'Table access failed', 
          details: sampleError.message,
          code: sampleError.code 
        });
      }

      console.log('Table access successful (0 rows returned as expected)');
    } else {
      console.log('Table info retrieved:', tableInfo);
    }

    console.log('=== TEST DB API DEBUG END ===');

    return res.status(200).json({
      success: true,
      message: 'Database connection and table access successful',
      connectionTest,
      tableExists: true
    });

  } catch (error) {
    console.error('=== TEST DB API ERROR ===');
    console.error('Error testing database:', error);
    console.error('Error stack:', error.stack);
    console.error('=== TEST DB API ERROR END ===');
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    });
  }
}
