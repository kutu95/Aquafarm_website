import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { AuthContext } from './_app';
import { createServerClient } from '@supabase/ssr';

export default function Page({ page }) {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (router.query.edit && user && isAdmin) {
      router.push(`/dashboard?edit=${page.id}`);
    }
  }, [router, page, isAdmin, user]);

  if (!page) {
    return (
      <>
        <NavBar />
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