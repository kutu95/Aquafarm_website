import { createServerSupabaseClient } from '@supabase/ssr';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });
  
  try {
    // Check if user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: 'user' }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        role: 'user',
        first_name: null,
        last_name: null,
        is_complete: false
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    // Generate invitation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${req.headers.origin}/complete-account`
      }
    });

    if (linkError) {
      return res.status(400).json({ error: linkError.message });
    }

    res.status(200).json({ 
      success: true, 
      message: 'User created successfully',
      userId: authData.user.id,
      invitationLink: linkData.properties.action_link
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 