import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/pages/_app';
import { useRouter } from 'next/router';
import { Dialog } from '@headlessui/react';

export default function MediaLibrary() {
  const { user, role } = useContext(AuthContext);
  const router = useRouter();

  const [files, setFiles] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [fileToDelete, setFileToDelete] = useState(null);
  const [fileToRename, setFileToRename] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [fileToResize, setFileToResize] = useState(null);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [resizeLoading, setResizeLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user === null || role === null) return;

    if (!user || role !== 'admin') {
      router.push('/');
    } else {
      checkBucketsAndFetchFiles();
    }
  }, [user, role]);

  const checkBucketsAndFetchFiles = async () => {
    try {
      const res = await fetch('/api/media/list');
      const result = await res.json();
      if (!res.ok) {
        setListError(`Error listing files: ${result.error}`);
        setFiles([]);
        return;
      }
      setFiles(result.files || []);
      setListError('');
    } catch (err) {
      console.error('Unexpected error:', err);
      setListError(`Unexpected error: ${err.message}`);
      setFiles([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    try {
      setLoading(true);
      const fileExt = uploadFile.name.split('.').pop().toLowerCase();
      if (!uploadFile.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        return;
      }
      const fileName = `${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', uploadFile, fileName);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        setUploadError('Image upload failed: ' + (result.error || 'Unknown error'));
      } else {
        setUploadFile(null);
        await checkBucketsAndFetchFiles();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName) => {
    setFileToDelete(fileName);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { error } = await supabase
        .storage
        .from('page-images')
        .remove([fileToDelete]);

      if (error) {
        setListError('Failed to delete file: ' + error.message);
      } else {
        await checkBucketsAndFetchFiles();
      }
    } catch (err) {
      setListError('Failed to delete file: ' + err.message);
    } finally {
      setFileToDelete(null);
    }
  };

  const getSignedURL = async (fileName) => {
    const res = await fetch(`/api/media/signed-url?fileName=${encodeURIComponent(fileName)}`);
    const result = await res.json();
    return result.url || '';
  };

  const openImageModal = (image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction) => {
    if (!selectedImage || files.length === 0) return;
    
    const currentIndex = files.findIndex(file => file.name === selectedImage.name);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % files.length;
    } else {
      newIndex = currentIndex === 0 ? files.length - 1 : currentIndex - 1;
    }
    
    setSelectedImage(files[newIndex]);
  };

  const handleKeyDown = (e) => {
    if (!isModalOpen) return;
    
    if (e.key === 'Escape') {
      closeImageModal();
    } else if (e.key === 'ArrowRight') {
      navigateImage('next');
    } else if (e.key === 'ArrowLeft') {
      navigateImage('prev');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedImage, files]);

  const ImageWithUrl = ({ file }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      setIsLoading(true);
      setHasError(false);
      getSignedURL(file.name).then(url => {
        setUrl(url);
        setIsLoading(false);
      }).catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
    }, [file.name]);

    if (isLoading) {
      return (
        <div className="w-90 h-68 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="w-90 h-68 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center">
          <div className="text-red-500 text-sm">Error loading image</div>
        </div>
      );
    }

    return (
      <div 
        className="w-90 h-68 bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => openImageModal(file)}
      >
        <img
          src={url}
          alt={file.name}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  };

  const handleRename = async () => {
    if (!fileToRename || !newFileName.trim()) return;

    try {
      setRenameLoading(true);
      
      const fileExt = fileToRename.split('.').pop();
      const newFileNameWithExt = newFileName.trim() + '.' + fileExt;
      
      const { data: downloadData, error: downloadError } = await supabase
        .storage
        .from('page-images')
        .download(fileToRename);

      if (downloadError) {
        setListError('Failed to download file: ' + downloadError.message);
        return;
      }

      const { error: uploadError } = await supabase
        .storage
        .from('page-images')
        .upload(newFileNameWithExt, downloadData, {
          contentType: downloadData.type,
          upsert: true
        });

      if (uploadError) {
        setListError('Failed to rename file: ' + uploadError.message);
        return;
      }

      const { error: deleteError } = await supabase
        .storage
        .from('page-images')
        .remove([fileToRename]);

      if (deleteError) {
        console.error('Failed to delete original file:', deleteError);
      }

      await checkBucketsAndFetchFiles();
      setFileToRename(null);
      setNewFileName('');
    } catch (err) {
      setListError('Failed to rename file: ' + err.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleResize = async () => {
    if (!fileToResize || (!resizeWidth && !resizeHeight)) return;

    try {
      setResizeLoading(true);
      
      const { data: downloadData, error: downloadError } = await supabase
        .storage
        .from('page-images')
        .download(fileToResize);

      if (downloadError) {
        setListError('Failed to download file: ' + downloadError.message);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        let newWidth = parseInt(resizeWidth) || 0;
        let newHeight = parseInt(resizeHeight) || 0;
        
        if (newWidth && newHeight) {
          const ratio = Math.min(newWidth / img.width, newHeight / img.height);
          newWidth = Math.round(img.width * ratio);
          newHeight = Math.round(img.height * ratio);
        } else if (newWidth) {
          const ratio = newWidth / img.width;
          newHeight = Math.round(img.height * ratio);
        } else if (newHeight) {
          const ratio = newHeight / img.height;
          newWidth = Math.round(img.width * ratio);
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(async (blob) => {
          try {
            const fileExt = fileToResize.split('.').pop();
            const fileNameWithoutExt = fileToResize.replace('.' + fileExt, '');
            const newFileName = `${fileNameWithoutExt}_${newWidth}x${newHeight}.${fileExt}`;

            const { error: uploadError } = await supabase
              .storage
              .from('page-images')
              .upload(newFileName, blob, {
                contentType: downloadData.type,
                upsert: true
              });

            if (uploadError) {
              setListError('Failed to upload resized image: ' + uploadError.message);
              return;
            }

            await checkBucketsAndFetchFiles();
            setFileToResize(null);
            setResizeWidth('');
            setResizeHeight('');
            setOriginalDimensions({ width: 0, height: 0 });
          } catch (err) {
            setListError('Failed to upload resized image: ' + err.message);
          } finally {
            setResizeLoading(false);
          }
        }, downloadData.type);
      };

      img.onerror = () => {
        setListError('Failed to load image for resizing');
        setResizeLoading(false);
      };

      const objectUrl = URL.createObjectURL(downloadData);
      img.src = objectUrl;

    } catch (err) {
      setListError('Failed to resize image: ' + err.message);
      setResizeLoading(false);
    }
  };

  const getImageDimensions = async (fileName) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('page-images')
        .createSignedUrl(fileName, 60 * 60);

      if (error) return null;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = data.signedUrl;
      });
    } catch (err) {
      return null;
    }
  };

  const openResizeDialog = async (fileName) => {
    setFileToResize(fileName);
    const dimensions = await getImageDimensions(fileName);
    if (dimensions) {
      setOriginalDimensions(dimensions);
    }
  };

  const openRenameDialog = (fileName) => {
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    setFileToRename(fileName);
    setNewFileName(fileNameWithoutExt);
  };

  const handleWidthChange = (value) => {
    setResizeWidth(value);
    if (value && originalDimensions.width && originalDimensions.height) {
      const ratio = parseInt(value) / originalDimensions.width;
      setResizeHeight(Math.round(originalDimensions.height * ratio).toString());
    }
  };

  const handleHeightChange = (value) => {
    setResizeHeight(value);
    if (value && originalDimensions.width && originalDimensions.height) {
      const ratio = parseInt(value) / originalDimensions.height;
      setResizeWidth(Math.round(originalDimensions.width * ratio).toString());
    }
  };

  // Modal Image Component
  const ModalImage = ({ file }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setIsLoading(true);
      getSignedURL(file.name).then(url => {
        setUrl(url);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }, [file.name]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-lg">Loading...</div>
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={file.name}
        className="max-w-full max-h-full object-contain"
      />
    );
  };

  if (user === null || role === null) {
    return <div className="p-6">Checking auth...</div>;
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <>
      <NavBar />
      <div className="p-6">
        <h1 className="text-2xl mb-4 font-bold">Media Library</h1>

        <form onSubmit={handleUpload} className="mb-6">
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files[0])} 
            className="border p-2 mb-2" 
          />
          <button 
            className={`bg-green-500 text-white p-2 rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
          {uploadError && <p className="text-red-500 mt-2">{uploadError}</p>}
        </form>

        {listError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
            {listError}
          </div>
        )}

        <h2 className="text-xl mb-2 font-bold">Uploaded Images</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file.name} className="border p-2 rounded">
              <ImageWithUrl file={file} />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => openRenameDialog(file.name)}
                  className="bg-blue-500 text-white p-1 rounded text-xs"
                >
                  Rename
                </button>
                <button
                  onClick={() => openResizeDialog(file.name)}
                  className="bg-purple-500 text-white p-1 rounded text-xs"
                >
                  Resize
                </button>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="bg-red-500 text-white p-1 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium mb-4">
                Confirm Delete
              </Dialog.Title>
              <p className="mb-4">Are you sure you want to delete "{fileToDelete}"?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFileToDelete(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog
          open={!!fileToRename}
          onClose={() => setFileToRename(null)}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium mb-4">
                Rename Image
              </Dialog.Title>
              <p className="mb-2 text-sm text-gray-600">Rename: {fileToRename}</p>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="border p-2 w-full mb-4"
                placeholder="Enter new filename (without extension)"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFileToRename(null);
                    setNewFileName('');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  disabled={renameLoading || !newFileName.trim()}
                  className={`bg-blue-500 text-white px-4 py-2 rounded ${renameLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {renameLoading ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Resize Dialog */}
        <Dialog
          open={!!fileToResize}
          onClose={() => {
            setFileToResize(null);
            setResizeWidth('');
            setResizeHeight('');
            setOriginalDimensions({ width: 0, height: 0 });
          }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium mb-4">
                Resize Image
              </Dialog.Title>
              <p className="mb-2 text-sm text-gray-600">Resize: {fileToResize}</p>
              {originalDimensions.width > 0 && (
                <p className="mb-4 text-sm text-gray-600">
                  Original: {originalDimensions.width} × {originalDimensions.height}px
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="border p-2 w-full"
                    placeholder="Enter width"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="border p-2 w-full"
                    placeholder="Enter height"
                  />
                </div>
              </div>
              
              {resizeWidth && resizeHeight && (
                <p className="text-sm text-gray-600 mb-4">
                  New file: {fileToResize.replace(/\.[^/.]+$/, '')}_{resizeWidth}x{resizeHeight}.{fileToResize.split('.').pop()}
                </p>
              )}
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFileToResize(null);
                    setResizeWidth('');
                    setResizeHeight('');
                    setOriginalDimensions({ width: 0, height: 0 });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResize}
                  disabled={resizeLoading || (!resizeWidth && !resizeHeight)}
                  className={`bg-purple-500 text-white px-4 py-2 rounded ${resizeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {resizeLoading ? 'Resizing...' : 'Resize'}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Image Modal/Lightbox */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-4xl max-h-full p-4">
              {/* Close button */}
              <button
                onClick={closeImageModal}
                className="absolute top-2 right-2 text-white text-2xl font-bold hover:text-gray-300 z-10"
              >
                ×
              </button>
              
              {/* Navigation buttons */}
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold hover:text-gray-300 z-10"
              >
                ‹
              </button>
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold hover:text-gray-300 z-10"
              >
                ›
              </button>
              
              {/* Image */}
              <div className="flex items-center justify-center">
                <ModalImage file={selectedImage} />
              </div>
              
              {/* Image info */}
              <div className="absolute bottom-4 left-4 right-4 text-white text-center">
                <p className="text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {selectedImage.name} ({files.findIndex(f => f.name === selectedImage.name) + 1} of {files.length})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
} 