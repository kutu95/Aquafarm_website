import React, { useState, useRef, useContext, useEffect } from 'react';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function WaterChemistry() {
  const { user, role, loading } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [aiStatus, setAiStatus] = useState('chatgpt');
  const [showDebug, setShowDebug] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [recordData, setRecordData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    ph: null,
    ammonia: null,
    nitrite: null,
    nitrate: null,
    dissolved_oxygen: '',
    water_temperature: '',
    confidence: null,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Function to extract date from image metadata or filename
  const extractDateFromImage = async (file) => {
    try {
      console.log('Starting date extraction for file:', file.name);
      
      // First try to extract date from filename (takes precedence)
      const filenameDate = extractDateFromFilename(file.name);
      if (filenameDate) {
        console.log('Date extracted from filename (takes precedence):', filenameDate);
        return filenameDate;
      }
      
      // Fallback to EXIF metadata if no filename date found
      const exifDate = await extractDateFromExif(file);
      if (exifDate) {
        console.log('Date extracted from EXIF metadata:', exifDate);
        return exifDate;
      }
      
      console.log('No date found in image, using today');
      return null; // Will use today's date as fallback
    } catch (error) {
      console.error('Error extracting date from image:', error);
      return null;
    }
  };

  // Extract date from EXIF metadata
  const extractDateFromExif = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Look for EXIF data in the image
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Check for JPEG EXIF marker
          let exifStart = -1;
          for (let i = 0; i < uint8Array.length - 1; i++) {
            if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xE1) {
              exifStart = i + 2;
              break;
            }
          }
          
          if (exifStart !== -1) {
            // Try to find date fields in EXIF data
            const exifData = uint8Array.slice(exifStart);
            const exifString = new TextDecoder().decode(exifData);
            
            // Look for common date patterns in EXIF
            const datePatterns = [
              /(\d{4}):(\d{2}):(\d{2})/, // YYYY:MM:DD format
              /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD format
              /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY format
            ];
            
            for (const pattern of datePatterns) {
              const match = exifString.match(pattern);
              if (match) {
                let year, month, day;
                if (pattern.source.includes('YYYY')) {
                  [_, year, month, day] = match;
                } else {
                  [_, month, day, year] = match;
                }
                
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  resolve(date.toISOString().split('T')[0]);
                  return;
                }
              }
            }
          }
          
          resolve(null);
        } catch (error) {
          console.error('Error parsing EXIF data:', error);
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Extract date from filename
  const extractDateFromFilename = (filename) => {
    // Common date patterns in filenames
    const datePatterns = [
      // YYYY-MM-DD or YYYY_MM_DD
      /(\d{4})[-_](\d{2})[-_](\d{2})/,
      // DD-MM-YYYY or DD_MM_YYYY
      /(\d{2})[-_](\d{2})[-_](\d{4})/,
      // MM-DD-YYYY or MM_DD_YYYY
      /(\d{2})[-_](\d{2})[-_](\d{4})/,
      // YYYYMMDD (8 consecutive digits starting with 20xx)
      /(20\d{2})(\d{2})(\d{2})/,
      // DDMMYYYY (8 consecutive digits ending with 20xx)
      /(\d{2})(\d{2})(20\d{2})/,
    ];
    
    for (const pattern of datePatterns) {
      const match = filename.match(pattern);
      if (match) {
        try {
          let year, month, day;
          
          if (pattern.source.includes('20\\d{2}')) {
            if (pattern.source.startsWith('(20\\d{2})')) {
              // YYYYMMDD format (e.g., 20250518)
              [_, year, month, day] = match;
              console.log('YYYYMMDD format detected:', { year, month, day });
            } else if (pattern.source.endsWith('(20\\d{2})')) {
              // DDMMYYYY format
              [_, day, month, year] = match;
              console.log('DDMMYYYY format detected:', { day, month, year });
            }
          } else if (pattern.source.includes('YYYY')) {
            if (pattern.source.startsWith('(\\d{4})')) {
              // YYYY-MM-DD format
              [_, year, month, day] = match;
              console.log('YYYY-MM-DD format detected:', { year, month, day });
            } else if (pattern.source.startsWith('(\\d{2})')) {
              // DD-MM-YYYY or MM-DD-YYYY format
              [_, first, second, year] = match;
              // Try to determine if it's DD-MM or MM-DD by checking ranges
              if (parseInt(first) <= 12 && parseInt(second) <= 31) {
                // Likely MM-DD format
                month = first;
                day = second;
                console.log('MM-DD-YYYY format detected:', { month, day, year });
              } else {
                // Likely DD-MM format
                day = first;
                month = second;
                console.log('DD-MM-YYYY format detected:', { day, month, year });
              }
            }
          }
          
          if (year && month && day) {
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) {
              const dateString = date.toISOString().split('T')[0];
              console.log('Valid date parsed:', { year, month, day, dateString });
              return dateString;
            }
          }
        } catch (error) {
          console.error('Error parsing date from filename:', error);
        }
      }
    }
    
    console.log('No date pattern matched in filename:', filename);
    return null;
  };

  const fileInputRef = useRef(null);
  const imageRef = useRef();
  const canvasRef = useRef();

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
  const handleImageSelect = async (file) => {
    console.log('handleImageSelect called with file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Reset any previous state
    setSelectedImage(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
    
    // Extract date from image metadata or filename
    const extractedDate = await extractDateFromImage(file);
    
    // Update record data with extracted date if found
    if (extractedDate) {
      setRecordData(prev => ({
        ...prev,
        record_date: extractedDate
      }));
      console.log('Updated record date to extracted date:', extractedDate);
    }
    
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
        
        // Set initial crop area to center of image
        const centerX = (img.width - 200) / 2;
        const centerY = (img.height - 200) / 2;
        setCropArea({
          x: Math.max(0, centerX),
          y: Math.max(0, centerY),
          width: Math.min(200, img.width),
          height: Math.min(200, img.height)
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = imageRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touch is on crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
    
    // Check if touch is on resize handle
    const handleSize = 20;
    const rightEdge = cropArea.x + cropArea.width;
    const bottomEdge = cropArea.y + cropArea.height;
    
    if (x >= rightEdge - handleSize && x <= rightEdge + handleSize &&
        y >= bottomEdge - handleSize && y <= bottomEdge + handleSize) {
      setIsResizing(true);
      setResizeHandle('bottom-right');
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDragging && !isResizing) return;
    
    const touch = e.touches[0];
    const rect = imageRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (isDragging) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      // Constrain to image bounds
      const maxX = imageRef.current.width - cropArea.width;
      const maxY = imageRef.current.height - cropArea.height;
      
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      }));
    } else if (isResizing) {
      const newWidth = x - cropArea.x;
      const newHeight = y - cropArea.y;
      
      // Maintain minimum size and constrain to image bounds
      const minSize = 50;
      const maxWidth = imageRef.current.width - cropArea.x;
      const maxHeight = imageRef.current.height - cropArea.y;
      
      setCropArea(prev => ({
        ...prev,
        width: Math.max(minSize, Math.min(newWidth, maxWidth)),
        height: Math.max(minSize, Math.min(newHeight, maxHeight))
      }));
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
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
    } else {
      // Outside crop area - no action
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
    
    // Calculate scale factors between displayed and natural image sizes
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    // Scale crop coordinates to natural image dimensions
    const scaledX = Math.round(cropArea.x * scaleX);
    const scaledY = Math.round(cropArea.y * scaleY);
    const scaledWidth = Math.round(cropArea.width * scaleX);
    const scaledHeight = Math.round(cropArea.height * scaleY);
    
    console.log('Cropping with coordinates:', {
      display: { x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height },
      natural: { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight },
      scale: { scaleX, scaleY },
      imageSizes: { natural: `${img.naturalWidth}x${img.naturalHeight}`, display: `${img.width}x${img.height}` }
    });
    
    // Set canvas size to crop area
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    
    // Draw cropped portion using scaled coordinates
    ctx.drawImage(
      img,
      scaledX, scaledY, scaledWidth, scaledHeight,
      0, 0, scaledWidth, scaledHeight
    );
    
    // Calculate target dimensions for compression (fixed width of 800px, height varies by aspect ratio)
    const targetWidth = 800;
    const targetHeight = Math.round((scaledHeight * targetWidth) / scaledWidth);
    
    // Create a new compressed canvas
    const compressedCanvas = document.createElement('canvas');
    const compressedCtx = compressedCanvas.getContext('2d');
    compressedCanvas.width = targetWidth;
    compressedCanvas.height = targetHeight;
    
    // Draw the cropped image to the compressed canvas (this will resize it)
    compressedCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    
    // Convert to data URL with JPEG compression (much smaller than PNG)
    const croppedImageData = compressedCanvas.toDataURL('image/jpeg', 0.7); // 70% quality for good compression
    
    console.log('=== CROP DEBUG START ===');
    console.log('Original crop dimensions:', `${scaledWidth}x${scaledHeight}`);
    console.log('Compressed dimensions:', `${targetWidth}x${targetHeight}`);
    console.log('Aspect ratio preserved:', `${(scaledWidth / scaledHeight).toFixed(2)}:1 → ${(targetWidth / targetHeight).toFixed(2)}:1`);
    console.log('Compression ratio:', `${((targetWidth * targetHeight) / (scaledWidth * scaledHeight) * 100).toFixed(1)}%`);
    console.log('Cropped image data length:', croppedImageData.length);
    console.log('Cropped image data prefix:', croppedImageData.substring(0, 100));
    console.log('Has data URL prefix:', croppedImageData.startsWith('data:image'));
    console.log('=== CROP DEBUG END ===');
    
    // Store the cropped image data directly
    setImagePreview(croppedImageData);
    setSelectedImage({ dataUrl: croppedImageData, name: 'cropped_image.jpg' });
    
    console.log('Cropped image created successfully:', {
      dataUrlLength: croppedImageData.length,
      originalDimensions: `${scaledWidth}x${scaledHeight}`,
      compressedDimensions: `${targetWidth}x${targetHeight}`,
      hasDataUrlPrefix: croppedImageData.startsWith('data:image')
    });
  };

  // Reference targets for this aquaponics system
  const referenceRanges = {
    pH: { min: 6.4, max: 6.4, unit: '', description: 'Target pH for optimal plant and fish health' },
    ammonia: { min: 0, max: 0.25, unit: 'ppm', description: 'Keep below 0.25 ppm' },
    nitrite: { min: 0, max: 0, unit: 'ppm', description: 'Must be 0 ppm' },
    nitrate: { min: 10, max: 40, unit: 'ppm', description: 'Target range for plant growth' }
  };

  const analyzeWaterChemistry = async () => {
    if (!selectedImage) {
      setError('No image selected. Please upload an image first.');
      return;
    }

    // Additional validation
    if (selectedImage.dataUrl && selectedImage.dataUrl.length < 1000) {
      setError('Selected image data is corrupted or too small. Please try uploading the image again.');
      return;
    }
    
    if (!selectedImage.dataUrl && (!selectedImage.size || selectedImage.size < 1000)) {
      setError('Selected image file is too small or corrupted. Please try uploading the image again.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      console.log('=== ANALYSIS DEBUG START ===');
      console.log('Starting analysis with selectedImage:', selectedImage);
      console.log('selectedImage type:', typeof selectedImage);
      console.log('selectedImage keys:', Object.keys(selectedImage || {}));
      console.log('selectedImage size:', selectedImage?.size);
      console.log('selectedImage name:', selectedImage?.name);
      console.log('selectedImage dataUrl length:', selectedImage?.dataUrl?.length);
      console.log('selectedImage dataUrl prefix:', selectedImage?.dataUrl?.substring(0, 100));
      console.log('=== ANALYSIS DEBUG END ===');
      
      // Get the image data - either from original file or cropped data URL
      let imageData;
      let filename;
      
      if (selectedImage.dataUrl) {
        // This is a cropped image (data URL format)
        imageData = selectedImage.dataUrl;
        filename = selectedImage.name;
        console.log('Using cropped image data:', {
          dataUrlLength: imageData.length,
          filename: filename,
          dataUrlPrefix: imageData.substring(0, 100) + '...',
          hasDataUrlPrefix: imageData.startsWith('data:image')
        });
      } else {
        // This is an original file, convert to data URL
        const reader = new FileReader();
        imageData = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
        filename = selectedImage.name;
        console.log('Converted original file to data URL:', {
          dataUrlLength: imageData.length,
          filename: filename,
          dataUrlPrefix: imageData.substring(0, 100) + '...',
          hasDataUrlPrefix: imageData.startsWith('data:image')
        });
      }
      
      console.log('About to send to API:', {
        imageDataLength: imageData.length,
        filename: filename,
        useChatGPT: true // Always true for ChatGPT
      });
      
      // Validate image data before sending to API
      if (imageData.length < 1000) {
        throw new Error(`Image data is too small (${imageData.length} characters). This usually means the image wasn't properly loaded or cropped. Please try uploading the image again.`);
      }
      
      // Additional validation for data URLs
      if (imageData.startsWith('data:image')) {
        const base64Part = imageData.split(',')[1];
        if (!base64Part || base64Part.length < 100) {
          throw new Error(`Invalid image data format. The image appears to be corrupted or empty. Please try again.`);
        }
        console.log('Data URL validation passed:', {
          totalLength: imageData.length,
          base64Length: base64Part.length,
          mimeType: imageData.split(';')[0]
        });
      }
      
      // Send the image data directly to the API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/water-chemistry/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        signal: controller.signal,
        body: JSON.stringify({
          imageData: imageData,
          filename: filename,
          useChatGPT: true // Always true for ChatGPT
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        console.error('Response headers:', response.headers);
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysisResults = await response.json();
      console.log('Analysis results received:', analysisResults);
      
      if (analysisResults.success) {
        // Use the API results directly - no transformation needed
        handleAnalysisComplete(analysisResults);
      } else {
        throw new Error('Analysis failed');
      }
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      if (error.name === 'AbortError') {
        setError('Analysis timed out after 30 seconds. Please try again.');
      } else {
        setError(`Failed to analyze image: ${error.message}`);
      }
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

  const handleSaveRecord = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/water-chemistry/save-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(recordData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        setShowEditForm(false);
        setShowSavePrompt(false);
        // Reset form
        setRecordData({
          record_date: new Date().toISOString().split('T')[0],
          ph: null,
          ammonia: null,
          nitrite: null,
          nitrate: null,
          dissolved_oxygen: '',
          water_temperature: '',
          confidence: null,
          notes: ''
        });
      } else {
        throw new Error(result.error || 'Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      alert(`Error saving record: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalysisComplete = (analysisResults) => {
    setResults(analysisResults);
    setIsAnalyzing(false);
    
    // Prepare record data for saving
    if (analysisResults.parameters) {
      setRecordData(prev => ({
        ...prev,
        ph: analysisResults.parameters.pH?.value !== undefined ? analysisResults.parameters.pH.value : null,
        ammonia: analysisResults.parameters.ammonia?.value !== undefined ? analysisResults.parameters.ammonia.value : null,
        nitrite: analysisResults.parameters.nitrite?.value !== undefined ? analysisResults.parameters.nitrite.value : null,
        nitrate: analysisResults.parameters.nitrate?.value !== undefined ? analysisResults.parameters.nitrate.value : null,
        confidence: analysisResults.confidence !== undefined ? analysisResults.confidence : null,
        notes: analysisResults.recommendations?.join('; ') || '',
        // Preserve the extracted date if it was set
        record_date: prev.record_date || new Date().toISOString().split('T')[0]
      }));
      
      // Show save prompt
      setShowSavePrompt(true);
    }
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
          <div className="mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Water Chemistry Analyzer</h1>
              <p className="mt-2 text-gray-600">Upload an image of your water test tubes for AI-powered analysis</p>
            </div>
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

              {/* AI Service Selection - Removed, only ChatGPT available */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <span className="mr-2">🧠</span>
                  <span className="text-green-900 font-medium">
                    Expert AI Analysis (ChatGPT) - Ready
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Using advanced AI to analyze your water test kit with API Freshwater Master Test Kit knowledge
                </p>
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
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            draggable={false}
                          />
                          
                          {/* Extracted date display */}
                          {recordData.record_date !== new Date().toISOString().split('T')[0] && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white text-sm px-3 py-1 rounded-lg shadow-lg">
                              📅 {recordData.record_date}
                            </div>
                          )}
                          
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
                              pointerEvents: 'auto'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
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
                              onTouchStart={(e) => {
                                console.log('Top-left handle touched!');
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Get current crop area values
                                const currentCropArea = { ...cropArea };
                                
                                const handleTouchMove = (moveEvent) => {
                                  const touch = moveEvent.touches[0];
                                  const rect = imageRef.current.getBoundingClientRect();
                                  const x = touch.clientX - rect.left;
                                  const y = touch.clientY - rect.top;
                                  
                                  const newX = Math.max(0, Math.min(x, currentCropArea.x + currentCropArea.width - 50));
                                  const newY = Math.max(0, Math.min(y, currentCropArea.y + currentCropArea.height - 50));
                                  const newWidth = currentCropArea.x + currentCropArea.width - newX;
                                  const newHeight = currentCropArea.y + currentCropArea.height - newY;
                                  
                                  setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
                                };
                                
                                const handleTouchEnd = () => {
                                  setIsResizing(false);
                                  setResizeHandle(null);
                                  document.removeEventListener('touchmove', handleTouchMove);
                                  document.removeEventListener('touchend', handleTouchEnd);
                                };
                                
                                setIsResizing(true);
                                setResizeHandle('top-left');
                                
                                document.addEventListener('touchmove', handleTouchMove);
                                document.addEventListener('touchend', handleTouchEnd);
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
                              onTouchStart={(e) => {
                                console.log('Bottom-right handle touched!');
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Get current crop area values
                                const currentCropArea = { ...cropArea };
                                
                                const handleTouchMove = (moveEvent) => {
                                  const touch = moveEvent.touches[0];
                                  const rect = imageRef.current.getBoundingClientRect();
                                  const x = touch.clientX - rect.left;
                                  const y = touch.clientY - rect.top;
                                  
                                  const newWidth = Math.max(50, x - currentCropArea.x);
                                  const newHeight = Math.max(50, y - currentCropArea.y);
                                  
                                  setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
                                };
                                
                                const handleTouchEnd = () => {
                                  setIsResizing(false);
                                  setResizeHandle(null);
                                  document.removeEventListener('touchmove', handleTouchMove);
                                  document.removeEventListener('touchend', handleTouchEnd);
                                };
                                
                                setIsResizing(true);
                                setResizeHandle('bottom-right');
                                
                                document.addEventListener('touchmove', handleTouchMove);
                                document.addEventListener('touchend', handleTouchEnd);
                              }}
                            />
                            {/* Center drag indicator */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
                            </div>
                          </div>

                          

                          
                          {/* Crop area dimensions */}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                            <div className="font-medium">Crop Area:</div>
                            <div>{Math.round(cropArea.width)} × {Math.round(cropArea.height)} pixels</div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Cropped preview"
                            className="max-w-full max-h-96 object-contain"
                          />
                          
                          {/* Extracted date display */}
                          {recordData.record_date !== new Date().toISOString().split('T')[0] && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white text-sm px-3 py-1 rounded-lg shadow-lg">
                              📅 {recordData.record_date}
                            </div>
                          )}
                        </div>
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
                        Analyzing with ChatGPT...
                      </>
                    ) : (
                      `🔬 Analyze with ChatGPT`
                    )}
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    💰 Token cost: ~${isAnalyzing ? '0.01-0.03' : '0.005-0.015'} (cropped image reduces cost)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Analysis Results</h2>
              
              {/* Debug Results Structure */}
              <div className="mb-4">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center"
                >
                  {showDebug ? '🔽' : '🔼'} Debug Info
                </button>
                
                {showDebug && (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs">
                    <div className="font-medium mb-2">🔍 Debug: Results Structure</div>
                    <div>Results keys: {Object.keys(results).join(', ')}</div>
                    <div>Has parameters: {results.parameters ? 'Yes' : 'No'}</div>
                    {results.parameters && (
                      <div>Parameter keys: {Object.keys(results.parameters).join(', ')}</div>
                    )}
                    <div>Success: {results.success?.toString()}</div>
                    <div>Confidence: {results.confidence}</div>
                    <div>Has imageAnalysis: {results.imageAnalysis ? 'Yes' : 'No'}</div>
                    
                    {/* Debug individual parameter values */}
                    {results.parameters && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="font-medium">Parameter Values:</div>
                        {Object.entries(results.parameters).map(([param, data]) => (
                          <div key={param} className="ml-2">
                            {param}: {JSON.stringify(data)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Object.entries(results.parameters || {}).map(([parameter, data]) => (
                  <div key={parameter} className="border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {parameter.toUpperCase()}
                    </div>
                    <div className={`text-3xl font-bold mb-2 ${getStatusColor(data.status).split(' ')[0]}`}>
                      {data.value !== null && data.value !== undefined ? data.value : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {referenceRanges[parameter]?.unit || ''}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                      {getStatusIcon(data.status)} {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round((data.confidence || 0) * 100)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Reference Targets */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">📋 Reference Targets</h3>
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
                <h3 className="font-medium text-blue-900 mb-3">💡 AI Recommendations</h3>
                
                {results.recommendations && results.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {results.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-blue-800 text-sm flex items-start">
                        <span className="mr-2">•</span>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Disclaimer */}
              <div className="mt-6 text-xs text-gray-500 text-center">
                <p>
                  ⚠️ This analysis is for informational purposes only. Always verify results with your test kit instructions and consult with aquarium professionals for critical decisions.
                </p>
              </div>
            </div>
          )}

          {/* Save Prompt */}
          {showSavePrompt && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">💾 Save Results</h2>
              <p className="text-gray-600 mb-4">
                Would you like to save these results to your water chemistry history?
              </p>
              
              {/* Date extraction notification */}
              {recordData.record_date !== new Date().toISOString().split('T')[0] && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-blue-800">
                    <span className="mr-2">📅</span>
                    <span className="text-sm">
                      Date automatically detected from image: <strong>{recordData.record_date}</strong>
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowEditForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yes, Save Results
                </button>
                <button
                  onClick={() => setShowSavePrompt(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  No, Thanks
                </button>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {showEditForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 Edit & Save Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={recordData.record_date}
                    onChange={(e) => setRecordData(prev => ({ ...prev, record_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Water Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Water Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 24.5"
                    value={recordData.water_temperature}
                    onChange={(e) => setRecordData(prev => ({ ...prev, water_temperature: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Dissolved Oxygen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dissolved Oxygen (mg/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 6.5"
                    value={recordData.dissolved_oxygen}
                    onChange={(e) => setRecordData(prev => ({ ...prev, dissolved_oxygen: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Any additional observations..."
                    value={recordData.notes}
                    onChange={(e) => setRecordData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Current Values Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Current Test Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">pH:</span> {recordData.ph}
                  </div>
                  <div>
                    <span className="font-medium">Ammonia:</span> {recordData.ammonia} ppm
                  </div>
                  <div>
                    <span className="font-medium">Nitrite:</span> {recordData.nitrite} ppm
                  </div>
                  <div>
                    <span className="font-medium">Nitrate:</span> {recordData.nitrate} ppm
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveRecord}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* AI Status & Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🤖 AI Analysis Status</h2>
            
            <div className="space-y-4">
              {/* Current Status */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="mr-2">🧠</span>
                  <span className="font-medium text-purple-900">
                    Current Mode: Expert AI Analysis (ChatGPT)
                  </span>
                </div>
                <p className="text-sm mt-2 text-purple-800">
                  Using advanced AI to analyze water chemistry with API Freshwater Master Test Kit knowledge
                </p>
              </div>
              
              {/* Service Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Service Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• <strong>AI Model:</strong> GPT-4o (OpenAI)</div>
                  <div>• <strong>Analysis Type:</strong> Expert water chemistry interpretation</div>
                  <div>• <strong>Test Kit Knowledge:</strong> API Freshwater Master Test Kit</div>
                  <div>• <strong>Parameters:</strong> pH, Ammonia, Nitrite, Nitrate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
