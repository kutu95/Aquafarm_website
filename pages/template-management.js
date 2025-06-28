import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';
import Layout from '@/components/Layout';
import TinyMCE from '@/components/TinyMCE-WithScripts';

export default function TemplateManagement() {
  const { user, role } = useContext(AuthContext);
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
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
    priority: 1,
    security: 'open',
    is_active: true
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchTemplates();
  }, [user, role, router]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('page_templates')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.title || !newTemplate.slug) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('page_templates')
        .insert([newTemplate]);

      if (error) throw error;

      alert('Template created successfully!');
      setNewTemplate({
        name: '',
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
        priority: 1,
        security: 'open',
        is_active: true
      });
      setShowCreateForm(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      if (error.code === '23505' && error.message.includes('name')) {
        alert('Template name must be unique. Please choose a different name.');
      } else {
        alert('Error creating template. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('page_templates')
        .update({
          name: editingTemplate.name,
          title: editingTemplate.title,
          slug: editingTemplate.slug,
          content: editingTemplate.content,
          meta_description: editingTemplate.meta_description,
          meta_title: editingTemplate.meta_title,
          og_title: editingTemplate.og_title,
          og_description: editingTemplate.og_description,
          og_image: editingTemplate.og_image,
          canonical_url: editingTemplate.canonical_url,
          robots_meta: editingTemplate.robots_meta,
          priority: editingTemplate.priority,
          security: editingTemplate.security,
          is_active: editingTemplate.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      alert('Template updated successfully!');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      if (error.code === '23505' && error.message.includes('name')) {
        alert('Template name must be unique. Please choose a different name.');
      } else {
        alert('Error updating template. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('page_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      alert('Template deleted successfully!');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateForm(false);
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
      <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Template Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Template
            </button>
          </div>
        </div>

        <div className="grid gap-8">
          {/* Templates List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Page Templates</h2>
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{template.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name: {template.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Slug: {template.slug}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{template.meta_description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          template.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Priority: {template.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Template Form */}
          {showCreateForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Template</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., about, services, contact"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Page title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.slug}
                      onChange={(e) => setNewTemplate({ ...newTemplate, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="page-slug"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={newTemplate.priority}
                      onChange={(e) => setNewTemplate({ ...newTemplate, priority: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={newTemplate.meta_description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, meta_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows="3"
                    placeholder="SEO meta description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content *
                  </label>
                  <TinyMCE
                    value={newTemplate.content}
                    onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.is_active}
                    onChange={(e) => setNewTemplate({ ...newTemplate, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active (available for use)
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTemplate}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Creating...' : 'Create Template'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-400 text-white px-6 py-2 rounded-md hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Template Form */}
          {editingTemplate && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Template: {editingTemplate.title}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.slug}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={editingTemplate.priority}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={editingTemplate.meta_description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, meta_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content *
                  </label>
                  <TinyMCE
                    value={editingTemplate.content}
                    onChange={(content) => setEditingTemplate({ ...editingTemplate, content })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingTemplate.is_active}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active (available for use)
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateTemplate}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Updating...' : 'Update Template'}
                  </button>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="bg-gray-400 text-white px-6 py-2 rounded-md hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 