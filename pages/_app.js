import '@/styles/globals.css';
import { createContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import GoogleAnalytics from '@/components/GoogleAnalytics';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create contexts
export const AuthContext = createContext();
export const DarkModeContext = createContext();

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved dark mode preference or default to system preference
    const savedDarkMode = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    } else {
      setDarkMode(systemPrefersDark);
    }
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

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
      <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
        <GoogleAnalytics />
        <Component {...pageProps} />
      </DarkModeContext.Provider>
    </AuthContext.Provider>
  );
}