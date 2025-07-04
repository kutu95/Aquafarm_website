import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging and validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Present' : 'Missing',
    key: supabaseAnonKey ? 'Present' : 'Missing'
  });
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL format. URL must start with https://');
  throw new Error('Invalid Supabase URL format');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      return document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=')
        return { name, value }
      })
    },
    get(name) {
      return document.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith(`${name}=`))
        ?.split('=')[1]
    },
    set(name, value, options) {
      document.cookie = `${name}=${value}; path=/; max-age=${options?.maxAge || 31536000}`
    },
    remove(name) {
      document.cookie = `${name}=; path=/; max-age=0`
    }
  }
});
