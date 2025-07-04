import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './_app';
import { useRouter } from 'next/router';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function VolunteerInductions() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log('VolunteerInductions - User:', user?.email, 'Role:', role, 'Loading:', loading);
    
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
      console.log('User is admin, loading inductions');
      loadApplications();
    }
  }, [user, role, loading]);

  const loadApplications = async () => {
    try {
      console.log('Loading volunteer inductions...');
      
      // First, let's test if we can access the table at all
      const { data: testData, error: testError } = await supabase
        .from('volunteer_inductions')
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
        return;
      }
      
      console.log('Test query successful, table exists');
      
      // Now get all applications
      const { data, error } = await supabase
        .from('volunteer_inductions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading inductions:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      console.log('Inductions loaded:', data);
      console.log('Number of inductions:', data?.length || 0);
      setApplications(data || []);
    } catch (error) {
      console.error('Catch block error:', error);
      console.error('Error stack:', error.stack);
    } finally {
      setIsLoading(false);
    }
  };

  const getPassportUrl = async (path) => {
    if (!path) return null;
    
    try {
      const { data } = await supabase
        .storage
        .from('volunteer-documents')
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      return data?.signedUrl;
    } catch (error) {
      console.error('Error getting passport URL:', error);
      return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const openApplicationModal = async (application) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
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
              Volunteer Inductions
            </h1>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading inductions...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No volunteer inductions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        Nationality
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
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {application.phone_country_code} {application.phone_number}
                          </div>
                          {application.whatsapp && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              WhatsApp
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {application.nationality}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(application.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openApplicationModal(application)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
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

      {/* Application Detail Modal */}
      {isModalOpen && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Volunteer Induction - {selectedApplication.first_name} {selectedApplication.last_name}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedApplication.first_name} {selectedApplication.last_name}</p>
                    <p><span className="font-medium">Nationality:</span> {selectedApplication.nationality}</p>
                    <p><span className="font-medium">Date of Birth:</span> {formatDate(selectedApplication.date_of_birth)}</p>
                    <p><span className="font-medium">Email:</span> {selectedApplication.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedApplication.phone_country_code} {selectedApplication.phone_number}</p>
                    {selectedApplication.whatsapp && (
                      <p><span className="font-medium">WhatsApp:</span> Available</p>
                    )}
                  </div>
                </div>

                {/* Health Insurance */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Health Insurance</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Company:</span> {selectedApplication.health_insurance_company}</p>
                    <p><span className="font-medium">Policy Name:</span> {selectedApplication.health_insurance_policy_name}</p>
                    <p><span className="font-medium">Policy Number:</span> {selectedApplication.health_insurance_policy_number}</p>
                    <p><span className="font-medium">Expiry Date:</span> {formatDate(selectedApplication.health_insurance_expiry_date)}</p>
                  </div>
                </div>

                {/* Next of Kin */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Next of Kin</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedApplication.next_of_kin_name}</p>
                    <p><span className="font-medium">Relation:</span> {selectedApplication.next_of_kin_relation}</p>
                    <p><span className="font-medium">Phone:</span> {selectedApplication.next_of_kin_country_code} {selectedApplication.next_of_kin_phone}</p>
                    <p><span className="font-medium">Email:</span> {selectedApplication.next_of_kin_email}</p>
                  </div>
                </div>

                {/* Other Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Other Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Additional Notes:</span></p>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded">
                      {selectedApplication.other_information || 'No additional information provided.'}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Privacy Policy Agreed:</span>{' '}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedApplication.privacy_policy_agreed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedApplication.privacy_policy_agreed ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Passport Image */}
              {selectedApplication.passport_image_path && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Passport Image</h4>
                  <PassportViewer path={selectedApplication.passport_image_path} />
                </div>
              )}

              {/* Application Dates */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <p><span className="font-medium">Submitted:</span> {formatDate(selectedApplication.created_at)}</p>
                  <p><span className="font-medium">Last Updated:</span> {formatDate(selectedApplication.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

// Passport Image Viewer Component
function PassportViewer({ path }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Use the new API route for signed URLs
        const response = await fetch(`/api/media/signed-url?fileName=${encodeURIComponent(path)}&bucket=volunteer-documents`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.signedUrl) {
          setImageUrl(data.signedUrl);
        } else {
          setError('Unable to load image');
        }
      } catch (err) {
        console.error('Error loading passport image:', err);
        setError('Error loading image');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-48 rounded"></div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="max-w-md">
      <img
        src={imageUrl}
        alt="Passport"
        className="w-full h-auto rounded border"
        onError={() => setError('Failed to load image')}
      />
    </div>
  );
} 