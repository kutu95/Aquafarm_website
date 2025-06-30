import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/Layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default function ConfirmEmail() {
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const { token, email } = router.query;

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please check your email and try again.');
        return;
      }

      try {
        // Update user to confirmed
        const { error } = await supabase.auth.admin.updateUserById(token, {
          email_confirm: true
        });

        if (error) {
          console.error('Confirmation error:', error);
          setStatus('error');
          setMessage('Failed to confirm email. Please try again or contact support.');
          return;
        }

        setStatus('success');
        setMessage('Your email has been confirmed successfully! You can now log in to your account.');
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again or contact support.');
      }
    };

    if (router.isReady) {
      confirmEmail();
    }
  }, [router.isReady, router.query]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Confirming your email...
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we confirm your email address.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              {status === 'success' ? (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Email Confirmed!
                  </h2>
                </>
              ) : (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Confirmation Failed
                  </h2>
                </>
              )}
              
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 