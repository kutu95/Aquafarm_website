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