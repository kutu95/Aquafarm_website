import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('Testing storage connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Test 1: List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Bucket list error:', bucketError);
      return res.status(500).json({ 
        error: `Storage error: ${bucketError.message}`,
        details: bucketError
      });
    }

    console.log('Available buckets:', buckets);

    // Test 2: Check if volunteer-documents bucket exists
    const volunteerBucket = buckets.find(bucket => bucket.name === 'volunteer-documents');
    
    if (!volunteerBucket) {
      return res.status(404).json({ 
        error: 'volunteer-documents bucket not found',
        availableBuckets: buckets.map(b => b.name)
      });
    }

    // Test 3: Try to list files in the bucket
    const { data: files, error: fileError } = await supabase.storage
      .from('volunteer-documents')
      .list('volunteer-gallery');

    if (fileError) {
      console.error('File list error:', fileError);
      return res.status(500).json({ 
        error: `File list error: ${fileError.message}`,
        details: fileError,
        bucket: volunteerBucket
      });
    }

    // Test 4: Check RLS policies
    const { data: policies, error: policyError } = await supabase.rpc('get_storage_policies');

    return res.status(200).json({ 
      success: true, 
      message: 'Storage connection successful',
      bucket: volunteerBucket,
      files: files || [],
      policies: policies || 'No policies found',
      policyError: policyError?.message || null
    });

  } catch (error) {
    console.error('Test storage error:', error);
    return res.status(500).json({ 
      error: `Internal server error: ${error.message}`,
      stack: error.stack
    });
  }
} 