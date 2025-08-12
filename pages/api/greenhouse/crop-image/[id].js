import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase service role environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Crop ID is required' });
    }

    console.log('Crop image API v2.0 called for ID:', id);

    // Fetch the crop image data
    const { data: crop, error } = await supabase
      .from('crops')
      .select('image_data, image_content_type, image_filename')
      .eq('id', id)
      .single();

    console.log('Crop image API v2.0 - ID:', id, 'Crop data:', {
      hasData: !!crop,
      hasImageData: !!crop?.image_data,
      contentType: crop?.image_content_type,
      filename: crop?.image_filename,
      imageDataLength: crop?.image_data?.length,
      imageDataType: crop?.image_data ? typeof crop.image_data : 'undefined',
      imageDataStart: crop?.image_data ? crop.image_data.substring(0, 100) + '...' : 'undefined'
    });

    if (error || !crop || !crop.image_data) {
      console.log('Crop image API v2.0 - Error or missing data:', { error, hasCrop: !!crop, hasImageData: !!crop?.image_data });
      return res.status(404).json({ error: 'Image not found' });
    }

    // Convert binary data to proper Buffer for response
    let imageBuffer;
    try {
      if (Buffer.isBuffer(crop.image_data)) {
        // If it's already a Buffer, use it directly
        imageBuffer = crop.image_data;
      } else if (typeof crop.image_data === 'string') {
        // Check if it's a double-escaped hex string (\\x) - this is what we actually have
        if (crop.image_data.startsWith('\\x')) {
          // This is a double-escaped hex string (\\x), need to unescape and parse
          console.log('Found double-escaped hex string, unescaping...');
          console.log('Original data starts with:', crop.image_data.substring(0, 50));
          
          const unescaped = crop.image_data.replace(/\\x/g, '');
          console.log('After unescaping, first 50 chars:', unescaped.substring(0, 50));
          
          const buffer = Buffer.from(unescaped, 'hex');
          console.log('Hex buffer length:', buffer.length);
          console.log('Hex buffer first 50 chars:', buffer.toString('utf8').substring(0, 50));
          
          // Now parse the JSON Buffer object
          try {
            const jsonString = buffer.toString('utf8');
            const bufferObj = JSON.parse(jsonString);
            if (bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
              imageBuffer = Buffer.from(bufferObj.data);
              console.log('Successfully parsed double-escaped JSON Buffer data, length:', imageBuffer.length);
            } else {
              throw new Error('Invalid Buffer object structure');
            }
          } catch (parseError) {
            console.error('Error parsing JSON Buffer:', parseError);
            throw parseError;
          }
        } else if (crop.image_data.startsWith('\\\\x')) {
          // This is a quadruple-escaped hex string, need to unescape multiple times
          console.log('Found quadruple-escaped hex string, unescaping...');
          const unescaped = crop.image_data.replace(/\\\\x/g, '');
          const hexString = unescaped.replace(/\\x/g, '');
          const buffer = Buffer.from(hexString, 'hex');
          
          // Now parse the JSON Buffer object
          try {
            const jsonString = buffer.toString('utf8');
            const bufferObj = JSON.parse(jsonString);
            if (bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
              imageBuffer = Buffer.from(bufferObj.data);
              console.log('Successfully parsed quadruple-escaped JSON Buffer data');
            } else {
              throw new Error('Invalid Buffer object structure');
            }
          } catch (parseError) {
            console.error('Error parsing unescaped JSON Buffer:', parseError);
            throw parseError;
          }
        } else if (crop.image_data.startsWith('{') && crop.image_data.includes('"type":"Buffer"')) {
          // This is a JSON Buffer object, parse it directly
          try {
            const bufferObj = JSON.parse(crop.image_data);
            if (bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
              imageBuffer = Buffer.from(bufferObj.data);
            } else {
              throw new Error('Invalid Buffer object structure');
            }
          } catch (parseError) {
            console.error('Error parsing JSON Buffer:', parseError);
            throw parseError;
          }
        } else {
          // Treat as regular binary string
          imageBuffer = Buffer.from(crop.image_data, 'binary');
        }
      } else {
        // Try to convert to buffer first
        imageBuffer = Buffer.from(crop.image_data);
      }
    } catch (conversionError) {
      console.error('Error converting image data to Buffer:', conversionError);
      return res.status(500).json({ error: 'Failed to convert image data' });
    }

    console.log('Crop image API v2.0 - Converting to binary response:', {
      contentType: crop.image_content_type || 'image/jpeg',
      filename: crop.image_filename || 'crop-image',
      imageDataLength: crop.image_data.length,
      bufferLength: imageBuffer.length,
      bufferType: typeof imageBuffer,
      isBuffer: Buffer.isBuffer(imageBuffer)
    });

    // Return the image data directly as a binary response
    res.setHeader('Content-Type', crop.image_content_type || 'image/jpeg');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('X-API-Version', '2.0'); // Version header to track changes
    
    // Add CORS headers to ensure browser can access the image
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Send the buffer directly without conversion
    console.log('Crop image API v2.0 - Sending binary response:', {
      contentType: crop.image_content_type || 'image/jpeg',
      bufferLength: imageBuffer.length,
      bufferType: typeof imageBuffer,
      isBuffer: Buffer.isBuffer(imageBuffer)
    });
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error serving crop image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
