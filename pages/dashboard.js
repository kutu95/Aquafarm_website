import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './_app';
import { useRouter } from 'next/router';
import TinyMCE from '@/components/TinyMCE';
import { Dialog } from '@headlessui/react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, role, loading } = useContext(AuthContext);
  const [pages, setPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState({ 
    title: '', 
    slug: '', 
    content: '', 
    image_path: null,
    priority: 0,
    security: 'open'
  });
  const [file, setFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmPage, setDeleteConfirmPage] = useState(null);
  const router = useRouter();
  const { edit: pageId } = router.query;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Dashboard - User:', user?.email, 'Role:', role, 'Loading:', loading);
    
    if (loading) {
      return; // Wait for auth to load
    }
    
    if (user && role === 'admin') {
      console.log('User is admin, fetching pages');
      fetchPages();
    } else if (user === null) {
      console.log('No user, redirecting to login');
      router.push('/login');
    } else {
      console.log('User not admin, redirecting to home');
      router.push('/');
    }
  }, [user, role, loading]);

  useEffect(() => {
    if (pageId && editingPage) {
      router.push(`/dashboard?edit=${editingPage.id}`);
    }
  }, [pageId, editingPage]);

  // Add new useEffect to handle edit parameter from URL
  useEffect(() => {
    if (pageId && !editingPage) {
      // Load the page data when edit parameter is present
      const loadPageForEditing = async () => {
        const { data: page, error } = await supabase
          .from('pages')
          .select('*')
          .eq('id', pageId)
          .single();
        
        if (!error && page) {
          handleEdit(page);
        }
      };
      
      loadPageForEditing();
    }
  }, [pageId, editingPage]);

  const fetchPages = async () => {
    const { data, error } = await supabase.from('pages').select('*').order('priority');
    if (!error) {
      setPages(data || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.title || !form.slug || !form.content) {
      setErrorMsg('All fields required.');
      return;
    }

    let imagePath = form.image_path || null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${form.slug}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from('page-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        setErrorMsg('Image upload failed: ' + uploadError.message);
        return;
      }

      imagePath = fileName;
    }

    const pageData = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      image_path: imagePath,
      priority: form.priority,
      security: form.security
    };

    let error;
    if (editingPage) {
      ({ error } = await supabase.from('pages').update(pageData).eq('id', editingPage.id));
    } else {
      ({ error } = await supabase.from('pages').insert([pageData]));
    }

    if (error) {
      setErrorMsg(error.message);
    } else {
      // Clear form and reset state
      const emptyForm = { title: '', slug: '', content: '', image_path: null, priority: 0, security: 'open' };
      setForm(emptyForm);
      setFile(null);
      setEditingPage(null);
      fetchPages();
      
      // Force a small delay to ensure the editor content is cleared
      setTimeout(() => {
        setForm(emptyForm);
      }, 50);
    }
  };

  const handleEdit = async (page) => {
    setEditingPage(page);
    
    const newForm = {
      title: page.title || '',
      slug: page.slug || '',
      content: page.content || '',
      image_path: page.image_path || null,
      priority: page.priority || 0,
      security: page.security || 'open'
    };
    
    setForm(newForm);
    setFile(null);
  };

  const handleDelete = async (id) => {
    setDeleteConfirmPage(null);
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) setErrorMsg(error.message);
    else fetchPages();
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
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Link
            href="/volunteer-applications"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Volunteer Applications
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mb-6" onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}>
          {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}
          
          <input
            className="border p-2 mr-2 mb-2"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="border p-2 mr-2 mb-2"
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            max="9"
            className="border p-2 mr-2 mb-2 w-20"
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
            title="Priority (0-9, 0 means not in menu, 1-9 for menu order)"
          />
          <select
            className="border p-2 mr-2 mb-2"
            value={form.security}
            onChange={(e) => setForm({ ...form, security: e.target.value })}
            title="Access Level"
          >
            <option value="open">Open (Anyone)</option>
            <option value="user">User (Logged in users)</option>
            <option value="admin">Admin (Admin only)</option>
          </select>

          <div className="border rounded-lg overflow-hidden mb-4">
            <TinyMCE
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
              placeholder="Start writing your content here..."
            />
          </div>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="border p-2 mb-4"
          />
          <button className="bg-green-500 text-white p-2 rounded">
            {editingPage ? 'Update Page' : 'Add Page'}
          </button>
          {editingPage && (
            <button
              type="button"
              className="ml-2 bg-gray-400 text-white p-2 rounded"
              onClick={() => {
                setEditingPage(null);
                setForm({ title: '', slug: '', content: '', image_path: null, priority: 0, security: 'open' });
                setFile(null);
              }}
            >
              Cancel
            </button>
          )}
        </form>

        <h2 className="text-xl mb-2 font-bold">Existing Pages</h2>
        <div className="overflow-x-auto">
          <table className="w-auto bg-white border rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {page.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.priority || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      page.security === 'open' ? 'bg-green-100 text-green-800' :
                      page.security === 'user' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {page.security === 'open' ? 'Open' :
                       page.security === 'user' ? 'User' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleEdit(page)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmPage(page)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={!!deleteConfirmPage} 
          onClose={() => setDeleteConfirmPage(null)}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <Dialog.Title className="text-xl font-bold mb-4">
                Confirm Delete
              </Dialog.Title>
              
              <p className="mb-4">
                Are you sure you want to delete the page "{deleteConfirmPage?.title}"? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmPage(null)}
                  className="bg-gray-200 text-gray-800 p-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmPage.id)}
                  className="bg-red-500 text-white p-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </div>
      <Footer />
    </>
  );
}