import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent.');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleReset} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-xl mb-4 font-bold text-center">Reset Password</h2>
        <input
          type="email"
          className="border p-2 w-full mb-4"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="bg-blue-500 text-white p-2 w-full rounded">Send Reset Email</button>
        {message && <p className="mt-4 text-center text-sm text-green-500">{message}</p>}
      </form>
    </div>
  );
}