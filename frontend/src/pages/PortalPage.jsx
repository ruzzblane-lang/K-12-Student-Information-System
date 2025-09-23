/**
 * Portal Page
 * 
 * Student portal page with academic progress, schedule, and activities.
 * Displays personalized information for students and parents.
 * 
 * API Endpoints:
 * - GET /api/portal/student/{studentId} - Student information
 * - GET /api/portal/schedule/{studentId} - Student schedule
 * - GET /api/portal/grades/{studentId} - Student grades
 * - GET /api/portal/assignments/{studentId} - Student assignments
 * - GET /api/portal/attendance/{studentId} - Student attendance
 * - GET /api/portal/activities/{studentId} - Student activities
 * 
 * Expected Data Structure:
 * {
 *   "student": {...},
 *   "schedule": [...],
 *   "grades": [...],
 *   "assignments": [...],
 *   "attendance": {...},
 *   "activities": [...]
 * }
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Chart from '../components/ui/Chart';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';

const PortalPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [activities, setActivities] = useState([]);

  // Mock data for demonstration
  const mockStudent = {
    id: 1,
    name: 'John Doe',
    grade: '10',
    studentId: 'STU001',
    email: 'john.doe@school.edu',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, City, State 12345',
    parentName: 'Jane Doe',
    parentEmail: 'jane.doe@email.com',
    parentPhone: '+1 (555) 987-6543',
    gpa: 3.75,
    credits: 45,
    graduationYear: 2025
  };

  const mockSchedule = [
    { id: 1, period: '1', time: '8:00-8:50', subject: 'Mathematics', teacher: 'Ms. Smith', room: 'A101' },
    { id: 2, period: '2', time: '9:00-9:50', subject: 'English', teacher: 'Mr. Johnson', room: 'B205' },
    { id: 3, period: '3', time: '10:00-10:50', subject: 'Science', teacher: 'Dr. Brown', room: 'C301' },
    { id: 4, period: '4', time: '11:00-11:50', subject: 'History', teacher: 'Ms. Davis', room: 'D102' },
    { id: 5, period: '5', time: '12:00-12:50', subject: 'Lunch', teacher: '', room: 'Cafeteria' },
    { id: 6, period: '6', time: '1:00-1:50', subject: 'Physical Education', teacher: 'Coach Wilson', room: 'Gym' },
    { id: 7, period: '7', time: '2:00-2:50', subject: 'Art', teacher: 'Ms. Garcia', room: 'E201' }
  ];

  const mockGrades = [
    { id: 1, subject: 'Mathematics', currentGrade: 'A-', assignments: 15, average: 89.5, lastUpdated: '2024-01-15' },
    { id: 2, subject: 'English', currentGrade: 'B+', assignments: 12, average: 87.2, lastUpdated: '2024-01-14' },
    { id: 3, subject: 'Science', currentGrade: 'A', assignments: 18, average: 92.1, lastUpdated: '2024-01-16' },
    { id: 4, subject: 'History', currentGrade: 'B', assignments: 10, average: 85.8, lastUpdated: '2024-01-13' },
    { id: 5, subject: 'Physical Education', currentGrade: 'A', assignments: 8, average: 94.0, lastUpdated: '2024-01-12' },
    { id: 6, subject: 'Art', currentGrade: 'A-', assignments: 6, average: 88.5, lastUpdated: '2024-01-11' }
  ];

  const mockAssignments = [
    { id: 1, subject: 'Mathematics', title: 'Algebra Problems', dueDate: '2024-01-20', status: 'pending', points: 100 },
    { id: 2, subject: 'English', title: 'Essay: The Great Gatsby', dueDate: '2024-01-22', status: 'in-progress', points: 150 },
    { id: 3, subject: 'Science', title: 'Lab Report: Photosynthesis', dueDate: '2024-01-18', status: 'completed', points: 200 },
    { id: 4, subject: 'History', title: 'Research Paper: World War II', dueDate: '2024-01-25', status: 'pending', points: 300 }
  ];

  const mockAttendance = {
    totalDays: 90,
    presentDays: 85,
    absentDays: 3,
    tardyDays: 2,
    attendanceRate: 94.4
  };

  const mockActivities = [
    { id: 1, name: 'Basketball Team', type: 'sports', status: 'active', coach: 'Coach Wilson' },
    { id: 2, name: 'Debate Club', type: 'academic', status: 'active', coach: 'Ms. Davis' },
    { id: 3, name: 'Art Club', type: 'arts', status: 'active', coach: 'Ms. Garcia' },
    { id: 4, name: 'Volunteer Program', type: 'community', status: 'active', coach: 'Ms. Smith' }
  ];

  useEffect(() => {
    const loadPortalData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        setTimeout(() => {
          setStudent(mockStudent);
          setSchedule(mockSchedule);
          setGrades(mockGrades);
          setAssignments(mockAssignments);
          setAttendance(mockAttendance);
          setActivities(mockActivities);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load portal data:', error);
        setLoading(false);
      }
    };

    loadPortalData();
  }, []);

  const gradeColumns = [
    { key: 'subject', label: t('tables.subject'), sortable: true },
    { key: 'currentGrade', label: 'Grade', sortable: true },
    { key: 'average', label: 'Average', sortable: true, render: (value) => `${value}%` },
    { key: 'assignments', label: 'Assignments', sortable: true },
    { key: 'lastUpdated', label: 'Last Updated', sortable: true }
  ];

  const assignmentColumns = [
    { key: 'subject', label: t('tables.subject'), sortable: true },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { key: 'points', label: 'Points', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'completed' ? 'success' : value === 'in-progress' ? 'warning' : 'info'}
        >
          {value}
        </Badge>
      )
    }
  ];

  const scheduleColumns = [
    { key: 'period', label: 'Period', sortable: true, width: '80px' },
    { key: 'time', label: 'Time', sortable: true, width: '120px' },
    { key: 'subject', label: t('tables.subject'), sortable: true },
    { key: 'teacher', label: t('tables.teacher'), sortable: true },
    { key: 'room', label: 'Room', sortable: true }
  ];

  const activityColumns = [
    { key: 'name', label: 'Activity', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'coach', label: 'Supervisor', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'default'}>
          {value}
        </Badge>
      )
    }
  ];

  const gradeChartData = {
    labels: grades.map(g => g.subject),
    datasets: [{
      label: 'Grade Average',
      data: grades.map(g => g.average),
      backgroundColor: grades.map(g => 
        g.average >= 90 ? 'var(--color-success, #10B981)' :
        g.average >= 80 ? 'var(--color-primary, #3B82F6)' :
        g.average >= 70 ? 'var(--color-warning, #F59E0B)' :
        'var(--color-error, #EF4444)'
      )
    }]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {t('portal.title')}
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'var(--font-secondary)' }}>
              Welcome back, {student.name || 'Student'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="info" icon="🎓">
              Grade {student.grade}
            </Badge>
            <Badge variant="success" icon="📊">
              GPA: {student.gpa}
            </Badge>
          </div>
        </div>
      </div>

      {/* Student Information */}
      <Card
        title={t('portal.studentInfo')}
        icon="👨‍🎓"
        variant="elevated"
        loading={loading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Student ID:</span> {student.studentId}</div>
              <div><span className="font-medium">Email:</span> {student.email}</div>
              <div><span className="font-medium">Phone:</span> {student.phone}</div>
              <div><span className="font-medium">Address:</span> {student.address}</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Academic Information</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Grade:</span> {student.grade}</div>
              <div><span className="font-medium">GPA:</span> {student.gpa}</div>
              <div><span className="font-medium">Credits:</span> {student.credits}</div>
              <div><span className="font-medium">Graduation Year:</span> {student.graduationYear}</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Parent/Guardian</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {student.parentName}</div>
              <div><span className="font-medium">Email:</span> {student.parentEmail}</div>
              <div><span className="font-medium">Phone:</span> {student.parentPhone}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Academic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={t('portal.academicProgress')}
          icon="📊"
          variant="elevated"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Overall GPA</span>
              <span className="text-2xl font-bold text-blue-600">{student.gpa}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Credits Earned</span>
              <span className="text-lg font-semibold text-gray-900">{student.credits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
              <span className="text-lg font-semibold text-green-600">{attendance.attendanceRate}%</span>
            </div>
          </div>
        </Card>

        <Chart
          type="bar"
          title="Grade Distribution"
          subtitle="Current semester grades"
          data={gradeChartData}
          loading={loading}
        />
      </div>

      {/* Schedule */}
      <Card
        title={t('portal.schedule')}
        icon="📅"
        variant="elevated"
      >
        <Table
          data={schedule}
          columns={scheduleColumns}
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Grades and Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={t('portal.grades')}
          icon="📝"
          variant="elevated"
        >
          <Table
            data={grades}
            columns={gradeColumns}
            loading={loading}
            pagination={false}
          />
        </Card>

        <Card
          title={t('portal.assignments')}
          icon="📋"
          variant="elevated"
        >
          <Table
            data={assignments}
            columns={assignmentColumns}
            loading={loading}
            pagination={false}
          />
        </Card>
      </div>

      {/* Attendance */}
      <Card
        title={t('portal.attendance')}
        icon="✅"
        variant="elevated"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{attendance.presentDays}</div>
            <div className="text-sm text-green-700">Present</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{attendance.absentDays}</div>
            <div className="text-sm text-red-700">Absent</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{attendance.tardyDays}</div>
            <div className="text-sm text-yellow-700">Tardy</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{attendance.attendanceRate}%</div>
            <div className="text-sm text-blue-700">Rate</div>
          </div>
        </div>
      </Card>

      {/* Activities */}
      <Card
        title={t('portal.clubs')}
        icon="🏃‍♂️"
        variant="elevated"
      >
        <Table
          data={activities}
          columns={activityColumns}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default PortalPage;
