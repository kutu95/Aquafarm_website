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
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'recurring',
    priority: 'medium',
    estimated_duration_minutes: 60,
    schedule_type: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    month_of_year: 1,
    week_of_month: 1,
    specific_date: '',
    season_start_month: 1,
    season_end_month: 12,
    start_time: '09:00',
    end_time: '17:00',
    repeat_every: 1,
    max_occurrences: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    selected_sops: []
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    console.log('👤 User context changed:', { user: !!user, loading, role });
    if (user) {
      console.log('🚀 User authenticated, fetching tasks...');
      fetchTasks();
    } else {
      console.log('⏳ No user yet, waiting...');
    }
  }, [user, loading, role]);

  const fetchTasks = async () => {
    try {
      setDataLoading(true);
      console.log('🔍 Fetching tasks...');
      
      // Check if tasks table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist yet - show setup message
        console.log('❌ Tasks table not found - migration needed');
        setTasks(null);
        return;
      }
      
      if (tableError) {
        console.error('❌ Table check error:', tableError);
        throw tableError;
      }
      
      console.log('✅ Table exists, fetching tasks...');
      
      // Table exists, fetch tasks with schedules
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_schedules (*)
        `)
        .eq('is_active', true)
        .order('title');

      if (error) {
        console.error('❌ Tasks fetch error:', error);
        throw error;
      }
      
      console.log('✅ Tasks fetched successfully:', data?.length || 0, 'tasks');
      setTasks(data || []);
    } catch (error) {
      console.error('❌ Error in fetchTasks:', error);
      setTasks([]);
    } finally {
      setDataLoading(false);
    }
  };

  const getTasksForDate = (date) => {
    if (!tasks || tasks.length === 0) return [];
    
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    return tasks.filter(task => {
      const schedule = task.task_schedules?.[0];
      if (!schedule) return false;

      switch (schedule.schedule_type) {
        case 'daily':
          return true;
        case 'weekly':
          return schedule.day_of_week === dayOfWeek;
        case 'monthly':
          return schedule.day_of_month === dayOfMonth;
        case 'yearly':
          return schedule.month_of_year === month;
        case 'one_off':
          return schedule.specific_date === date.toISOString().split('T')[0];
        case 'seasonal':
          return month >= schedule.season_start_month && month <= schedule.season_end_month;
        default:
          return false;
      }
    });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDateObj = new Date(startDate);

    while (currentDateObj <= lastDay || calendar.length < 42) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDateObj);
        const tasks = getTasksForDate(date);
        const isCurrentMonth = date.getMonth() === month;
        const isToday = date.toDateString() === new Date().toDateString();

        week.push({
          date,
          tasks,
          isCurrentMonth,
          isToday
        });
        currentDateObj.setDate(currentDateObj.getDate() + 1);
      }
      calendar.push(week);
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
          
          {calendar.map((week, weekIndex) => (
            week.map(({ date, tasks, isCurrentMonth, isToday }) => (
              <div
                key={`${weekIndex}-${date.getDate()}`}
                className={`p-2 min-h-[100px] border border-gray-100 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="text-sm text-gray-900 mb-1">
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`text-xs p-1 rounded cursor-pointer ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                      title={`${task.title} - ${task.description}`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ))}
        </div>
      </div>
    );
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
          {dataLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading tasks...</p>
              </div>
            </div>
          ) : tasks === null ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
                <p className="text-gray-600 mb-4">
                  The tasks system needs to be set up. Please run the database migration first.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-blue-900 mb-2">Setup Required:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Run the database migration: <code className="bg-blue-100 px-1 rounded">supabase/migrations/create_greenhouse_tasks_system.sql</code></li>
                    <li>Restart the development server</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tasks</h3>
                <p className="text-gray-600 mb-4">
                  No active tasks have been created yet. Create your first task to get started!
                </p>
              </div>
            </div>
          ) : (
            viewMode === 'calendar' ? renderCalendar() : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Task List View</h2>
                <p className="text-gray-600">List view coming soon...</p>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Found {tasks.length} active tasks in the system.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}
