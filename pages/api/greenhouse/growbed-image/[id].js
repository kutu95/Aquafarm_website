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
      return res.status(400).json({ error: 'Growbed ID is required' });
    }

    // Fetch the growbed image data
    const { data: growbed, error } = await supabase
      .from('growbeds')
      .select('image_data, image_content_type, image_filename')
      .eq('id', id)
      .single();

    if (error || !growbed || !growbed.image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', growbed.image_content_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${growbed.image_filename || 'growbed-image'}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send the binary image data
    res.send(growbed.image_data);

  } catch (error) {
    console.error('Error serving growbed image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
