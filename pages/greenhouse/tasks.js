import React, { useState, useEffect, useContext } from 'react';
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

  const [availableSops, setAvailableSops] = useState([]);
  const [sopSearchTerm, setSopSearchTerm] = useState('');
  const [showSopSelector, setShowSopSelector] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTask) {
        // Update existing task
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            description: formData.description,
            task_type: formData.task_type,
            priority: formData.priority,
            estimated_duration_minutes: formData.estimated_duration_minutes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id);

        if (taskError) throw taskError;

        // Update or create schedule
        const scheduleData = {
          schedule_type: formData.schedule_type,
          start_time: formData.start_time,
          end_time: formData.end_time,
          repeat_every: formData.repeat_every,
          max_occurrences: formData.max_occurrences || null,
          start_date: formData.start_date,
          end_date: formData.end_date || null
        };

        // Add schedule-specific fields
        switch (formData.schedule_type) {
          case 'daily':
            break;
          case 'weekly':
            scheduleData.day_of_week = formData.day_of_week;
            break;
          case 'monthly':
            scheduleData.day_of_month = formData.day_of_month;
            break;
          case 'yearly':
            scheduleData.month_of_year = formData.month_of_year;
            break;
          case 'one_off':
            scheduleData.specific_date = formData.specific_date;
            break;
          case 'seasonal':
            scheduleData.season_start_month = formData.season_start_month;
            scheduleData.season_end_month = formData.season_end_month;
            break;
        }

        // Check if schedule exists
        const { data: existingSchedule } = await supabase
          .from('task_schedules')
          .select('id')
          .eq('task_id', editingTask.id)
          .single();

        if (existingSchedule) {
          // Update existing schedule
          const { error: scheduleError } = await supabase
            .from('task_schedules')
            .update(scheduleData)
            .eq('id', existingSchedule.id);

          if (scheduleError) throw scheduleError;
        } else {
          // Create new schedule
          const { error: scheduleError } = await supabase
            .from('task_schedules')
            .insert({
              ...scheduleData,
              task_id: editingTask.id
            });

          if (scheduleError) throw scheduleError;
        }

        console.log('✅ Task updated successfully');
      } else {
        // Create new task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: formData.title,
            description: formData.description,
            task_type: formData.task_type,
            priority: formData.priority,
            estimated_duration_minutes: formData.estimated_duration_minutes,
            is_active: true
          })
          .select()
          .single();

        if (taskError) throw taskError;

        // Create schedule
        const scheduleData = {
          task_id: newTask.id,
          schedule_type: formData.schedule_type,
          start_time: formData.start_time,
          end_time: formData.end_time,
          repeat_every: formData.repeat_every,
          max_occurrences: formData.max_occurrences || null,
          start_date: formData.start_date,
          end_date: formData.end_date || null
        };

        // Add schedule-specific fields
        switch (formData.schedule_type) {
          case 'daily':
            break;
          case 'weekly':
            scheduleData.day_of_week = formData.day_of_week;
            break;
          case 'monthly':
            scheduleData.day_of_month = formData.day_of_month;
            break;
          case 'yearly':
            scheduleData.month_of_year = formData.month_of_year;
            break;
          case 'one_off':
            scheduleData.specific_date = formData.specific_date;
            break;
          case 'seasonal':
            scheduleData.season_start_month = formData.season_start_month;
            scheduleData.season_end_month = formData.season_end_month;
            break;
        }

        const { error: scheduleError } = await supabase
          .from('task_schedules')
          .insert(scheduleData);

        if (scheduleError) throw scheduleError;

        console.log('✅ Task created successfully');
      }

      // Handle SOP links for both create and update
      const taskId = editingTask ? editingTask.id : newTask.id;
      
      if (formData.selected_sops.length > 0) {
        // First, remove existing SOP links
        if (editingTask) {
          await supabase
            .from('task_sop_links')
            .delete()
            .eq('task_id', taskId);
        }

        // Create new SOP links
        const sopLinks = formData.selected_sops.map((sopId, index) => ({
          task_id: taskId,
          sop_id: sopId,
          display_order: index
        }));

        const { error: sopLinksError } = await supabase
          .from('task_sop_links')
          .insert(sopLinks);

        if (sopLinksError) {
          console.error('❌ Error creating SOP links:', sopLinksError);
        }
      }

      // Refresh tasks and close form
      await fetchTasks();
      setShowForm(false);
      setEditingTask(null);
      setFormData({
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
    } catch (error) {
      console.error('❌ Error saving task:', error);
      alert('Error saving task: ' + error.message);
    }
  };

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
      fetchAvailableSops();
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
      
      // Table exists, fetch tasks with schedules and SOPs
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_schedules (*),
          task_sop_links (
            sop_id,
            display_order,
            pages (
              id,
              title,
              slug,
              page_type
            )
          )
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

  const fetchAvailableSops = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, page_type')
        .eq('page_type', 'sop')
        .order('title');

      if (error) {
        console.error('❌ Error fetching SOPs:', error);
        return;
      }

      setAvailableSops(data || []);
    } catch (error) {
      console.error('❌ Error in fetchAvailableSops:', error);
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

        <div className="grid grid-cols-7 gap-0 border border-gray-300 rounded-lg overflow-hidden">
          {/* Header row */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 bg-gray-100 border-b border-gray-300">
              {day}
            </div>
          ))}
          
          {/* Calendar weeks */}
          {calendar.map((week, weekIndex) => (
            <div key={weekIndex} className="contents">
              {week.map(({ date, tasks, isCurrentMonth, isToday }, dayIndex) => {
                // Check if this is the first week of the current month
                const isFirstWeekOfMonth = date.getDate() <= 7 && isCurrentMonth;
                // Check if this is the last week of the previous month
                const isLastWeekOfPrevMonth = !isCurrentMonth && date.getDate() >= 25;
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`p-3 min-h-[100px] border-r border-gray-300 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''} ${
                      isFirstWeekOfMonth ? 'border-t-2 border-t-blue-400' : ''
                    } ${
                      isLastWeekOfPrevMonth ? 'border-b-2 border-b-gray-400' : ''
                    } ${
                      dayIndex === 6 ? 'border-r-0' : ''
                    }`}
                  >
                    <div className={`text-sm mb-2 ${
                      isCurrentMonth ? 'text-gray-900 font-semibold' : 'text-gray-400'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                            task.priority === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            task.priority === 'medium' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                          title={`${task.title} - ${task.description}`}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Task List View</h2>
        
        <div className="space-y-3">
          {tasks.map(task => {
            const schedule = task.task_schedules?.[0];
            let scheduleText = 'No schedule';
            
            if (schedule) {
              switch (schedule.schedule_type) {
                case 'daily':
                  scheduleText = 'Daily';
                  break;
                case 'weekly':
                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  scheduleText = `Every ${days[schedule.day_of_week]}`;
                  break;
                case 'monthly':
                  scheduleText = `Monthly on day ${schedule.day_of_month}`;
                  break;
                case 'yearly':
                  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  scheduleText = `Yearly in ${months[schedule.month_of_year]}`;
                  break;
                case 'one_off':
                  scheduleText = `One-off on ${schedule.specific_date}`;
                  break;
                case 'seasonal':
                  scheduleText = `Seasonal (${schedule.season_start_month}-${schedule.season_end_month})`;
                  break;
                default:
                  scheduleText = 'Custom schedule';
              }
            }
            
            return (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{task.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>📅 {scheduleText}</span>
                      <span>⏱️ {task.estimated_duration_minutes} min</span>
                      {task.task_schedules?.[0]?.start_time && (
                        <span>🕐 {task.task_schedules[0].start_time}</span>
                      )}
                    </div>
                  </div>
                  
                  {role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setFormData({
                          title: task.title,
                          description: task.description,
                          task_type: task.task_type,
                          priority: task.priority,
                          estimated_duration_minutes: task.estimated_duration_minutes,
                          schedule_type: task.task_schedules?.[0]?.schedule_type || 'weekly',
                          day_of_week: task.task_schedules?.[0]?.day_of_week || 1,
                          day_of_month: task.task_schedules?.[0]?.day_of_month || 1,
                          month_of_year: task.task_schedules?.[0]?.month_of_year || 1,
                          week_of_month: task.task_schedules?.[0]?.week_of_month || 1,
                          specific_date: task.task_schedules?.[0]?.specific_date || '',
                          season_start_month: task.task_schedules?.[0]?.season_start_month || 1,
                          season_end_month: task.task_schedules?.[0]?.season_end_month || 12,
                          start_time: task.task_schedules?.[0]?.start_time || '09:00',
                          end_time: task.task_schedules?.[0]?.end_time || '17:00',
                          repeat_every: task.task_schedules?.[0]?.repeat_every || 1,
                          max_occurrences: task.task_schedules?.[0]?.max_occurrences || '',
                          start_date: task.task_schedules?.[0]?.start_date || new Date().toISOString().split('T')[0],
                          end_date: task.task_schedules?.[0]?.end_date || '',
                          selected_sops: []
                        });
                        setShowForm(true);
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

          {/* View Toggle and Add Task Button */}
          <div className="mb-6 flex justify-between items-center">
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
            
            {role === 'admin' && (
              <button
                onClick={() => {
                  setEditingTask(null);
                  setFormData({
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
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                + Add Task
              </button>
            )}
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
            viewMode === 'calendar' ? renderCalendar() : renderListView()
          )}
        </div>
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recurring">Recurring</option>
                    <option value="one_off">One-off</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Type
                  </label>
                  <select
                    value={formData.schedule_type}
                    onChange={(e) => setFormData({...formData, schedule_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_off">One-off</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData({...formData, estimated_duration_minutes: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
              
              {/* Schedule-specific fields */}
              {formData.schedule_type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}
              
              {formData.schedule_type === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    value={formData.day_of_month}
                    onChange={(e) => setFormData({...formData, day_of_month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="31"
                  />
                </div>
              )}
              
              {formData.schedule_type === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month of Year
                  </label>
                  <select
                    value={formData.month_of_year}
                    onChange={(e) => setFormData({...formData, month_of_year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
              )}
              
              {formData.schedule_type === 'one_off' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Date
                  </label>
                  <input
                    type="date"
                    value={formData.specific_date}
                    onChange={(e) => setFormData({...formData, specific_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {formData.schedule_type === 'seasonal' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Season Start Month
                    </label>
                    <select
                      value={formData.season_start_month}
                      onChange={(e) => setFormData({...formData, season_start_month: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Season End Month
                    </label>
                    <select
                      value={formData.season_end_month}
                      onChange={(e) => setFormData({...formData, season_end_month: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* SOP Links Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Related SOPs</h3>
                
                <div className="space-y-3">
                  {/* Selected SOPs */}
                  {formData.selected_sops.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Selected SOPs:</label>
                      <div className="space-y-2">
                        {formData.selected_sops.map((sopId, index) => {
                          const sop = availableSops.find(s => s.id === sopId);
                          return sop ? (
                            <div key={sopId} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                              <span className="text-sm text-blue-800">{sop.title}</span>
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  selected_sops: formData.selected_sops.filter(id => id !== sopId)
                                })}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add SOP Button */}
                  <button
                    type="button"
                    onClick={() => setShowSopSelector(true)}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors duration-200"
                  >
                    + Add SOP Link
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedTask.title}</h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{selectedTask.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    selectedTask.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    selectedTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedTask.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <p className="text-gray-900">{selectedTask.estimated_duration_minutes} minutes</p>
                </div>
              </div>

              {/* Related SOPs Section */}
              {selectedTask.task_sop_links && selectedTask.task_sop_links.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Related SOPs</h3>
                  <div className="space-y-2">
                    {selectedTask.task_sop_links
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((link) => {
                        const sop = link.pages;
                        if (!sop) return null;
                        
                        return (
                          <div key={link.sop_id} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-900">{sop.title}</h4>
                              <p className="text-sm text-blue-700">SOP Document</p>
                            </div>
                            <a
                              href={`/sops/${sop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200"
                            >
                              Open SOP ↗
                            </a>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {role === 'admin' && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditingTask(selectedTask);
                      setFormData({
                        title: selectedTask.title,
                        description: selectedTask.description,
                        task_type: selectedTask.task_type,
                        priority: selectedTask.priority,
                        estimated_duration_minutes: selectedTask.estimated_duration_minutes,
                        schedule_type: selectedTask.task_schedules?.[0]?.schedule_type || 'weekly',
                        day_of_week: selectedTask.task_schedules?.[0]?.day_of_week || 1,
                        day_of_month: selectedTask.task_schedules?.[0]?.day_of_month || 1,
                        month_of_year: selectedTask.task_schedules?.[0]?.month_of_year || 1,
                        week_of_month: selectedTask.task_schedules?.[0]?.week_of_month || 1,
                        specific_date: selectedTask.task_schedules?.[0]?.specific_date || '',
                        season_start_month: selectedTask.task_schedules?.[0]?.season_start_month || 1,
                        season_end_month: selectedTask.task_schedules?.[0]?.season_end_month || 12,
                        start_time: selectedTask.task_schedules?.[0]?.start_time || '09:00',
                        end_time: selectedTask.task_schedules?.[0]?.end_time || '17:00',
                        repeat_every: selectedTask.task_schedules?.[0]?.repeat_every || 1,
                        max_occurrences: selectedTask.task_schedules?.[0]?.max_occurrences || '',
                        start_date: selectedTask.task_schedules?.[0]?.start_date || new Date().toISOString().split('T')[0],
                        end_date: selectedTask.task_schedules?.[0]?.end_date || '',
                        selected_sops: selectedTask.task_sop_links?.map(link => link.sop_id) || []
                      });
                      setShowTaskModal(false);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Edit Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOP Selector Modal */}
      {showSopSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select SOPs to Link</h2>
              <button
                onClick={() => setShowSopSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search SOPs..."
                value={sopSearchTerm}
                onChange={(e) => setSopSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SOP List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableSops
                .filter(sop => sop.title.toLowerCase().includes(sopSearchTerm.toLowerCase()))
                .map(sop => (
                  <div
                    key={sop.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${
                      formData.selected_sops.includes(sop.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (formData.selected_sops.includes(sop.id)) {
                        setFormData({
                          ...formData,
                          selected_sops: formData.selected_sops.filter(id => id !== sop.id)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          selected_sops: [...formData.selected_sops, sop.id]
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{sop.title}</h3>
                        <p className="text-sm text-gray-500">/{sop.slug}</p>
                      </div>
                      <div className="text-blue-600">
                        {formData.selected_sops.includes(sop.id) ? '✓' : '+'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowSopSelector(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
