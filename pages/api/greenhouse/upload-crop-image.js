import { supabase } from '@/lib/supabaseClient';

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

    const { cropId, imageData, filename, contentType } = req.body;

    if (!cropId || !imageData || !filename || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate content type
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }

    // Convert base64 to binary data
    const binaryData = Buffer.from(imageData, 'base64');

    // Update the crop record with the image data
    const { error: updateError } = await supabase
      .from('crops')
      .update({
        image_data: binaryData,
        image_filename: filename,
        image_content_type: contentType
      })
      .eq('id', cropId);

    if (updateError) {
      console.error('Error updating crop with image:', updateError);
      return res.status(500).json({ error: 'Failed to save image' });
    }

    res.status(200).json({ 
      message: 'Image uploaded successfully',
      cropId,
      filename,
      contentType
    });

  } catch (error) {
    console.error('Error in crop image upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
