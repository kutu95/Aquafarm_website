import { createServerClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies[name];
        },
        set(name, value, options) {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly`);
        },
        remove(name) {
          res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Max-Age=0`);
        },
      },
    }
  );

  try {
    // Fetch the water_testing SOP using EXACTLY the same query as the SOP page
    console.log('🔍 DEBUG: Test API - Starting fetch...');
    
    const { data: page, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', 'water_testing')
      .eq('page_type', 'sop')
      .maybeSingle();
    
    console.log('🔍 DEBUG: Test API - Fetch completed');
    console.log('🔍 DEBUG: Test API - Error:', error);
    console.log('🔍 DEBUG: Test API - Page found:', !!page);
    if (page) {
      console.log('🔍 DEBUG: Test API - Content length:', page.content?.length);
      console.log('🔍 DEBUG: Test API - Contains <table>:', page.content?.includes('<table>'));
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!page) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Return detailed analysis of the content
    const content = page.content;
    const analysis = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      contentLength: content?.length || 0,
      contentType: typeof content,
      containsTable: content?.includes('<table') || false,
      containsTableExact: content?.includes('<table>') || false,
      containsTableWithAttributes: content?.includes('<table border') || false,
      containsH3: content?.includes('<h3>') || false,
      containsTroubleshooting: content?.includes('Troubleshooting') || false,
      first300Chars: content?.substring(0, 300) || '',
      last300Chars: content?.substring(Math.max(0, (content?.length || 0) - 300)) || '',
      fullContent: content || '',
      // Check for specific sections
      sections: {
        hasPurpose: content?.includes('1. Purpose') || false,
        hasScope: content?.includes('2. Scope') || false,
        hasTroubleshooting: content?.includes('9. Troubleshooting') || false,
        hasReferences: content?.includes('10. References') || false,
        hasDocumentControl: content?.includes('11. Document Control') || false,
      }
    };

    res.status(200).json(analysis);
  } catch (err) {
    console.error('Error in test-sop-content:', err);
    res.status(500).json({ error: err.message });
  }
}
