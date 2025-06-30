export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        headers: Object.fromEntries(response.headers.entries())
      });
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    return res.status(200).json({
      success: true,
      contentType,
      contentLength,
      accessible: true
    });

  } catch (error) {
    return res.status(500).json({
      error: `Error testing URL: ${error.message}`,
      accessible: false
    });
  }
} 