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
    is_published: false
  });

  useEffect(() => {
    checkUser();
    fetchPages();
  }, []);

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
      const { error } = await supabase
        .from('pages')
        .update({
          title: selectedPage.title,
          content: selectedPage.content,
          meta_description: selectedPage.meta_description,
          is_published: selectedPage.is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPage.id);

      if (error) throw error;

      // Update the pages list
      setPages(pages.map(p => p.id === selectedPage.id ? selectedPage : p));
      
      trackEvent('page_updated', 'publishing', 'page_edit', 1);
      alert('Page updated successfully!');
    } catch (error) {
      console.error('Error updating page:', error);
      trackEvent('page_update_failed', 'publishing', 'page_edit', 0);
      alert('Error updating page. Please try again.');
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
          is_published: newPage.is_published
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
        is_published: false
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
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            page.is_published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {page.is_published ? 'Published' : 'Draft'}
                          </span>
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