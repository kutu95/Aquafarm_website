import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cropId } = req.body;
    
    if (!cropId) {
      return res.status(400).json({ error: 'Crop ID is required' });
    }

    // Create a simple test image (1x1 red pixel)
    const testImageData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8F, 0x20,
      0x5F, 0xFF, 0xD9
    ]);

    console.log('Test update - Creating test image data:', {
      cropId,
      testImageLength: testImageData.length,
      testImageSizeKB: Math.round(testImageData.length / 1024)
    });

    // Update the crop with the test image
    const { error: updateError } = await supabase
      .from('crops')
      .update({
        image_data: testImageData,
        image_filename: 'test-image.jpg',
        image_content_type: 'image/jpeg'
      })
      .eq('id', cropId);

    if (updateError) {
      console.error('Test update - Error updating crop:', updateError);
      return res.status(500).json({ error: 'Failed to update crop' });
    }

    console.log('Test update - Successfully updated crop with test image');

    // Verify the update by reading back the data
    const { data: updatedCrop, error: readError } = await supabase
      .from('crops')
      .select('image_data, image_filename, image_content_type')
      .eq('id', cropId)
      .single();

    if (readError) {
      console.error('Test update - Error reading updated crop:', readError);
      return res.status(500).json({ error: 'Failed to read updated crop' });
    }

    console.log('Test update - Verification read:', {
      hasImageData: !!updatedCrop.image_data,
      imageDataLength: updatedCrop.image_data ? updatedCrop.image_data.length : 0,
      imageDataSizeKB: updatedCrop.image_data ? Math.round(updatedCrop.image_data.length / 1024) : 0,
      filename: updatedCrop.image_filename,
      contentType: updatedCrop.image_content_type
    });

    res.status(200).json({
      message: 'Test update successful',
      cropId,
      testImageSize: testImageData.length,
      testImageSizeKB: Math.round(testImageData.length / 1024),
      verification: {
        hasImageData: !!updatedCrop.image_data,
        imageDataLength: updatedCrop.image_data ? updatedCrop.image_data.length : 0,
        imageDataSizeKB: updatedCrop.image_data ? Math.round(updatedCrop.image_data.length / 1024) : 0
      }
    });

  } catch (error) {
    console.error('Error in test update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
