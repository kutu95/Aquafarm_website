import React, { useState, useRef, useContext, useEffect } from 'react';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';

export default function WaterChemistry() {
  const { user, role, loading } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState('checking'); // 'checking', 'chatgpt', 'google', 'error'
  const fileInputRef = useRef(null);

  // Check AI status when component mounts
  useEffect(() => {
    if (user) {
      checkAiStatus();
    }
  }, [user]);

  // Reference ranges for water chemistry tests
  const referenceRanges = {
    pH: { min: 6.5, max: 8.5, unit: '', description: 'Slightly acidic to slightly alkaline' },
    ammonia: { min: 0, max: 0.25, unit: 'ppm', description: 'Should be 0 for healthy water' },
    nitrite: { min: 0, max: 0.5, unit: 'ppm', description: 'Should be 0 for healthy water' },
    nitrate: { min: 0, max: 40, unit: 'ppm', description: 'Low levels are acceptable' }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file size must be less than 10MB');
        return;
      }

      setSelectedImage(file);
      setError(null);
      setResults(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const analyzeWaterChemistry = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      // Compress and resize the image before sending
      const compressedImage = await compressImage(selectedImage);
      
      // Convert compressed image to base64 for API
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        const response = await fetch('/api/water-chemistry/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            imageData: base64Data,
            filename: selectedImage.name
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          console.error('Response headers:', response.headers);
          throw new Error(`Analysis failed: ${response.status}`);
        }

        const analysisResults = await response.json();
        
        if (analysisResults.success) {
          // Transform the API results to match our display format
          const transformedResults = {
            pH: analysisResults.parameters.pH,
            ammonia: analysisResults.parameters.ammonia,
            nitrite: analysisResults.parameters.nitrite,
            nitrate: analysisResults.parameters.nitrate
          };
          setResults(transformedResults);
        } else {
          throw new Error('Analysis failed');
        }
      };
      
      reader.readAsDataURL(compressedImage);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError(`Failed to analyze image: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800x600)
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          0.7 // 70% quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'danger': return '🚨';
      default: return '❓';
    }
  };

  const checkAiStatus = async () => {
    try {
      // Make a test call to the API to see if real AI is available
      const response = await fetch('/api/water-chemistry/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          filename: 'status-check.png'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Status check response:', data);
        console.log('Response structure:', {
          hasProcessingNotes: !!data.processingNotes,
          processingNotesValue: data.processingNotes,
          hasImageAnalysis: !!data.imageAnalysis,
          hasAvailableServices: !!data.availableServices
        });
        
        // Check if this is a status check response
        if (data.processingNotes) {
          console.log('Processing notes found:', data.processingNotes);
          if (data.processingNotes.includes('ChatGPT')) {
            console.log('Setting status to chatgpt');
            setAiStatus('chatgpt');
          } else if (data.processingNotes.includes('Google Vision')) {
            console.log('Setting status to google');
            setAiStatus('google');
          } else {
            console.log('Setting status to error - unknown processing notes');
            setAiStatus('error');
          }
        }
        // Check if the response indicates real AI analysis (for actual image uploads)
        else if (data.imageAnalysis?.processingNotes?.includes('ChatGPT') || data.imageAnalysis?.aiModel === 'gpt-4o') {
          console.log('Setting status to chatgpt from image analysis');
          setAiStatus('chatgpt');
        } else if (data.imageAnalysis?.processingNotes?.includes('Google Cloud Vision')) {
          console.log('Setting status to google from image analysis');
          setAiStatus('google');
        } else {
          console.log('Setting status to error - no matching AI service found');
          setAiStatus('error');
        }
      } else {
        console.log('Response not ok, setting status to error');
        setAiStatus('error');
      }
    } catch (error) {
      console.log('Error checking AI status:', error);
      setAiStatus('error');
    }
  };

  const getRecommendations = (results) => {
    const recommendations = [];
    
    if (results.pH.status === 'warning') {
      if (results.pH.value < 6.5) {
        recommendations.push('pH is low. Consider adding crushed coral or limestone to raise pH gradually.');
      } else if (results.pH.value > 8.5) {
        recommendations.push('pH is high. Consider adding driftwood or peat moss to lower pH gradually.');
      }
    }
    
    if (results.ammonia.status === 'warning' || results.ammonia.status === 'danger') {
      recommendations.push('Ammonia detected! Perform immediate water change and check for overfeeding or dead fish.');
    }
    
    if (results.nitrite.status === 'warning' || results.nitrite.status === 'danger') {
      recommendations.push('Nitrite detected! Your tank may not be fully cycled. Perform water changes and add beneficial bacteria.');
    }
    
    if (results.nitrate.status === 'warning' || results.nitrate.status === 'danger') {
      recommendations.push('Nitrate levels are high. Perform water change and check your filtration system.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your water parameters look good! Continue with regular maintenance.');
    }
    
    return recommendations;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">Please log in to access the water chemistry analyzer.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 Water Chemistry Analyzer
            </h1>
            <p className="text-lg text-gray-600">
              Upload a photo of your water test kit to get instant analysis and recommendations
            </p>
          </div>

          {/* Image Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Test Kit Image</h2>
            
            <div className="space-y-4">
              {/* Upload Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">📸 How to take the perfect photo:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ensure all 4 test tubes are clearly visible (pH, Ammonia, Nitrite, Nitrate)</li>
                  <li>• Take photo in good, natural lighting (avoid fluorescent lights)</li>
                  <li>• Place test tubes on a white background for best color accuracy</li>
                  <li>• Wait the full time specified in your test kit instructions</li>
                </ul>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {!imagePreview ? (
                  <div>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        Click to upload
                      </button>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                ) : (
                  <div>
                    <img src={imagePreview} alt="Test kit preview" className="mx-auto max-h-64 rounded-lg" />
                    <div className="mt-4 space-x-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                          setResults(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Analyze Button */}
              {selectedImage && (
                <div className="text-center">
                  <button
                    onClick={analyzeWaterChemistry}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      '🔬 Analyze Water Chemistry'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Analysis Results</h2>
              
              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Object.entries(results).map(([parameter, data]) => (
                  <div key={parameter} className="border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {parameter.toUpperCase()}
                    </div>
                    <div className={`text-3xl font-bold mb-2 ${getStatusColor(data.status).split(' ')[0]}`}>
                      {data.value}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {referenceRanges[parameter].unit}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                      {getStatusIcon(data.status)} {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(data.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Reference Ranges */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">📋 Reference Ranges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {Object.entries(referenceRanges).map(([parameter, range]) => (
                    <div key={parameter} className="flex justify-between">
                      <span className="font-medium">{parameter.toUpperCase()}:</span>
                      <span className="text-gray-600">
                        {range.min} - {range.max} {range.unit} ({range.description})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">💡 Recommendations</h3>
                <ul className="space-y-2">
                  {getRecommendations(results).map((recommendation, index) => (
                    <li key={index} className="text-blue-800 text-sm flex items-start">
                      <span className="mr-2">•</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 text-xs text-gray-500 text-center">
                <p>
                  ⚠️ This analysis is for informational purposes only. Always verify results with your test kit instructions and consult with aquarium professionals for critical decisions.
                </p>
              </div>
            </div>
          )}

          {/* AI Status & Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🤖 AI Analysis Status</h2>
            
            <div className="space-y-4">
              {/* Current Status */}
              <div className={`border rounded-lg p-4 ${
                aiStatus === 'chatgpt' ? 'bg-purple-50 border-purple-200' :
                aiStatus === 'google' ? 'bg-green-50 border-green-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center">
                  <span className="mr-2">{
                    aiStatus === 'chatgpt' ? '🧠' :
                    aiStatus === 'google' ? '🤖' :
                    '🔍'
                  }</span>
                  <span className={`font-medium ${
                    aiStatus === 'chatgpt' ? 'text-purple-900' :
                    aiStatus === 'google' ? 'text-green-900' :
                    'text-blue-900'
                  }`}>
                    Current Mode: {
                      aiStatus === 'chatgpt' ? 'Expert AI Analysis (ChatGPT)' :
                      aiStatus === 'google' ? 'Basic AI Analysis (Google Vision)' :
                      'AI Analysis'
                    }
                  </span>
                </div>
                <p className={`text-sm mt-2 ${
                  aiStatus === 'chatgpt' ? 'text-purple-800' :
                  aiStatus === 'google' ? 'text-green-800' :
                  'text-blue-800'
                }`}>
                  {aiStatus === 'chatgpt' 
                    ? 'The system is using expert AI analysis with ChatGPT for superior accuracy! 🧠✨'
                    : aiStatus === 'google'
                    ? 'The system is using basic AI analysis with Google Cloud Vision.'
                    : 'The system encountered an error with AI services. Please check your configuration.'
                  }
                </p>
              </div>

              {/* Setup Instructions */}
              {aiStatus === 'error' ? (
                <div className="bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">🚀 Enable AI Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ChatGPT Option */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <h4 className="font-medium text-purple-800 mb-2">🧠 Expert Mode (Recommended)</h4>
                      <ol className="text-sm text-purple-700 space-y-1">
                        <li>1. Get OpenAI API key from <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                        <li>2. Add <code className="bg-purple-100 px-1 rounded">OPEN_AI_KEY=your_key</code> to <code className="bg-purple-100 px-1 rounded">.env.local</code></li>
                        <li>3. Restart the development server</li>
                      </ol>
                      <div className="mt-2">
                        <span className="text-xs text-purple-600">✅ Superior accuracy • 🧠 Context understanding • 🎯 Focus on test tubes</span>
                      </div>
                    </div>
                    
                    {/* Google Vision Option */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-medium text-green-800 mb-2">🤖 Basic Mode</h4>
                      <ol className="text-sm text-green-700 space-y-1">
                        <li>1. Get Google Cloud Vision API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                        <li>2. Add <code className="bg-green-100 px-1 rounded">GOOGLE_CLOUD_VISION_API_KEY=your_key</code> to <code className="bg-green-100 px-1 rounded">.env.local</code></li>
                        <li>3. Restart the development server</li>
                      </ol>
                      <div className="mt-2">
                        <span className="text-xs text-green-600">⚠️ Limited accuracy • 🔍 Basic color analysis • 📊 Background noise issues</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : aiStatus === 'chatgpt' ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">🎉 Expert AI Analysis Active!</h3>
                  <p className="text-sm text-purple-800">
                    Your OpenAI API key is configured and working perfectly! The system is now using ChatGPT for superior water chemistry analysis.
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-2 border border-purple-300 rounded-md text-sm font-medium text-purple-700 bg-purple-100">
                      🧠 ChatGPT Expert Mode Enabled
                    </span>
                  </div>
                </div>
              ) : aiStatus === 'google' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">🤖 Basic AI Analysis Active</h3>
                  <p className="text-sm text-green-800">
                    Your Google Cloud Vision API key is configured and working. Consider upgrading to ChatGPT for superior accuracy.
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-100">
                      🤖 Google Vision Basic Mode
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">⏳ Checking AI Status...</h3>
                  <p className="text-sm text-gray-800">
                    Verifying your AI configuration...
                  </p>
                </div>
              )}

              {/* Error Information - Only show when there's an error */}
              {aiStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ AI Service Issue</h4>
                  <p className="text-sm text-red-800 mb-3">
                    The system is unable to connect to AI services. This could be due to:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Missing or invalid API keys</li>
                    <li>• Network connectivity issues</li>
                    <li>• AI service outages</li>
                    <li>• Configuration errors</li>
                  </ul>
                  <p className="text-sm text-red-800 mt-3">
                    Please check your API configuration and try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
