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
    await supabase.auth.signOut();
    router.push('/');
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