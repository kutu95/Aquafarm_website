import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Growbeds() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [growbeds, setGrowbeds] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGrowbed, setEditingGrowbed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    holes: '',
    flowrate: '',
    area: '',
    volume: '',
    type: 'DWC',
    status: 'active',
    notes: ''
  });

  const [filters, setFilters] = useState({
    type: '',
    status: ''
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchGrowbeds();
    }
  }, [user, role]);

  const fetchGrowbeds = async () => {
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('growbeds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrowbeds(data || []);
    } catch (error) {
      console.error('Error fetching growbeds:', error);
      alert('Error fetching growbeds');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const growbedData = {
        ...formData,
        holes: parseInt(formData.holes),
        flowrate: parseFloat(formData.flowrate),
        area: parseFloat(formData.area),
        volume: parseFloat(formData.volume)
      };

      if (editingGrowbed) {
        const { error } = await supabase
          .from('growbeds')
          .update(growbedData)
          .eq('id', editingGrowbed.id);

        if (error) throw error;
        alert('Growbed updated successfully!');
      } else {
        const { error } = await supabase
          .from('growbeds')
          .insert([growbedData]);

        if (error) throw error;
        alert('Growbed created successfully!');
      }

      // If there's a selected image, upload it
      if (selectedImage) {
        await uploadImage(editingGrowbed ? editingGrowbed.id : data[0].id);
      }

      setShowForm(false);
      setEditingGrowbed(null);
      resetForm();
      setSelectedImage(null);
      setImagePreview(null);
      fetchGrowbeds();
    } catch (error) {
      console.error('Error saving growbed:', error);
      alert('Error saving growbed');
    }
  };

  const handleEdit = (growbed) => {
    setEditingGrowbed(growbed);
    setFormData({
      name: growbed.name,
      holes: growbed.holes.toString(),
      flowrate: growbed.flowrate.toString(),
      area: growbed.area ? growbed.area.toString() : '',
      volume: growbed.volume ? growbed.volume.toString() : '',
      type: growbed.type,
      status: growbed.status,
      notes: growbed.notes || ''
    });
    
    // Set image preview if growbed has an image
    if (growbed.image_data) {
      setImagePreview(`/api/greenhouse/growbed-image/${growbed.id}`);
    } else {
      setImagePreview(null);
    }
    
    setSelectedImage(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this growbed?')) return;

    try {
      const { error } = await supabase
        .from('growbeds')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Growbed deleted successfully!');
      fetchGrowbeds();
    } catch (error) {
      console.error('Error deleting growbed:', error);
      alert('Error deleting growbed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      holes: '',
      flowrate: '',
      area: '',
      volume: '',
      type: 'DWC',
      status: 'active',
      notes: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingGrowbed(null);
    resetForm();
  };

  // Filter growbeds based on current filters
  const filteredGrowbeds = growbeds.filter(growbed => {
    if (filters.type && growbed.type !== filters.type) return false;
    if (filters.status && growbed.status !== filters.status) return false;
    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setFilters({ type: '', status: '' });
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file size must be less than 10MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (growbedId) => {
    if (!selectedImage) return;

    try {
      setUploadingImage(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        const response = await fetch('/api/greenhouse/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            entityType: 'growbeds',
            entityId: growbedId,
            imageData: base64Data,
            filename: selectedImage.name,
            contentType: selectedImage.type
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        setSelectedImage(null);
        setImagePreview(null);
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      setUploadingImage(false);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Growbeds Management</h1>
              <p className="text-gray-600">Manage your growbed configurations and settings</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Add Growbed
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingGrowbed ? 'Edit Growbed' : 'Add New Growbed'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="e.g., Main Growbed A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Holes *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.holes}
                      onChange={(e) => setFormData({ ...formData, holes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 24 (0 for media beds)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use 0 for media beds, &gt;0 for other types</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flow Rate (L/hr) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.flowrate}
                      onChange={(e) => setFormData({ ...formData, flowrate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 15.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area (m²) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Volume (L) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 50.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFormData({ 
                          ...formData, 
                          type: newType,
                          // Auto-set holes to 0 for media beds
                          holes: newType === 'Media bed' ? '0' : formData.holes
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DWC">DWC (Deep Water Culture)</option>
                      <option value="Media bed">Media Bed</option>
                      <option value="Wicking bed">Wicking Bed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
                                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Growbed Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: Upload an image of this growbed (max 10MB)</p>
                    
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-3">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-24 h-24 object-cover rounded-md border border-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current image</p>
                      </div>
                    )}
                    
                    {/* Selected Image Preview */}
                    {selectedImage && (
                      <div className="mt-3">
                        <img 
                          src={URL.createObjectURL(selectedImage)} 
                          alt="Selected" 
                          className="w-24 h-24 object-cover rounded-md border border-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">New image to upload</p>
                      </div>
                    )}
                    
                    {/* Upload Progress */}
                    {uploadingImage && (
                      <div className="mt-3 text-sm text-blue-600">
                        Uploading image...
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes about this growbed..."
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
                    {editingGrowbed ? 'Update' : 'Create'} Growbed
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Growbeds List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Growbeds</h2>
                
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="DWC">DWC</option>
                    <option value="Media bed">Media Bed</option>
                    <option value="Wicking bed">Wicking Bed</option>
                  </select>
                  
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  
                  {(filters.type || filters.status) && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
            {dataLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading growbeds...</p>
              </div>
            ) : filteredGrowbeds.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>
                  {growbeds.length === 0 
                    ? 'No growbeds found. Create your first growbed to get started.'
                    : 'No growbeds match the current filters. Try adjusting your filter criteria.'
                  }
                </p>
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
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Holes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flow Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Area
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGrowbeds.map((growbed) => (
                      <tr key={growbed.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            growbed.status === 'active' ? 'bg-green-100 text-green-800' :
                            growbed.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {growbed.name}
                          </span>
                          {growbed.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-xs mt-1">{growbed.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {growbed.image_data ? (
                            <div className="flex items-center space-x-2">
                              <img 
                                src={`/api/greenhouse/growbed-image/${growbed.id}`}
                                alt={growbed.name}
                                className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              <span className="text-xs text-gray-500 hidden">Image</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {growbed.holes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {growbed.flowrate} L/hr
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {growbed.area} m²
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {growbed.volume || 0} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative group">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 cursor-help">
                              {growbed.type}
                            </span>
                            
                            {/* Tooltip for Media bed */}
                            {growbed.type === 'Media bed' && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
                                <div className="text-center">
                                  <div className="font-semibold mb-1">Media bed</div>
                                  <div className="text-gray-200 leading-relaxed">
                                    Media beds are also known as 'gravel beds' or 'flood and drain' beds. They are filled with stones that are coated with Nitrosomonas and Nitrobacter bacteria that convert ammonia into nitrate. They have a critical function in the greenhouse in the nitrogen cycle and also act as bio-filters. Crops can also grow in them and they are typically used for plants with larger root systems.
                                  </div>
                                </div>
                                {/* Arrow pointing down */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                            
                            {/* Tooltip for DWC */}
                            {growbed.type === 'DWC' && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
                                <div className="text-center">
                                  <div className="font-semibold mb-1">DWC</div>
                                  <div className="text-gray-200 leading-relaxed">
                                    DWC or 'Deep Water Culture beds' or 'Floating Raft Beds' are about 30cm deep and have 25 holes or plants per square meter. They are typically for quick growing plants especially leafy greens and herbs.
                                  </div>
                                </div>
                                {/* Arrow pointing down */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(growbed)}
                            className="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-200"
                            aria-label="Edit growbed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(growbed.id)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            aria-label="Delete growbed"
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

          {/* Summary Section */}
          {growbeds.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                {(filters.type || filters.status) && (
                  <div className="text-sm text-gray-600 mt-2 sm:mt-0">
                    Showing {filteredGrowbeds.length} of {growbeds.length} growbeds
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {filteredGrowbeds.reduce((total, growbed) => total + growbed.holes, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Holes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {filteredGrowbeds.reduce((total, growbed) => total + (growbed.area || 0), 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Total Area (m²)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-600">
                    {filteredGrowbeds.reduce((total, growbed) => total + (growbed.volume || 0), 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Total Volume (L)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {filteredGrowbeds.reduce((total, growbed) => total + growbed.flowrate, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Total Flow Rate (L/hr)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
