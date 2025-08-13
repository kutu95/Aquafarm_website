import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Tasks() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [tasks, setTasks] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setDataLoading(true);
      
      // Check if tasks table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist yet - show setup message
        console.log('Tasks table not found - migration needed');
        setTasks([]);
        return;
      }
      
      if (tableError) throw tableError;
      
      // Table exists, fetch tasks
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/greenhouse" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Greenhouse
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Greenhouse Operations Calendar</h1>
            <p className="text-gray-600">Manage recurring tasks, schedules, and link to SOPs</p>
          </div>

          {/* View Toggle */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                List View
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {viewMode === 'calendar' ? 'Calendar View' : 'Task List'}
            </h2>
            
            {dataLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
                <p className="text-gray-600 mb-4">
                  {tasks === null 
                    ? 'The tasks system needs to be set up. Please run the database migration first.'
                    : 'No active tasks have been created yet.'
                  }
                </p>
                {tasks === null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-blue-900 mb-2">Setup Required:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Run the database migration: <code className="bg-blue-100 px-1 rounded">supabase/migrations/create_greenhouse_tasks_system.sql</code></li>
                      <li>Restart the development server</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-600">
                  {viewMode === 'calendar' 
                    ? 'Calendar view coming soon...' 
                    : 'Task list view coming soon...'
                  }
                </p>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Found {tasks.length} active tasks in the system.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
