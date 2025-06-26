import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { trackEvent } from '@/components/GoogleAnalytics';

export default function ResetPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('Reset password page - checking user...');
        console.log('Router query:', router.query);
        console.log('Router asPath:', router.asPath);
        console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
        
        // Check if we have the necessary URL parameters for password reset
        const { access_token, refresh_token, type, error, error_code, error_description } = router.query;
        
        // Also check for hash fragments (Supabase sometimes puts tokens in the hash)
        let hashParams = {};
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1); // Remove the #
          hashParams = Object.fromEntries(new URLSearchParams(hash));
          console.log('Hash parameters:', hashParams);
        }
        
        console.log('URL params:', { 
          access_token: !!access_token, 
          refresh_token: !!refresh_token, 
          type,
          error,
          error_code,
          error_description
        });
        
        // Check for error parameters first (from query or hash)
        const hasError = error || error_code || error_description || hashParams.error || hashParams.error_code || hashParams.error_description;
        
        if (hasError) {
          const actualError = error || hashParams.error;
          const actualErrorCode = error_code || hashParams.error_code;
          const actualErrorDescription = error_description || hashParams.error_description;
          
          console.log('Error detected in URL parameters:', { 
            error: actualError, 
            error_code: actualErrorCode, 
            error_description: actualErrorDescription 
          });
          
          if (actualErrorCode === 'otp_expired' || actualErrorDescription?.includes('expired')) {
            setError('This password reset link has expired. Please request a new password reset link.');
          } else if (actualError === 'access_denied') {
            setError('This password reset link is invalid or has expired. Please request a new password reset link.');
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
          setLoading(false);
          return;
        }
        
        // Check for tokens in both query params and hash
        const hasAccessToken = access_token || hashParams.access_token;
        const hasRefreshToken = refresh_token || hashParams.refresh_token;
        const hasType = type || hashParams.type;
        
        // If we don't have the tokens in the URL, this might not be a valid reset link
        if (!hasAccessToken || !hasRefreshToken || hasType !== 'recovery') {
          console.log('Missing required URL parameters for password reset');
          console.log('Required params:', { hasAccessToken, hasRefreshToken, hasType });
          setError('Invalid or expired reset link. Please request a new password reset.');
          setLoading(false);
          return;
        }

        // Set a flag in localStorage to indicate this is a password reset session
        if (typeof window !== 'undefined') {
          localStorage.setItem('password_reset_in_progress', 'true');
          console.log('Set password reset flag in localStorage');
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session check result:', { hasSession: !!session, error: sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new password reset.');
          setLoading(false);
          return;
        }

        // Check if we have a session (which means the reset token is valid)
        if (!session) {
          console.log('No session found');
          setError('Invalid or expired reset link. Please request a new password reset.');
          setLoading(false);
          return;
        }

        console.log('Valid password reset session found, allowing password reset');
        // If we get here, we have a valid password reset session
        setLoading(false);
        
      } catch (error) {
        console.error('Error checking user:', error);
        setError('Invalid or expired reset link. Please request a new password reset.');
        setLoading(false);
      }
    };

    // Only run the check if we have router.query
    if (router.isReady) {
      checkUser();
    }

    // Cleanup function to remove the flag when component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('password_reset_in_progress');
        console.log('Cleared password reset flag from localStorage');
      }
    };
  }, [router.isReady, router.query, router.asPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        throw error;
      }

      setSuccess('Password updated successfully! Redirecting to login...');
      trackEvent('password_reset_success', 'authentication', 'password_reset', 1);
      
      // Clear the password reset flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem('password_reset_in_progress');
      }
      
      // Sign out to clear the session
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error) {
      console.error('Error updating password:', error);
      setError(`Error updating password: ${error.message}`);
      trackEvent('password_reset_failed', 'authentication', 'password_reset', 0);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
            {error}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Request new reset link
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
            {success}
          </div>
          )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm your new password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isUpdating}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
