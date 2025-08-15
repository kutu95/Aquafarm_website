import { createServerClient } from '@supabase/ssr';

// Configure Next.js API to handle large request bodies
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB for large image data
    },
    responseLimit: false, // No response size limit
  },
};

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

    const { imageData, filename, useChatGPT: userPrefersChatGPT } = req.body;

    if (!imageData || !filename) {
      return res.status(400).json({ error: 'Image data and filename are required' });
    }

    // Validate image data length early
    if (imageData.length < 1000) {
      console.error('Image data too small:', {
        filename,
        imageDataLength: imageData.length,
        imageDataPrefix: imageData.substring(0, 100)
      });
      return res.status(400).json({ 
        error: 'Image data is too small', 
        details: `Received ${imageData.length} characters, expected at least 1000. This usually means the image wasn't properly loaded or cropped.`,
        suggestion: 'Please try uploading the image again or check if the cropping tool is working properly.'
      });
    }

    // Additional validation for data URLs
    if (imageData.startsWith('data:image')) {
      const base64Part = imageData.split(',')[1];
      if (!base64Part || base64Part.length < 100) {
        console.error('Invalid data URL format:', {
          filename,
          hasDataUrlPrefix: true,
          base64PartLength: base64Part ? base64Part.length : 0
        });
        return res.status(400).json({ 
          error: 'Invalid image data format', 
          details: 'The image appears to be corrupted or empty.',
          suggestion: 'Please try uploading the image again.'
        });
      }
      console.log('Data URL validation passed:', {
        filename,
        totalLength: imageData.length,
        base64Length: base64Part.length,
        mimeType: imageData.split(';')[0]
      });
    }

    // Debug: Log the request details
    console.log('Request details:', {
      filename,
      imageDataLength: imageData ? imageData.length : 0,
      isStatusCheck: filename === 'status-check.png'
    });

    // Check payload size (base64 data can be large)
    const payloadSize = JSON.stringify(req.body).length;
    const maxSize = 50 * 1024 * 1024; // 50MB limit to match Next.js config
    
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

    // Check if this is a status check request
    if (filename === 'status-check.png') {
      console.log('Status check request detected, returning service availability');
      console.log('Status check environment variables:');
      console.log('- OPEN_AI_KEY:', process.env.OPEN_AI_KEY ? 'SET' : 'NOT SET');
      
      // Return status information without processing
      return res.status(200).json({
        status: 'ready',
        message: 'Water chemistry analyzer is ready',
        availableServices: {
          chatgpt: !!process.env.OPEN_AI_KEY
        },
        processingNotes: process.env.OPEN_AI_KEY ? 'ChatGPT Expert Mode Enabled' : 
                        'No AI Services Available'
      });
    }

    // Phase 2: Real AI Analysis using ChatGPT
    let analysisResults;
    
    // Debug: Check if API keys are available
    console.log('Environment check:', {
      hasChatGPTKey: !!process.env.OPEN_AI_KEY,
      chatGPTKeyLength: process.env.OPEN_AI_KEY ? process.env.OPEN_AI_KEY.length : 0
    });
    
    // Additional debugging
    console.log('Raw environment variables:');
    console.log('- OPEN_AI_KEY:', process.env.OPEN_AI_KEY ? 'SET' : 'NOT SET');
    console.log('- OPEN_AI_KEY first 10 chars:', process.env.OPEN_AI_KEY ? process.env.OPEN_AI_KEY.substring(0, 10) + '...' : 'NOT SET');
    
    // Check if ChatGPT is available
    const hasChatGPT = !!process.env.OPEN_AI_KEY;
    
    console.log('Available services - ChatGPT:', hasChatGPT);
    
    if (hasChatGPT) {
      console.log('Using ChatGPT for expert AI analysis');
      try {
        analysisResults = await analyzeWithChatGPT(imageData, filename);
      } catch (error) {
        console.error('ChatGPT analysis error:', error);
        throw error; // No fallback available
      }
    } else {
      console.log('No AI API keys found');
      return res.status(503).json({ 
        error: 'No AI services available',
        message: 'Please configure ChatGPT API key',
        details: 'Add OPEN_AI_KEY to your environment variables'
      });
    }

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

    console.log('=== FINAL RESPONSE DEBUG ===');
    console.log('analysisResults type:', typeof analysisResults);
    console.log('analysisResults keys:', Object.keys(analysisResults));
    console.log('analysisResults structure:', JSON.stringify(analysisResults, null, 2));
    console.log('About to return to frontend...');
    console.log('=== END FINAL RESPONSE DEBUG ===');

    return res.status(200).json(analysisResults);

  } catch (error) {
    console.error('Error analyzing water chemistry:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function analyzeWithChatGPT(imageData, filename) {
  try {
    console.log('Starting ChatGPT expert analysis...');
    
    // The imageData is already a data URL from the frontend
    const testTubesDataUrl = imageData;
    
    console.log('ChatGPT analysis setup:', {
      imageDataLength: imageData.length,
      imageDataPrefix: imageData.substring(0, 100),
      filename: filename
    });

    // Create the content array for ChatGPT
    const contentArray = [
      {
        type: 'text',
        text: `You are an expert aquaponics water chemistry analyst. Analyze this image of water test kit tubes to determine the pH, ammonia, nitrite, and nitrate levels.

IMPORTANT: This is an API Freshwater Master Test Kit. Use the color chart knowledge you have to interpret the test tube colors accurately.

Please provide:
1. pH level (6.0-8.5 range)
2. Ammonia level (0-8 ppm range) 
3. Nitrite level (0-5 ppm range)
4. Nitrate level (0-160 ppm range)

For each parameter, provide:
- The exact value detected
- Status: good, warning, or danger
- Confidence level (0.0-1.0)
- Specific notes about the reading
- Recommended actions if levels are concerning

Format your response as a JSON object with this structure:
{
  "pH": {"value": 7.2, "status": "good", "confidence": 0.9, "notes": "Neutral pH, ideal for most fish"},
  "ammonia": {"value": 0.0, "status": "good", "confidence": 0.95, "notes": "No ammonia detected"},
  "nitrite": {"value": 0.0, "status": "good", "confidence": 0.95, "notes": "No nitrite detected"},
  "nitrate": {"value": 10.0, "status": "good", "confidence": 0.85, "notes": "Low nitrate, safe level"}
}

Be precise and use your knowledge of the API Freshwater Master Test Kit color chart.`
      },
      {
        type: 'image_url',
        image_url: {
          url: testTubesDataUrl
        }
      }
    ];

    // Send images to ChatGPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: contentArray
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('ChatGPT response received');

    // Extract the analysis from ChatGPT's response
    const analysisText = data.choices[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('No analysis content received from ChatGPT');
    }

    console.log('Raw ChatGPT analysis:', analysisText);

    // Parse the JSON response from ChatGPT
    let analysis;
    try {
      // Try to extract JSON from the response (ChatGPT sometimes wraps it in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing ChatGPT response:', parseError);
      throw new Error(`Failed to parse ChatGPT analysis: ${parseError.message}`);
    }

    // Validate the analysis structure
    const requiredParams = ['pH', 'ammonia', 'nitrite', 'nitrate'];
    for (const param of requiredParams) {
      if (!analysis[param] || typeof analysis[param] !== 'object') {
        throw new Error(`Missing or invalid ${param} parameter in analysis`);
      }
      if (typeof analysis[param].value === 'undefined') {
        throw new Error(`Missing value for ${param} parameter`);
      }
    }

    // Create the final result structure
    const result = {
      success: true,
      confidence: 0.9, // High confidence for ChatGPT analysis
      parameters: analysis,
      imageAnalysis: {
        tubesDetected: 4, // Assuming 4 test tubes for pH, ammonia, nitrite, nitrate
        imageQuality: 'good',
        lightingConditions: 'natural',
        processingNotes: 'Expert AI analysis using ChatGPT with API Freshwater Master Test Kit knowledge',
        aiModel: 'gpt-4o',
        analysisMethod: 'ChatGPT expert interpretation'
      }
    };

    console.log('Final ChatGPT analysis result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('ChatGPT analysis error:', error);
    throw new Error(`ChatGPT analysis failed: ${error.message}`);
  }
}


