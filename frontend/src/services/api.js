import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Authentication API
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-_password', { email }),
  resetPassword: (token, _password) => api.post('/auth/reset-_password', { token, _password }),
};

// Students API
export const studentService = {
  getAllStudents: (params) => api.get('/students', { params }),
  getStudentById: (_id) => api.get(`/students/${_id}`),
  createStudent: (data) => api.post('/students', data),
  updateStudent: (_id, data) => api.put(`/students/${_id}`, data),
  deleteStudent: (_id) => api.delete(`/students/${_id}`),
  getStudentGrades: (_id, termId) => api.get(`/students/${_id}/grades`, { params: { _term_id: termId } }),
  getStudentAttendance: (_id, params) => api.get(`/students/${_id}/attendance`, { params }),
  getStudentEnrollments: (_id, termId) => api.get(`/students/${_id}/enrollments`, { params: { _term_id: termId } }),
  enrollStudent: (_id, courseSectionId) => api.post(`/students/${_id}/enroll`, { _course_section_id: courseSectionId }),
  unenrollStudent: (_id, _enrollmentId) => api.delete(`/students/${_id}/unenroll/${_enrollmentId}`),
};

// Teachers API
export const teacherService = {
  getAllTeachers: (params) => api.get('/teachers', { params }),
  getTeacherById: (_id) => api.get(`/teachers/${_id}`),
  createTeacher: (data) => api.post('/teachers', data),
  updateTeacher: (_id, data) => api.put(`/teachers/${_id}`, data),
  deleteTeacher: (_id) => api.delete(`/teachers/${_id}`),
  getTeacherCourses: (_id) => api.get(`/teachers/${_id}/courses`),
};

// Courses API
export const courseService = {
  getAllCourses: (params) => api.get('/courses', { params }),
  getCourseById: (_id) => api.get(`/courses/${_id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (_id, data) => api.put(`/courses/${_id}`, data),
  deleteCourse: (_id) => api.delete(`/courses/${_id}`),
  getCourseSections: (_id) => api.get(`/courses/${_id}/sections`),
};

// Course Sections API
export const courseSectionService = {
  getAllCourseSections: (params) => api.get('/course-sections', { params }),
  getCourseSectionById: (_id) => api.get(`/course-sections/${_id}`),
  createCourseSection: (data) => api.post('/course-sections', data),
  updateCourseSection: (_id, data) => api.put(`/course-sections/${_id}`, data),
  deleteCourseSection: (_id) => api.delete(`/course-sections/${_id}`),
  getSectionStudents: (_id) => api.get(`/course-sections/${_id}/students`),
  getSectionAssignments: (_id) => api.get(`/course-sections/${_id}/assignments`),
};

// Assignments API
export const assignmentService = {
  getAllAssignments: (params) => api.get('/assignments', { params }),
  getAssignmentById: (_id) => api.get(`/assignments/${_id}`),
  createAssignment: (data) => api.post('/assignments', data),
  updateAssignment: (_id, data) => api.put(`/assignments/${_id}`, data),
  deleteAssignment: (_id) => api.delete(`/assignments/${_id}`),
};

// Grades API
export const gradeService = {
  getAllGrades: (params) => api.get('/grades', { params }),
  getGradeById: (_id) => api.get(`/grades/${_id}`),
  createGrade: (data) => api.post('/grades', data),
  updateGrade: (_id, data) => api.put(`/grades/${_id}`, data),
  deleteGrade: (_id) => api.delete(`/grades/${_id}`),
};

// Attendance API
export const attendanceService = {
  getAllAttendance: (params) => api.get('/attendance', { params }),
  getAttendanceById: (_id) => api.get(`/attendance/${_id}`),
  createAttendance: (data) => api.post('/attendance', data),
  updateAttendance: (_id, data) => api.put(`/attendance/${_id}`, data),
  deleteAttendance: (_id) => api.delete(`/attendance/${_id}`),
};

// Enrollments API
export const enrollmentService = {
  getAllEnrollments: (params) => api.get('/enrollments', { params }),
  getEnrollmentById: (_id) => api.get(`/enrollments/${_id}`),
  createEnrollment: (data) => api.post('/enrollments', data),
  updateEnrollment: (_id, data) => api.put(`/enrollments/${_id}`, data),
  deleteEnrollment: (_id) => api.delete(`/enrollments/${_id}`),
};

// Academic Years & Terms API
export const academicService = {
  getAllAcademicYears: () => api.get('/academic-years'),
  getCurrentAcademicYear: () => api.get('/academic-years/current'),
  getAllTerms: () => api.get('/terms'),
  getCurrentTerm: () => api.get('/terms/current'),
};

// Announcements API
export const announcementService = {
  getAllAnnouncements: (params) => api.get('/announcements', { params }),
  getAnnouncementById: (_id) => api.get(`/announcements/${_id}`),
  createAnnouncement: (data) => api.post('/announcements', data),
  updateAnnouncement: (_id, data) => api.put(`/announcements/${_id}`, data),
  deleteAnnouncement: (_id) => api.delete(`/announcements/${_id}`),
};

// Messages API
export const messageService = {
  getAllMessages: (params) => api.get('/messages', { params }),
  getMessageById: (_id) => api.get(`/messages/${_id}`),
  createMessage: (data) => api.post('/messages', data),
  markAsRead: (_id) => api.put(`/messages/${_id}/read`),
  deleteMessage: (_id) => api.delete(`/messages/${_id}`),
};

// File Upload API
export const uploadService = {
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadDocument: (file, _studentId) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('student_id', _studentId);
    return api.post('/upload/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Users API
export const userService = {
  getAllUsers: (params) => api.get('/users', { params }),
  getUserById: (_id) => api.get(`/users/${_id}`),
  updateUser: (_id, data) => api.put(`/users/${_id}`, data),
  deleteUser: (_id) => api.delete(`/users/${_id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-_password', data),
};

export default api;
