import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cropId } = req.query;
    
    if (!cropId) {
      return res.status(400).json({ error: 'Crop ID is required' });
    }

    // Get the raw image data from the database
    const { data: crop, error } = await supabase
      .from('crops')
      .select('image_data, image_content_type, image_filename')
      .eq('id', cropId)
      .single();

    if (error || !crop || !crop.image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Examine the raw data structure
    const rawData = crop.image_data;
    const dataType = typeof rawData;
    const dataLength = rawData.length;
    
    // Check if it's a JSON string
    let isJson = false;
    let jsonData = null;
    let parsedBuffer = null;
    
    try {
      if (typeof rawData === 'string' && rawData.startsWith('{')) {
        isJson = true;
        jsonData = JSON.parse(rawData);
        
        if (jsonData.type === 'Buffer' && Array.isArray(jsonData.data)) {
          parsedBuffer = Buffer.from(jsonData.data);
        }
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
    }

    // Return detailed analysis
    res.json({
      cropId,
      filename: crop.image_filename,
      contentType: crop.image_content_type,
      rawData: {
        type: dataType,
        length: dataLength,
        start: typeof rawData === 'string' ? rawData.substring(0, 200) : 'Not a string',
        end: typeof rawData === 'string' ? rawData.substring(rawData.length - 200) : 'Not a string',
        complete: typeof rawData === 'string' ? rawData : 'Not a string'
      },
      jsonAnalysis: {
        isJson,
        jsonData: jsonData ? {
          type: jsonData.type,
          dataLength: jsonData.data ? jsonData.data.length : 'No data array',
          dataStart: jsonData.data ? jsonData.data.slice(0, 20) : 'No data array'
        } : null
      },
      parsedBuffer: parsedBuffer ? {
        length: parsedBuffer.length,
        start: parsedBuffer.slice(0, 20),
        isBuffer: Buffer.isBuffer(parsedBuffer)
      } : null
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
