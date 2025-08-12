import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Layout from '../../components/Layout';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side rendering
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default function SOPPage({ pageData, error }) {
  const router = useRouter();
  const [page, setPage] = useState(pageData);
  const [loading, setLoading] = useState(!pageData);

  useEffect(() => {
    if (pageData) {
      setPage(pageData);
      setLoading(false);
    }
  }, [pageData]);

  useEffect(() => {
    if (router.isReady && !pageData) {
      fetchPage();
    }
  }, [router.isReady, router.query.slug]);

  const fetchPage = async () => {
    if (!router.query.slug) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', router.query.slug)
        .eq('page_type', 'sop')
        .single();

      if (error) {
        console.error('Error fetching SOP page:', error);
        router.push('/404');
        return;
      }

      if (!data) {
        router.push('/404');
        return;
      }

      setPage(data);
    } catch (error) {
      console.error('Error fetching SOP page:', error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SOP...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!page) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">SOP Not Found</h1>
            <p className="text-gray-600">The requested SOP document could not be found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <a href="/greenhouse" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Greenhouse
                </a>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li>
                <a href="/greenhouse/sops" className="hover:text-blue-600 dark:hover:text-blue-400">
                  SOPs
                </a>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li className="text-gray-900 dark:text-gray-200">{page.title}</li>
            </ol>
          </nav>

          {/* SOP Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {page.title}
                </h1>
                {page.meta_description && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {page.meta_description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Priority: {page.priority || 'Not set'}</span>
                  <span>•</span>
                  <span>Last updated: {new Date(page.updated_at || page.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    page.is_published 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {page.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SOP Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div 
              className="prose prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>

          {/* Back to SOPs */}
          <div className="mt-8 text-center">
            <a
              href="/greenhouse/sops"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              ← Back to SOPs
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ params }) {
  try {
    const { data, error } = await supabaseClient
      .from('pages')
      .select('*')
      .eq('slug', params.slug)
      .eq('page_type', 'sop')
      .single();

    if (error || !data) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        pageData: data,
      },
      revalidate: 60, // Revalidate every minute
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      notFound: true,
    };
  }
}

export async function getStaticPaths() {
  try {
    const { data, error } = await supabaseClient
      .from('pages')
      .select('slug')
      .eq('page_type', 'sop')
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching SOP paths:', error);
      return {
        paths: [],
        fallback: 'blocking',
      };
    }

    const paths = data.map((page) => ({
      params: { slug: page.slug },
    }));

    return {
      paths,
      fallback: 'blocking',
    };
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}
