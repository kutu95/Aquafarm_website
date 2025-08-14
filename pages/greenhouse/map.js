import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';
import GreenhouseMap from '@/components/GreenhouseMap';
import GreenhouseMapEditor from '@/components/GreenhouseMapEditor';
import { supabase } from '@/lib/supabaseClient';

export default function GreenhouseMapPage() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Greenhouse Map</h1>
              <p className="mt-2 text-gray-600">
                Interactive visualization of your greenhouse layout and components
              </p>
            </div>
            
            {/* Edit Mode Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {isEditMode ? 'Edit Mode' : 'View Mode'}
              </span>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isEditMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isEditMode ? '👁️ View' : '✏️ Edit'}
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="h-[600px] w-full">
              {isEditMode ? (
                <GreenhouseMapEditor 
                  onSave={() => {
                    setIsEditMode(false);
                    // Refresh the view mode
                  }}
                  onCancel={() => setIsEditMode(false)}
                />
              ) : (
                <GreenhouseMap />
              )}
            </div>
          </div>

          {/* Simple Instructions Panel */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <div className="text-center text-gray-600">
              <p className="text-sm">
                🖱️ Drag to move • 🔍 Scroll to zoom • 👆 Click components for details • 📏 20m × 20m greenhouse
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
