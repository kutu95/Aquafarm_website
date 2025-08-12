import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import TinyMCE from '@/components/TinyMCE-WithScripts';
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
    security: 'open',
    page_type: 'page',
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [pageTemplates, setPageTemplates] = useState({});

  // SOP Template Content
  const sopTemplate = `
<h2>Standard Operating Procedure</h2>

<h3>1. Purpose</h3>
<p>This document outlines the standard operating procedure for [PROCEDURE NAME].</p>

<h3>2. Scope</h3>
<p>This procedure applies to [WHO/WHAT THIS APPLIES TO].</p>

<h3>3. Definitions</h3>
<ul>
  <li><strong>Term 1:</strong> Definition of term 1</li>
  <li><strong>Term 2:</strong> Definition of term 2</li>
</ul>

<h3>4. Responsibilities</h3>
<ul>
  <li><strong>Role 1:</strong> Description of responsibilities</li>
  <li><strong>Role 2:</strong> Description of responsibilities</li>
</ul>

<h3>5. Equipment and Materials</h3>
<ul>
  <li>Equipment item 1</li>
  <li>Equipment item 2</li>
  <li>Materials needed</li>
</ul>

<h3>6. Safety Precautions</h3>
<ul>
  <li>Safety measure 1</li>
  <li>Safety measure 2</li>
  <li>Personal protective equipment requirements</li>
</ul>

<h3>7. Procedure Steps</h3>
<ol>
  <li><strong>Step 1:</strong> Detailed description of first step</li>
  <li><strong>Step 2:</strong> Detailed description of second step</li>
  <li><strong>Step 3:</strong> Detailed description of third step</li>
</ol>

<h3>8. Quality Control</h3>
<p>Describe how to verify the procedure was completed correctly and any quality checks required.</p>

<h3>9. Troubleshooting</h3>
<table border="1" cellpadding="5" cellspacing="0">
  <tr>
    <th>Problem</th>
    <th>Possible Cause</th>
    <th>Solution</th>
  </tr>
  <tr>
    <td>Common problem 1</td>
    <td>Likely cause</td>
    <td>Recommended solution</td>
  </tr>
  <tr>
    <td>Common problem 2</td>
    <td>Likely cause</td>
    <td>Recommended solution</td>
  </tr>
</table>

<h3>10. References</h3>
<ul>
  <li>Reference document 1</li>
  <li>Reference document 2</li>
  <li>Regulatory requirements</li>
</ul>

<h3>11. Document Control</h3>
<p><strong>Version:</strong> 1.0<br>
<strong>Last Updated:</strong> [DATE]<br>
<strong>Next Review:</strong> [DATE]<br>
<strong>Approved By:</strong> [NAME]</p>
`;

  // Function to handle page type changes and apply templates
  const handlePageTypeChange = (pageType, isEdit = false) => {
    if (pageType === 'sop') {
      if (isEdit) {
        // For edit form, only apply template if content is empty or just whitespace
        if (!selectedPage.content || selectedPage.content.trim() === '') {
          setSelectedPage({ ...selectedPage, page_type: pageType, content: sopTemplate });
        } else {
          setSelectedPage({ ...selectedPage, page_type: pageType });
        }
      } else {
        // For create form, only apply template if content is empty or just whitespace
        if (!newPage.content || newPage.content.trim() === '') {
          setNewPage({ ...newPage, page_type: pageType, content: sopTemplate });
        } else {
          setNewPage({ ...newPage, page_type: pageType });
        }
      }
    } else {
      // For other page types, just update the page type
      if (isEdit) {
        setSelectedPage({ ...selectedPage, page_type: pageType });
      } else {
        setNewPage({ ...newPage, page_type: pageType });
      }
    }
  };

  useEffect(() => {
    checkUser();
    fetchPages();
    fetchTemplates();
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

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('page_templates')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    const templatesObject = data.reduce((acc, template) => ({
      ...acc,
      [template.name]: {
        title: template.title,
        slug: template.slug,
        content: template.content,
        meta_description: template.meta_description,
        priority: template.priority
      }
    }), {});

    setPageTemplates(templatesObject);
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
          page_type: selectedPage.page_type,
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
      
      // Check for specific error types
      if (error.code === '23505' && error.message.includes('slug')) {
        alert('Slug must be unique. Please choose a different slug.');
      } else if (error.message.includes('duplicate key')) {
        alert('Slug must be unique. Please choose a different slug.');
      } else {
        alert(`Error updating page: ${error.message}`);
      }
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
        .insert([{ ...newPage }]);

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
        security: 'open',
        page_type: 'page',
      });
      setShowCreateForm(false);
      fetchPages();
    } catch (error) {
      console.error('Error creating page:', error);
      trackEvent('page_creation_failed', 'publishing', 'page_creation', 0);
      
      // Check for specific error types
      if (error.code === '23505' && error.message.includes('slug')) {
        alert('Slug must be unique. Please choose a different slug.');
      } else if (error.message.includes('duplicate key')) {
        alert('Slug must be unique. Please choose a different slug.');
      } else {
        alert('Error creating page. Please try again.');
      }
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

  const selectTemplate = (templateKey) => {
    const template = pageTemplates[templateKey];
    if (template) {
      setNewPage({
        ...newPage,
        title: template.title,
        slug: template.slug,
        content: template.content,
        meta_description: template.meta_description,
        priority: template.priority
      });
      setShowTemplates(false);
    }
  };

  const handlePreview = (pageData) => {
    setPreviewData(pageData);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
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
          page_type: pageData.page_type,
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
      
      // Check for specific error types
      if (error.code === '23505' && error.message.includes('slug')) {
        setAutoSaveStatus('error');
        // Don't show alert for auto-save, just log it
        console.warn('Auto-save failed: Slug must be unique');
      } else {
        setAutoSaveStatus('error');
      }
      
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
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {page.page_type === 'sop' ? `/sops/${page.slug}` : `/${page.slug}`}
                          </p>
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
                              href={page.page_type === 'sop' ? `/sops/${page.slug}` : `/${page.slug}`}
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Page</h2>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    {showTemplates ? 'Hide Templates' : 'Use Template'}
                  </button>
                </div>
                
                {/* Template Selection */}
                {showTemplates && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Choose a Template</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(pageTemplates).map(([key, template]) => (
                        <button
                          key={key}
                          onClick={() => selectTemplate(key)}
                          className="p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <h4 className="font-medium text-gray-900 dark:text-white">{template.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.meta_description}</p>
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                            Priority: {template.priority}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Page Type *
                          </label>
                          <select
                            value={newPage.page_type}
                            onChange={e => handlePageTypeChange(e.target.value, false)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="page">Page</option>
                            <option value="document">Document</option>
                            <option value="product">Product</option>
                            <option value="sop">SOP</option>
                          </select>
                          {newPage.page_type === 'sop' && (
                            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                              ✓ SOP template will be applied only if content field is empty
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content *
                    </label>
                    <TinyMCE
                      value={newPage.content}
                      onChange={(content) => setNewPage({ ...newPage, content })}
                    />
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={newPage.priority || 0}
                        onChange={(e) => setNewPage({ ...newPage, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Security Level
                      </label>
                      <select
                        value={newPage.security || 'open'}
                        onChange={(e) => setNewPage({ ...newPage, security: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="open">Open</option>
                        <option value="user">User Only</option>
                        <option value="admin">Admin Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Published
                      </label>
                      <select
                        value={newPage.is_published ? 'true' : 'false'}
                        onChange={(e) => setNewPage({ ...newPage, is_published: e.target.value === 'true' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="false">Draft</option>
                        <option value="true">Published</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      type="button"
                      onClick={handleCreatePage}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Creating...' : 'Create Page'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreview(newPage)}
                      className="bg-gray-600 dark:bg-gray-700 text-white px-6 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-400 text-white px-6 py-2 rounded-md hover:bg-gray-500 transition-colors"
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
                      Page Type *
                    </label>
                    <select
                      value={selectedPage.page_type}
                      onChange={e => handlePageTypeChange(e.target.value, true)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="page">Page</option>
                      <option value="document">Document</option>
                      <option value="product">Product</option>
                      <option value="sop">SOP</option>
                    </select>
                    {selectedPage.page_type === 'sop' && (
                      <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                        ✓ SOP template applied. Edit content as needed.
                      </p>
                    )}
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
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreview(selectedPage)}
                      className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      Preview
                    </button>
                  </div>
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

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Preview: {previewData.title}
              </h3>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="prose dark:prose-invert max-w-none">
                <h1 className="text-3xl font-bold mb-4">{previewData.title}</h1>
                {previewData.meta_description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-6 italic">
                    {previewData.meta_description}
                  </p>
                )}
                <div dangerouslySetInnerHTML={{ __html: previewData.content }} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>Slug: /{previewData.slug}</span>
                <span>Priority: {previewData.priority || 0}</span>
                <span>Status: {previewData.is_published ? 'Published' : 'Draft'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 