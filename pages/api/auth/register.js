import { createClient } from '@supabase/supabase-js';
import { emailService } from '../../../lib/emailService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, password } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Create user account with email confirmation disabled (we'll handle it ourselves)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't auto-confirm
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    });

    if (authError) {
      console.error('User creation error:', authError);
      return res.status(500).json({ error: authError.message });
    }

    if (authData.user) {
      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            role: 'user'
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the registration if profile creation fails
      }

      // Generate confirmation URL
      const confirmationToken = authData.user.email_confirmed_at ? null : authData.user.id;
      const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

      // Send confirmation email using Resend
      try {
        await emailService.sendConfirmationEmail(email, confirmationUrl);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail registration if email fails, but log it
        // You might want to implement a retry mechanism or queue
      }

      // Send admin notification
      try {
        await emailService.notifyAdminsOfNewUser({
          firstName,
          lastName,
          email
        });
      } catch (adminNotificationError) {
        console.error('Admin notification error:', adminNotificationError);
        // Don't fail registration if admin notification fails
      }

      return res.status(200).json({
        success: true,
        message: 'Account created successfully! Please check your email to confirm your account.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName,
          lastName
        }
      });
    }

    return res.status(500).json({ error: 'Failed to create user account' });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during registration' });
  }
} 