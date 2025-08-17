import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SOPs() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [sopPages, setSopPages] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, sopId: null, sopTitle: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchSOPPages();
    }
  }, [user]);

  const fetchSOPPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('page_type', 'sop')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SOP pages:', error);
        return;
      }

      setSopPages(data || []);
    } catch (error) {
      console.error('Error fetching SOP pages:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteSOP = (sopId, sopTitle) => {
    setDeleteConfirm({ show: true, sopId, sopTitle });
  };

  const confirmDeleteSOP = async () => {
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', deleteConfirm.sopId);

      if (error) {
        console.error('Error deleting SOP:', error);
        alert('Failed to delete SOP. Please try again.');
        return;
      }

      // Remove the deleted SOP from the list
      setSopPages(sopPages.filter(sop => sop.id !== deleteConfirm.sopId));
      setDeleteConfirm({ show: false, sopId: null, sopTitle: '' });
              // SOP deleted successfully - no alert needed
    } catch (error) {
      console.error('Error deleting SOP:', error);
      alert('Failed to delete SOP. Please try again.');
    }
  };

  const cancelDeleteSOP = () => {
    setDeleteConfirm({ show: false, sopId: null, sopTitle: '' });
  };

  if (loading || dataLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
                          </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">Delete SOP</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteConfirm.sopTitle}</strong>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={cancelDeleteSOP}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSOP}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <Link
                  href="/greenhouse"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  ← Back to Greenhouse
                </Link>
              </div>
                                   <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                       Standard Operating Procedures
                       {role !== 'admin' && <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(Read Only)</span>}
                     </h1>
                     <p className="text-gray-600 dark:text-gray-400 mt-2">
                       {role === 'admin' 
                         ? 'Access all SOP documents and procedures (published and draft)'
                         : 'View all SOP documents and procedures (published and draft)'
                       }
                     </p>
            </div>

            {/* SOP Pages Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SOP Documents</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {sopPages.length} SOP document{sopPages.length !== 1 ? 's' : ''} available (published and draft)
                </p>
              </div>

              {sopPages.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <p>No SOP documents found.</p>
                  <p className="mt-2 text-sm">
                    Create SOP documents in the{' '}
                    <Link href="/publishing" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                      Publishing
                    </Link>{' '}
                    section.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Priority
                        </th>

                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sopPages.map((sop) => (
                        <tr key={sop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {sop.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              /sops/{sop.slug}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {sop.meta_description || 'No description available'}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              sop.priority >= 8 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              sop.priority >= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {sop.priority || 0}
                            </span>
                          </td>

                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(sop.updated_at || sop.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3">
                              {/* View Icon */}
                              <Link
                                href={`/sops/${sop.slug}`}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View SOP"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              
                              {role === 'admin' && (
                                <>
                                  {/* Edit Icon */}
                                  <Link
                                    href={`/publishing?edit=${sop.id}`}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200"
                                    title="Edit SOP"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </Link>
                                  
                                  {/* Delete Icon */}
                                  <button
                                    onClick={() => handleDeleteSOP(sop.id, sop.title)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                                    title="Delete SOP"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                {role === 'admin' && (
                  <Link
                    href="/publishing"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Create New SOP
                  </Link>
                )}
                <Link
                  href="/greenhouse"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Back to Greenhouse
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">Delete SOP</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteConfirm.sopTitle}</strong>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={cancelDeleteSOP}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSOP}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
