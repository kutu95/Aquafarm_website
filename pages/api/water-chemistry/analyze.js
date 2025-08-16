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

  console.log('=== ANALYZE API DEBUG START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  console.log('Request cookies:', req.cookies);
  console.log('Cookie names present:', Object.keys(req.cookies));
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  console.log('OPEN_AI_KEY:', process.env.OPEN_AI_KEY ? 'SET' : 'NOT SET');

  try {
    // Create server-side Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = req.cookies[name];
            console.log(`Getting cookie ${name}:`, cookie ? 'present' : 'missing');
            return cookie;
          },
          set(name, value, options) {
            const isProduction = process.env.NODE_ENV === 'production';
            const domain = isProduction ? '.aquafarm.au' : undefined;
            const secure = isProduction;
            const sameSite = isProduction ? 'none' : 'lax';
            
            let cookieString = `${name}=${value}; Path=/; HttpOnly; SameSite=${sameSite}`;
            if (domain) cookieString += `; Domain=${domain}`;
            if (secure) cookieString += '; Secure';
            
            console.log(`Setting cookie ${name} with domain: ${domain}, secure: ${secure}, sameSite: ${sameSite}`);
            console.log(`Full cookie string: ${cookieString}`);
            
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
            
            console.log(`Removing cookie ${name} with domain: ${domain}, secure: ${secure}, sameSite: ${sameSite}`);
            
            res.setHeader('Set-Cookie', cookieString);
          },
        },
      }
    );

    // Get the user session from cookies
    console.log('Attempting to get user session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Debug: Log cookie and session information
    console.log('API Request cookies:', Object.keys(req.cookies));
    console.log('API Request session result:', { hasSession: !!session, sessionError, userId: session?.user?.id });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ error: 'Authentication error', details: sessionError.message });
    }
    
    if (!session) {
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
            console.log('Token-based authentication successful for user:', user.id);
            // Continue with the user from token
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

    console.log('API Request authenticated for user:', session?.user?.id || 'token-based user');

    // Extract request data
    const { imageData, filename } = req.body;

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

// Function to get the embedded API Freshwater Master Test Kit color chart
async function getEmbeddedColorChart() {
  try {
    // Read the embedded color chart from the public directory
    const fs = require('fs');
    const path = require('path');
    
    const chartPath = path.join(process.cwd(), 'public', 'api-color-chart.png');
    const chartBuffer = fs.readFileSync(chartPath);
    const base64Chart = chartBuffer.toString('base64');
    
    return {
      filename: 'api-freshwater-master-test-kit-color-chart.png',
      dataUrl: `data:image/png;base64,${base64Chart}`,
      description: 'API Freshwater Master Test Kit color chart with standardized color scales for pH, ammonia, nitrite, and nitrate'
    };
  } catch (error) {
    console.error('Error reading embedded color chart:', error);
    // Fallback to a simple description if chart can't be loaded
    return {
      filename: 'api-freshwater-master-test-kit-color-chart.png',
      dataUrl: null,
      description: 'API Freshwater Master Test Kit color chart with standardized color scales for pH, ammonia, nitrite, and nitrate'
    };
  }
}

async function analyzeWithChatGPT(imageData, filename) {
  try {
    console.log('Starting ChatGPT expert analysis...');
    
    // Get the embedded color chart
    const colorChart = await getEmbeddedColorChart();
    
    // The imageData is already a data URL from the frontend
    const testTubesDataUrl = imageData;
    
    console.log('ChatGPT analysis setup:', {
      hasColorChart: !!colorChart.dataUrl,
      imageDataLength: imageData.length,
      imageDataPrefix: imageData.substring(0, 100),
      filename: filename
    });

    // Create the content array for ChatGPT
    const contentArray = [
      {
        type: 'text',
        text: `You are an educational assistant helping with aquaponics water quality testing. You will analyze TWO images:

1. A user's test tube image (water chemistry test tubes from an aquaponics system)
2. The official API Freshwater Master Test Kit color chart (with standardized color scales)

IMPORTANT: This aquaponics system is targeting a pH of 6.4 for optimal plant and fish health.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no additional text, no markdown formatting.

Compare the colors in the test tubes to the exact colors on the color chart to determine precise readings.

For each parameter, provide:
- The value/level based on the closest color match to the chart
- The status (good, warning, or danger) based on the color intensity
- Your confidence level (0-1)
- Brief notes about what color you see and how it matches the chart

Focus ONLY on the test tube colors compared to the chart colors. Ignore background elements.

Additionally, provide personalized recommendations based on the water chemistry values for an aquaponics system targeting pH 6.4.

RESPOND WITH ONLY THIS JSON STRUCTURE - NO OTHER TEXT:
{
  "success": true,
  "confidence": 0.95,
  "parameters": {
    "pH": {"value": 6.0, "status": "warning", "confidence": 0.9, "color": "#FFFF00", "notes": "Yellow color matches chart at 6.0"},
    "ammonia": {"value": 2.0, "status": "danger", "confidence": 0.85, "color": "#008000", "notes": "Green color matches chart at 2.0 ppm"},
    "nitrite": {"value": 0.0, "status": "good", "confidence": 0.88, "color": "#ADD8E6", "notes": "Light blue color matches chart at 0.0 ppm"},
    "nitrate": {"value": 80.0, "status": "danger", "confidence": 0.87, "color": "#FF0000", "notes": "Red color matches chart at 80.0 ppm"}
  },
  "recommendations": [
    "pH is low (6.0) - Need to raise pH from 6.0 to target of 6.4. Consider adding crushed coral or limestone gradually",
    "Ammonia is dangerously high (2.0 ppm) - Perform immediate 50% water change and check for overfeeding or dead fish",
    "Nitrite is good (0.0 ppm) - Your tank is properly cycled for this parameter",
    "Nitrate is very high (80.0 ppm) - Perform water change and check filtration system"
  ],
  "imageAnalysis": {
    "tubesDetected": 4,
    "imageQuality": "good",
    "lightingConditions": "natural",
    "processingNotes": "Dual-image analysis: test tubes compared to API color chart",
    "aiModel": "gpt-4o"
  }
}`
      },
      {
        type: 'image_url',
        image_url: {
          url: testTubesDataUrl
        }
      }
    ];

    // Add color chart if available
    if (colorChart.dataUrl) {
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: colorChart.dataUrl
        }
      });
      console.log('✅ Color chart added to ChatGPT request');
    } else {
      console.log('❌ Color chart not available - using fallback');
    }

    console.log('Final content array for ChatGPT:', {
      textLength: contentArray[0].text.length,
      hasTestTubesImage: contentArray[1]?.type === 'image_url',
      hasColorChart: contentArray[2]?.type === 'image_url',
      totalItems: contentArray.length
    });

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

    console.log('=== CHATGPT RESPONSE DEBUG ===');
    console.log('Raw ChatGPT response length:', analysisText.length);
    console.log('Raw ChatGPT response (first 500 chars):', analysisText.substring(0, 500));
    console.log('Raw ChatGPT response (last 500 chars):', analysisText.substring(Math.max(0, analysisText.length - 500)));
    console.log('=== END CHATGPT RESPONSE DEBUG ===');

    // Parse the JSON response from ChatGPT
    let analysis;
    try {
      // Try to extract JSON from the response (ChatGPT sometimes wraps it in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        console.log('=== PARSED JSON DEBUG ===');
        console.log('Parsed JSON analysis:', JSON.stringify(analysis, null, 2));
        console.log('=== END PARSED JSON DEBUG ===');
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing ChatGPT response:', parseError);
      console.error('Raw response that failed to parse:', analysisText);
      throw new Error(`Failed to parse ChatGPT analysis: ${parseError.message}`);
    }

    // Check if the response has the expected structure
    console.log('=== STRUCTURE ANALYSIS DEBUG ===');
    console.log('Analysis structure check:', {
      hasSuccess: 'success' in analysis,
      hasParameters: 'parameters' in analysis,
      hasDirectParams: ['pH', 'ammonia', 'nitrite', 'nitrate'].some(p => p in analysis),
      topLevelKeys: Object.keys(analysis),
      parametersKeys: analysis.parameters ? Object.keys(analysis.parameters) : 'NO PARAMETERS'
    });
    console.log('=== END STRUCTURE ANALYSIS DEBUG ===');

    // Handle different response formats from ChatGPT
    let parameters;
    if (analysis.parameters && typeof analysis.parameters === 'object') {
      // Format: { success: true, parameters: { pH: {...}, ammonia: {...} } }
      parameters = analysis.parameters;
      console.log('✅ Using parameters from analysis.parameters');
    } else if (['pH', 'ammonia', 'nitrite', 'nitrate'].some(p => p in analysis)) {
      // Format: { pH: {...}, ammonia: {...}, nitrite: {...}, nitrate: {...} }
      parameters = analysis;
      console.log('✅ Using direct parameters from analysis root');
    } else {
      console.error('❌ Unexpected analysis structure:', JSON.stringify(analysis, null, 2));
      throw new Error('Analysis response does not contain expected parameter structure');
    }

    // Validate the parameters structure
    const requiredParams = ['pH', 'ammonia', 'nitrite', 'nitrate'];
    console.log('=== PARAMETER VALIDATION DEBUG ===');
    for (const param of requiredParams) {
      console.log(`Checking ${param}:`, {
        exists: !!parameters[param],
        type: typeof parameters[param],
        isObject: typeof parameters[param] === 'object',
        hasValue: parameters[param] ? 'value' in parameters[param] : false,
        value: parameters[param]?.value,
        fullParam: parameters[param]
      });
      
      if (!parameters[param] || typeof parameters[param] !== 'object') {
        console.error(`❌ Missing or invalid ${param} parameter:`, parameters[param]);
        throw new Error(`Missing or invalid ${param} parameter in analysis`);
      }
      if (typeof parameters[param].value === 'undefined') {
        console.error(`❌ Missing value for ${param} parameter:`, parameters[param]);
        throw new Error(`Missing value for ${param} parameter`);
      }
    }
    console.log('=== END PARAMETER VALIDATION DEBUG ===');

    // Create the final result structure
    const result = {
      success: true,
      confidence: analysis.confidence || 0.9,
      parameters: parameters,
      recommendations: analysis.recommendations || [],
      imageAnalysis: {
        tubesDetected: analysis.imageAnalysis?.tubesDetected || 4,
        imageQuality: analysis.imageAnalysis?.imageQuality || 'good',
        lightingConditions: analysis.imageAnalysis?.lightingConditions || 'natural',
        processingNotes: analysis.imageAnalysis?.processingNotes || 'Expert AI analysis using ChatGPT with API Freshwater Master Test Kit knowledge',
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


