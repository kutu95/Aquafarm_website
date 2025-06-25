import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import InvitationEmail from '@/components/EmailTemplate';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend
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

    // Create user in Supabase Auth
    // The trigger will automatically create the profile
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { role: 'user' }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Generate invitation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-account`
      }
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return res.status(400).json({ error: 'Failed to generate invitation link' });
    }

    // Get admin name for the email
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser();
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', adminUser.id)
      .single();

    const adminName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name}`
      : 'An administrator';

    // Send invitation email
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [email],
        subject: 'Welcome to Aquafarm - Complete Your Account Setup',
        react: InvitationEmail({
          invitationLink: linkData.properties.action_link,
          adminName: adminName
        })
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the whole operation if email fails
        console.warn('Could not send invitation email:', emailError.message);
      } else {
        console.log('Invitation email sent successfully:', emailData);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the whole operation if email fails
      console.warn('Could not send invitation email:', emailError.message);
    }

    return res.status(200).json({ 
      success: true, 
      user: authData.user,
      invitationLink: linkData.properties.action_link,
      emailSent: true
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 