'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import Layout from '@/components/Layout';

export default function VolunteerApplicationDetail() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const { id } = router.query;
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState([]);
  const [cvUrl, setCvUrl] = useState(null);

  useEffect(() => {
    if (loading) return;
    
    if (!user || role !== 'admin') {
      router.push('/login');
      return;
    }

    if (id) {
      fetchApplication();
    }
  }, [user, role, loading, id]);

  const fetchApplication = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setApplication(data);
      
      // Fetch image URLs if gallery_images exist
      if (data.gallery_images?.length > 0) {
        const imageUrlPromises = data.gallery_images.map(async (imagePath) => {
          const { data: urlData } = await supabase.storage
            .from('volunteer-applications')
            .createSignedUrl(imagePath, 3600); // 1 hour expiry
          return urlData?.signedUrl;
        });
        
        const urls = await Promise.all(imageUrlPromises);
        setImageUrls(urls.filter(url => url));
      }

      // Fetch CV URL if cv_file exists
      if (data.cv_file) {
        const { data: cvUrlData } = await supabase.storage
          .from('volunteer-applications')
          .createSignedUrl(data.cv_file, 3600);
        setCvUrl(cvUrlData?.signedUrl);
      }

    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApplicationStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('volunteer_applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setApplication(prev => ({ ...prev, status: newStatus }));
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  if (loading || !user || role !== 'admin') {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-2">Loading application details...</p>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Application not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Volunteer Application - {application.full_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Submitted on {formatDate(application.created_at)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/volunteer-applications')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Applications
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                  {application.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                </span>
                <select
                  value={application.status || 'pending'}
                  onChange={(e) => updateApplicationStatus(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <p className="text-gray-900 dark:text-white text-lg">{application.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white">{application.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <p className="text-gray-900 dark:text-white">{application.phone_country_code} {application.phone_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <p className="text-gray-900 dark:text-white">{application.current_city}, {application.current_country}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                <p className="text-gray-900 dark:text-white">{application.date_of_birth}</p>
              </div>
            </div>
          </div>

          {/* Availability & Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
              Availability & Skills
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Start Date</label>
                <p className="text-gray-900 dark:text-white">{application.preferred_start_date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stay Details</label>
                <p className="text-gray-900 dark:text-white">{application.stay_details}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relevant Skills</label>
                <p className="text-gray-900 dark:text-white">{application.relevant_skills}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Experience Level</label>
                <p className="text-gray-900 dark:text-white">{application.experience_level}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Languages</label>
                <p className="text-gray-900 dark:text-white">{application.languages_spoken}</p>
              </div>
            </div>
          </div>

          {/* Motivation & Work Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
              Motivation & Work Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Why Applying</label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{application.why_applying}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Experience</label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{application.previous_experience || 'None specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Work Areas</label>
                <p className="text-gray-900 dark:text-white">{application.preferred_work_areas}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Physical Limitations</label>
                <p className="text-gray-900 dark:text-white">{application.physical_limitations}</p>
              </div>
            </div>
          </div>

          {/* Practical Details & Community Fit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
              Practical Details & Community Fit
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport</label>
                <p className="text-gray-900 dark:text-white">{application.transport_ownership}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Visa Status</label>
                <p className="text-gray-900 dark:text-white">{application.visa_status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cultural Exchange Meaning</label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{application.cultural_exchange_meaning}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shared Household Comfort</label>
                <p className="text-gray-900 dark:text-white">{application.comfortable_shared_household}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Handling Challenges</label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{application.handle_challenges}</p>
              </div>
            </div>
          </div>
        </div>

        {/* References */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
            References
          </h2>
          <div>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{application.references}</p>
          </div>
        </div>

        {/* Attached Files */}
        {(imageUrls.length > 0 || cvUrl) && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
              Attached Files
            </h2>
            
            {cvUrl && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">CV/Resume</h3>
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CV/Resume
                </a>
              </div>
            )}

            {imageUrls.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gallery Images ({imageUrls.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg shadow-md"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white bg-black bg-opacity-75 px-3 py-1 rounded-md text-sm"
                        >
                          View Full Size
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
} 