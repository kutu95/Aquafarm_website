import { useState, useEffect } from 'react';
import { trackEvent } from './GoogleAnalytics';

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalApplications: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Track dashboard view
      trackEvent('dashboard_viewed', 'analytics', 'admin_dashboard', 1);
      
      // You can add API calls here to fetch real-time stats
      // For now, we'll use placeholder data
      setStats({
        totalUsers: 25,
        totalApplications: 12,
        recentActivity: [
          { type: 'user_created', user: 'john@example.com', timestamp: new Date().toISOString() },
          { type: 'application_submitted', user: 'jane@example.com', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { type: 'login_success', user: 'admin@aquafarm.au', timestamp: new Date(Date.now() - 172800000).toISOString() }
        ]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Website Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-900">Volunteer Applications</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalApplications}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {stats.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium text-gray-900">
                  {activity.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-gray-600 ml-2">by {activity.user}</span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(activity.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-sm font-medium text-yellow-900 mb-2">Google Analytics</h3>
        <p className="text-sm text-yellow-700">
          Detailed analytics are available in your Google Analytics dashboard. 
          Visit <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline">analytics.google.com</a> to view comprehensive reports.
        </p>
      </div>
    </div>
  );
} 