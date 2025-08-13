import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Layout from '../../components/Layout';
import { createServerClient } from '@supabase/ssr';

export default function SOPPage({ pageData, error }) {
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(!pageData);

  useEffect(() => {
    if (pageData) {
      setPage(pageData);
      setLoading(false);
    }
  }, [pageData]);

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

  useEffect(() => {
    if (!pageData && router.query.slug) {
      fetchPage();
    }
  }, [router.query.slug, pageData]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                SOP Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                The SOP you're looking for could not be found.
              </p>
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-8">
            <ol className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <li>
                <a
                  href="/greenhouse"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  Greenhouse
                </a>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li>
                <a
                  href="/greenhouse/sops"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                >
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
                </div>
              </div>
            </div>
          </div>

          {/* SOP Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">

            
            <div 
              className="prose prose-sm max-w-none"
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

export async function getServerSideProps({ params, req, res }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies[name];
        },
        set(name, value, options) {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly`);
        },
        remove(name) {
          res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Max-Age=0`);
        },
      },
    }
  );

  try {
             const { data: page, error } = await supabase
           .from('pages')
           .select('*')
           .eq('slug', params.slug)
           .eq('page_type', 'sop')
           .maybeSingle();
       
         if (error) {
           console.error('Supabase error:', error);
           return { props: { pageData: null } };
         }
       
         if (!page) {
           return {
             notFound: true,
           };
         }

    return { props: { pageData: page } };
  } catch (err) {
    console.error('Server error:', err);
    return { props: { pageData: null } };
  }
}
