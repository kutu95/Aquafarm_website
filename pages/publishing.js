import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import TinyMCE from '../components/TinyMCE';
import { trackEvent } from '../components/GoogleAnalytics';

export default function Publishing() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPageList, setShowPageList] = useState(true);
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
    content: '',
    meta_description: '',
    meta_title: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots_meta: 'index, follow',
    is_published: false,
    priority: 0,
    security: 'open'
  });
  const [resizeLoading, setResizeLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [ogExpanded, setOgExpanded] = useState(false);
  const [editSeoExpanded, setEditSeoExpanded] = useState(false);
  const [editOgExpanded, setEditOgExpanded] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(true);
  const [editTitleExpanded, setEditTitleExpanded] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    checkUser();
    fetchPages();
  }, []);

  // Handle edit parameter from URL
  useEffect(() => {
    if (router.query.edit && pages.length > 0) {
      const pageToEdit = pages.find(page => page.id.toString() === router.query.edit);
      if (pageToEdit) {
        setSelectedPage(pageToEdit);
        setShowCreateForm(false);
        setShowPageList(true);
      }
    }
  }, [router.query.edit, pages]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(user);
    setIsLoading(false);
  };

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pages:', error);
      return;
    }

    setPages(data || []);
  };

  const handlePageSelect = (page) => {
    setSelectedPage(page);
    setShowCreateForm(false);
  };

  const handleSave = async () => {
    if (!selectedPage) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({
          title: selectedPage.title,
          slug: selectedPage.slug,
          content: selectedPage.content,
          meta_description: selectedPage.meta_description,
          meta_title: selectedPage.meta_title,
          og_title: selectedPage.og_title,
          og_description: selectedPage.og_description,
          og_image: selectedPage.og_image,
          canonical_url: selectedPage.canonical_url,
          robots_meta: selectedPage.robots_meta,
          is_published: selectedPage.is_published,
          priority: selectedPage.priority,
          security: selectedPage.security,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPage.id)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Update the pages list
      const updatedPages = pages.map(p => p.id === selectedPage.id ? selectedPage : p);
      setPages(updatedPages);
      
      // Also refresh the pages to make sure we have the latest data
      await fetchPages();
      
      trackEvent('page_updated', 'publishing', 'page_edit', 1);
      alert('Page updated successfully!');
    } catch (error) {
      console.error('Error updating page:', error);
      trackEvent('page_update_failed', 'publishing', 'page_edit', 0);
      alert(`Error updating page: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPage.title || !newPage.slug) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .insert([{
          title: newPage.title,
          slug: newPage.slug,
          content: newPage.content,
          meta_description: newPage.meta_description,
          meta_title: newPage.meta_title,
          og_title: newPage.og_title,
          og_description: newPage.og_description,
          og_image: newPage.og_image,
          canonical_url: newPage.canonical_url,
          robots_meta: newPage.robots_meta,
          is_published: newPage.is_published,
          priority: newPage.priority,
          security: newPage.security
        }]);

      if (error) throw error;

      trackEvent('page_created', 'publishing', 'page_creation', 1);
      alert('Page created successfully!');
      
      // Reset form and refresh pages
      setNewPage({
        title: '',
        slug: '',
        content: '',
        meta_description: '',
        meta_title: '',
        og_title: '',
        og_description: '',
        og_image: '',
        canonical_url: '',
        robots_meta: 'index, follow',
        is_published: false,
        priority: 0,
        security: 'open'
      });
      setShowCreateForm(false);
      fetchPages();
    } catch (error) {
      console.error('Error creating page:', error);
      trackEvent('page_creation_failed', 'publishing', 'page_creation', 0);
      alert('Error creating page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      trackEvent('page_deleted', 'publishing', 'page_deletion', 1);
      alert('Page deleted successfully!');
      
      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      trackEvent('page_deletion_failed', 'publishing', 'page_deletion', 0);
      alert('Error deleting page. Please try again.');
    }
  };

  // Auto-save functionality
  const autoSave = async (pageData) => {
    if (!pageData || !pageData.id) return;
    
    setAutoSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('pages')
        .update({
          title: pageData.title,
          slug: pageData.slug,
          content: pageData.content,
          meta_description: pageData.meta_description,
          meta_title: pageData.meta_title,
          og_title: pageData.og_title,
          og_description: pageData.og_description,
          og_image: pageData.og_image,
          canonical_url: pageData.canonical_url,
          robots_meta: pageData.robots_meta,
          is_published: pageData.is_published,
          priority: pageData.priority,
          security: pageData.security,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageData.id);

      if (error) throw error;

      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      
      // Clear saved status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!selectedPage || !selectedPage.id) return;

    const timeoutId = setTimeout(() => {
      autoSave(selectedPage);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [selectedPage]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Publishing</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPageList(!showPageList)}
              className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              {showPageList ? 'Hide Page List' : 'Show Page List'}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Page
            </button>
          </div>
        </div>

        <div className={`grid gap-8 ${showPageList ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* Pages List */}
          {showPageList && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Pages</h2>
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedPage?.id === page.id
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => handlePageSelect(page)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{page.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">/{page.slug}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              page.is_published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {page.is_published ? 'Published' : 'Draft'}
                            </span>
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Priority: {page.priority || 0}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              page.security === 'admin' ? 'bg-red-100 text-red-800' :
                              page.security === 'user' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {page.security || 'open'}
                            </span>
                          </div>
                          <div className="mt-2">
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Preview Page
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePage(page.id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Page Editor */}
          <div className={showPageList ? 'lg:col-span-2' : 'col-span-1'}>
            {showCreateForm ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Page</h2>
                <div className="space-y-4">
                  {/* Title Settings Panel */}
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTitleExpanded(!titleExpanded)}
                      className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg border-b border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Title Settings</h3>
                        <svg
                          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${titleExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {titleExpanded && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={newPage.title}
                            onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Page title"
                            maxLength="100"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {newPage.title?.length || 0}/100 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Slug *
                          </label>
                          <input
                            type="text"
                            value={newPage.slug}
                            onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="page-slug"
                            maxLength="50"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {newPage.slug?.length || 0}/50 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Meta Description
                          </label>
                          <textarea
                            value={newPage.meta_description}
                            onChange={(e) => setNewPage({ ...newPage, meta_description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows="3"
                            placeholder="SEO meta description"
                            maxLength="160"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {newPage.meta_description?.length || 0}/160 characters
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* SEO Fields Section */}
                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      {/* Basic SEO Panel */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSeoExpanded(!seoExpanded)}
                          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">SEO Settings</h3>
                            <svg
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${seoExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {seoExpanded && (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Meta Title
                              </label>
                              <input
                                type="text"
                                value={newPage.meta_title}
                                onChange={(e) => setNewPage({ ...newPage, meta_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Custom title for search results (50-60 characters)"
                                maxLength="60"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {newPage.meta_title?.length || 0}/60 characters
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Canonical URL
                              </label>
                              <input
                                type="url"
                                value={newPage.canonical_url}
                                onChange={(e) => setNewPage({ ...newPage, canonical_url: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com/page-url"
                              />
                              <p className="text-xs text-gray-500 mt-1">Leave empty to use default URL</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Robots Meta Tag
                              </label>
                              <select
                                value={newPage.robots_meta}
                                onChange={(e) => setNewPage({ ...newPage, robots_meta: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="index, follow">Index, Follow</option>
                                <option value="noindex, follow">No Index, Follow</option>
                                <option value="index, nofollow">Index, No Follow</option>
                                <option value="noindex, nofollow">No Index, No Follow</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Open Graph Panel */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setOgExpanded(!ogExpanded)}
                          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Open Graph (Social Media)</h3>
                            <svg
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${ogExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {ogExpanded && (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Title
                              </label>
                              <input
                                type="text"
                                value={newPage.og_title}
                                onChange={(e) => setNewPage({ ...newPage, og_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Title for social media shares"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Description
                              </label>
                              <textarea
                                value={newPage.og_description}
                                onChange={(e) => setNewPage({ ...newPage, og_description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Description for social media shares"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Image URL
                              </label>
                              <input
                                type="url"
                                value={newPage.og_image}
                                onChange={(e) => setNewPage({ ...newPage, og_image: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com/image.jpg"
                              />
                              <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630 pixels</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPage.is_published}
                        onChange={(e) => setNewPage({ ...newPage, is_published: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newPage.priority}
                        onChange={(e) => setNewPage({ ...newPage, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Higher numbers = higher priority</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Level
                      </label>
                      <select
                        value={newPage.security}
                        onChange={(e) => setNewPage({ ...newPage, security: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="open">Open - Anyone can view</option>
                        <option value="user">User - Logged in users only</option>
                        <option value="admin">Admin - Administrators only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <TinyMCE
                      value={newPage.content}
                      onChange={(content) => setNewPage({ ...newPage, content })}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreatePage}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Creating...' : 'Create Page'}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedPage ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Edit Page: {selectedPage.title}</h2>
                  <div className="flex items-center space-x-2">
                    {autoSaveStatus === 'saving' && (
                      <div className="flex items-center text-blue-600">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <div className="flex items-center text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm">Saved</span>
                      </div>
                    )}
                    {autoSaveStatus === 'error' && (
                      <div className="flex items-center text-red-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">Save failed</span>
                      </div>
                    )}
                    {lastSaved && (
                      <span className="text-xs text-gray-500">
                        Last saved: {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Title Settings Panel */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditTitleExpanded(!editTitleExpanded)}
                      className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Title Settings</h3>
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${editTitleExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {editTitleExpanded && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={selectedPage.title}
                            onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength="100"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedPage.title?.length || 0)}/100 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Slug
                          </label>
                          <input
                            type="text"
                            value={selectedPage.slug}
                            onChange={(e) => setSelectedPage({ ...selectedPage, slug: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength="50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedPage.slug?.length || 0)}/50 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meta Description
                          </label>
                          <textarea
                            value={selectedPage.meta_description}
                            onChange={(e) => setSelectedPage({ ...selectedPage, meta_description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            maxLength="160"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedPage.meta_description?.length || 0)}/160 characters
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* SEO Fields Section */}
                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      {/* Basic SEO Panel */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setEditSeoExpanded(!editSeoExpanded)}
                          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">SEO Settings</h3>
                            <svg
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${editSeoExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {editSeoExpanded && (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Meta Title
                              </label>
                              <input
                                type="text"
                                value={selectedPage.meta_title || ''}
                                onChange={(e) => setSelectedPage({ ...selectedPage, meta_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Custom title for search results (50-60 characters)"
                                maxLength="60"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {(selectedPage.meta_title?.length || 0)}/60 characters
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Canonical URL
                              </label>
                              <input
                                type="url"
                                value={selectedPage.canonical_url || ''}
                                onChange={(e) => setSelectedPage({ ...selectedPage, canonical_url: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com/page-url"
                              />
                              <p className="text-xs text-gray-500 mt-1">Leave empty to use default URL</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Robots Meta Tag
                              </label>
                              <select
                                value={selectedPage.robots_meta || 'index, follow'}
                                onChange={(e) => setSelectedPage({ ...selectedPage, robots_meta: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="index, follow">Index, Follow</option>
                                <option value="noindex, follow">No Index, Follow</option>
                                <option value="index, nofollow">Index, No Follow</option>
                                <option value="noindex, nofollow">No Index, No Follow</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Open Graph Panel */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setEditOgExpanded(!editOgExpanded)}
                          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Open Graph (Social Media)</h3>
                            <svg
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${editOgExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {editOgExpanded && (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Title
                              </label>
                              <input
                                type="text"
                                value={selectedPage.og_title || ''}
                                onChange={(e) => setSelectedPage({ ...selectedPage, og_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Title for social media shares"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Description
                              </label>
                              <textarea
                                value={selectedPage.og_description || ''}
                                onChange={(e) => setSelectedPage({ ...selectedPage, og_description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Description for social media shares"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OG Image URL
                              </label>
                              <input
                                type="url"
                                value={selectedPage.og_image || ''}
                                onChange={(e) => setSelectedPage({ ...selectedPage, og_image: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com/image.jpg"
                              />
                              <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630 pixels</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPage.is_published}
                        onChange={(e) => setSelectedPage({ ...selectedPage, is_published: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Published</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedPage.priority || 0}
                        onChange={(e) => setSelectedPage({ ...selectedPage, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Higher numbers = higher priority</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Level
                      </label>
                      <select
                        value={selectedPage.security || 'open'}
                        onChange={(e) => setSelectedPage({ ...selectedPage, security: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="open">Open - Anyone can view</option>
                        <option value="user">User - Logged in users only</option>
                        <option value="admin">Admin - Administrators only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <TinyMCE
                      value={selectedPage.content}
                      onChange={(content) => setSelectedPage({ ...selectedPage, content })}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                  <p>Select a page from the list to edit, or create a new page.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 