"""
School SIS Python SDK

Official Python SDK for K-12 Student Information System API.
"""

from .client import SISClient
from .services.students import StudentsService
from .services.grades import GradesService
from .models import (
    SISConfig,
    User,
    Student,
    Teacher,
    Class,
    Grade,
    Attendance,
    Tenant,
    APIResponse,
    PaginationInfo,
    ListParams,
    SISError,
)

__version__ = "1.0.0"
__author__ = "School SIS Team"
__email__ = "team@schoolsis.com"

__all__ = [
    "SISClient",
    "StudentsService", 
    "GradesService",
    "SISConfig",
    "User",
    "Student",
    "Teacher", 
    "Class",
    "Grade",
    "Attendance",
    "Tenant",
    "APIResponse",
    "PaginationInfo",
    "ListParams",
    "SISError",
]
