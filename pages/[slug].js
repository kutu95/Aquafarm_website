// [slug].js
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { AuthContext } from './_app';
import { createServerClient } from '@supabase/ssr';

// 👇 Component definition
export default function Page({ page }) {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (router.query.edit && user && isAdmin && page?.id) {
      router.push(`/dashboard?edit=${page.id}`);
    }
  }, [router, user, isAdmin, page?.id]);

  // Client-side meta tag injection (fallback for when Head component doesn't work)
  useEffect(() => {
    if (page) {
      const title = page.meta_title || page.title || 'Aquafarm';
      const description = page.meta_description || page.title || 'Sustainable agriculture, community living and permaculture';
      
      // Update document title
      document.title = title;
      
      // Update or create meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
      
      // Update or create robots meta
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.name = 'robots';
        document.head.appendChild(metaRobots);
      }
      metaRobots.content = page.robots_meta || 'index, follow';
      
      // Update or create og:title
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = page.og_title || title;
      
      // Update or create og:description
      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.content = page.og_description || description;
      
      // Update or create og:url
      const ogUrl = page.canonical_url || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aquafarm.au'}/${page.slug}`;
      let ogUrlMeta = document.querySelector('meta[property="og:url"]');
      if (!ogUrlMeta) {
        ogUrlMeta = document.createElement('meta');
        ogUrlMeta.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrlMeta);
      }
      ogUrlMeta.content = ogUrl;
      
      // Update or create canonical link
      if (page.canonical_url) {
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
          canonicalLink = document.createElement('link');
          canonicalLink.rel = 'canonical';
          document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = page.canonical_url;
      }
    }
  }, [page]);

  if (!page) {
    return (
      <Layout>
        <Head>
          <title>Page Not Found</title>
          <meta name="description" content="The page you are looking for could not be found." />
        </Head>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          {user && isAdmin && (
            <Link href={`/dashboard?edit=${router.query.slug}`} className="text-blue-600 hover:underline">
              Create this page
            </Link>
          )}
        </div>
      </Layout>
    );
  }

  const title = page.meta_title || page.title || 'Aquafarm';
  const description = page.meta_description || page.title || 'Sustainable agriculture, community living and permaculture';
  const ogUrl = page.canonical_url || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aquafarm.au'}/${page.slug}`;

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={page.robots_meta || 'index, follow'} />
        {page.canonical_url && <link rel="canonical" href={page.canonical_url} />}
        <meta property="og:title" content={page.og_title || title} />
        <meta property="og:description" content={page.og_description || description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        {page.og_image && <meta property="og:image" content={page.og_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.og_title || title} />
        <meta name="twitter:description" content={page.og_description || description} />
        {page.og_image && <meta name="twitter:image" content={page.og_image} />}
      </Head>

      <div className="max-w-4xl mx-auto">
        <article className="prose max-w-none mt-0 pt-0">
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
    </Layout>
  );
}

// 👇 SSR logic goes here, after the component
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
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return { props: { page: null } };
    }

    // Set meta tags in response headers for better SEO
    if (page) {
      const title = page.meta_title || page.title || 'Aquafarm';
      const description = page.meta_description || page.title || 'Sustainable agriculture, community living and permaculture';
      
      // Sanitize content for HTTP headers (remove invalid characters)
      const sanitizeHeader = (str) => {
        if (!str) return '';
        return str
          .replace(/[\r\n]/g, ' ') // Remove line breaks
          .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
          .substring(0, 1000); // Limit length
      };
      
      // Set meta tags as response headers (only if content is safe)
      try {
        res.setHeader('X-Meta-Title', sanitizeHeader(title));
        res.setHeader('X-Meta-Description', sanitizeHeader(description));
        res.setHeader('X-Meta-Robots', sanitizeHeader(page.robots_meta || 'index, follow'));
        
        if (page.canonical_url) {
          res.setHeader('X-Meta-Canonical', sanitizeHeader(page.canonical_url));
        }
      } catch (headerError) {
        console.warn('Could not set meta headers:', headerError);
        // Continue without headers rather than failing
      }
    }

    return { props: { page } };
  } catch (err) {
    console.error('Server error:', err);
    return { props: { page: null } };
  }
}