import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/locales/translations';

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
  const { currentLanguage } = useLanguage();
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
    pelleted: false,
    notes: ''
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCropTypes();
      fetchCrops();
    }
  }, [user]);

  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      // Clean up any created object URLs when component unmounts
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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
      alert(t('crops.errorFetchingCrops', currentLanguage));
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted:', {
      editingCrop: editingCrop,
      hasSelectedImage: !!selectedImage,
      selectedImageSize: selectedImage ? selectedImage.size : 'N/A',
      selectedImageSizeMB: selectedImage ? (selectedImage.size / (1024 * 1024)).toFixed(2) : 'N/A'
    });
    
    try {
      const cropData = {
        ...formData,
        seeds_per_pot: parseInt(formData.seeds_per_pot),
        time_to_harvest: parseInt(formData.time_to_harvest),
        crop_type_id: parseInt(formData.crop_type_id),
        pelleted: formData.pelleted
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

      console.log('Crop saved/updated, cropId:', cropId);

      // If there's a selected image, upload it
      if (selectedImage) {
        console.log('Starting image upload for cropId:', cropId);
        await uploadImage(cropId);
      } else {
        console.log('No image selected, skipping upload');
      }

      setShowForm(false);
      setEditingCrop(null);
      resetForm();
      setSelectedImage(null);
      setImagePreview(null);
      fetchCrops();
    } catch (error) {
      console.error('Error saving crop:', error);
      alert(t('crops.errorSavingCrop', currentLanguage));
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
      pelleted: crop.pelleted,
      notes: crop.notes || ''
    });
    
    // Set image preview if crop has an image
    if (crop.image_data && crop.image_data.length > 0) {
      // Create a data URL from the binary image data
      const blob = new Blob([crop.image_data], { type: crop.image_content_type || 'image/jpeg' });
      const dataUrl = URL.createObjectURL(blob);
      setImagePreview(dataUrl);
    } else {
      setImagePreview(null);
    }
    
    setSelectedImage(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('crops.confirmDelete', currentLanguage))) return;

    try {
      const { error } = await supabase
        .from('crops')
        .delete()
        .eq('id', id);

              if (error) throw error;
        fetchCrops();
    } catch (error) {
      console.error('Error deleting crop:', error);
      alert(t('crops.errorDeletingCrop', currentLanguage));
    }
  };

  const resetForm = () => {
    // Clean up any created object URLs
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData({
      vegetable_name: '',
      crop_type_id: '',
      seeds_per_pot: '',
      time_to_harvest: '',
      status: 'active',
      pelleted: false,
      notes: ''
    });
    setImagePreview(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCrop(null);
    resetForm();
    setSelectedImage(null);
    // Clean up any created object URLs
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(t('crops.errorInvalidFileType', currentLanguage));
        return;
      }
      
      // Validate file size (max 20MB for upload, will be compressed and resized)
      if (file.size > 20 * 1024 * 1024) {
        alert(t('crops.errorImageSizeTooLarge', currentLanguage));
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
      
      console.log('Starting image upload:', {
        cropId,
        fileName: selectedImage.name,
        fileSize: selectedImage.size,
        fileSizeMB: (selectedImage.size / (1024 * 1024)).toFixed(2),
        fileType: selectedImage.type
      });
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        console.log('Base64 conversion complete:', {
          base64Length: base64Data.length,
          base64SizeMB: (base64Data.length * 0.75 / (1024 * 1024)).toFixed(2)
        });
        
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

        console.log('Sending upload request to API...');
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

        console.log('API response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
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
      alert(t('crops.errorUploadingImage', currentLanguage));
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
                ← {t('common.back', currentLanguage)} {t('navigation.greenhouse', currentLanguage)}
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('crops.title', currentLanguage)}
                {role !== 'admin' && <span className="text-sm text-gray-500 ml-2">({t('common.readOnly', currentLanguage)})</span>}
              </h1>
              <p className="text-gray-600">
                {role === 'admin' 
                  ? t('crops.subtitle', currentLanguage)
                  : t('crops.subtitleReadOnly', currentLanguage)
                }
              </p>
            </div>
            {role === 'admin' && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                {t('crops.addCrop', currentLanguage)}
              </button>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingCrop ? t('crops.editCrop', currentLanguage) : t('crops.addNewCrop', currentLanguage)}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vegetable_name" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('crops.vegetableName', currentLanguage)}
                    </label>
                    <input
                      type="text"
                      id="vegetable_name"
                      name="vegetable_name"
                      value={formData.vegetable_name}
                      onChange={handleInputChange}
                      placeholder={t('crops.vegetableNamePlaceholder', currentLanguage)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="crop_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('crops.cropType', currentLanguage)}
                    </label>
                    <select
                      id="crop_type_id"
                      name="crop_type_id"
                      value={formData.crop_type_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t('crops.selectCropType', currentLanguage)}</option>
                      {cropTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="seeds_per_pot" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('crops.seedsPerPot', currentLanguage)}
                    </label>
                    <input
                      type="number"
                      id="seeds_per_pot"
                      name="seeds_per_pot"
                      value={formData.seeds_per_pot}
                      onChange={handleInputChange}
                      placeholder={t('crops.seedsPerPotPlaceholder', currentLanguage)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="time_to_harvest" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('crops.harvestTime', currentLanguage)}
                    </label>
                    <input
                      type="number"
                      id="time_to_harvest"
                      name="time_to_harvest"
                      value={formData.time_to_harvest}
                      onChange={handleInputChange}
                      placeholder={t('crops.harvestTimePlaceholder', currentLanguage)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      min="1"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pelleted Seeds
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pelleted"
                        name="pelleted"
                        checked={formData.pelleted}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pelleted" className="ml-2 block text-sm text-gray-700">
                        {t('crops.pelletedSeedsLabel', currentLanguage)}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pelleted seeds are coated for easier handling and planting
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('crops.image', currentLanguage)}
                  </label>
                  <div className="text-sm text-gray-600 mb-2">
                    {t('crops.imageUpload', currentLanguage)}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {t('crops.imageNote', currentLanguage)}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">{t('crops.currentImage', currentLanguage)}:</p>
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                    </div>
                  )}
                  {selectedImage && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">{t('crops.newImageToUpload', currentLanguage)}:</p>
                      <img src={URL.createObjectURL(selectedImage)} alt="New image" className="w-32 h-32 object-cover rounded border" />
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {uploadingImage && (
                    <div className="mt-3 text-sm text-blue-600">
                      {t('crops.uploadingImage', currentLanguage)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.notes', currentLanguage)}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('crops.notes', currentLanguage)}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('common.cancel', currentLanguage)}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingCrop ? t('common.update', currentLanguage) : t('common.create', currentLanguage)}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Crops List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('navigation.crops', currentLanguage)}</h2>
            </div>
            {dataLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">{t('crops.loadingCrops', currentLanguage)}</p>
              </div>
            ) : crops.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>{t('crops.noCropsFound', currentLanguage)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('crops.vegetableName', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('crops.image', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('crops.cropType', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('crops.seedsPerPot', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('crops.harvestTime', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.status', currentLanguage)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.actions', currentLanguage)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {crops.map((crop) => (
                      <tr key={crop.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {crop.vegetable_name}{crop.pelleted ? ' *' : ''}
                          </div>
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
                            <span className="text-xs text-gray-400">{t('common.noImage', currentLanguage)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {crop.crop_types?.name || t('common.unknown', currentLanguage)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crop.seeds_per_pot}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crop.time_to_harvest} {t('crops.harvestTime', currentLanguage).includes('weeks') ? 'weeks' : 'Wochen'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            crop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {crop.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {role === 'admin' ? (
                            <>
                              <button
                                onClick={() => handleEdit(crop)}
                                className="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-200"
                                aria-label={t('crops.editCrop', currentLanguage)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(crop.id)}
                                className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                aria-label={t('common.delete', currentLanguage)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400">{t('common.readOnly', currentLanguage)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600">
                <span className="font-medium">{t('common.legend', currentLanguage)}:</span> {t('common.pelletedSeedsDesc', currentLanguage)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
