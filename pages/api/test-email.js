import { emailService } from '../../lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    await emailService.testEmail(email);
    return res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
} 