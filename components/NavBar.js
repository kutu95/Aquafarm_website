import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DarkModeToggle from './DarkModeToggle';

export default function NavBar() {
  const { user, role } = useContext(AuthContext);
  const [menuPages, setMenuPages] = useState([]);
  const [productPages, setProductPages] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(false);
  const [isMobileProductsMenuOpen, setIsMobileProductsMenuOpen] = useState(false);
  const [isVolunteeringMenuOpen, setIsVolunteeringMenuOpen] = useState(false);
  const [isMobileVolunteeringMenuOpen, setIsMobileVolunteeringMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        setMenuPages(data.menuItems || []);
        setProductPages(data.productItems || []);
      } catch (error) {
        console.error('Error fetching menu data:', error);
        // Fallback to empty arrays
        setMenuPages([]);
        setProductPages([]);
      }
    };

    fetchMenuData();
  }, []);

  const handleLogout = async () => {
    try {
      console.log('Logout initiated');
      
      // Track logout event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'logout', {
          event_category: 'authentication',
          event_label: 'user_logout',
          value: 1
        });
      }

      // Call server-side logout API
      console.log('Calling server-side logout...');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Server-side logout successful');

      // Also call client-side logout to update auth context
      console.log('Calling client-side logout...');
      const { error: clientError } = await supabase.auth.signOut();
      if (clientError) {
        console.error('Client-side logout error:', clientError);
      } else {
        console.log('Client-side logout successful');
      }

      // Force clear any local storage or session data
      if (typeof window !== 'undefined') {
        console.log('Clearing local storage...');
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

      console.log('Redirecting to home page...');
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
    <nav className="bg-gray-800 text-white relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Margaret River Aquafarm
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {(() => {
              // Create a combined menu array with regular pages and submenus
              const combinedMenu = [
                ...menuPages.map(page => ({ ...page, type: 'page' })),
                {
                  id: 'volunteering',
                  title: 'Volunteering',
                  priority: 4,
                  type: 'submenu',
                  items: [
                    { title: 'About Volunteering', href: '/volunteer' },
                    { title: 'What to Expect', href: '/volunteering-description' },
                    { title: 'Apply to Volunteer', href: '/volunteer-application' }
                  ]
                }
              ].sort((a, b) => (b.priority || 0) - (a.priority || 0));

              return combinedMenu.map((item) => {
                if (item.type === 'submenu') {
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => setOpenSubmenu(item.id)}
                      onMouseLeave={() => setOpenSubmenu(null)}
                    >
                      <button
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        {item.title}
                      </button>
                      <div
                        className={`absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 transition-opacity duration-200 z-50 border border-gray-200 ${
                          openSubmenu === item.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <Link
                      key={item.slug}
                      href={`/${item.slug}`}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        router.asPath === `/${item.slug}`
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {item.title}
                    </Link>
                  );
                }
              });
            })()}

            {/* Products menu */}
            {productPages.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setIsProductsMenuOpen(true)}
                onMouseLeave={() => setIsProductsMenuOpen(false)}
              >
                <button
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Products
                </button>
                <div
                  className={`absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 transition-opacity duration-200 z-50 border border-gray-200 ${
                    isProductsMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                  {productPages.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/${product.slug}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {product.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <DarkModeToggle />
            {user ? (
              <>
                {/* Debug info */}
                {console.log('NavBar Debug:', { user: !!user, role, isAdmin: role === 'admin' })}
                {/* Admin submenu, always before Logout, only for admin users */}
                {/* Debug: User={!!user}, Role={role}, IsAdmin={role === 'admin' ? 'Yes' : 'No'} */}
                {role === 'admin' && (
                  <div
                    className="relative"
                    onMouseEnter={() => setOpenSubmenu('admin')}
                    onMouseLeave={() => setOpenSubmenu(null)}
                  >
                    <button
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Admin
                    </button>
                    <div
                      className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 transition-opacity duration-200 z-50 border border-gray-200 ${
                        openSubmenu === 'admin' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                      <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</Link>
                      <Link href="/publishing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Publishing</Link>
                      <Link href="/media-library" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Media Library</Link>
                      <Link href="/volunteer-inductions" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Volunteer Inductions</Link>
                      <Link href="/volunteer-applications" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Volunteer Applications</Link>
                      <Link href="/admin/users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Manage Users</Link>
                      <Link href="/template-management" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Template Management</Link>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === '/login'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {(() => {
            // Create a combined menu array with regular pages and submenus
            const combinedMenu = [
              ...menuPages.map(page => ({ ...page, type: 'page' })),
              {
                id: 'volunteering',
                title: 'Volunteering',
                priority: 4,
                type: 'submenu',
                items: [
                  { title: 'About Volunteering', href: '/volunteer' },
                  { title: 'What to Expect', href: '/volunteering-description' },
                  { title: 'Apply to Volunteer', href: '/volunteer-application' }
                ]
              }
            ].sort((a, b) => (b.priority || 0) - (a.priority || 0));

            return combinedMenu.map((item) => {
              if (item.type === 'submenu') {
                return (
                  <div key={item.id} className="border-t border-gray-700 pt-2">
                    <button
                      onClick={() => setIsMobileVolunteeringMenuOpen(!isMobileVolunteeringMenuOpen)}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {item.title}
                    </button>
                    {isMobileVolunteeringMenuOpen && (
                      <div className="pl-4 space-y-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="block px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setIsMobileVolunteeringMenuOpen(false);
                            }}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <Link
                    key={item.slug}
                    href={`/${item.slug}`}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      router.asPath === `/${item.slug}`
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                );
              }
            });
          })()}
          {/* Mobile Products menu */}
          {productPages.length > 0 && (
            <div className="border-t border-gray-700 pt-2">
              <button
                onClick={() => setIsMobileProductsMenuOpen(!isMobileProductsMenuOpen)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Products
              </button>
              {isMobileProductsMenuOpen && (
                <div className="pl-4 space-y-1">
                  {productPages.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/${product.slug}`}
                      className="block px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsMobileProductsMenuOpen(false);
                      }}
                    >
                      {product.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {user ? (
            <>
              {role === 'admin' && (
                <>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/publishing"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Publishing
                  </Link>
                  <Link
                    href="/media-library"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Media Library
                  </Link>
                  <Link
                    href="/volunteer-inductions"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Volunteer Inductions
                  </Link>
                  <Link
                    href="/volunteer-applications"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Volunteer Applications
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Manage Users
                  </Link>
                  <Link
                    href="/template-management"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Template Management
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}