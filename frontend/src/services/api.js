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
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Students API
export const studentService = {
  getAllStudents: (params) => api.get('/students', { params }),
  getStudentById: (id) => api.get(`/students/${id}`),
  createStudent: (data) => api.post('/students', data),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/students/${id}`),
  getStudentGrades: (id, termId) => api.get(`/students/${id}/grades`, { params: { term_id: termId } }),
  getStudentAttendance: (id, params) => api.get(`/students/${id}/attendance`, { params }),
  getStudentEnrollments: (id, termId) => api.get(`/students/${id}/enrollments`, { params: { term_id: termId } }),
  enrollStudent: (id, courseSectionId) => api.post(`/students/${id}/enroll`, { course_section_id: courseSectionId }),
  unenrollStudent: (id, enrollmentId) => api.delete(`/students/${id}/unenroll/${enrollmentId}`),
};

// Teachers API
export const teacherService = {
  getAllTeachers: (params) => api.get('/teachers', { params }),
  getTeacherById: (id) => api.get(`/teachers/${id}`),
  createTeacher: (data) => api.post('/teachers', data),
  updateTeacher: (id, data) => api.put(`/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/teachers/${id}`),
  getTeacherCourses: (id) => api.get(`/teachers/${id}/courses`),
};

// Courses API
export const courseService = {
  getAllCourses: (params) => api.get('/courses', { params }),
  getCourseById: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  getCourseSections: (id) => api.get(`/courses/${id}/sections`),
};

// Course Sections API
export const courseSectionService = {
  getAllCourseSections: (params) => api.get('/course-sections', { params }),
  getCourseSectionById: (id) => api.get(`/course-sections/${id}`),
  createCourseSection: (data) => api.post('/course-sections', data),
  updateCourseSection: (id, data) => api.put(`/course-sections/${id}`, data),
  deleteCourseSection: (id) => api.delete(`/course-sections/${id}`),
  getSectionStudents: (id) => api.get(`/course-sections/${id}/students`),
  getSectionAssignments: (id) => api.get(`/course-sections/${id}/assignments`),
};

// Assignments API
export const assignmentService = {
  getAllAssignments: (params) => api.get('/assignments', { params }),
  getAssignmentById: (id) => api.get(`/assignments/${id}`),
  createAssignment: (data) => api.post('/assignments', data),
  updateAssignment: (id, data) => api.put(`/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/assignments/${id}`),
};

// Grades API
export const gradeService = {
  getAllGrades: (params) => api.get('/grades', { params }),
  getGradeById: (id) => api.get(`/grades/${id}`),
  createGrade: (data) => api.post('/grades', data),
  updateGrade: (id, data) => api.put(`/grades/${id}`, data),
  deleteGrade: (id) => api.delete(`/grades/${id}`),
};

// Attendance API
export const attendanceService = {
  getAllAttendance: (params) => api.get('/attendance', { params }),
  getAttendanceById: (id) => api.get(`/attendance/${id}`),
  createAttendance: (data) => api.post('/attendance', data),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  deleteAttendance: (id) => api.delete(`/attendance/${id}`),
};

// Enrollments API
export const enrollmentService = {
  getAllEnrollments: (params) => api.get('/enrollments', { params }),
  getEnrollmentById: (id) => api.get(`/enrollments/${id}`),
  createEnrollment: (data) => api.post('/enrollments', data),
  updateEnrollment: (id, data) => api.put(`/enrollments/${id}`, data),
  deleteEnrollment: (id) => api.delete(`/enrollments/${id}`),
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
  getAnnouncementById: (id) => api.get(`/announcements/${id}`),
  createAnnouncement: (data) => api.post('/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),
};

// Messages API
export const messageService = {
  getAllMessages: (params) => api.get('/messages', { params }),
  getMessageById: (id) => api.get(`/messages/${id}`),
  createMessage: (data) => api.post('/messages', data),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
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
  uploadDocument: (file, studentId) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('student_id', studentId);
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
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
};

export default api;
