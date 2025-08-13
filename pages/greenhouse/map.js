import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';
import GreenhouseMap from '@/components/GreenhouseMap';
import { supabase } from '@/lib/supabaseClient';

export default function GreenhouseMapPage() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        setHasAccess(true);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Greenhouse Map</h1>
            <p className="mt-2 text-gray-600">
              Interactive visualization of your greenhouse layout and components
            </p>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="h-[600px] w-full">
              <GreenhouseMap />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-sm">🟢</div>
                <span className="text-sm text-gray-700">Growbeds</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-sm">🔵</div>
                <span className="text-sm text-gray-700">Fish Tanks</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-sm">🟠</div>
                <span className="text-sm text-gray-700">Pumps</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-sm">🟣</div>
                <span className="text-sm text-gray-700">Sensors</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-brown-500 rounded flex items-center justify-center text-white text-sm">🟤</div>
                <span className="text-sm text-gray-700">Pipes</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center text-white text-sm">⚫</div>
                <span className="text-sm text-gray-700">Valves</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm">⚪</div>
                <span className="text-sm text-gray-700">Filters</span>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Active</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Inactive</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Maintenance</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span className="text-sm text-gray-700">Error</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
