import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/emailService';

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable');
}

if (!process.env.RESEND_FROM_EMAIL) {
  console.error('Missing RESEND_FROM_EMAIL environment variable');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, adminName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Attempting to generate recovery link for:', email);

    // Always use production URL for email invitations, regardless of environment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://aquafarm.au';

    // Generate a recovery link for the user (this works for existing users)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/complete-account`
      }
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return res.status(400).json({ error: `Failed to generate invitation link: ${linkError.message}` });
    }

    console.log('Recovery link generated successfully');

    // Send invitation resend email using the email service
    try {
      await emailService.sendInvitationResend(email, linkData.properties.action_link, adminName || 'Administrator');
      console.log('Invitation resend email sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: `Failed to send invitation email: ${emailError.message}` });
    }

    return res.status(200).json({ success: true, message: 'Invitation email sent successfully' });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
} 