import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Create a Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase service role environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB for image uploads
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user is admin by looking up their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { entityType, entityId, imageData, filename, contentType } = req.body;

    if (!entityType || !entityId || !imageData || !filename || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate entity type
    const validEntityTypes = ['crops', 'growbeds', 'fishtanks'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Validate content type
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Process image with Sharp: resize to max 400px width and compress
    let processedImageBuffer;
    let newWidth, newHeight;
    
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Calculate new dimensions maintaining aspect ratio
      const maxWidth = 400;
      newWidth = metadata.width;
      newHeight = metadata.height;
      
      if (metadata.width > maxWidth) {
        newWidth = maxWidth;
        newHeight = Math.round((metadata.height * maxWidth) / metadata.width);
      }
      
      console.log('Image processing:', {
        original: `${metadata.width}x${metadata.height}`,
        new: `${newWidth}x${newHeight}`,
        format: metadata.format,
        size: `${(imageBuffer.length / 1024).toFixed(1)}KB`
      });
      
      // Resize and compress image
      processedImageBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: 80,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      // If still too large, compress more aggressively
      if (processedImageBuffer.length > 30 * 1024) {
        console.log('Image still too large, compressing more aggressively...');
        processedImageBuffer = await sharp(imageBuffer)
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 60,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      }
      
      // If still too large, reduce dimensions further
      if (processedImageBuffer.length > 30 * 1024) {
        console.log('Image still too large, reducing dimensions...');
        const scaleFactor = Math.sqrt(30 * 1024 / processedImageBuffer.length);
        newWidth = Math.round(newWidth * scaleFactor);
        newHeight = Math.round(newHeight * scaleFactor);
        
        processedImageBuffer = await sharp(imageBuffer)
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 70,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      }
      
      console.log('Final processed image:', {
        dimensions: `${newWidth}x${newHeight}`,
        size: `${(processedImageBuffer.length / 1024).toFixed(1)}KB`,
        compression: `${((1 - processedImageBuffer.length / imageBuffer.length) * 100).toFixed(1)}%`
      });
      
    } catch (processingError) {
      console.error('Error processing image:', processingError);
      return res.status(500).json({ error: 'Failed to process image' });
    }

    // Update the entity record with the processed image data
    console.log('Upload API - About to update database:', {
      entityType,
      entityId,
      processedImageBufferLength: processedImageBuffer.length,
      processedImageBufferType: typeof processedImageBuffer,
      isBuffer: Buffer.isBuffer(processedImageBuffer),
      processedImageBufferSizeKB: Math.round(processedImageBuffer.length / 1024)
    });

    const { error: updateError } = await supabase
      .from(entityType)
      .update({
        image_data: processedImageBuffer,
        image_filename: filename,
        image_content_type: 'image/jpeg' // Always JPEG after processing
      })
      .eq('id', entityId);

    if (updateError) {
      console.error(`Error updating ${entityType} with image:`, updateError);
      return res.status(500).json({ error: 'Failed to save image' });
    }

    console.log('Upload API - Database update successful');

    res.status(200).json({ 
      message: 'Image uploaded and processed successfully',
      entityType,
      entityId,
      filename,
      contentType: 'image/jpeg',
      originalSize: `${(imageBuffer.length / 1024).toFixed(1)}KB`,
      processedSize: `${(processedImageBuffer.length / 1024).toFixed(1)}KB`,
      dimensions: `${newWidth}x${newHeight}`
    });

  } catch (error) {
    console.error('Error in image upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
