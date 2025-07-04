import { IncomingForm } from 'formidable';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Error parsing form data' });
    }
    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileData = Array.isArray(file) ? file[0] : file;
    const { filepath, originalFilename, mimetype } = fileData;
    const fs = await import('fs/promises');
    try {
      const fileBuffer = await fs.readFile(filepath);
      const { data, error } = await supabase.storage
        .from('page-images')
        .upload(originalFilename, fileBuffer, {
          contentType: mimetype || 'application/octet-stream',
          upsert: true,
        });
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
} 