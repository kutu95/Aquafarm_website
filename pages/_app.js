import '@/styles/globals.css';
import { createContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GoogleAnalytics from '@/components/GoogleAnalytics';

export const AuthContext = createContext();

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setRole(null);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Get role from user metadata
            const userRole = session.user.user_metadata?.role;
            console.log('User role from metadata:', userRole);
            setRole(userRole || null);
          } else {
            setRole(null);
          }
        }
      } catch (error) {
        console.error('Load user error:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      // Check if we're in a password reset flow
      const isPasswordResetInProgress = typeof window !== 'undefined' && 
        localStorage.getItem('password_reset_in_progress') === 'true';
      
      console.log('Password reset check:', {
        isPasswordResetInProgress,
        event,
        localStorageValue: typeof window !== 'undefined' ? localStorage.getItem('password_reset_in_progress') : 'N/A'
      });
      
      if (isPasswordResetInProgress && (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION')) {
        console.log('Password reset in progress, not updating user state for event:', event);
        // Don't update user state during password recovery or initial session
        return;
      }
      
      console.log('Updating user state for event:', event);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Get role from user metadata
        const userRole = session.user.user_metadata?.role;
        console.log('User role from auth change:', userRole);
        setRole(userRole || null);
      } else {
        setRole(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, role, setUser, loading }}>
      <GoogleAnalytics />
      <Component {...pageProps} />
    </AuthContext.Provider>
  );
}