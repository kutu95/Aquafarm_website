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
      console.log('- GOOGLE_CLOUD_VISION_API_KEY:', process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'SET' : 'NOT SET');
      
      // Return status information without processing
      return res.status(200).json({
        status: 'ready',
        message: 'Water chemistry analyzer is ready',
        availableServices: {
          chatgpt: !!process.env.OPEN_AI_KEY,
          googleVision: !!process.env.GOOGLE_CLOUD_VISION_API_KEY
        },
        processingNotes: process.env.OPEN_AI_KEY ? 'ChatGPT Expert Mode Enabled' : 
                        process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'Google Vision Mode Enabled' : 
                        'No AI Services Available'
      });
    }

    // Phase 2: Real AI Analysis using ChatGPT (primary) or Google Cloud Vision (fallback)
    let analysisResults;
    
    // Debug: Check if API keys are available
    console.log('Environment check:', {
      hasGoogleKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      hasChatGPTKey: !!process.env.OPEN_AI_KEY,
      googleKeyLength: process.env.GOOGLE_CLOUD_VISION_API_KEY ? process.env.GOOGLE_CLOUD_VISION_API_KEY.length : 0,
      chatGPTKeyLength: process.env.OPEN_AI_KEY ? process.env.OPEN_AI_KEY.length : 0
    });
    
    // Additional debugging
    console.log('Raw environment variables:');
    console.log('- GOOGLE_CLOUD_VISION_API_KEY:', process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'SET' : 'NOT SET');
    console.log('- OPEN_AI_KEY:', process.env.OPEN_AI_KEY ? 'SET' : 'NOT SET');
    console.log('- OPEN_AI_KEY first 10 chars:', process.env.OPEN_AI_KEY ? process.env.OPEN_AI_KEY.substring(0, 10) + '...' : 'NOT SET');
    
    // Check user preference and available services
    const hasChatGPT = !!process.env.OPEN_AI_KEY;
    const hasGoogleVision = !!process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    console.log('User preference:', userPrefersChatGPT ? 'ChatGPT' : 'Google Vision');
    console.log('Available services - ChatGPT:', hasChatGPT, 'Google Vision:', hasGoogleVision);
    
    // If user prefers ChatGPT and it's available
    if (userPrefersChatGPT && hasChatGPT) {
      console.log('Using ChatGPT for expert AI analysis (user preference)');
      try {
        analysisResults = await analyzeWithChatGPT(imageData, filename);
      } catch (error) {
        console.error('ChatGPT analysis error:', error);
        if (hasGoogleVision) {
          console.log('ChatGPT failed, falling back to Google Cloud Vision...');
          analysisResults = await analyzeWithGoogleVision(imageData);
        } else {
          throw error; // No fallback available
        }
      }
    } 
    // If user prefers Google Vision and it's available
    else if (!userPrefersChatGPT && hasGoogleVision) {
      console.log('Using Google Cloud Vision API (user preference)');
      analysisResults = await analyzeWithGoogleVision(imageData);
    }
    // If user preference not available, use what's available
    else if (hasChatGPT) {
      console.log('Using ChatGPT (fallback to available service)');
      try {
        analysisResults = await analyzeWithChatGPT(imageData, filename);
      } catch (error) {
        console.error('ChatGPT analysis error:', error);
        if (hasGoogleVision) {
          console.log('ChatGPT failed, falling back to Google Cloud Vision...');
          analysisResults = await analyzeWithGoogleVision(imageData);
        } else {
          throw error;
        }
      }
    } else if (hasGoogleVision) {
      console.log('Using Google Cloud Vision API (fallback to available service)');
      analysisResults = await analyzeWithGoogleVision(imageData);
    } else {
      console.log('No AI API keys found');
      return res.status(503).json({ 
        error: 'No AI services available',
        message: 'Please configure either ChatGPT or Google Cloud Vision API keys',
        details: 'Add OPEN_AI_KEY or GOOGLE_CLOUD_VISION_API_KEY to your environment variables'
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
      isDataUrl: imageData.startsWith('data:image')
    });

    // Prepare the prompt for ChatGPT with both images
    const prompt = `You are an educational assistant helping with aquaponics water quality testing. You will analyze TWO images:

1. A user's test tube image (water chemistry test tubes from an aquaponics system)
2. The official API Freshwater Master Test Kit color chart (with standardized color scales)

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no additional text, no markdown formatting.

Compare the colors in the test tubes to the exact colors on the color chart to determine precise readings.

For each parameter, provide:
- The value/level based on the closest color match to the chart
- The status (good, warning, or danger) based on the color intensity
- Your confidence level (0-1)
- Brief notes about what color you see and how it matches the chart

Focus ONLY on the test tube colors compared to the chart colors. Ignore background elements.

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
  "imageAnalysis": {
    "tubesDetected": 4,
    "imageQuality": "good",
    "lightingConditions": "natural",
    "processingNotes": "Dual-image analysis: test tubes compared to API color chart",
    "aiModel": "gpt-4o"
  }
}`;

    // Prepare content array for ChatGPT
    const contentArray = [
      {
        type: 'text',
        text: prompt
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
    }

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
      console.error('ChatGPT API error:', errorText);
      throw new Error(`ChatGPT API error: ${response.status}`);
    }

    const chatGPTData = await response.json();
    console.log('ChatGPT response received');
    
    // Extract the JSON response from ChatGPT
    const content = chatGPTData.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from ChatGPT');
    }
    
    // Check if ChatGPT is refusing to analyze
    if (content.toLowerCase().includes("i'm sorry") || 
        content.toLowerCase().includes("i can't") || 
        content.toLowerCase().includes("unable to") ||
        content.toLowerCase().includes("cannot assist")) {
      console.log('ChatGPT refused to analyze the image, falling back to Google Vision...');
      return await analyzeWithGoogleVision(imageData);
    }
    
    // Try to parse the JSON response (handle various response formats)
    try {
      let cleanedContent = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        cleanedContent = content.replace(/```\n?/g, '');
      }
      
      // Try to extract JSON from the response if it contains explanatory text
      if (cleanedContent.includes('{') && cleanedContent.includes('}')) {
        const jsonStart = cleanedContent.indexOf('{');
        const jsonEnd = cleanedContent.lastIndexOf('}') + 1;
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd);
      }
      
      // Trim whitespace
      cleanedContent = cleanedContent.trim();
      
      console.log('Cleaned ChatGPT response:', cleanedContent);
      const analysisResults = JSON.parse(cleanedContent);
      console.log('ChatGPT analysis parsed successfully');
      return analysisResults;
    } catch (parseError) {
      console.error('Failed to parse ChatGPT JSON response:', parseError);
      console.log('Raw ChatGPT response:', content);
      
      // Try to extract just the JSON part if the response contains explanatory text
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log('Attempting to parse extracted JSON:', extractedJson);
          const analysisResults = JSON.parse(extractedJson);
          console.log('ChatGPT analysis parsed successfully from extracted JSON');
          return analysisResults;
        }
      } catch (extractError) {
        console.log('JSON extraction also failed:', extractError.message);
      }
      
      // Return error if all parsing attempts fail
      console.log('ChatGPT response parsing failed completely');
      
      // If ChatGPT refuses to analyze, fall back to Google Vision
      console.log('ChatGPT refused analysis, falling back to Google Vision...');
      return await analyzeWithGoogleVision(imageData);
    }
    
  } catch (error) {
    console.error('ChatGPT analysis error:', error);
    // Return error - no fallbacks to simulation
    throw new Error(`ChatGPT analysis failed: ${error.message}`);
  }
}

async function analyzeWithGoogleVision(imageData) {
  try {
    console.log('=== analyzeWithGoogleVision START ===');
    console.log('Starting Google Cloud Vision analysis...');
    
    // The imageData is already a data URL (same format as OpenAI)
    // Extract the base64 part after the comma
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    
    console.log('Processing image for Google Cloud Vision:', {
      originalLength: imageData.length,
      base64Length: base64Data.length,
      hasDataUrlPrefix: imageData.includes('data:image'),
      base64Prefix: base64Data.substring(0, 50) + '...'
    });
    
    // Prepare the request for Google Cloud Vision API
    const visionRequest = {
      requests: [
        {
          image: {
            content: base64Data  // Send the base64 data directly
          },
          features: [
            {
              type: 'IMAGE_PROPERTIES',
              maxResults: 30  // Get more colors for better analysis
            },
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 30  // Find more objects (test tubes, containers)
            },
            {
              type: 'LABEL_DETECTION',
              maxResults: 20  // Identify what we're looking at
            },
            {
              type: 'CROP_HINTS',
              maxResults: 10  // Get suggestions for important areas
            }
          ],
          // Add specific context about API Freshwater Master Test Kit
          imageContext: {
            languageHints: ['en'],
            productSearchParams: {
              productCategories: ['water-testing-kits', 'aquarium-supplies', 'laboratory-equipment'],
              filter: 'API Freshwater Master Test Kit, water chemistry testing, pH ammonia nitrite nitrate'
            }
          }
        }
      ]
    };

    console.log('Sending image to Google Cloud Vision for API Freshwater Master Test Kit analysis:', {
      base64DataLength: base64Data.length,
      requestSize: JSON.stringify(visionRequest).length,
      context: 'API Freshwater Master Test Kit water chemistry analysis'
    });

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Cloud Vision API error:', response.status, errorText);
      throw new Error(`Google Cloud Vision API error: ${response.status} - ${errorText}`);
    }

    const visionData = await response.json();
    console.log('Google Cloud Vision response received');

    // Process the AI results
    console.log('About to call processVisionResults...');
    const result = processVisionResults(visionData, imageData);
    console.log('processVisionResults returned:', result);
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result));
    console.log('=== analyzeWithGoogleVision END ===');
    
    return result;
    
  } catch (error) {
    console.error('Google Cloud Vision error:', error);
    throw new Error(`Google Cloud Vision API failed: ${error.message}`);
  }
}

function processVisionResults(visionData, imageData) {
  try {
    console.log('Processing Google Cloud Vision results...');
    
    // Debug: Log the full response structure
    console.log('Full Vision API response structure:', JSON.stringify(visionData, null, 2));
    
    // Extract image properties (colors, lighting) - FIXED: Get more colors
    const imageProperties = visionData.responses[0]?.imagePropertiesAnnotation;
    const dominantColors = imageProperties?.dominantColors?.colors || [];
    
    // Extract object locations (potential test tubes)
    const objects = visionData.responses[0]?.localizedObjectAnnotations || [];
    
    // Extract labels (what the AI sees in the image)
    const labels = visionData.responses[0]?.labelAnnotations || [];
    
    // Log detailed information for debugging
    console.log('Detailed Vision analysis:');
    console.log('- Dominant colors found:', dominantColors.length);
    if (dominantColors.length > 0) {
      console.log('- Color details:', dominantColors.map((color, i) => ({
        index: i,
        color: color.color,
        score: color.score,
        pixelFraction: color.pixelFraction
      })));
    }
    
    console.log('- Objects detected:', objects.length);
    if (objects.length > 0) {
      console.log('- Object details:', objects.map((obj, i) => ({
        index: i,
        name: obj.name,
        confidence: obj.score,
        boundingPoly: obj.boundingPoly
      })));
    }
    
    console.log('- Labels found:', labels.length);
    if (labels.length > 0) {
      console.log('- Label details:', labels.map((label, i) => ({
        index: i,
        description: label.description,
        confidence: label.score
      })));
    }

    // Analyze the image for test tubes and colors
    console.log('About to call analyzeWaterChemistryFromVision with:', {
      dominantColorsLength: dominantColors.length,
      objectsLength: objects.length,
      labelsLength: labels.length
    });
    
    const analysis = analyzeWaterChemistryFromVision(dominantColors, objects, labels);
    
    console.log('analyzeWaterChemistryFromVision returned:', analysis);
    console.log('Analysis type:', typeof analysis);
    console.log('Analysis is null/undefined:', analysis === null || analysis === undefined);
    
    if (!analysis) {
      throw new Error('analyzeWaterChemistryFromVision returned null or undefined');
    }
    
    console.log('Final analysis result:', JSON.stringify(analysis, null, 2));
    console.log('Analysis object keys:', Object.keys(analysis));
    console.log('Analysis.tubesDetected value:', analysis.tubesDetected);
    console.log('Analysis.tubesDetected type:', typeof analysis.tubesDetected);
    
    // Validate the analysis object structure
    if (typeof analysis.tubesDetected === 'undefined') {
      throw new Error(`tubesDetected is undefined in analysis object. Full analysis: ${JSON.stringify(analysis)}`);
    }
    
    const result = {
      success: true,
      confidence: analysis.confidence,
      parameters: analysis.parameters,
      imageAnalysis: {
        tubesDetected: analysis.tubesDetected,
        imageQuality: analysis.imageQuality,
        lightingConditions: analysis.lightingConditions,
        processingNotes: 'AI-powered analysis using Google Cloud Vision',
        visionData: {
          dominantColors: dominantColors.length,
          objectsDetected: objects.length,
          labelsFound: labels.length,
          // Add detailed color information
          colorDetails: dominantColors.map(color => ({
            rgb: color.color,
            score: color.score,
            pixelFraction: color.pixelFraction
          })),
          objectDetails: objects.map(obj => ({
            name: obj.name,
            confidence: obj.score
          }))
        }
      }
    };
    
    console.log('Final result being returned:', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('Error processing vision results:', error);
    throw error;
  }
}

function analyzeWaterChemistryFromVision(dominantColors, objects, labels) {
  // This is where we'll implement the actual chemistry analysis
  // For now, we'll use the vision data to make intelligent estimates
  
  console.log('=== analyzeWaterChemistryFromVision START ===');
  console.log('Input parameters:', { dominantColors, objects, labels });
  
  let tubesDetected = 0;
  let imageQuality = 'good';
  let lightingConditions = 'natural';
  let confidence = 0.85;
  
  console.log('Initial variable values:', { tubesDetected, imageQuality, lightingConditions, confidence });
  
  console.log('Starting analyzeWaterChemistryFromVision with:', {
    dominantColorsCount: dominantColors.length,
    objectsCount: objects.length,
    labelsCount: labels.length
  });
  
  // Enhanced test tube detection based on object analysis
  const testTubeObjects = objects.filter(obj => {
    const name = obj.name.toLowerCase();
    return name.includes('bottle') || 
           name.includes('tube') ||
           name.includes('container') ||
           name.includes('vial') ||
           name.includes('flask') ||
           name.includes('beaker');
  });
  
  console.log('Test tube objects found:', testTubeObjects);
  
  tubesDetected = testTubeObjects.length;
  
  console.log('tubesDetected after assignment:', tubesDetected);
  
  // Log test tube detection details
  if (testTubeObjects.length > 0) {
    console.log('Test tubes detected:', testTubeObjects.map(obj => ({
      name: obj.name,
      confidence: obj.score,
      boundingBox: obj.boundingPoly
    })));
  } else {
    console.log('No test tubes detected in objects');
  }
  
  // Analyze lighting conditions
  if (dominantColors.length > 0) {
    const avgBrightness = dominantColors.reduce((sum, color) => {
      const rgb = color.color;
      return sum + (rgb.red + rgb.green + rgb.blue) / 3;
    }, 0) / dominantColors.length;
    
    if (avgBrightness < 100) {
      lightingConditions = 'low';
      confidence *= 0.9;
    } else if (avgBrightness > 200) {
      lightingConditions = 'bright';
      confidence *= 0.95;
    }
  }
  
  // Estimate water chemistry parameters based on color analysis
  // This is a simplified version - in production, we'd use more sophisticated algorithms
  console.log('About to call estimateChemistryFromColors...');
  const parameters = estimateChemistryFromColors(dominantColors, confidence);
  console.log('estimateChemistryFromColors returned:', parameters);
  
  console.log('Final parameters object being returned:', JSON.stringify(parameters, null, 2));
  
  // Create the complete result object with all required properties
  const result = {
    tubesDetected: tubesDetected || 0,
    imageQuality: imageQuality || 'good',
    lightingConditions: lightingConditions || 'natural',
    confidence: confidence || 0.85,
    parameters: parameters || {}
  };
  
  console.log('Final result object being returned from analyzeWaterChemistryFromVision:', JSON.stringify(result, null, 2));
  console.log('Result object keys:', Object.keys(result));
  console.log('Result.tubesDetected:', result.tubesDetected);
  console.log('=== analyzeWaterChemistryFromVision END ===');
  
  return result;
}

function estimateChemistryFromColors(dominantColors, baseConfidence) {
  // Analyze actual colors from Google Cloud Vision for API Freshwater Master Test Kit
  console.log('Estimating chemistry from colors for API Freshwater Master Test Kit:', dominantColors.length, 'colors detected');
  
  if (dominantColors.length === 0) {
    console.log('No colors detected - cannot estimate chemistry');
    return {
      pH: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No color data available from API Freshwater Master Test Kit' },
      ammonia: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No color data available from API Freshwater Master Test Kit' },
      nitrite: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No color data available from API Freshwater Master Test Kit' },
      nitrate: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No color data available from API Freshwater Master Test Kit' }
    };
  }
  
  console.log('Analyzing dominant colors for API Freshwater Master Test Kit chemistry...');
  
  // Log all detected colors for debugging
  console.log('All detected colors:', dominantColors.map((color, i) => ({
    index: i,
    rgb: color.color,
    score: color.score,
    pixelFraction: color.pixelFraction
  })));
  
  // Filter out likely background/container colors and focus on test tube colors
  const relevantColors = dominantColors.filter(color => {
    const rgb = color.color;
    const red = rgb.red;
    const green = rgb.green;
    const blue = rgb.blue;
    
    // Skip very light/white colors (likely background)
    if (red > 220 && green > 220 && blue > 220) return false;
    
    // Skip very dark colors (likely shadows/edges)
    if (red < 40 && green < 40 && blue < 40) return false;
    
    // Skip beige/brown colors (likely test tube holders)
    if (Math.abs(red - green) < 25 && Math.abs(green - blue) < 25 && red > 150) return false;
    
    // Keep colors that could represent water chemistry test results
    return true;
  });
  
  console.log(`Filtered to ${relevantColors.length} relevant colors out of ${dominantColors.length} total`);
  
  if (relevantColors.length === 0) {
    console.log('No relevant colors found after filtering');
    return {
      pH: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No relevant colors detected for API Freshwater Master Test Kit analysis' },
      ammonia: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No relevant colors detected for API Freshwater Master Test Kit analysis' },
      nitrite: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No relevant colors detected for API Freshwater Master Test Kit analysis' },
      nitrate: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'No relevant colors detected for API Freshwater Master Test Kit analysis' }
    };
  }
  
  // Log the relevant colors being analyzed
  console.log('Relevant colors being analyzed for API Freshwater Master Test Kit:', relevantColors.map(color => ({
    rgb: color.color,
    score: color.score,
    pixelFraction: color.pixelFraction
  })));
  
  // Initialize parameters for API Freshwater Master Test Kit analysis
  const parameters = {
    pH: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'Color analysis for API Freshwater Master Test Kit in progress' },
    ammonia: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'Color analysis for API Freshwater Master Test Kit in progress' },
    nitrite: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'Color analysis for API Freshwater Master Test Kit in progress' },
    nitrate: { value: null, status: 'unknown', confidence: 0, color: '#999999', notes: 'Color analysis for API Freshwater Master Test Kit in progress' }
  };
  
  // Analyze colors in the context of API Freshwater Master Test Kit
  if (relevantColors.length > 0) {
    const primaryColor = relevantColors[0]; // Most dominant relevant color
    const rgb = primaryColor.color;
    const red = rgb.red;
    const green = rgb.green;
    const blue = rgb.blue;
    
    console.log('Analyzing primary color for API Freshwater Master Test Kit:', { red, green, blue, score: primaryColor.score });
    
    // Note: We're not making assumptions about specific color values
    // Instead, we're providing the raw color data and asking Google Vision
    // to analyze it in the context of the API Freshwater Master Test Kit
    
    // For now, provide the detected color information and let the user interpret
    // This is more honest than guessing based on made-up patterns
    
    parameters.pH.value = 'Color detected';
    parameters.pH.status = 'unknown';
    parameters.pH.confidence = baseConfidence * 0.5;
    parameters.pH.color = `rgb(${red}, ${green}, ${blue})`;
    parameters.pH.notes = `Detected color: RGB(${red}, ${green}, ${blue}). Please compare with your API Freshwater Master Test Kit color chart for accurate pH reading.`;
    
    parameters.ammonia.value = 'Color detected';
    parameters.ammonia.status = 'unknown';
    parameters.ammonia.confidence = baseConfidence * 0.5;
    parameters.ammonia.color = `rgb(${red}, ${green}, ${blue})`;
    parameters.ammonia.notes = `Detected color: RGB(${red}, ${green}, ${blue}). Please compare with your API Freshwater Master Test Kit color chart for accurate ammonia reading.`;
    
    parameters.nitrite.value = 'Color detected';
    parameters.nitrite.status = 'unknown';
    parameters.nitrite.confidence = baseConfidence * 0.5;
    parameters.nitrite.color = `rgb(${red}, ${green}, ${blue})`;
    parameters.nitrite.notes = `Detected color: RGB(${red}, ${green}, ${blue}). Please compare with your API Freshwater Master Test Kit color chart for accurate nitrite reading.`;
    
    parameters.nitrate.value = 'Color detected';
    parameters.nitrate.status = 'unknown';
    parameters.nitrate.confidence = baseConfidence * 0.5;
    parameters.nitrate.color = `rgb(${red}, ${green}, ${blue})`;
    parameters.nitrate.notes = `Detected color: RGB(${red}, ${green}, ${blue}). Please compare with your API Freshwater Master Test Kit color chart for accurate nitrate reading.`;
    
    // If we have multiple relevant colors, analyze them for additional insights
    if (relevantColors.length > 1) {
      const secondaryColor = relevantColors[1];
      console.log('Analyzing secondary color for API Freshwater Master Test Kit:', secondaryColor.color);
      
      // Additional analysis based on secondary colors
      // This could help identify multiple test tubes or confirm readings
    }
  }
  
  console.log('API Freshwater Master Test Kit color analysis completed');
  console.log('Final parameters object being returned:', JSON.stringify(parameters, null, 2));
  
  return parameters;
}


