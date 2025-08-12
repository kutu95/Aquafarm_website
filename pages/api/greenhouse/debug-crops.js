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
    // Get all crops with their image data info
    const { data: crops, error } = await supabase
      .from('crops')
      .select('id, vegetable_name, image_data, image_filename, image_content_type')
      .order('id');

    if (error) {
      console.error('Error fetching crops:', error);
      return res.status(500).json({ error: 'Failed to fetch crops' });
    }

    // Format the response to show image data sizes
    const formattedCrops = crops.map(crop => ({
      id: crop.id,
      name: crop.vegetable_name,
      hasImageData: !!crop.image_data,
      imageDataLength: crop.image_data ? crop.image_data.length : 0,
      imageDataSizeKB: crop.image_data ? Math.round(crop.image_data.length / 1024) : 0,
      filename: crop.image_filename,
      contentType: crop.image_content_type,
      imageDataStart: crop.image_data ? crop.image_data.substring(0, 100) + '...' : null
    }));

    res.status(200).json({
      totalCrops: crops.length,
      crops: formattedCrops
    });

  } catch (error) {
    console.error('Error in debug crops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
