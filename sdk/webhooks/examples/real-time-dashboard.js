// Real-time dashboard example using webhooks
import { WebhookClient } from '@school-sis/webhooks';

class RealTimeDashboard {
  constructor(config) {
    this.webhook = new WebhookClient(config);
    this.stats = {
      students: { total: 0, recent: 0 },
      grades: { total: 0, recent: 0 },
      attendance: { total: 0, recent: 0 },
      users: { total: 0, recent: 0 }
    };
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Connection events
    this.webhook.on('connected', () => {
      console.log('✅ Connected to webhook server');
      this.updateConnectionStatus('connected');
    });

    this.webhook.on('disconnected', (info) => {
      console.log('❌ Disconnected from webhook server:', info);
      this.updateConnectionStatus('disconnected');
    });

    this.webhook.on('reconnecting', (info) => {
      console.log('🔄 Reconnecting...', info);
      this.updateConnectionStatus('reconnecting');
    });

    this.webhook.on('error', (error) => {
      console.error('❌ Webhook error:', error);
      this.showError(error.message);
    });

    // Student events
    this.webhook.subscribeToStudents((event) => {
      console.log('📚 Student event:', event.event, event.data);
      this.handleStudentEvent(event);
    });

    // Grade events
    this.webhook.subscribeToGrades((event) => {
      console.log('📊 Grade event:', event.event, event.data);
      this.handleGradeEvent(event);
    });

    // Attendance events
    this.webhook.subscribeToAttendance((event) => {
      console.log('📅 Attendance event:', event.event, event.data);
      this.handleAttendanceEvent(event);
    });

    // User events
    this.webhook.subscribeToUsers((event) => {
      console.log('👤 User event:', event.event, event.data);
      this.handleUserEvent(event);
    });

    // General event handler
    this.webhook.on('event', (event) => {
      this.updateActivityFeed(event);
    });
  }

  async connect() {
    try {
      await this.webhook.connect();
      this.initializeDashboard();
    } catch (error) {
      console.error('Failed to connect:', error);
      this.showError('Failed to connect to webhook server');
    }
  }

  disconnect() {
    this.webhook.disconnect();
  }

  handleStudentEvent(event) {
    switch (event.event) {
      case 'student.created':
        this.stats.students.total++;
        this.stats.students.recent++;
        this.showNotification('New student enrolled', `${event.data.firstName} ${event.data.lastName}`);
        break;
      
      case 'student.updated':
        this.showNotification('Student updated', `${event.data.firstName} ${event.data.lastName}`);
        break;
      
      case 'student.deleted':
        this.stats.students.total--;
        this.showNotification('Student removed', event.data.studentId);
        break;
      
      case 'student.graduated':
        this.stats.students.total--;
        this.showNotification('Student graduated', `${event.data.firstName} ${event.data.lastName}`);
        break;
    }
    
    this.updateStats();
  }

  handleGradeEvent(event) {
    switch (event.event) {
      case 'grade.created':
      case 'grade.updated':
        this.stats.grades.total++;
        this.stats.grades.recent++;
        this.showNotification('Grade updated', `Student: ${event.data.studentId}`);
        break;
    }
    
    this.updateStats();
  }

  handleAttendanceEvent(event) {
    switch (event.event) {
      case 'attendance.marked':
        this.stats.attendance.total++;
        this.stats.attendance.recent++;
        this.showNotification('Attendance marked', `Student: ${event.data.studentId}`);
        break;
    }
    
    this.updateStats();
  }

  handleUserEvent(event) {
    switch (event.event) {
      case 'user.created':
        this.stats.users.total++;
        this.stats.users.recent++;
        this.showNotification('New user created', event.data.email);
        break;
      
      case 'user.login':
        this.showNotification('User logged in', event.data.email);
        break;
    }
    
    this.updateStats();
  }

  initializeDashboard() {
    // Create dashboard HTML if not exists
    if (!document.getElementById('dashboard')) {
      this.createDashboardHTML();
    }
    
    this.updateStats();
    this.startStatsResetTimer();
  }

