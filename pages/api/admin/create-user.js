import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import React from 'react';
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

    console.log('Creating user for email:', email);

    let user;
    let isNewUser = false;

    // Try to create the user first - if it fails with "email exists", we know the user exists
    try {
      console.log('Attempting to create user...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { role: 'user' }
      });

      if (authError) {
        console.log('Auth error occurred:', authError.message);
        // Check if the error is because user already exists
        if (authError.message.includes('already been registered') || authError.message.includes('email_exists')) {
          // User exists, we'll handle this below
          console.log('User already exists, will generate recovery link');
          // Don't return error, continue to generate recovery link
        } else {
          console.error('Auth error:', authError);
          return res.status(400).json({ error: authError.message });
        }
      } else {
        // User was created successfully
        console.log('User created successfully:', authData.user.id);
        user = authData.user;
        isNewUser = true;
      }
    } catch (createError) {
      console.error('Error creating user:', createError);
      return res.status(400).json({ error: createError.message });
    }

    // If user wasn't created (already exists), we need to get their info
    if (!user) {
      // For existing users, we'll just use the email and generate a recovery link
      // We don't need to fetch the user object since we're just sending an invitation
      console.log('Using existing user for invitation');
    }

    // Generate invitation link (use magiclink for all cases - it's more appropriate for admin invitations)
    console.log('Generating magic link for invitation');
    
    // Always use production URL for email invitations, regardless of environment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aquafarm.au';
    console.log('Using site URL for redirect:', siteUrl);
    console.log('Full redirect URL:', `${siteUrl}/complete-account`);
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/complete-account`
      }
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return res.status(400).json({ error: `Failed to generate invitation link: ${linkError.message}` });
    }

    console.log('Link generated successfully');
    console.log('Generated link:', linkData.properties.action_link);

    // Use a default admin name for the email
    const adminName = 'Margaret River Aquafarm';

    // Convert React component to HTML string
    const emailHtml = ReactDOMServer.renderToString(
      React.createElement(InvitationEmail, {
        invitationLink: linkData.properties.action_link,
        adminName: adminName
      })
    );

    // Send invitation email
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: 'Margaret River Aquafarm - Your Login Link',
        html: emailHtml
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
      user: user || { email: email },
      isNewUser: isNewUser,
      invitationLink: linkData.properties.action_link,
      emailSent: true
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
} 