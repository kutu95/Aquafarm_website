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
      // Get and log the current session state
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        setListError('Authentication error');
        return;
      }
      
      // Log authentication details
      console.log('Auth state:', {
        hasSession: !!session,
        accessToken: session?.access_token ? 'Present' : 'Missing',
        user: session?.user?.email,
        role: session?.user?.role,
        id: session?.user?.id
      });

      // Only use the basic list approach since it works
      const { data: files, error: filesError } = await supabase
        .storage
        .from('page-images')
        .list('');

      if (filesError) {
        console.error('Error listing files:', filesError);
        setListError(`Error listing files: ${filesError.message}`);
        setFiles([]);
        return;
      }

      // Log detailed file information
      console.log('Files from bucket:', files?.map(f => ({
        name: f.name,
        id: f.id,
        metadata: f.metadata,
        created_at: f.created_at
      })));

      setFiles(files || []);
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
      
      // Validate file type
      if (!uploadFile.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        return;
      }

      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from('page-images')
        .upload(fileName, uploadFile, {
          contentType: uploadFile.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError('Image upload failed: ' + uploadError.message);
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

  const getPublicURL = async (fileName) => {
    try {
      // Try getting a download URL instead of public URL
      const { data, error } = await supabase
        .storage
        .from('page-images')
        .createSignedUrl(fileName, 60 * 60); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        return '';
      }

      console.log('Signed URL generated for', fileName, {
        signedUrl: data.signedUrl
      });

      return data.signedUrl;
    } catch (err) {
      console.error('Error generating URL:', err);
      return '';
    }
  };

  const ImageWithUrl = ({ file }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      setIsLoading(true);
      setHasError(false);
      getPublicURL(file.name).then(url => {
        setUrl(url);
        setIsLoading(false);
      }).catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
    }, [file.name]);

    const handleLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      console.error('Image load error:', {
        fileName: file.name,
        url
      });
    };

    return (
      <>
        <div className="relative">
          {url && (
            <img
              src={url}
              alt={file.name}
              className={`w-full h-32 object-cover mb-2 rounded ${isLoading ? 'opacity-50' : ''}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
              <span className="text-sm text-red-500">Failed to load</span>
            </div>
          )}
        </div>
        <div className="text-sm break-all mb-2">
          <p className="text-xs mb-1">File: {file.name}</p>
          <input
            readOnly
            className="border p-1 text-xs w-full"
            value={url}
            onClick={(e) => e.target.select()}
          />
        </div>
      </>
    );
  };

  const handleRename = async () => {
    if (!fileToRename || !newFileName.trim()) return;

    try {
      setLoading(true);
      
      // Get the file extension from the original file
      const fileExt = fileToRename.split('.').pop();
      const newFileNameWithExt = newFileName.trim() + '.' + fileExt;
      
      // Download the original file
      const { data: downloadData, error: downloadError } = await supabase
        .storage
        .from('page-images')
        .download(fileToRename);

      if (downloadError) {
        setListError('Failed to download file: ' + downloadError.message);
        return;
      }

      // Upload with new name
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

      // Delete the original file
      const { error: deleteError } = await supabase
        .storage
        .from('page-images')
        .remove([fileToRename]);

      if (deleteError) {
        console.error('Failed to delete original file:', deleteError);
        // Continue anyway since the new file was uploaded successfully
      }

      await checkBucketsAndFetchFiles();
      setFileToRename(null);
      setNewFileName('');
    } catch (err) {
      setListError('Failed to rename file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResize = async () => {
    if (!fileToResize || (!resizeWidth && !resizeHeight)) return;

    try {
      setResizeLoading(true);
      
      // Download the original file
      const { data: downloadData, error: downloadError } = await supabase
        .storage
        .from('page-images')
        .download(fileToResize);

      if (downloadError) {
        setListError('Failed to download file: ' + downloadError.message);
        return;
      }

      // Create a canvas to resize the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        // Calculate new dimensions maintaining aspect ratio
        let newWidth = parseInt(resizeWidth) || 0;
        let newHeight = parseInt(resizeHeight) || 0;
        
        if (newWidth && newHeight) {
          // Both dimensions specified, use the smaller one to maintain aspect ratio
          const ratio = Math.min(newWidth / img.width, newHeight / img.height);
          newWidth = Math.round(img.width * ratio);
          newHeight = Math.round(img.height * ratio);
        } else if (newWidth) {
          // Only width specified
          const ratio = newWidth / img.width;
          newHeight = Math.round(img.height * ratio);
        } else if (newHeight) {
          // Only height specified
          const ratio = newHeight / img.height;
          newWidth = Math.round(img.width * ratio);
        }

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          try {
            // Create new filename with dimensions
            const fileExt = fileToResize.split('.').pop();
            const fileNameWithoutExt = fileToResize.replace('.' + fileExt, '');
            const newFileName = `${fileNameWithoutExt}_${newWidth}x${newHeight}.${fileExt}`;

            // Upload resized image
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

      // Create object URL for the image
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

  if (user === null || role === null) {
    return <div className="p-6">Checking auth...</div>;
  }

  if (!user || role !== 'admin') {
    return null; // Will redirect in useEffect
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
              <button
                onClick={() => handleDelete(file.name)}
                className="bg-red-500 text-white p-1 rounded text-xs w-full"
              >
                Delete
              </button>
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
              <Dialog.Title className="text-xl font-bold mb-4">
                Confirm Delete
              </Dialog.Title>
              
              <p className="mb-4">
                Are you sure you want to delete the file "{fileToDelete}"? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFileToDelete(null)}
                  className="bg-gray-200 text-gray-800 p-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
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