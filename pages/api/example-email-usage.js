import { emailService } from '@/lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, email, data } = req.body;

    switch (action) {
      case 'welcome':
        // Example: Send welcome email
        await emailService.sendCustomNotification(
          email,
          'Welcome to Margaret River Aquafarm!',
          'Thank you for joining our community. We\'re excited to have you on board!',
          {
            data: { 
              userName: data.userName,
              joinDate: new Date().toLocaleDateString()
            }
          }
        );
        break;

      case 'admin-notification':
        // Example: Notify admins of new application
        await emailService.sendAdminNotification(
          email,
          'New Volunteer Application',
          'A new volunteer application has been submitted.',
          data
        );
        break;

      case 'bulk-newsletter':
        // Example: Send newsletter to multiple users
        const results = await emailService.sendBulkEmails(
          data.emails,
          'Aquafarm Newsletter - Latest Updates',
          'Here are the latest updates from Margaret River Aquafarm...',
          {
            delay: 1000,
            batchSize: 5
          }
        );
        return res.status(200).json({ success: true, results });

      case 'test':
        // Example: Send test email
        await emailService.testEmail(email);
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('Email service error:', error);
    return res.status(500).json({ error: error.message });
  }
} 