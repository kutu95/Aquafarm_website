import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/pages/_app';
import { supabase } from '@/lib/supabaseClient';

const Footer = () => {
  const [footerContent, setFooterContent] = useState('');
  const { user, role } = useContext(AuthContext);

  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('content')
          .eq('slug', 'footer')
          .single();
        
        if (!error && data) {
          setFooterContent(data.content);
        }
      } catch (error) {
        console.error('Error fetching footer:', error);
      }
    };

    fetchFooter();
  }, []);

  return (
    <footer className="mt-8 border-t pt-8 pb-16">
      <div className="container mx-auto px-4">
        {footerContent ? (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: footerContent }} 
          />
        ) : user && role === 'admin' && (
          <div className="text-center text-gray-500">
            <Link href="/dashboard?edit=footer">
              Create footer page
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer; 