import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Attempting to generate recovery link for:', email);

    // Generate a password reset link for the user (this works for existing users)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-account`
      }
    });

    if (linkError) {
      console.error('Error generating recovery link:', linkError);
      return res.status(500).json({ error: `Failed to generate invitation link: ${linkError.message}` });
    }

    console.log('Recovery link generated successfully');

    // Send the recovery link via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Complete Your Account Setup',
      html: `
        <h2>Welcome to Aquafarm!</h2>
        <p>You have been invited to join our platform. Please click the link below to complete your account setup:</p>
        <p><a href="${linkData.properties.action_link}">Complete Account Setup</a></p>
        <p>If the link doesn't work, copy and paste this URL into your browser:</p>
        <p>${linkData.properties.action_link}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The Aquafarm Team</p>
      `
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: `Failed to send invitation email: ${emailError.message}` });
    }

    console.log('Email sent successfully');
    res.status(200).json({ message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
} 