import { emailService } from '@/lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType } = req.body;

    switch (testType) {
      case 'new-user':
        await emailService.notifyAdminsOfNewUser({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        });
        break;

      case 'new-application':
        await emailService.notifyAdminsOfNewApplication({
          id: 'test-123',
          full_name: 'Test Applicant',
          email: 'applicant@example.com',
          phone_country_code: '+1',
          phone_number: '1234567890',
          current_city: 'Test City',
          current_country: 'Test Country',
          age: 25,
          preferred_start_date: '2024-06-01',
          created_at: new Date().toISOString()
        });
        break;

      case 'new-induction':
        await emailService.notifyAdminsOfNewInduction({
          id: 'test-456',
          full_name: 'Test Volunteer',
          email: 'volunteer@example.com',
          created_at: new Date().toISOString()
        });
        break;

      case 'get-admin-emails':
        const adminEmails = await emailService.getAdminEmails();
        return res.status(200).json({ 
          success: true, 
          adminEmails,
          count: adminEmails.length
        });

      default:
        return res.status(400).json({ error: 'Invalid test type. Use: new-user, new-application, new-induction, or get-admin-emails' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Admin notification test for ${testType} completed successfully` 
    });

  } catch (error) {
    console.error('Admin notification test error:', error);
    return res.status(500).json({ 
      error: 'Failed to test admin notification',
      details: error.message 
    });
  }
} 