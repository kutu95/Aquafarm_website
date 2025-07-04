import { emailService } from '@/lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationData } = req.body;

    if (!applicationData) {
      return res.status(400).json({ error: 'Application data is required' });
    }

    // Send admin notification
    await emailService.notifyAdminsOfNewApplication(applicationData);

    return res.status(200).json({ 
      success: true, 
      message: 'Admin notification sent successfully' 
    });

  } catch (error) {
    console.error('Admin notification error:', error);
    return res.status(500).json({ 
      error: 'Failed to send admin notification',
      details: error.message 
    });
  }
} 