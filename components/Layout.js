import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
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
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left-aligned page menu */}
            <div className="flex items-center space-x-4">
              {menuItems.map((item) => (
                <Link 
                  key={item.id}
                  href={`/${item.slug}`} 
                  className="text-gray-700 hover:text-gray-900"
                >
                  {item.title}
                </Link>
              ))}
            </div>

            {/* Right-aligned admin menu and login/logout */}
            <div className="flex items-center space-x-4">
              {user && role === 'admin' && (
                <div className="relative group">
                  <button className="text-gray-700 hover:text-gray-900 group-hover:text-gray-900">
                    Admin
                  </button>
                  {/* Transparent bridge to prevent menu from disappearing */}
                  <div className="absolute right-0 w-48 invisible group-hover:visible">
                    <div className="h-2 w-full"></div>
                    <div className="bg-white border rounded-lg shadow-lg py-1">
                      <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link href="/media-library" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Media Library
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              ) : (
                <Link href="/login" className="text-gray-700 hover:text-gray-900">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
} 