import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { trackEvent } from '@/components/GoogleAnalytics';
import Layout from '../components/Layout';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      console.log('Attempting login for:', credentials.email);
      
      // Use server-side login API instead of client-side Supabase
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      const result = await response.json();
      console.log('Login response:', result);

      if (!response.ok) {
        console.error('Login error:', result.message);
        setError(result.message || 'Login failed');
        trackEvent('login_failed', 'authentication', 'login_attempt', 0);
      } else {
        console.log('Login successful, user:', result.user?.id);
        
        trackEvent('login_success', 'authentication', 'login_attempt', 1);
        // Redirect to the intended page or home
        const redirect = router.query.redirect || '/';
        router.push(redirect);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      trackEvent('login_failed', 'authentication', 'login_attempt', 0);
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsResetting(true);

    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      setIsResetting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://aquafarm.au'}/reset-password`
      });

      if (error) {
        setError(error.message);
        trackEvent('password_reset_failed', 'authentication', 'password_reset', 0);
      } else {
        setSuccess('Password reset email sent! Check your inbox for instructions.');
        setResetEmail('');
        setShowForgotPassword(false);
        trackEvent('password_reset_sent', 'authentication', 'password_reset', 1);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      trackEvent('password_reset_failed', 'authentication', 'password_reset', 0);
    }

    setIsResetting(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {showForgotPassword ? 'Reset Password' : 'Sign in to your account'}
          </h2>
          {!showForgotPassword && (
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Access your volunteer application and dashboard
            </p>
          )}
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {!showForgotPassword ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {success}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter your email address"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>

                <div className="text-center space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:underline"
                  >
                    Forgot your password?
                  </button>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/register')}
                        className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:underline font-medium"
                      >
                        Create one here
                      </button>
                    </p>
                  </div>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleForgotPassword}>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {success}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError('');
                      setSuccess('');
                      setResetEmail('');
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to login
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}