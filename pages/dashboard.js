import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './_app';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function Dashboard() {
  const { user, role, loading } = useContext(AuthContext);
  const [loginEvents, setLoginEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard - User:', user?.email, 'Role:', role, 'Loading:', loading);
    
    if (loading) {
      return; // Wait for auth to load
    }
    
    if (user && role === 'admin') {
      console.log('User is admin, loading dashboard');
      fetchLoginEvents();
    } else if (user === null) {
      console.log('No user, redirecting to login');
      router.push('/login');
    } else {
      console.log('User not admin, redirecting to home');
      router.push('/');
    }
  }, [user, role, loading]);

  const fetchLoginEvents = async () => {
    setIsLoadingEvents(true);
    try {
      // This would typically come from your analytics database
      // For now, we'll simulate some login event data
      const mockLoginEvents = [
        {
          id: 1,
          user_email: 'admin@aquafarm.au',
          event_type: 'login_success',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.1'
        },
        {
          id: 2,
          user_email: 'user@example.com',
          event_type: 'login_success',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.2'
        },
        {
          id: 3,
          user_email: 'unknown@example.com',
          event_type: 'login_failed',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.3'
        }
      ];
      
      setLoginEvents(mockLoginEvents);
    } catch (error) {
      console.error('Error fetching login events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  if (loading || user === null || role === null) {
    return <div className="p-6">Checking auth...</div>;
  }

  if (!user || role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <NavBar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Link
              href="/publishing"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Publishing
            </Link>
            <Link
              href="/admin/users"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Manage Users
            </Link>
            <Link
              href="/volunteer-applications"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View Volunteer Applications
            </Link>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <AnalyticsDashboard />
        </div>

        {/* Login Events */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Recent Login Events</h2>
          {isLoadingEvents ? (
            <div className="text-center py-4">Loading login events...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loginEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {event.user_email}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.event_type === 'login_success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {event.event_type === 'login_success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {event.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">24</p>
            <p className="text-sm text-gray-500">+12% from last month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h3>
            <p className="text-3xl font-bold text-green-600">8</p>
            <p className="text-sm text-gray-500">Currently online</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed Logins</h3>
            <p className="text-3xl font-bold text-red-600">3</p>
            <p className="text-sm text-gray-500">Last 24 hours</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}