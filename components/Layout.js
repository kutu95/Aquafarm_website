import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import NavBar from './NavBar';
import Footer from './Footer';

export default function Layout({ children }) {
  const { user, role } = useContext(AuthContext);
  const router = useRouter();
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('title, slug, priority')
          .gt('priority', 0)
          .order('priority');
        
        if (!error && data) {
          setMenuItems(data);
        }
      } catch (error) {
        console.error('Error fetching menu items:', error);
      }
    };

    fetchMenuItems();
  }, []);

  const handleLogout = async () => {
    try {
      // Track logout event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'logout', {
          event_category: 'authentication',
          event_label: 'user_logout',
          value: 1
        });
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }

      // Force clear any local storage or session data
      if (typeof window !== 'undefined') {
        // Clear any cached auth data
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Clear any other potential auth-related storage
        localStorage.removeItem('supabase.auth.expires_at');
        localStorage.removeItem('supabase.auth.refresh_token');
        sessionStorage.removeItem('supabase.auth.expires_at');
        sessionStorage.removeItem('supabase.auth.refresh_token');
        
        // Clear any user-related data
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
      }

      // Redirect to home page
      router.push('/');
      
      // Force a page reload to ensure clean state (only in production)
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      router.push('/');
      
      // Force reload in production even on error
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="container mx-auto px-4 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
} 