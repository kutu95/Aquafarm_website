import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function DebugAuth() {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setUser(null);
        } else {
          setUser(session?.user || null);
          
          if (session?.user) {
            // Get detailed user info
            const { data, error: userError } = await supabase.auth.getUser();
            if (!userError && data?.user) {
              setUserDetails(data.user);
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user || null);
      
      if (session?.user) {
        supabase.auth.getUser().then(({ data, error }) => {
          if (!error && data?.user) {
            setUserDetails(data.user);
          }
        });
      } else {
        setUserDetails(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Auth Status</h2>
        <div className="space-y-2">
          <p><strong>User:</strong> {user ? 'Logged in' : 'Not logged in'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
          <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
        </div>
      </div>

      {userDetails && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Detailed User Info</h2>
          <div className="space-y-2">
            <p><strong>User Metadata:</strong></p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(userDetails.user_metadata, null, 2)}
            </pre>
            <p><strong>App Metadata:</strong></p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(userDetails.app_metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
          >
            Try Dashboard
          </button>
          <button
            onClick={() => router.push('/volunteer-applications')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
          >
            Try Volunteer Applications
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
} 