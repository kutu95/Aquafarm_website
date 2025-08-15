import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create server-side Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return req.cookies[name];
          },
          set(name, value, options) {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/`);
          },
          remove(name) {
            res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
          },
        },
      }
    );

    // Get the user session from cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ error: 'Authentication error', details: sessionError.message });
    }
    
    if (!session) {
      console.log('No session found in API request');
      return res.status(401).json({ error: 'Unauthorized - No valid session' });
    }

    console.log('API Request authenticated for user:', session.user.id);

    const { imageData, filename } = req.body;

    if (!imageData || !filename) {
      return res.status(400).json({ error: 'Image data and filename are required' });
    }

    // Check payload size (base64 data can be large)
    const payloadSize = JSON.stringify(req.body).length;
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    console.log('API Request received:', {
      filename,
      payloadSize: `${(payloadSize / 1024 / 1024).toFixed(2)}MB`,
      maxSize: `${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      imageDataLength: imageData ? imageData.length : 0
    });
    
    if (payloadSize > maxSize) {
      return res.status(413).json({ 
        error: 'Payload too large', 
        size: payloadSize,
        maxSize: maxSize,
        suggestion: 'Try uploading a smaller image or compress the image before upload'
      });
    }

    // For Phase 1, we'll simulate the analysis
    // In Phase 2, this will use actual AI/computer vision libraries
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate AI analysis results
    // This will be replaced with actual computer vision analysis
    const analysisResults = {
      success: true,
      confidence: 0.85,
      parameters: {
        pH: {
          value: 7.2,
          status: 'good',
          confidence: 0.88,
          color: '#4CAF50',
          notes: 'pH is within healthy range'
        },
        ammonia: {
          value: 0.1,
          status: 'warning',
          confidence: 0.82,
          color: '#FF9800',
          notes: 'Low level detected, monitor closely'
        },
        nitrite: {
          value: 0.0,
          status: 'good',
          confidence: 0.95,
          color: '#4CAF50',
          notes: 'No nitrite detected - excellent'
        },
        nitrate: {
          value: 15.0,
          status: 'good',
          confidence: 0.87,
          color: '#4CAF50',
          notes: 'Nitrate levels are acceptable'
        }
      },
      imageAnalysis: {
        tubesDetected: 4,
        imageQuality: 'good',
        lightingConditions: 'natural',
        processingNotes: 'Image processed successfully with simulated AI analysis'
      }
    };

    // Store the analysis in the database for future reference
    const { data: analysisRecord, error: dbError } = await supabase
      .from('water_chemistry_analyses')
      .insert({
        user_id: session.user.id,
        filename: filename,
        results: analysisResults,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB storage fails
    }

    return res.status(200).json(analysisResults);

  } catch (error) {
    console.error('Error analyzing water chemistry:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
