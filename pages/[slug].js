import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { AuthContext } from './_app';
import { createServerClient } from '@supabase/ssr';

export default function Page({ page }) {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const isAdmin = role === 'admin';

  // Debug logging
  if (page) {
    const finalMetaDescription = page.meta_description || page.title || 'Aquafarm - Sustainable Aquaculture';
    console.log('Page data:', {
      title: page.title,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      slug: page.slug,
      finalMetaDescription: finalMetaDescription
    });
  }

  useEffect(() => {
    if (router.query.edit && user && isAdmin) {
      router.push(`/dashboard?edit=${page.id}`);
    }
  }, [router, page, isAdmin, user]);

  if (!page) {
    return (
      <>
        <NavBar />
        <Head>
          <title>Page Not Found</title>
          <meta name="description" content="The page you are looking for could not be found." />
        </Head>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            {user && isAdmin && (
              <Link href={`/dashboard?edit=${router.query.slug}`} className="text-blue-600 hover:text-blue-800">
                Create this page
              </Link>
            )}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Head>
        <title>{page.meta_title || page.title || 'Aquafarm'}</title>
        <meta name="description" content={page.meta_description || page.title || 'Aquafarm - Sustainable Aquaculture'} />
        <meta name="robots" content={page.robots_meta || 'index, follow'} />
        
        {/* Canonical URL */}
        {page.canonical_url && (
          <link rel="canonical" href={page.canonical_url} />
        )}
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={page.og_title || page.meta_title || page.title || 'Aquafarm'} />
        <meta property="og:description" content={page.og_description || page.meta_description || page.title || 'Aquafarm - Sustainable Aquaculture'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={page.canonical_url || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aquafarm.com'}/${page.slug}`} />
        {page.og_image && (
          <meta property="og:image" content={page.og_image} />
        )}
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.og_title || page.meta_title || page.title || 'Aquafarm'} />
        <meta name="twitter:description" content={page.og_description || page.meta_description || page.title || 'Aquafarm - Sustainable Aquaculture'} />
        {page.og_image && (
          <meta name="twitter:image" content={page.og_image} />
        )}
      </Head>
      <div className="p-6 max-w-4xl mx-auto">
        <article className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </article>
        {user && isAdmin && (
          <div className="mt-8 text-center text-gray-500">
            <Link href={`/publishing?edit=${page.id}`} className="hover:text-gray-700">
              Edit this page
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export async function getServerSideProps({ params, req, res }) {
  try {
    // Create server-side Supabase client
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
          remove(name, options) {
            res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Max-Age=0`);
          },
        },
      }
    );

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    let userRole = null;
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      userRole = profile?.role;
    }

    // Use maybeSingle() instead of single() to handle cases where page might not exist
    const { data: page, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', params.slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching page:', error);
      return {
        props: {
          page: null
        }
      };
    }

    // If no page found, return null
    if (!page) {
      return {
        props: {
          page: null
        }
      };
    }

    // Debug logging
    console.log('Server-side page data for slug:', params.slug, {
      title: page.title,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      slug: page.slug
    });

    // Check access permissions (temporarily disabled until migration is run)
    // if (page.security === 'user' && !session) {
    //   // User-only page but no session
    //   return {
    //     redirect: {
    //       destination: '/login',
    //       permanent: false,
    //     },
    //   };
    // }

    // if (page.security === 'admin' && (!session || userRole !== 'admin')) {
    //   // Admin-only page but not admin
    //   return {
    //     redirect: {
    //       destination: '/',
    //       permanent: false,
    //     },
    //   };
    // }

    return {
      props: {
        page
      }
    };
  } catch (error) {
    console.error('Error fetching page:', error);
    return {
      props: {
        page: null
      }
    };
  }
}