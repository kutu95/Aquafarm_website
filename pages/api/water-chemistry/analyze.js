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

    // Phase 2: Real AI Analysis using Google Cloud Vision
    let analysisResults;
    
    // Debug: Check if API key is available
    console.log('Environment check:', {
      hasApiKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      apiKeyLength: process.env.GOOGLE_CLOUD_VISION_API_KEY ? process.env.GOOGLE_CLOUD_VISION_API_KEY.length : 0,
      apiKeyPreview: process.env.GOOGLE_CLOUD_VISION_API_KEY ? process.env.GOOGLE_CLOUD_VISION_API_KEY.substring(0, 10) + '...' : 'none'
    });
    
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      console.log('Using Google Cloud Vision API for real AI analysis');
      // Use real Google Cloud Vision API
      analysisResults = await analyzeWithGoogleVision(imageData);
    } else {
      console.log('No Google Cloud Vision API key found, using enhanced simulation');
      // Fallback to enhanced simulation for development
      analysisResults = await enhancedSimulation(imageData);
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

    return res.status(200).json(analysisResults);

  } catch (error) {
    console.error('Error analyzing water chemistry:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function analyzeWithGoogleVision(imageData) {
  try {
    console.log('Starting Google Cloud Vision analysis...');
    
    // Convert base64 to buffer for Google Cloud Vision
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Prepare the request for Google Cloud Vision API
    const visionRequest = {
      requests: [
        {
          image: {
            content: imageBuffer.toString('base64')
          },
          features: [
            {
              type: 'IMAGE_PROPERTIES',
              maxResults: 20  // Get more colors for better analysis
            },
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 20  // Find more objects (test tubes)
            },
            {
              type: 'LABEL_DETECTION',
              maxResults: 15  // Identify what we're looking at
            }
          ]
        }
      ]
    };

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
      throw new Error(`Google Cloud Vision API error: ${response.status}`);
    }

    const visionData = await response.json();
    console.log('Google Cloud Vision response received');

    // Process the AI results
    return processVisionResults(visionData, imageData);
    
  } catch (error) {
    console.error('Google Cloud Vision error:', error);
    // Fallback to enhanced simulation
    return await enhancedSimulation(imageData);
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
    const analysis = analyzeWaterChemistryFromVision(dominantColors, objects, labels);
    
    return {
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
    
  } catch (error) {
    console.error('Error processing vision results:', error);
    throw error;
  }
}

function analyzeWaterChemistryFromVision(dominantColors, objects, labels) {
  // This is where we'll implement the actual chemistry analysis
  // For now, we'll use the vision data to make intelligent estimates
  
  let tubesDetected = 0;
  let imageQuality = 'good';
  let lightingConditions = 'natural';
  let confidence = 0.85;
  
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
  
  tubesDetected = testTubeObjects.length;
  
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
  const parameters = estimateChemistryFromColors(dominantColors, confidence);
  
  return {
    tubesDetected,
    imageQuality,
    lightingConditions,
    confidence,
    parameters
  };
}

