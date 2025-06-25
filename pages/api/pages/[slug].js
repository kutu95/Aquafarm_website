import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug } = req.query;
  const session = await getServerSession(req, res, authOptions);

  try {
    // Here you would typically fetch from your database
    // For now, let's return mock data for known pages
    if (slug === 'home') {
      return res.status(200).json({
        id: 1,
        title: 'Home',
        slug: 'home',
        content: '<h1>Welcome</h1><p>This is the home page content.</p>'
      });
    }

    if (slug === 'footer') {
      return res.status(200).json({
        id: 2,
        title: 'Footer',
        slug: 'footer',
        content: '<p>&copy; 2024. All rights reserved.</p>'
      });
    }

    // If no matching page is found
    return res.status(404).json(null);
  } catch (error) {
    console.error('Error fetching page:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 