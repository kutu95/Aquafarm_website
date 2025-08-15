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
  const [useChatGPT, setUseChatGPT] = useState(true); // Toggle for AI service choice
  const [aiStatus, setAiStatus] = useState('checking'); // 'checking', 'chatgpt', 'google', 'error'
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  
  const fileInputRef = useRef(null);
  const imageRef = useRef();
  const canvasRef = useRef();

  // Check AI status when component mounts
  useEffect(() => {
    checkAiStatus();
  }, []);

  // Ensure crop area is always visible when cropper is shown
  useEffect(() => {
    if (showCropper && imageRef.current) {
      // If crop area is not visible, set a default one
      if (cropArea.width === 0 || cropArea.height === 0) {
        console.log('Setting fallback crop area');
        setCropArea({
          x: 50,
          y: 50,
          width: 200,
          height: 200
        });
      }
      
      // Ensure crop area is within image bounds (using display dimensions)
      const img = imageRef.current;
      if (img && img.width > 0 && img.height > 0) {
        const maxX = img.width - cropArea.width;
        const maxY = img.height - cropArea.height;
        
        if (cropArea.x < 0 || cropArea.x > maxX || cropArea.y < 0 || cropArea.y > maxY) {
          console.log('Crop area out of bounds, adjusting...');
          setCropArea(prev => ({
            x: Math.max(0, Math.min(prev.x, maxX)),
            y: Math.max(0, Math.min(prev.y, maxY)),
            width: prev.width,
            height: prev.height
          }));
        }
      }
    }
  }, [showCropper, cropArea.width, cropArea.height, cropArea.x, cropArea.y]);

  // Cropping functions
  const handleImageSelect = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(file);
      setImagePreview(e.target.result);
      setShowCropper(true);
      
      // Wait for image to load before setting crop area
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded:', { 
          naturalWidth: img.naturalWidth, 
          naturalHeight: img.naturalHeight,
          displayWidth: img.width,
          displayHeight: img.height
        });
        
        // Set initial crop area to center of displayed image (not natural size)
        const centerX = Math.max(0, (img.width - 200) / 2);
        const centerY = Math.max(0, (img.height - 200) / 2);
        const initialWidth = Math.min(200, img.width);
        const initialHeight = Math.min(200, img.height);
        
        console.log('Setting initial crop area:', { centerX, centerY, initialWidth, initialHeight });
        
        setCropArea({
          x: centerX,
          y: centerY,
          width: initialWidth,
          height: initialHeight
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const startCrop = () => {
    setShowCropper(false);
    cropImage();
  };

  const handleMouseDown = (e) => {
    console.log('Mouse down event captured:', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      target: e.target,
      currentTarget: e.currentTarget
    });
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) {
      console.log('No image ref, returning');
      return;
    }
    
    // Get the image's actual position and size
    const rect = imageRef.current.getBoundingClientRect();
    
    // Calculate coordinates relative to the displayed image
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Mouse down coordinates:', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      relativeX: x, 
      relativeY: y,
      cropArea
    });
    
    // Check if clicking on resize handles
    const handleSize = 20;
    
    // Bottom-right handle
    const bottomRightX = cropArea.x + cropArea.width;
    const bottomRightY = cropArea.y + cropArea.height;
    const inBottomRight = x >= bottomRightX - handleSize && x <= bottomRightX + handleSize && 
                         y >= bottomRightY - handleSize && y <= bottomRightY + handleSize;
    
    // Top-left handle  
    const topLeftX = cropArea.x;
    const topLeftY = cropArea.y;
    const inTopLeft = x >= topLeftX - handleSize && x <= topLeftX + handleSize && 
                     y >= topLeftY - handleSize && y <= topLeftY + handleSize;
    
    console.log('Handle detection:', {
      handleSize,
      bottomRightX,
      bottomRightY,
      inBottomRight,
      topLeftX,
      topLeftY,
      inTopLeft,
      cropArea
    });
    
    if (inBottomRight) {
      console.log('Bottom-right resize handle clicked!');
      setIsResizing(true);
      setResizeHandle('bottom-right');
      setDragStart({ x: x - cropArea.width, y: y - cropArea.height });
      console.log('Set resizing state to true, handle to bottom-right');
    } else if (inTopLeft) {
      console.log('Top-left resize handle clicked!');
      setIsResizing(true);
      setResizeHandle('top-left');
      setDragStart({ x, y });
      console.log('Set resizing state to true, handle to top-left');
    } else if (x >= cropArea.x && x <= cropArea.x + cropArea.width && 
               y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      console.log('Inside crop area - starting drag');
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
      console.log('Set dragging state to true');
    } else {
      console.log('Outside crop area - no action');
    }
  };

  const handleMouseMove = (e) => {
    // Only log occasionally to avoid performance issues
    if (Math.random() < 0.1) { // Log only 10% of mouse moves
      console.log('Mouse move event captured:', { 
        clientX: e.clientX, 
        clientY: e.clientY,
        isDragging, 
        isResizing, 
        resizeHandle 
      });
    }
    
    if (!isDragging && !isResizing) {
      return; // Early return if no action needed
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) return;
    
    // Get the image's actual position and size
    const rect = imageRef.current.getBoundingClientRect();
    
    // Calculate coordinates relative to the displayed image
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      const newX = Math.max(0, Math.min(x - dragStart.x, imageRef.current.width - cropArea.width));
      const newY = Math.max(0, Math.min(y - dragStart.y, imageRef.current.height - cropArea.height));
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      if (resizeHandle === 'bottom-right') {
        // Simple, direct calculation for bottom-right resize
        const newWidth = Math.max(50, x - cropArea.x);
        const newHeight = Math.max(50, y - cropArea.y);
        setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
      } else if (resizeHandle === 'top-left') {
        // Simple, direct calculation for top-left resize
        const newX = Math.max(0, Math.min(x, cropArea.x + cropArea.width - 50));
        const newY = Math.max(0, Math.min(y, cropArea.y + cropArea.height - 50));
        const newWidth = cropArea.x + cropArea.width - newX;
        const newHeight = cropArea.y + cropArea.height - newY;
        setCropArea(prev => ({ x: newX, y: newY, width: newWidth, height: newHeight }));
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      console.log('Mouse up - final crop area:', cropArea);
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const cropImage = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Set canvas size to crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    
    // Draw cropped portion
    ctx.drawImage(
      img,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
    
    // Convert to base64
    const croppedImageData = canvas.toDataURL('image/png');
    setImagePreview(croppedImageData);
    
    // Convert base64 to file for upload
    const base64Response = fetch(croppedImageData);
    base64Response.then(res => res.blob()).then(blob => {
      const croppedFile = new File([blob], selectedImage.name.replace(/\.[^/.]+$/, '_cropped.png'), { type: 'image/png' });
      setSelectedImage(croppedFile);
    });
  };

  // Reference ranges for water chemistry tests
  const referenceRanges = {
    pH: { min: 6.5, max: 8.5, unit: '', description: 'Slightly acidic to slightly alkaline' },
    ammonia: { min: 0, max: 0.25, unit: 'ppm', description: 'Should be 0 for healthy water' },
    nitrite: { min: 0, max: 0.5, unit: 'ppm', description: 'Should be 0 for healthy water' },
    nitrate: { min: 0, max: 40, unit: 'ppm', description: 'Low levels are acceptable' }
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
            filename: selectedImage.name,
            useChatGPT: useChatGPT
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

              {/* AI Service Selection */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  🤖 Choose AI Analysis Service
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="aiService"
                      value="chatgpt"
                      checked={useChatGPT}
                      onChange={() => setUseChatGPT(true)}
                      className="mr-2 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ChatGPT + Color Chart (Recommended)
                    </span>
                    <span className="ml-2 text-xs text-blue-600">
                      Uses embedded API color chart for accuracy
                    </span>
                  </label>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="aiService"
                      value="google"
                      checked={!useChatGPT}
                      onChange={() => setUseChatGPT(false)}
                      className="mr-2 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Google Cloud Vision
                    </span>
                    <span className="ml-2 text-xs text-gray-600">
                      Traditional computer vision analysis
                    </span>
                  </label>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e.target.files[0])}
                  className="hidden"
                />
                
                {!imagePreview ? (
                  <>
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Upload Water Chemistry Test Image
                    </p>
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
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Tip: Crop your image to focus only on the test tubes for better accuracy and lower costs
                    </p>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      {showCropper ? (
                        <div className="relative">
                          <img
                            ref={imageRef}
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full max-h-96 object-contain select-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onClick={() => console.log('Image clicked at:', { x: cropArea.x, y: cropArea.y })}
                            draggable={false}
                          />
                          {/* Crop overlay */}
                          <div
                            className={`absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 ${
                              isDragging ? 'cursor-grabbing' : 'cursor-grab'
                            }`}
                            style={{
                              left: cropArea.x,
                              top: cropArea.y,
                              width: cropArea.width,
                              height: cropArea.height,
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Top-left resize handle */}
                            <div
                              className={`absolute w-6 h-6 bg-blue-600 border-2 border-white rounded-full transition-all duration-150 cursor-nw-resize ${
                                isResizing && resizeHandle === 'top-left' 
                                  ? 'scale-125 bg-blue-700 shadow-lg' 
                                  : 'hover:scale-110 hover:bg-blue-700'
                              }`}
                              style={{
                                left: '-12px',
                                top: '-12px',
                                pointerEvents: 'auto',
                                zIndex: 10
                              }}
                              onMouseDown={(e) => {
                                console.log('Top-left handle clicked directly!');
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Get current crop area values
                                const currentCropArea = { ...cropArea };
                                
                                const handleMouseMove = (moveEvent) => {
                                  const rect = imageRef.current.getBoundingClientRect();
                                  const x = moveEvent.clientX - rect.left;
                                  const y = moveEvent.clientY - rect.top;
                                  
                                  const newX = Math.max(0, Math.min(x, currentCropArea.x + currentCropArea.width - 50));
                                  const newY = Math.max(0, Math.min(y, currentCropArea.y + currentCropArea.height - 50));
                                  const newWidth = currentCropArea.x + currentCropArea.width - newX;
                                  const newHeight = currentCropArea.y + currentCropArea.height - newY;
                                  
                                  setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
                                };
                                
                                const handleMouseUp = () => {
                                  setIsResizing(false);
                                  setResizeHandle(null);
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                setIsResizing(true);
                                setResizeHandle('top-left');
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                            {/* Bottom-right resize handle */}
                            <div
                              className={`absolute w-6 h-6 bg-blue-600 border-2 border-white rounded-full transition-all duration-150 cursor-se-resize ${
                                isResizing && resizeHandle === 'bottom-right' 
                                  ? 'scale-125 bg-blue-700 shadow-lg' 
                                  : 'hover:scale-110 hover:bg-blue-700'
                              }`}
                              style={{
                                right: '-12px',
                                bottom: '-12px',
                                pointerEvents: 'auto',
                                zIndex: 10
                              }}
                              onMouseDown={(e) => {
                                console.log('Bottom-right handle clicked directly!');
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Get current crop area values
                                const currentCropArea = { ...cropArea };
                                
                                const handleMouseMove = (moveEvent) => {
                                  const rect = imageRef.current.getBoundingClientRect();
                                  const x = moveEvent.clientX - rect.left;
                                  const y = moveEvent.clientY - rect.top;
                                  
                                  const newWidth = Math.max(50, x - currentCropArea.x);
                                  const newHeight = Math.max(50, y - currentCropArea.y);
                                  
                                  setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
                                };
                                
                                const handleMouseUp = () => {
                                  setIsResizing(false);
                                  setResizeHandle(null);
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                setIsResizing(true);
                                setResizeHandle('bottom-right');
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                            {/* Center drag indicator */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
                            </div>
                          </div>
                          {/* Instructions */}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
                            <div className="font-medium mb-1">How to crop:</div>
                            <div>• Drag the blue box to move</div>
                            <div>• Drag corners to resize</div>
                            <div>• Click "Crop & Analyze" when ready</div>
                            {isResizing && (
                              <div className="mt-2 text-yellow-300 font-medium">
                                ✨ Resizing from {resizeHandle} corner
                              </div>
                            )}
                            {isDragging && (
                              <div className="mt-2 text-yellow-300 font-medium">
                                ✨ Dragging crop area
                              </div>
                            )}
                            <div className="mt-2 text-blue-300 text-xs">
                              💡 Click anywhere on image to test coordinates
                            </div>
                          </div>
                          
                          {/* Debug info */}
                          <div className="absolute top-2 right-2 bg-red-500 bg-opacity-75 text-white text-xs p-2 rounded">
                            <div className="font-medium">Debug:</div>
                            <div>Show: {showCropper ? 'Yes' : 'No'}</div>
                            <div>Area: {JSON.stringify(cropArea)}</div>
                            <div>Dragging: {isDragging ? 'Yes' : 'No'}</div>
                            <div>Resizing: {isResizing ? resizeHandle : 'No'}</div>
                            {imageRef.current && (
                              <>
                                <div>Image: {imageRef.current.naturalWidth}×{imageRef.current.naturalHeight}</div>
                                <div>Display: {Math.round(imageRef.current.width)}×{Math.round(imageRef.current.height)}</div>
                              </>
                            )}
                            <div className="mt-2 text-yellow-300">
                              Click areas: 25px around handles
                            </div>
                            <button 
                              onClick={() => {
                                console.log('Test button clicked');
                                setIsResizing(true);
                                setResizeHandle('bottom-right');
                                console.log('Set resizing to true, handle to bottom-right');
                              }}
                              className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                            >
                              Test Resize State
                            </button>
                            <div className="mt-2 text-xs">
                              <div>Current State:</div>
                              <div>isResizing: {isResizing.toString()}</div>
                              <div>resizeHandle: {resizeHandle || 'null'}</div>
                              <div>isDragging: {isDragging.toString()}</div>
                            </div>
                          </div>
                          
                          {/* Crop area dimensions */}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                            <div className="font-medium">Crop Area:</div>
                            <div>{Math.round(cropArea.width)} × {Math.round(cropArea.height)} pixels</div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={imagePreview}
                          alt="Cropped preview"
                          className="max-w-full max-h-96 object-contain"
                        />
                      )}
                    </div>
                    
                    {showCropper ? (
                      <div className="space-y-2">
                        <button
                          onClick={startCrop}
                          className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                        >
                          ✂️ Crop & Analyze
                        </button>
                        <button
                          onClick={() => {
                            setShowCropper(false);
                            setImagePreview(null);
                            setSelectedImage(null);
                          }}
                          className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 ml-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowCropper(true)}
                          className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600"
                        >
                          ✂️ Re-crop Image
                        </button>
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedImage(null);
                          }}
                          className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 ml-2"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden canvas for cropping */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Cropping styles */}
              <style jsx>{`
                .crop-image {
                  user-select: none;
                  -webkit-user-select: none;
                  -moz-user-select: none;
                  -ms-user-select: none;
                }
                .crop-image img {
                  max-width: 100%;
                  max-height: 400px;
                  object-fit: contain;
                }
                .crop-overlay {
                  transition: all 0.1s ease;
                }
                .crop-overlay:hover {
                  border-color: #3b82f6;
                  background-color: rgba(59, 130, 246, 0.3);
                }
                .resize-handle {
                  transition: all 0.1s ease;
                }
                .resize-handle:hover {
                  transform: scale(1.2);
                  background-color: #1d4ed8;
                }
              `}</style>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Analyze Button */}
              {selectedImage && !showCropper && (
                <div className="text-center">
                  <button
                    onClick={analyzeWaterChemistry}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-2"></div>
                        Analyzing with {useChatGPT ? 'ChatGPT + Color Chart' : 'Google Vision'}...
                      </>
                    ) : (
                      `🔬 Analyze with ${useChatGPT ? 'ChatGPT + Color Chart' : 'Google Vision'}`
                    )}
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    💰 Token cost: ~${useChatGPT ? '0.01-0.03' : '0.005-0.015'} (cropped image reduces cost)
                  </p>
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