  createDashboardHTML() {
    const dashboardHTML = `
      <div id="dashboard" class="dashboard">
        <header class="dashboard-header">
          <h1>Real-Time School SIS Dashboard</h1>
          <div class="connection-status">
            <span id="connection-status" class="status-indicator">Connecting...</span>
          </div>
        </header>

        <div class="dashboard-grid">
          <div class="stats-panel">
            <h2>Live Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card students">
                <div class="stat-number" id="students-total">0</div>
                <div class="stat-label">Students</div>
                <div class="stat-recent" id="students-recent">+0 recent</div>
              </div>
              
              <div class="stat-card grades">
                <div class="stat-number" id="grades-total">0</div>
                <div class="stat-label">Grades</div>
                <div class="stat-recent" id="grades-recent">+0 recent</div>
              </div>
              
              <div class="stat-card attendance">
                <div class="stat-number" id="attendance-total">0</div>
                <div class="stat-label">Attendance</div>
                <div class="stat-recent" id="attendance-recent">+0 recent</div>
              </div>
              
              <div class="stat-card users">
                <div class="stat-number" id="users-total">0</div>
                <div class="stat-label">Users</div>
                <div class="stat-recent" id="users-recent">+0 recent</div>
              </div>
            </div>
          </div>

          <div class="activity-panel">
            <h2>Live Activity Feed</h2>
            <div id="activity-feed" class="activity-feed">
              <div class="activity-item">
                <span class="activity-time">Just now</span>
                <span class="activity-message">Dashboard connected and ready</span>
              </div>
            </div>
          </div>

          <div class="notifications-panel">
            <h2>Notifications</h2>
            <div id="notifications" class="notifications">
              <div class="notification">
                <span class="notification-time">Just now</span>
                <span class="notification-message">Dashboard initialized</span>
              </div>
            </div>
          </div>
        </div>

        <div class="controls">
          <button id="connect-btn" class="btn btn-primary">Connect</button>
          <button id="disconnect-btn" class="btn btn-secondary">Disconnect</button>
          <button id="clear-feed-btn" class="btn btn-outline">Clear Feed</button>
        </div>
      </div>

      <style>
        .dashboard {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .status-indicator {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .status-indicator.connected {
          background: #d4edda;
          color: #155724;
        }

        .status-indicator.disconnected {
          background: #f8d7da;
          color: #721c24;
        }

        .status-indicator.reconnecting {
          background: #fff3cd;
          color: #856404;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .stats-panel {
          grid-column: 1 / -1;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-number {
          font-size: 2.5em;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 1.1em;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-recent {
          font-size: 0.9em;
          color: #28a745;
        }

        .activity-feed, .notifications {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item, .notification {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .activity-item:last-child, .notification:last-child {
          border-bottom: none;
        }

        .activity-time, .notification-time {
          font-size: 0.8em;
          color: #999;
          min-width: 80px;
        }

        .activity-message, .notification-message {
          flex: 1;
          margin-left: 10px;
        }

        .controls {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-outline {
          background: white;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn:hover {
          opacity: 0.9;
        }
      </style>
    `;

    document.body.innerHTML = dashboardHTML;

    // Setup event listeners
    document.getElementById('connect-btn').addEventListener('click', () => this.connect());
    document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());
    document.getElementById('clear-feed-btn').addEventListener('click', () => this.clearActivityFeed());
  }

  updateStats() {
    document.getElementById('students-total').textContent = this.stats.students.total;
    document.getElementById('students-recent').textContent = `+${this.stats.students.recent} recent`;
    
    document.getElementById('grades-total').textContent = this.stats.grades.total;
    document.getElementById('grades-recent').textContent = `+${this.stats.grades.recent} recent`;
    
    document.getElementById('attendance-total').textContent = this.stats.attendance.total;
    document.getElementById('attendance-recent').textContent = `+${this.stats.attendance.recent} recent`;
    
    document.getElementById('users-total').textContent = this.stats.users.total;
    document.getElementById('users-recent').textContent = `+${this.stats.users.recent} recent`;
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = `status-indicator ${status}`;
  }

  updateActivityFeed(event) {
    const feed = document.getElementById('activity-feed');
    const time = new Date().toLocaleTimeString();
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
      <span class="activity-time">${time}</span>
      <span class="activity-message">${event.event}: ${JSON.stringify(event.data)}</span>
    `;
    
    feed.insertBefore(activityItem, feed.firstChild);
    
    // Keep only last 50 items
    while (feed.children.length > 50) {
      feed.removeChild(feed.lastChild);
    }
  }

  showNotification(title, message) {
    const notifications = document.getElementById('notifications');
    const time = new Date().toLocaleTimeString();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <span class="notification-time">${time}</span>
      <span class="notification-message">${title}: ${message}</span>
    `;
    
    notifications.insertBefore(notification, notifications.firstChild);
    
    // Keep only last 20 notifications
    while (notifications.children.length > 20) {
      notifications.removeChild(notifications.lastChild);
    }
  }

  showError(message) {
    this.showNotification('Error', message);
  }

  clearActivityFeed() {
    document.getElementById('activity-feed').innerHTML = `
      <div class="activity-item">
        <span class="activity-time">Just now</span>
        <span class="activity-message">Activity feed cleared</span>
      </div>
    `;
  }

  startStatsResetTimer() {
    // Reset recent counters every 5 minutes
    setInterval(() => {
      this.stats.students.recent = 0;
      this.stats.grades.recent = 0;
      this.stats.attendance.recent = 0;
      this.stats.users.recent = 0;
      this.updateStats();
    }, 5 * 60 * 1000);
  }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new RealTimeDashboard({
    baseUrl: 'https://api.schoolsis.com',
    token: 'your-jwt-token-here', // Replace with actual token
    tenantSlug: 'springfield-high'
  });

  // Auto-connect
  dashboard.connect();
});

export default RealTimeDashboard;
