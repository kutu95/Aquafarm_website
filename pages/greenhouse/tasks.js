import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/locales/translations';

export default function Tasks() {
  const { user, role, loading } = useContext(AuthContext);
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [sops, setSops] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'recurring',
    priority: 'medium',
    estimated_duration_minutes: 60,
    schedule_type: 'weekly',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    selected_sops: []
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchSOPs();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_schedules (*),
          task_sop_links (
            sop_id,
            pages!task_sop_links_sop_id_fkey (id, title)
          )
        `)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchSOPs = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title')
        .eq('page_type', 'sop')
        .order('title');

      if (error) throw error;
      setSops(data || []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/greenhouse" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Greenhouse
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Greenhouse Operations Calendar</h1>
              <p className="text-gray-600">Manage recurring tasks, schedules, and link to SOPs</p>
            </div>
            {role === 'admin' && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Add Task
              </button>
            )}
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
            <p className="text-gray-600">
              {viewMode === 'calendar' 
                ? 'Calendar view coming soon...' 
                : 'Task list view coming soon...'
              }
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
