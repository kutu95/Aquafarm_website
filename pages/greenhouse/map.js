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
  const [mapScale, setMapScale] = useState(1);
  const [mapRef, setMapRef] = useState(null);

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
            {/* Map Controls - Added above the map to prevent overlay */}
            {!isEditMode && (
              <div className="mb-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    if (mapRef && mapRef.fitToView) {
                      mapRef.fitToView();
                    }
                  }}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
                >
                  🔍 Fit to View
                </button>
                <button
                  onClick={() => {
                    if (mapRef && mapRef.resetView) {
                      mapRef.resetView();
                    }
                  }}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
                >
                  Reset View
                </button>
                <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md px-3 py-2">
                  <span className="text-sm text-gray-600">Zoom:</span>
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        if (mapRef && mapRef.zoomIn) {
                          mapRef.zoomIn();
                        }
                      }}
                      className="w-4 h-4 flex items-center justify-center text-xs hover:bg-gray-100 rounded"
                      title="Zoom In"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => {
                        if (mapRef && mapRef.zoomOut) {
                          mapRef.zoomOut();
                        }
                      }}
                      className="w-4 h-4 flex items-center justify-center text-xs hover:bg-gray-100 rounded"
                      title="Zoom Out"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="text-sm font-medium">{Math.round(mapScale * 100)}%</span>
                </div>
              </div>
            )}
            
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
                <GreenhouseMap 
                  ref={setMapRef}
                  onScaleChange={setMapScale}
                />
              )}
            </div>
          </div>

          {/* Simple Instructions Panel */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <div className="text-center text-gray-600">
              <p className="text-sm">
                🖱️ Drag to move • 🔼🔽 Use arrow buttons to zoom • 👆 Click components for details • 📏 20m × 20m greenhouse
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
