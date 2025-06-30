import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const uploadedFiles = [];
    const fileArray = Array.isArray(files.file) ? files.file : [files.file];

    for (const file of fileArray) {
      if (!file) continue;

      const fileExt = file.originalFilename.split('.').pop();
      
      // Determine folder based on file type
      let folder = 'volunteer-gallery';
      if (file.mimetype === 'application/pdf' || 
          file.mimetype === 'application/msword' || 
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        folder = 'volunteer-cv';
      }
      
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file using service role key
      const { error: uploadError } = await supabase.storage
        .from('volunteer-documents')
        .upload(fileName, file.filepath, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      // Create URL - use public URL for images, signed URL for documents
      let fileUrl;
      if (file.mimetype.startsWith('image/')) {
        // For images, use public URL
        const { data: publicUrl } = supabase.storage
          .from('volunteer-documents')
          .getPublicUrl(fileName);
        fileUrl = publicUrl.publicUrl;
      } else {
        // For documents, use signed URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from('volunteer-documents')
          .createSignedUrl(fileName, 3600 * 24 * 7); // 7 days

        if (urlError) {
          console.error('URL creation error:', urlError);
          return res.status(500).json({ error: `URL creation failed: ${urlError.message}` });
        }
        fileUrl = urlData.signedUrl;
      }

      console.log('File URL created:', {
        fileName,
        url: fileUrl,
        type: file.mimetype.startsWith('image/') ? 'public' : 'signed',
        expiresAt: file.mimetype.startsWith('image/') ? 'never' : new Date(Date.now() + 3600 * 24 * 7 * 1000)
      });

      uploadedFiles.push({
        name: file.originalFilename,
        url: fileUrl,
        path: fileName
      });
      
      console.log('Uploaded file:', {
        name: file.originalFilename,
        url: fileUrl,
        path: fileName,
        mimetype: file.mimetype
      });
    }

    return res.status(200).json({ 
      success: true, 
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
} 