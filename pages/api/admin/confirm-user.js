import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Get user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      return res.status(500).json({ error: `Failed to get users: ${userError.message}` });
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user to confirmed
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      return res.status(500).json({ error: `Failed to confirm user: ${updateError.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      message: `User ${email} has been manually confirmed. They can now log in.`
    });

  } catch (error) {
    console.error('Manual confirmation error:', error);
    return res.status(500).json({ 
      error: `Manual confirmation failed: ${error.message}`,
      details: error
    });
  }
} 