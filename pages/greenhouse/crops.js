import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// Component to handle image display with data URL fetching
function CropImageDisplay({ cropId, cropName, hasImageData }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasImageData) {
      setLoading(false);
      setError(true);
      return;
    }

    // Set the image URL directly - the API is working correctly
    // Use multiple cache-busting parameters to ensure fresh images
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const imageUrl = `/api/greenhouse/crop-image/${cropId}?t=${timestamp}&r=${randomId}`;
    console.log('Setting imageSrc to API URL with aggressive cache busting:', imageUrl);
    
    setImageSrc(imageUrl);
    setLoading(false);
    setError(false);
  }, [cropId, cropName, hasImageData]);

  if (loading) {
    return <div className="w-12 h-12 bg-gray-200 rounded-md animate-pulse"></div>;
  }

  if (error || !imageSrc) {
    return <span className="text-xs text-red-400">Image error</span>;
  }

  return (
    <img 
      src={imageSrc}
      alt={cropName}
      className="w-12 h-12 object-cover rounded-md border border-gray-200"
      onError={(e) => {
        console.error('Image load error:', e);
        console.error('Image src that failed:', imageSrc);
        console.error('Image target:', e.target);
        console.error('Error details:', e.nativeEvent);
        setError(true);
      }}
      onLoad={() => {
        console.log('Image loaded successfully:', imageSrc);
      }}
    />
  );
}

export default function Crops() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [crops, setCrops] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [formData, setFormData] = useState({
    vegetable_name: '',
    crop_type_id: '',
    seeds_per_pot: '',
    time_to_harvest: '',
    status: 'active',
    notes: ''
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
      fetchCropTypes();
      fetchCrops();
    }
  }, [user, role]);

  const fetchCropTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('crop_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setCropTypes(data || []);
    } catch (error) {
      console.error('Error fetching crop types:', error);
    }
  };

  const fetchCrops = async () => {
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('crops')
        .select(`
          *,
          crop_types (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Log the crops data to debug image fields
      console.log('Fetched crops data:', data);
      
      setCrops(data || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
      alert('Error fetching crops');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const cropData = {
        ...formData,
        seeds_per_pot: parseInt(formData.seeds_per_pot),
        time_to_harvest: parseInt(formData.time_to_harvest),
        crop_type_id: parseInt(formData.crop_type_id)
      };

      let cropId;

      if (editingCrop) {
        const { error } = await supabase
          .from('crops')
          .update(cropData)
          .eq('id', editingCrop.id);

        if (error) throw error;
        cropId = editingCrop.id;
      } else {
        const { data: newCrop, error } = await supabase
          .from('crops')
          .insert([cropData])
          .select()
          .single();

        if (error) throw error;
        cropId = newCrop.id;
      }

      // If there's a selected image, upload it
      if (selectedImage) {
        await uploadImage(cropId);
      }

      setShowForm(false);
      setEditingCrop(null);
      resetForm();
      setSelectedImage(null);
      setImagePreview(null);
      fetchCrops();
    } catch (error) {
      console.error('Error saving crop:', error);
      alert('Error saving crop');
    }
  };

  const handleEdit = (crop) => {
    setEditingCrop(crop);
    setFormData({
      vegetable_name: crop.vegetable_name,
      crop_type_id: crop.crop_type_id.toString(),
      seeds_per_pot: crop.seeds_per_pot.toString(),
      time_to_harvest: crop.time_to_harvest.toString(),
      status: crop.status,
      notes: crop.notes || ''
    });
    
    // Set image preview if crop has an image
    if (crop.image_data && crop.image_data.length > 0) {
      // Fetch the image data URL for preview
      fetch(`/api/greenhouse/crop-image/${crop.id}`)
        .then(response => response.json())
        .then(data => setImagePreview(data.dataUrl))
        .catch(err => {
          console.error('Error fetching image preview:', err);
          setImagePreview(null);
        });
    } else {
      setImagePreview(null);
    }
    
    setSelectedImage(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this crop?')) return;

    try {
      const { error } = await supabase
        .from('crops')
        .delete()
        .eq('id', id);

              if (error) throw error;
        fetchCrops();
    } catch (error) {
      console.error('Error deleting crop:', error);
      alert('Error deleting crop');
    }
  };

  const resetForm = () => {
    setFormData({
      vegetable_name: '',
      crop_type_id: '',
      seeds_per_pot: '',
      time_to_harvest: '',
      status: 'active',
      notes: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCrop(null);
    resetForm();
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB for upload, will be compressed to 30KB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB. It will be automatically resized and compressed.');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (cropId) => {
    if (!selectedImage) return;

    try {
      setUploadingImage(true);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }
        
        console.log('Session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          accessToken: session?.access_token ? 'Present' : 'Missing'
        });

        const response = await fetch('/api/greenhouse/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            entityType: 'crops',
            entityId: cropId,
            imageData: base64Data,
            filename: selectedImage.name,
            contentType: selectedImage.type
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, response.statusText, errorText);
          throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Clear form and refresh crops list
        setSelectedImage(null);
        setImagePreview(null);
        setUploadingImage(false);
        
        // Refresh the crops list to show the new image
        fetchCrops();
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
              <h1 className="text-3xl font-bold text-gray-900">Crops Management</h1>
              <p className="text-gray-600">Manage your crop types, seeds per pot, and harvest times</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Add Crop
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingCrop ? 'Edit Crop' : 'Add New Crop'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vegetable Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vegetable_name}
                      onChange={(e) => setFormData({ ...formData, vegetable_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Lettuce, Basil, Tomatoes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crop Type *
                    </label>
                    <select
                      required
                      value={formData.crop_type_id}
                      onChange={(e) => setFormData({ ...formData, crop_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a crop type</option>
                      {cropTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeds per Pot *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.seeds_per_pot}
                      onChange={(e) => setFormData({ ...formData, seeds_per_pot: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time to Harvest (weeks) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.time_to_harvest}
                      onChange={(e) => setFormData({ ...formData, time_to_harvest: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 8"
                    />
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
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Upload an image of this crop (max 5MB). 
                    Images will be automatically resized to max 400px width and compressed to under 30KB for optimal performance.
                  </p>
                  
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
                    placeholder="Additional notes about this crop..."
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
                    {editingCrop ? 'Update' : 'Create'} Crop
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Crops List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Crops</h2>
            </div>
            {dataLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading crops...</p>
              </div>
            ) : crops.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No crops found. Create your first crop to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vegetable Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crop Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seeds per Pot
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harvest Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {crops.map((crop) => (
                      <tr key={crop.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{crop.vegetable_name}</div>
                          {crop.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{crop.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {crop.image_data && crop.image_data.length > 0 ? (
                            <div className="flex items-center space-x-2">
                              <CropImageDisplay cropId={crop.id} cropName={crop.vegetable_name} hasImageData={crop.image_data && crop.image_data.length > 0} />
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {crop.crop_types?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crop.seeds_per_pot}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crop.time_to_harvest} weeks
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            crop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {crop.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(crop)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(crop.id)}
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
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
