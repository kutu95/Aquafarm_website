export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Here you would typically fetch from your database
    // SELECT * FROM pages WHERE priority > 0 ORDER BY priority ASC
    const menuItems = await prisma.pages.findMany({
      where: {
        priority: {
          gt: 0
        }
      },
      orderBy: {
        priority: 'asc'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        priority: true
      }
    });

    return res.status(200).json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 