function estimateChemistryFromColors(dominantColors, baseConfidence) {
  // Enhanced chemistry estimation based on actual color analysis
  // This uses the real colors detected by Google Vision API
  
  console.log('Estimating chemistry from colors:', dominantColors.length, 'colors detected');
  
  const parameters = {
    pH: { value: 7.0, status: 'good', confidence: baseConfidence * 0.9, color: '#4CAF50', notes: 'Estimated from image analysis' },
    ammonia: { value: 0.0, status: 'good', confidence: baseConfidence * 0.85, color: '#4CAF50', notes: 'Estimated from image analysis' },
    nitrite: { value: 0.0, status: 'good', confidence: baseConfidence * 0.88, color: '#4CAF50', notes: 'Estimated from image analysis' },
    nitrate: { value: 10.0, status: 'good', confidence: baseConfidence * 0.87, color: '#4CAF50', notes: 'Estimated from image analysis' }
  };
  
  // Analyze each dominant color for chemistry clues
  if (dominantColors.length > 0) {
    console.log('Analyzing dominant colors for chemistry...');
    
    // Sort colors by pixel fraction (most prominent first)
    const sortedColors = [...dominantColors].sort((a, b) => b.pixelFraction - a.pixelFraction);
    
    // Analyze the most prominent colors
    for (let i = 0; i < Math.min(sortedColors.length, 5); i++) {
      const color = sortedColors[i];
      const rgb = color.color;
      const red = rgb.red;
      const green = rgb.green;
      const blue = rgb.blue;
      
      console.log(`Color ${i + 1}: RGB(${red}, ${green}, ${blue}) - Score: ${color.score}, Pixels: ${color.pixelFraction}`);
      
      // pH estimation based on color analysis
      if (i === 0) { // Most prominent color
        if (red > green + 50 && red > blue + 50) {
          // Red dominant - likely acidic
          parameters.pH.value = 6.2;
          parameters.pH.status = 'warning';
          parameters.pH.notes = 'Acidic pH detected from dominant red color';
          parameters.pH.color = '#FF5722';
        } else if (blue > red + 50 && blue > green + 50) {
          // Blue dominant - likely alkaline
          parameters.pH.value = 8.1;
          parameters.pH.status = 'warning';
          parameters.pH.notes = 'Alkaline pH detected from dominant blue color';
          parameters.pH.color = '#2196F3';
        } else if (green > red + 30 && green > blue + 30) {
          // Green dominant - likely neutral
          parameters.pH.value = 7.0;
          parameters.pH.notes = 'Neutral pH detected from dominant green color';
        }
      }
      
      // Ammonia detection (yellow/green colors often indicate ammonia)
      if (green > red && green > blue && green > 150) {
        if (red > 100 && red < 200) { // Yellow-green range
          parameters.ammonia.value = 0.5;
          parameters.ammonia.status = 'warning';
          parameters.ammonia.notes = 'Potential ammonia detected from yellow-green color';
          parameters.ammonia.color = '#FF9800';
        }
      }
      
      // Nitrite detection (pink/red colors often indicate nitrite)
      if (red > green + 50 && red > blue + 50 && red > 180) {
        if (blue > 100 && blue < 180) { // Pink range
          parameters.nitrite.value = 0.25;
          parameters.nitrite.status = 'warning';
          parameters.nitrite.notes = 'Potential nitrite detected from pink color';
          parameters.nitrite.color = '#E91E63';
        }
      }
      
      // Nitrate detection (orange/red colors often indicate nitrate)
      if (red > 200 && green > 100 && green < 180 && blue < 100) {
        parameters.nitrate.value = 20.0;
        parameters.nitrate.status = 'warning';
        parameters.nitrate.notes = 'Elevated nitrate detected from orange color';
        parameters.nitrate.color = '#FF9800';
      }
    }
    
    // Adjust confidence based on color analysis quality
    if (dominantColors.length >= 3) {
      parameters.pH.confidence *= 1.1;
      parameters.ammonia.confidence *= 1.1;
      parameters.nitrite.confidence *= 1.1;
      parameters.nitrate.confidence *= 1.1;
    }
  } else {
    console.log('No dominant colors detected - using default values');
    // Reduce confidence when no colors are detected
    parameters.pH.confidence *= 0.7;
    parameters.ammonia.confidence *= 0.7;
    parameters.nitrite.confidence *= 0.7;
    parameters.nitrate.confidence *= 0.7;
  }
  
  return parameters;
}

async function enhancedSimulation(imageData) {
  // Enhanced simulation that mimics real AI analysis
  console.log('Using enhanced simulation (Google Cloud Vision not configured)');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate AI analysis results with more realistic data
  const analysisResults = {
    success: true,
    confidence: 0.85,
    parameters: {
      pH: {
        value: 7.2,
        status: 'good',
        confidence: 0.88,
        color: '#4CAF50',
        notes: 'Simulated AI analysis - configure Google Cloud Vision for real results'
      },
      ammonia: {
        value: 0.1,
        status: 'warning',
        confidence: 0.82,
        color: '#FF9800',
        notes: 'Simulated AI analysis - configure Google Cloud Vision for real results'
      },
      nitrite: {
        value: 0.0,
        status: 'good',
        confidence: 0.95,
        color: '#4CAF50',
        notes: 'Simulated AI analysis - configure Google Cloud Vision for real results'
      },
      nitrate: {
        value: 15.0,
        status: 'good',
        confidence: 0.87,
        color: '#4CAF50',
        notes: 'Simulated AI analysis - configure Google Cloud Vision for real results'
      }
    },
    imageAnalysis: {
      tubesDetected: 4,
      imageQuality: 'good',
      lightingConditions: 'natural',
      processingNotes: 'Enhanced simulation - configure Google Cloud Vision API key for real AI analysis'
    }
  };

  return analysisResults;
}
