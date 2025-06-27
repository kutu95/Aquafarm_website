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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Publishing</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPageList(!showPageList)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Pages</h2>
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedPage?.id === page.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => handlePageSelect(page)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{page.title}</h3>
                          <p className="text-sm text-gray-500">/{page.slug}</p>
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Create New Page</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newPage.title}
                      onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Page title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={newPage.slug}
                      onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="page-slug"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description
                    </label>
                    <textarea
                      value={newPage.meta_description}
                      onChange={(e) => setNewPage({ ...newPage, meta_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="SEO meta description"
                    />
                  </div>
                  
                  {/* SEO Fields Section */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                    
                    <div className="space-y-4">
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

                    {/* Open Graph Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Open Graph (Social Media)</h4>
                      
                      <div className="space-y-4">
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
                <h2 className="text-xl font-semibold mb-4">Edit Page: {selectedPage.title}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={selectedPage.title}
                      onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                    />
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
                    />
                  </div>
                  
                  {/* SEO Fields Section */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                    
                    <div className="space-y-4">
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

                    {/* Open Graph Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Open Graph (Social Media)</h4>
                      
                      <div className="space-y-4">
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