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
      return res.status(400).json({ error: 'Fishtank ID is required' });
    }

    // Fetch the fishtank image data
    const { data: fishtank, error } = await supabase
      .from('fishtanks')
      .select('image_data, image_content_type, image_filename')
      .eq('id', id)
      .single();

    if (error || !fishtank || !fishtank.image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', fishtank.image_content_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${fishtank.image_filename || 'fishtank-image'}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send the binary image data
    res.send(fishtank.image_data);

  } catch (error) {
    console.error('Error serving fishtank image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
