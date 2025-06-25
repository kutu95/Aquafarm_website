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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user details
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error('User fetch error:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userData.user;

    // Generate new invitation link using signup type
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-account`
      }
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return res.status(400).json({ error: `Failed to generate invitation link: ${linkError.message}` });
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
        to: [user.email],
        subject: 'Aquafarm - Complete Your Account Setup',
        react: InvitationEmail({
          invitationLink: linkData.data.url,
          adminName: adminName
        })
      });

      if (emailError) {
        console.error('Email error:', emailError);
        return res.status(400).json({ error: `Failed to send email: ${emailError.message}` });
      } else {
        console.log('Invitation email re-sent successfully:', emailData);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(400).json({ error: `Failed to send email: ${emailError.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Invitation email re-sent successfully',
      invitationLink: linkData.data.url
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 