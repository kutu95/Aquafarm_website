import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch footer content from Supabase
    const { data: footer, error } = await supabase
      .from('pages')
      .select('content')
      .eq('slug', 'footer')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(200).json({ content: null });
    }

    return res.status(200).json({ content: footer?.content || null });
  } catch (error) {
    console.error('Error fetching footer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 