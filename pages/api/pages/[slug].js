import { supabase } from '@/lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug } = req.query;

  try {
    // Fetch page from Supabase
    const { data: page, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !page) {
      return res.status(404).json(null);
    }

    return res.status(200).json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 