import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestCropsDB() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testDatabase = async () => {
      try {
        setLoading(true);
        
        // Test 1: Check if crops table exists and get its structure
        console.log('Testing crops table structure...');
        
        // Test 2: Try to fetch crops with all fields
        const { data, error } = await supabase
          .from('crops')
          .select('*')
          .limit(5);

        if (error) {
          console.error('Error fetching crops:', error);
          setError(error.message);
        } else {
          console.log('Crops data:', data);
          setCrops(data || []);
          
          // Test 3: Check if image fields exist
          if (data && data.length > 0) {
            const firstCrop = data[0];
            console.log('First crop fields:', Object.keys(firstCrop));
            console.log('Image fields check:', {
              hasImageData: 'image_data' in firstCrop,
              hasImageFilename: 'image_filename' in firstCrop,
              hasImageContentType: 'image_content_type' in firstCrop,
              imageDataValue: firstCrop.image_data,
              imageFilenameValue: firstCrop.image_filename,
              imageContentTypeValue: firstCrop.image_content_type
            });
          }
        }
      } catch (err) {
        console.error('Test error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testDatabase();
  }, []);

  if (loading) {
    return <div>Testing database...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Crops Database Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Database Structure Test Results:</h2>
        <p>Check the browser console for detailed information.</p>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Sample Crops Data:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(crops, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Next Steps:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check the browser console for field information</li>
          <li>If image fields are missing, run the database migration</li>
          <li>If image fields exist but are empty, the issue is with image upload</li>
        </ol>
      </div>
    </div>
  );
}
