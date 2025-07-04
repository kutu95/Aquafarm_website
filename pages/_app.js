import '@/styles/globals.css';
import { useEffect, useState, createContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const AuthContext = createContext();
export const DarkModeContext = createContext();

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Track when component has mounted (prevents hydration mismatch)
  useEffect(() => {
    setHasMounted(true);

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const preferredDark = savedDarkMode !== null
      ? JSON.parse(savedDarkMode)
      : systemPrefersDark;

    setDarkMode(preferredDark);
    document.documentElement.classList.toggle('dark', preferredDark);
    localStorage.setItem('darkMode', JSON.stringify(preferredDark));

    // Load Supabase auth session
    async function loadUser() {
      try {
        console.log('Loading user session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session result:', { session: !!session, error, userId: session?.user?.id });
        
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setRole(null);
        } else {
          console.log('Setting user:', session?.user?.id || 'null');
          setUser(session?.user ?? null);
          
          // Fetch role from client-side Supabase if user is authenticated
          if (session?.user) {
            console.log('Fetching role for user:', session.user.id);
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              console.log('Profile fetch result:', { profile, profileError });
              
              if (profileError) {
                console.error('Profile fetch error:', profileError);
                setRole(null);
              } else {
                console.log('Setting role:', profile?.role);
                setRole(profile?.role || null);
              }
            } catch (roleError) {
              console.error('Role fetch error:', roleError);
              setRole(null);
            }
          } else {
            console.log('No session user, setting role to null');
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Auth load error:', err);
        setUser(null);
        setRole(null);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, { hasUser: !!session?.user, userId: session?.user?.id });
      console.log('Session details:', session);
      setUser(session?.user ?? null);
      
      // Fetch role from client-side Supabase if user is authenticated
      if (session?.user) {
        console.log('Auth state change: Fetching role for user:', session.user.id);
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          console.log('Auth state change: Profile fetch result:', { profile, profileError });
          
          if (profileError) {
            console.error('Auth state change: Profile fetch error:', profileError);
            setRole(null);
          } else {
            console.log('Auth state change: Setting role:', profile?.role);
            setRole(profile?.role || null);
          }
        } catch (roleError) {
          console.error('Auth state change: Role fetch error:', roleError);
          setRole(null);
        }
      } else {
        console.log('Auth state change: No user, setting role to null');
        setRole(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Avoid hydration mismatch by delaying render
  if (!hasMounted) return null;

  // Add manual role fetch function for debugging
  const manualFetchRole = async () => {
    if (user) {
      console.log('Manual role fetch for user:', user.id);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        console.log('Manual role fetch result:', { profile, profileError });
        
        if (profileError) {
          console.error('Manual role fetch error:', profileError);
        } else {
          console.log('Manual role fetch: Setting role:', profile?.role);
          setRole(profile?.role || null);
        }
      } catch (error) {
        console.error('Manual role fetch error:', error);
      }
    }
  };

  // Expose manual fetch function globally for debugging
  if (typeof window !== 'undefined') {
    window.manualFetchRole = manualFetchRole;
  }

  return (
    <>
      <Head>
        {/* Global meta tags */}
        <meta name="description" content="Sustainable agriculture, community living and permaculture" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <AuthContext.Provider value={{ user, role, setUser, setRole, loading }}>
        <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
          <GoogleAnalytics />
          <Component {...pageProps} />
        </DarkModeContext.Provider>
      </AuthContext.Provider>
    </>
  );
}