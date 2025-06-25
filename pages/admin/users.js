import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { AuthContext } from '../_app';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsers() {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [message, setMessage] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (role !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, role, router]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from profiles table...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === '42P01') {
          setMessage('Error: Profiles table does not exist. Please run the database migrations first.');
        } else {
          setMessage(`Error loading users: ${error.message}`);
        }
        throw error;
      }
      
      console.log('Users fetched successfully:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (!error.code) {
        setMessage('Error loading users. Please check your database connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      setMessage('Please enter an email address');
      return;
    }

    setCreatingUser(true);
    setMessage('');

    try {
      // Call the API route to create user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newUserEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setNewUserEmail('');
      setMessage('User created successfully! Invitation email sent.');
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage(`Error creating user: ${error.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setMessage('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage(`Error deleting user: ${error.message}`);
    }
  };

  if (!user || role !== 'admin') {
    return <div>Loading...</div>;
  }

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>

            {/* Create New User Form */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h2>
              <form onSubmit={createNewUser} className="flex gap-4">
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Enter user's email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>

            {/* Message Display */}
            {message && (
              <div className="px-6 py-4">
                <div className={`p-3 rounded-md ${
                  message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  {message}
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Users</h2>
              {loading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((tableUser) => (
                        <tr key={tableUser.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {tableUser.first_name && tableUser.last_name 
                                    ? `${tableUser.first_name} ${tableUser.last_name}`
                                    : 'Pending Setup'
                                  }
                                </div>
                                <div className="text-sm text-gray-500">{tableUser.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tableUser.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {tableUser.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tableUser.is_complete 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {tableUser.is_complete ? 'Complete' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tableUser.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {tableUser.id !== user?.id && (
                              <button
                                onClick={() => deleteUser(tableUser.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 