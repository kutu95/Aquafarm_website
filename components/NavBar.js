import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DarkModeToggle from './DarkModeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/locales/translations';

export default function NavBar() {
  const { user, role, setUser, setRole, loading } = useContext(AuthContext);
  const { currentLanguage, changeLanguage, isEnglish, isGerman } = useLanguage();
  const [menuPages, setMenuPages] = useState([]);
  const [productPages, setProductPages] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(false);
  const [isMobileProductsMenuOpen, setIsMobileProductsMenuOpen] = useState(false);
  const [isVolunteeringMenuOpen, setIsVolunteeringMenuOpen] = useState(false);
  const [isMobileVolunteeringMenuOpen, setIsMobileVolunteeringMenuOpen] = useState(false);
  const [isMobileAdminMenuOpen, setIsMobileAdminMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isGreenhouseMode, setIsGreenhouseMode] = useState(false);
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

  // Restore greenhouse mode from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('greenhouseMode');
      if (savedMode !== null) {
        setIsGreenhouseMode(JSON.parse(savedMode));
      }
    } catch (error) {
      console.error('Error parsing saved greenhouse mode:', error);
      // Keep default state (false)
    }
  }, []);

  const toggleGreenhouseMode = () => {
    setIsGreenhouseMode(prev => {
      const newState = !prev;
      // Save to localStorage
      try {
        localStorage.setItem('greenhouseMode', JSON.stringify(newState));
      } catch (error) {
        console.error('Error saving greenhouse mode to localStorage:', error);
      }
      
      // Navigate to appropriate page based on new mode
      if (newState) {
        // Greenhouse mode - navigate to greenhouse page
        router.push('/greenhouse');
      } else {
        // Website mode - navigate to welcome page
        router.push('/welcome');
      }
      
      return newState;
    });
  };

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

      // Clear all Supabase auth data from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('Removed:', key);
      });
      
      // Also clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log('Removed from sessionStorage:', key);
      });
      
      // Clear the auth context state
      console.log('Clearing auth context state...');
      setUser(null);
      setRole(null);
      
      console.log('Session cleared manually');

      // Force clear any other local storage or session data
      if (typeof window !== 'undefined') {
        console.log('Clearing additional local storage...');
        // Clear any other potential auth-related storage
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
      }

      console.log('Redirecting to home page...');
      // Redirect to home page
      router.push('/');
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      router.push('/');
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
              // Show different menus based on mode
              if (isGreenhouseMode && role === 'admin') {
                // Greenhouse menu - only show Admin and Logout
                return null; // No website menu items in greenhouse mode
              } else {
                // Website mode - show regular website menu
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
                  },
                  // Add Products submenu if there are product pages
                  ...(productPages.length > 0 ? [{
                    id: 'products',
                    title: 'Products',
                    priority: 3,
                    type: 'submenu',
                    items: productPages.map(product => ({
                      title: product.title,
                      href: `/${product.slug}`
                    }))
                  }] : [])
                ].sort((a, b) => (a.priority || 0) - (b.priority || 0));

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
              }
            })()}
            <DarkModeToggle />
            
            {/* Language Selector - Only visible to logged-in users */}
            {!loading && user && (
              <div className="relative">
                <select
                  value={currentLanguage}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent border border-gray-600 cursor-pointer"
                >
                  <option value="en">🇺🇸 EN</option>
                  <option value="de">🇩🇪 DE</option>
                </select>
              </div>
            )}
            
            {/* Greenhouse Mode Toggle - Available to all logged-in users */}
            {!loading && user && (
              <button
                onClick={toggleGreenhouseMode}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isGreenhouseMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                title={isGreenhouseMode ? 'Switch to Website Mode' : 'Switch to Greenhouse Mode'}
              >
                {isGreenhouseMode ? '🌱' : '🏠'}
              </button>
            )}
            
            {/* Greenhouse Menu Items - shown when in greenhouse mode */}
            {isGreenhouseMode && user && (
              <>
                <Link
                  href="/greenhouse"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.asPath === '/greenhouse'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Greenhouse
                </Link>
                <Link
                  href="/greenhouse/crops"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.asPath === '/greenhouse/crops'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Crops
                </Link>
                <Link
                  href="/greenhouse/seeding"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.asPath === '/greenhouse/seeding'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Seeding
                </Link>
                <Link
                  href="/greenhouse/sops"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.asPath === '/greenhouse/sops'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  SOP's
                </Link>
                <Link
                  href="/greenhouse/map"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.asPath === '/greenhouse/map'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  🗺️ Map
                </Link>
              </>
            )}
            
            {user ? (
              <>
                {/* Debug logging for production */}
        
                {/* Admin submenu, always before Logout, only for admin users */}
                {!loading && role === 'admin' && (
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
                      {!isGreenhouseMode && (
                        <Link href="/greenhouse" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Greenhouse</Link>
                      )}
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
          {/* Greenhouse Mode Toggle - Mobile - Available to all logged-in users */}
          {!loading && user && (
            <div className="border-b border-gray-700 pb-2 mb-2">
              <button
                onClick={() => {
                  toggleGreenhouseMode();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isGreenhouseMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                title={isGreenhouseMode ? 'Switch to Website Mode' : 'Switch to Greenhouse Mode'}
              >
                {isGreenhouseMode ? '🌱 Switch to Website Mode' : '🏠 Switch to Greenhouse Mode'}
              </button>
            </div>
          )}
          
          {(() => {
            // Show different menus based on mode
            if (isGreenhouseMode && user) {
              // Greenhouse mode - show greenhouse menu items
              return (
                <>
                  <div className="border-t border-gray-700 pt-2">
                    <div className="px-3 py-2 text-sm font-medium text-gray-400">
                      Greenhouse Mode
                    </div>
                  </div>
                  <Link
                    href="/greenhouse"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Greenhouse
                  </Link>
                  <Link
                    href="/greenhouse/crops"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Crops
                  </Link>
                  <Link
                    href="/greenhouse/seeding"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Seeding
                  </Link>
                  <Link
                    href="/greenhouse/sops"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    SOP's
                  </Link>
                  <Link
                    href="/greenhouse/map"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Map
                  </Link>
                  <Link
                    href="/water-chemistry"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    🧪 Water Chemistry
                  </Link>
                </>
              );
            } else {
              // Website mode - show regular website menu
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
                },
                // Add Products submenu if there are product pages
                ...(productPages.length > 0 ? [{
                  id: 'products',
                  title: 'Products',
                  priority: 3,
                  type: 'submenu',
                  items: productPages.map(product => ({
                    title: product.title,
                    href: `/${product.slug}`
                  }))
                }] : []),
                // Add Admin submenu for admin users
                ...(user && role === 'admin' ? [{
                  id: 'admin',
                  title: 'Admin',
                  priority: 9,
                  type: 'submenu',
                  items: [
                    { title: 'Dashboard', href: '/dashboard' },
                    { title: 'Publishing', href: '/publishing' },
                    { title: 'Media Library', href: '/media-library' },
                    { title: 'Volunteer Inductions', href: '/volunteer-inductions' },
                    { title: 'Volunteer Applications', href: '/volunteer-applications' },
                    { title: 'Manage Users', href: '/admin/users' },
                    { title: 'Template Management', href: '/template-management' },
                    ...(isGreenhouseMode ? [] : [{ title: 'Greenhouse', href: '/greenhouse' }])
                  ]
                }] : [])
              ].sort((a, b) => (a.priority || 0) - (b.priority || 0));

            return combinedMenu.map((item) => {
              if (item.type === 'submenu') {
                const isOpen = item.id === 'volunteering' ? isMobileVolunteeringMenuOpen : 
                               item.id === 'products' ? isMobileProductsMenuOpen :
                               item.id === 'admin' ? isMobileAdminMenuOpen : false;
                const setIsOpen = item.id === 'volunteering' ? setIsMobileVolunteeringMenuOpen : 
                                 item.id === 'products' ? setIsMobileProductsMenuOpen :
                                 item.id === 'admin' ? setIsMobileAdminMenuOpen : () => {};
                
                return (
                  <div key={item.id} className="border-t border-gray-700 pt-2">
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {item.title}
                    </button>
                    {isOpen && (
                      <div className="pl-4 space-y-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="block px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setIsOpen(false);
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
          }
        })()}
        
        {/* Language Selector - Mobile - Only for logged in users */}
        {user && (
          <div className="border-t border-gray-700 pt-2">
            <div className="px-3 py-2 text-sm font-medium text-gray-400">
              Language / Sprache
            </div>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="mx-3 mb-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 cursor-pointer w-full"
            >
              <option value="en">🇺🇸 English</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </div>
        )}
        
        {user ? (
            <>
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