import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './_app';
import { useRouter } from 'next/router';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function VolunteerApplications() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('VolunteerApplications - User:', user?.email, 'Role:', role, 'Loading:', loading);
    
    if (loading) {
      return; // Wait for auth to load
    }
    
    if (user === null) {
      console.log('No user, redirecting to login');
      router.push('/login');
    } else if (user && role !== 'admin') {
      console.log('User not admin, redirecting to home');
      router.push('/');
    } else if (user && role === 'admin') {
      console.log('User is admin, loading applications');
      loadApplications();
    }
  }, [user, role, loading]);

  const loadApplications = async () => {
    try {
      console.log('Loading volunteer applications...');
      setError(null);
      
      // First, let's test if we can access the table at all
      const { data: testData, error: testError } = await supabase
        .from('volunteer_applications')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Test query error:', testError);
        console.error('Test error details:', {
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        });
        setError(`Database access error: ${testError.message}`);
        return;
      }
      
      console.log('Test query successful, table exists');
      console.log('Test data:', testData);
      
      // Now get all applications
      const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading applications:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setError(`Error loading applications: ${error.message}`);
        return;
      }

      console.log('Applications loaded:', data);
      console.log('Number of applications:', data?.length || 0);
      console.log('Raw data structure:', JSON.stringify(data, null, 2));
      setApplications(data || []);
    } catch (error) {
      console.error('Catch block error:', error);
      console.error('Error stack:', error.stack);
      setError(`Unexpected error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Volunteer Applications
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <strong>Error:</strong> {error}
                <button 
                  onClick={loadApplications}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No volunteer applications found.</p>
                <button 
                  onClick={loadApplications}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4 text-sm text-gray-600">
                  Found {applications.length} application(s)
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {application.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {application.phone_country_code} {application.phone_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {application.current_city}, {application.current_country}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(application.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/volunteer-application-detail?id=${application.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}