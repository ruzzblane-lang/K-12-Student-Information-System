/**
 * Dashboard Page
 * 
 * Main dashboard page with overview statistics, charts, and quick actions.
 * Displays key metrics, recent activity, and system status.
 * 
 * API Endpoints:
 * - GET /api/dashboard/stats - Dashboard statistics
 * - GET /api/dashboard/activity - Recent activity feed
 * - GET /api/dashboard/charts - Chart data
 * - GET /api/notifications - System notifications
 * 
 * Expected Data Structure:
 * {
 *   "stats": {
 *     "students": 1250,
 *     "teachers": 85,
 *     "courses": 120,
 *     "attendanceRate": 94.5
 *   },
 *   "activity": [...],
 *   "charts": {...},
 *   "notifications": [...]
 * }
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Chart from '../components/ui/Chart';
import Badge from '../components/ui/Badge';
import Notification from '../components/ui/Notification';

const DashboardPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Mock data for demonstration
  const mockStats = {
    students: 1250,
    teachers: 85,
    courses: 120,
    attendanceRate: 94.5,
    averageGrade: 87.2,
    activeUsers: 892
  };

  const mockActivity = [
    { id: 1, type: 'enrollment', message: 'New student enrolled: Sarah Johnson', time: '2 hours ago', icon: '👨‍🎓' },
    { id: 2, type: 'grade', message: 'Grades posted for Math 101', time: '4 hours ago', icon: '📝' },
    { id: 3, type: 'attendance', message: 'Attendance marked for Grade 10A', time: '6 hours ago', icon: '✅' },
    { id: 4, type: 'announcement', message: 'New announcement: School Holiday', time: '1 day ago', icon: '📢' },
    { id: 5, type: 'payment', message: 'Payment received from John Smith', time: '2 days ago', icon: '💳' }
  ];

  const mockNotifications = [
    { id: 1, type: 'info', title: 'System Update', message: 'New features available in the portal' },
    { id: 2, type: 'warning', title: 'Maintenance', message: 'Scheduled maintenance tonight at 2 AM' },
    { id: 3, type: 'success', title: 'Backup Complete', message: 'Daily backup completed successfully' }
  ];

  useEffect(() => {
    // Simulate API call
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // In real implementation, fetch from API
        // const response = await fetch('/api/dashboard/stats');
        // const data = await response.json();
        
        // Using mock data for now
        setTimeout(() => {
          setStats(mockStats);
          setActivity(mockActivity);
          setNotifications(mockNotifications);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const statCards = [
    {
      title: t('dashboard.studentCount'),
      value: stats.students || 0,
      icon: '👨‍🎓',
      color: 'blue',
      change: '+5.2%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.teacherCount'),
      value: stats.teachers || 0,
      icon: '👩‍🏫',
      color: 'green',
      change: '+2.1%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.courseCount'),
      value: stats.courses || 0,
      icon: '📚',
      color: 'purple',
      change: '+1.8%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.attendanceRate'),
      value: `${stats.attendanceRate || 0}%`,
      icon: '✅',
      color: 'yellow',
      change: '+0.5%',
      changeType: 'positive'
    }
  ];

  const chartData = {
    attendance: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: t('charts.attendance'),
        data: [85, 92, 78, 96, 88, 94],
        borderColor: 'var(--color-primary, #3B82F6)',
        backgroundColor: 'var(--color-primary, #3B82F6)20',
        tension: 0.4,
        fill: true
      }]
    },
    grades: {
      labels: ['A', 'B', 'C', 'D', 'F'],
      datasets: [{
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          'var(--color-success, #10B981)',
          'var(--color-primary, #3B82F6)',
          'var(--color-accent, #F59E0B)',
          'var(--color-warning, #F59E0B)',
          'var(--color-error, #EF4444)'
        ]
      }]
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {t('dashboard.title')}
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'var(--font-secondary)' }}>
              {t('dashboard.welcome')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="success" icon="🟢">
              {t('common.active')}
            </Badge>
            <span className="text-sm text-gray-500">
              {t('common.lastUpdated')}: {new Date().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Notification
              key={notification.id}
              type={notification.type}
              title={notification.title}
              message={notification.message}
            />
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            title={stat.title}
            icon={stat.icon}
            variant="elevated"
            loading={loading}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                  {stat.value}
                </div>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    vs last month
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          type="line"
          title={t('charts.attendance')}
          subtitle={t('charts.monthly')}
          data={chartData.attendance}
          loading={loading}
        />
        <Chart
          type="doughnut"
          title={t('charts.grades')}
          subtitle={t('charts.distribution')}
          data={chartData.grades}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={t('dashboard.recentActivity')}
          icon="📊"
          variant="elevated"
        >
          <div className="space-y-4">
            {activity.map(item => (
              <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <span className="text-2xl" role="img" aria-label={item.type}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                    {item.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.time}
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card
          title={t('dashboard.quickActions')}
          icon="⚡"
          variant="elevated"
        >
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="text-2xl mb-2">👨‍🎓</div>
              <div className="font-medium text-gray-900">{t('common.students')}</div>
              <div className="text-sm text-gray-500">{t('common.view')}</div>
            </button>
            <button className="p-4 text-left rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium text-gray-900">{t('common.grades')}</div>
              <div className="text-sm text-gray-500">{t('common.edit')}</div>
            </button>
            <button className="p-4 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-medium text-gray-900">{t('common.attendance')}</div>
              <div className="text-sm text-gray-500">{t('common.mark')}</div>
            </button>
            <button className="p-4 text-left rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
              <div className="text-2xl mb-2">📢</div>
              <div className="font-medium text-gray-900">{t('common.announcements')}</div>
              <div className="text-sm text-gray-500">{t('common.create')}</div>
            </button>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card
        title="System Status"
        icon="🖥️"
        variant="outlined"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Database: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">API: Healthy</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Storage: 78% Full</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
