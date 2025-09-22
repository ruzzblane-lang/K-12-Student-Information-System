// TypeScript types for K-12 Student Information System SDK

export interface SISConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string;
  tenantSlug?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    tenant: Tenant;
    expiresIn: number;
  };
  message: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'principal' | 'teacher' | 'staff' | 'student' | 'parent';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schoolName: string;
  schoolType: SchoolType;
  schoolLevel: SchoolLevel;
  countryCode: string;
  timezone: string;
  locale: string;
  settings: Record<string, any>;
}

export type SchoolType = 'public' | 'private' | 'charter' | 'international' | 'homeschool';
export type SchoolLevel = 'elementary' | 'middle' | 'high' | 'k12' | 'preschool';

export interface Student {
  id: string;
  tenantId: string;
  userId?: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  dateOfBirth: string;
  gender?: string;
  gradeLevel: string;
  enrollmentDate: string;
  graduationDate?: string;
  status: StudentStatus;
  academicProgram?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContact1Name?: string;
  emergencyContact1Relationship?: string;
  emergencyContact1Phone?: string;
  emergencyContact1Email?: string;
  emergencyContact2Name?: string;
  emergencyContact2Relationship?: string;
  emergencyContact2Phone?: string;
  emergencyContact2Email?: string;
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  medicalInsurance?: string;
  medicalInsuranceNumber?: string;
  physicianName?: string;
  physicianPhone?: string;
  gpa?: number;
  creditsEarned: number;
  creditsRequired: number;
  classRank?: number;
  graduationPlan?: string;
  specialEducation: boolean;
  iep: boolean;
  section504: boolean;
  ell: boolean;
  gifted: boolean;
  transportationMethod?: string;
  busRoute?: string;
  busStop?: string;
  profilePictureUrl?: string;
  documents: any[];
  privacyLevel: PrivacyLevel;
  dataSharingConsent: boolean;
  photoRelease: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'active' | 'graduated' | 'transferred' | 'withdrawn' | 'suspended';
export type PrivacyLevel = 'standard' | 'restricted' | 'public';

export interface Teacher {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  title?: string;
  department?: string;
  subjects: string[];
  qualifications: string[];
  certifications: string[];
  hireDate: string;
  status: TeacherStatus;
  primaryEmail?: string;
  primaryPhone?: string;
  officeLocation?: string;
  officeHours?: string;
  bio?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TeacherStatus = 'active' | 'inactive' | 'on-leave' | 'terminated';

export interface Class {
  id: string;
  tenantId: string;
  courseId: string;
  sectionNumber: string;
  name: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  semester: string;
  teacherId: string;
  roomNumber?: string;
  schedule: ClassSchedule[];
  maxStudents: number;
  currentEnrollment: number;
  status: ClassStatus;
  credits: number;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export type ClassStatus = 'active' | 'inactive' | 'completed' | 'cancelled';

export interface Grade {
  id: string;
  tenantId: string;
  studentId: string;
  classId: string;
  assignmentId?: string;
  assignmentName?: string;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number;
  letterGrade?: string;
  gradeType: GradeType;
  category?: string;
  weight?: number;
  dueDate?: string;
  submittedDate?: string;
  gradedDate?: string;
  comments?: string;
  isExcused: boolean;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GradeType = 'assignment' | 'quiz' | 'exam' | 'project' | 'participation' | 'homework';

export interface Attendance {
  id: string;
  tenantId: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  period?: string;
  notes?: string;
  excused: boolean;
  tardy: boolean;
  earlyDismissal: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'tardy' | 'excused' | 'late';

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  [key: string]: any;
}

export interface WebhookEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
  tenantId: string;
  userId?: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class SISError extends Error {
  public code: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status?: number, details?: any) {
    super(message);
    this.name = 'SISError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
