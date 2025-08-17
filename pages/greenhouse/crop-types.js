import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function CropTypes() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [cropTypes, setCropTypes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCropType, setEditingCropType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchCropTypes();
    }
  }, [user, role]);

  const fetchCropTypes = async () => {
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('crop_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setCropTypes(data || []);
    } catch (error) {
      console.error('Error fetching crop types:', error);
      alert('Error fetching crop types');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCropType) {
        const { error } = await supabase
          .from('crop_types')
          .update(formData)
          .eq('id', editingCropType.id);

        if (error) throw error;
        // Crop type updated successfully - no alert needed
      } else {
        const { error } = await supabase
          .from('crop_types')
          .insert([formData]);

        if (error) throw error;
        // Crop type created successfully - no alert needed
      }

      setShowForm(false);
      setEditingCropType(null);
      resetForm();
      fetchCropTypes();
    } catch (error) {
      console.error('Error saving crop type:', error);
      alert('Error saving crop type');
    }
  };

  const handleEdit = (cropType) => {
    setEditingCropType(cropType);
    setFormData({
      name: cropType.name,
      description: cropType.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this crop type? This will affect all crops using this type.')) return;

    try {
      const { error } = await supabase
        .from('crop_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
              // Crop type deleted successfully - no alert needed
      fetchCropTypes();
    } catch (error) {
      console.error('Error deleting crop type:', error);
      alert('Error deleting crop type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCropType(null);
    resetForm();
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/greenhouse" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Greenhouse
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Crop Types Management</h1>
              <p className="text-gray-600">Manage vegetable categories and descriptions</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Add Crop Type
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingCropType ? 'Edit Crop Type' : 'Add New Crop Type'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Leafy Greens, Herbs, Root Vegetables"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe this crop type..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200"
                  >
                    {editingCropType ? 'Update' : 'Create'} Crop Type
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Crop Types List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Crop Types</h2>
            </div>
            {dataLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading crop types...</p>
              </div>
            ) : cropTypes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No crop types found. Create your first crop type to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cropTypes.map((cropType) => (
                      <tr key={cropType.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{cropType.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md">
                            {cropType.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(cropType.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(cropType)}
                            className="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-200"
                            aria-label="Edit crop type"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(cropType.id)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            aria-label="Delete crop type"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
    </Layout>
  );
}
