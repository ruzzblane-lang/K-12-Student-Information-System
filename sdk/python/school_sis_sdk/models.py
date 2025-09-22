"""
Data models for School SIS SDK
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    PRINCIPAL = "principal"
    TEACHER = "teacher"
    STAFF = "staff"
    STUDENT = "student"
    PARENT = "parent"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class SchoolType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    CHARTER = "charter"
    INTERNATIONAL = "international"
    HOMESCHOOL = "homeschool"


class SchoolLevel(str, Enum):
    ELEMENTARY = "elementary"
    MIDDLE = "middle"
    HIGH = "high"
    K12 = "k12"
    PRESCHOOL = "preschool"


class StudentStatus(str, Enum):
    ACTIVE = "active"
    GRADUATED = "graduated"
    TRANSFERRED = "transferred"
    WITHDRAWN = "withdrawn"
    SUSPENDED = "suspended"


class PrivacyLevel(str, Enum):
    STANDARD = "standard"
    RESTRICTED = "restricted"
    PUBLIC = "public"


class GradeType(str, Enum):
    ASSIGNMENT = "assignment"
    QUIZ = "quiz"
    EXAM = "exam"
    PROJECT = "project"
    PARTICIPATION = "participation"
    HOMEWORK = "homework"


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    TARDY = "tardy"
    EXCUSED = "excused"
    LATE = "late"


class ClassStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SISConfig(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    token: Optional[str] = None
    tenant_slug: Optional[str] = None
    timeout: int = 30
    retries: int = 3
    headers: Optional[Dict[str, str]] = None


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class ListParams(BaseModel):
    page: Optional[int] = 1
    limit: Optional[int] = 20
    sort: Optional[str] = None
    search: Optional[str] = None
    # Additional filters as needed
    grade_level: Optional[str] = None
    status: Optional[str] = None
    academic_program: Optional[str] = None


class User(BaseModel):
    id: str
    tenant_id: str
    email: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    preferred_name: Optional[str] = None
    role: UserRole
    status: UserStatus
    created_at: str
    updated_at: str


class Tenant(BaseModel):
    id: str
    name: str
    slug: str
    school_name: str
    school_type: SchoolType
    school_level: SchoolLevel
    country_code: str
    timezone: str
    locale: str
    settings: Dict[str, Any] = {}


class Student(BaseModel):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    student_id: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    preferred_name: Optional[str] = None
    date_of_birth: str
    gender: Optional[str] = None
    grade_level: str
    enrollment_date: str
    graduation_date: Optional[str] = None
    status: StudentStatus
    academic_program: Optional[str] = None
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    emergency_contact_1_name: Optional[str] = None
    emergency_contact_1_relationship: Optional[str] = None
    emergency_contact_1_phone: Optional[str] = None
    emergency_contact_1_email: Optional[str] = None
    emergency_contact_2_name: Optional[str] = None
    emergency_contact_2_relationship: Optional[str] = None
    emergency_contact_2_phone: Optional[str] = None
    emergency_contact_2_email: Optional[str] = None
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    medical_insurance: Optional[str] = None
    medical_insurance_number: Optional[str] = None
    physician_name: Optional[str] = None
    physician_phone: Optional[str] = None
    gpa: Optional[float] = None
    credits_earned: int = 0
    credits_required: int = 120
    class_rank: Optional[int] = None
    graduation_plan: Optional[str] = None
    special_education: bool = False
    iep: bool = False
    section_504: bool = False
    ell: bool = False
    gifted: bool = False
    transportation_method: Optional[str] = None
    bus_route: Optional[str] = None
    bus_stop: Optional[str] = None
    profile_picture_url: Optional[str] = None
    documents: List[Dict[str, Any]] = []
    privacy_level: PrivacyLevel = PrivacyLevel.STANDARD
    data_sharing_consent: bool = False
    photo_release: bool = False
    created_at: str
    updated_at: str


class Teacher(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    employee_id: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    preferred_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    subjects: List[str] = []
    qualifications: List[str] = []
    certifications: List[str] = []
    hire_date: str
    status: str
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    office_location: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: str
    updated_at: str


class ClassSchedule(BaseModel):
    day_of_week: int  # 0 = Sunday, 1 = Monday, etc.
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format


class Class(BaseModel):
    id: str
    tenant_id: str
    course_id: str
    section_number: str
    name: str
    description: Optional[str] = None
    subject: str
    grade_level: str
    academic_year: str
    semester: str
    teacher_id: str
    room_number: Optional[str] = None
    schedule: List[ClassSchedule] = []
    max_students: int
    current_enrollment: int
    status: ClassStatus
    credits: int
    prerequisites: List[str] = []
    created_at: str
    updated_at: str


class Grade(BaseModel):
    id: str
    tenant_id: str
    student_id: str
    class_id: str
    assignment_id: Optional[str] = None
    assignment_name: Optional[str] = None
    points_earned: float
    points_possible: float
    percentage: float
    letter_grade: Optional[str] = None
    grade_type: GradeType
    category: Optional[str] = None
    weight: Optional[float] = None
    due_date: Optional[str] = None
    submitted_date: Optional[str] = None
    graded_date: Optional[str] = None
    comments: Optional[str] = None
    is_excused: bool = False
    is_late: bool = False
    created_at: str
    updated_at: str


class Attendance(BaseModel):
    id: str
    tenant_id: str
    student_id: str
    class_id: str
    date: str
    status: AttendanceStatus
    period: Optional[str] = None
    notes: Optional[str] = None
    excused: bool = False
    tardy: bool = False
    early_dismissal: bool = False
    created_at: str
    updated_at: str


class AuthResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str


class APIResponse(BaseModel):
    success: bool
    data: Any
    message: str
    pagination: Optional[PaginationInfo] = None


class SISError(Exception):
    """Custom exception for SIS API errors"""
    
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", status: Optional[int] = None, details: Optional[Any] = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details
