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
    // Fetch menu pages from Supabase
    const { data: menuItems, error } = await supabase
      .from('pages')
      .select('id, title, slug, priority')
      .gt('priority', 0)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Database error', error: error.message });
    }

    // Fetch product pages
    const { data: productItems, error: productError } = await supabase
      .from('pages')
      .select('id, title, slug, page_type')
      .eq('page_type', 'product')
      .order('created_at', { ascending: false });

    if (productError) {
      console.error('Supabase product error:', productError);
      return res.status(500).json({ message: 'Database error', error: productError.message });
    }

    return res.status(200).json({
      menuItems: menuItems || [],
      productItems: productItems || []
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 