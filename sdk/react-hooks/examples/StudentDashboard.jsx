import React, { useState } from 'react';
import { SISProvider, useSIS, useStudents, useStudentStats } from '@school-sis/react-hooks';

// Main App Component with SIS Provider
function App() {
  return (
    <SISProvider config={{ 
      baseUrl: 'https://api.schoolsis.com',
      tenantSlug: 'springfield-high'
    }}>
      <div className="app">
        <Header />
        <main>
          <LoginForm />
          <StudentDashboard />
        </main>
      </div>
    </SISProvider>
  );
}

// Header Component
function Header() {
  const { user, tenant, logout, isAuthenticated } = useSIS();

  return (
    <header className="header">
      <div className="header-content">
        <h1>School SIS Dashboard</h1>
        {tenant && <span className="tenant-name">{tenant.schoolName}</span>}
        {isAuthenticated && (
          <div className="user-info">
            <span>Welcome, {user?.firstName} {user?.lastName}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}

// Login Form Component
function LoginForm() {
  const { login, isLoading, isAuthenticated } = useSIS();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    tenantSlug: 'springfield-high'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(credentials.email, credentials.password, credentials.tenantSlug);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isAuthenticated) {
    return null; // Hide login form when authenticated
  }

  return (
    <div className="login-form">
      <h2>Login to School SIS</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={credentials.email}
            onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tenantSlug">School:</label>
          <input
            type="text"
            id="tenantSlug"
            value={credentials.tenantSlug}
            onChange={(e) => setCredentials(prev => ({ ...prev, tenantSlug: e.target.value }))}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

// Student Dashboard Component
function StudentDashboard() {
  const { isAuthenticated } = useSIS();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="stats-panel">
          <StudentStats />
        </div>
        <div className="students-panel">
          <StudentList />
        </div>
        <div className="actions-panel">
          <StudentActions />
        </div>
      </div>
    </div>
  );
}

// Student Statistics Component
function StudentStats() {
  const { stats, isLoading, error } = useStudentStats();

  if (isLoading) return <div className="loading">Loading statistics...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stats) return <div>No statistics available</div>;

  return (
    <div className="stats">
      <h3>Student Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{stats.recentEnrollments}</div>
          <div className="stat-label">Recent Enrollments</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{stats.upcomingGraduations}</div>
          <div className="stat-label">Upcoming Graduations</div>
        </div>
      </div>
      
      <div className="grade-breakdown">
        <h4>By Grade Level</h4>
        {Object.entries(stats.byGradeLevel).map(([grade, count]) => (
          <div key={grade} className="grade-item">
            <span className="grade">Grade {grade}</span>
            <span className="count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Student List Component
function StudentList() {
  const { 
    students, 
    pagination, 
    isLoading, 
    error, 
    refetch, 
    setParams 
  } = useStudents({ autoLoad: true });

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    setParams({ search: searchTerm });
  };

  const handleGradeFilter = (grade) => {
    setGradeFilter(grade);
    setParams({ gradeLevel: grade || undefined });
  };

  if (isLoading) return <div className="loading">Loading students...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="student-list">
      <div className="list-header">
        <h3>Students ({pagination?.total || 0})</h3>
        <button onClick={refetch} className="refresh-btn">Refresh</button>
      </div>

      <div className="filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="grade-filters">
          <button 
            className={gradeFilter === '' ? 'active' : ''}
            onClick={() => handleGradeFilter('')}
          >
            All Grades
          </button>
          {['9', '10', '11', '12'].map(grade => (
            <button 
              key={grade}
              className={gradeFilter === grade ? 'active' : ''}
              onClick={() => handleGradeFilter(grade)}
            >
              Grade {grade}
            </button>
          ))}
        </div>
      </div>

      <div className="students-grid">
        {students.map(student => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>

      {pagination && (
        <div className="pagination">
          <button 
            disabled={!pagination.hasPrev}
            onClick={() => setParams({ page: pagination.page - 1 })}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button 
            disabled={!pagination.hasNext}
            onClick={() => setParams({ page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Student Card Component
function StudentCard({ student }) {
  return (
    <div className="student-card">
      <div className="student-info">
        <h4>{student.firstName} {student.lastName}</h4>
        <p className="student-id">ID: {student.studentId}</p>
        <p className="grade">Grade {student.gradeLevel}</p>
        {student.primaryEmail && (
          <p className="email">{student.primaryEmail}</p>
        )}
      </div>
      <div className="student-actions">
        <button className="view-btn">View Details</button>
        <button className="edit-btn">Edit</button>
      </div>
    </div>
  );
}

// Student Actions Component
function StudentActions() {
  const { create, isLoading } = useStudents();

  const handleCreateStudent = async () => {
    try {
      await create({
        studentId: 'SHS-2024-001',
        firstName: 'New',
        lastName: 'Student',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: new Date().toISOString().split('T')[0]
      });
      alert('Student created successfully!');
    } catch (error) {
      alert('Error creating student: ' + error.message);
    }
  };

  return (
    <div className="actions">
      <h3>Quick Actions</h3>
      <button 
        onClick={handleCreateStudent}
        disabled={isLoading}
        className="create-btn"
      >
        {isLoading ? 'Creating...' : 'Create New Student'}
      </button>
      
      <div className="bulk-actions">
        <button className="bulk-btn">Import CSV</button>
        <button className="bulk-btn">Export CSV</button>
        <button className="bulk-btn">Bulk Update</button>
      </div>
    </div>
  );
}

export default App;
