"""
Unit tests for teacher service functions
Tests individual functions and methods without external dependencies
"""

import pytest
import sys
import os
from datetime import date, datetime
from unittest.mock import Mock, patch, MagicMock

# Add the backend directory to the path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

@pytest.fixture
def mock_db():
    """Mock database connection"""
    return Mock()

@pytest.fixture
def mock_tenant():
    """Mock tenant object"""
    tenant = Mock()
    tenant.id = "tenant-123"
    tenant.name = "Springfield High School"
    tenant.slug = "springfield"
    return tenant

@pytest.fixture
def sample_teacher_data():
    """Sample teacher data for testing"""
    return {
        "employee_id": "TCH001",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@springfield.edu",
        "phone": "(217) 555-0125",
        "department": "Mathematics",
        "employment_type": "full_time",
        "hire_date": date(2023, 8, 15),
        "subjects_taught": ["Algebra", "Geometry", "Calculus"],
        "grade_levels_taught": ["9", "10", "11", "12"],
        "years_experience": 5,
        "qualifications": "Master's in Mathematics Education"
    }

class TestTeacherService:
    """Test cases for teacher service functions"""
    
    def test_create_teacher_success(self, mock_db, mock_tenant, sample_teacher_data):
        """Test successful teacher creation"""
        # Mock the database operations
        mock_db.query.return_value.fetchone.return_value = None  # No duplicate
        mock_db.execute.return_value.lastrowid = "teacher-456"
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import create_teacher
            
            result = create_teacher(mock_tenant.id, sample_teacher_data)
            
            assert result is not None
            assert result["id"] == "teacher-456"
            assert result["first_name"] == "Jane"
            assert result["last_name"] == "Smith"
            assert result["tenant_id"] == mock_tenant.id
            assert result["department"] == "Mathematics"
    
    def test_create_teacher_duplicate_employee_id(self, mock_db, mock_tenant, sample_teacher_data):
        """Test teacher creation with duplicate employee ID"""
        # Mock duplicate employee ID found
        mock_db.query.return_value.fetchone.return_value = {"id": "existing-teacher"}
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import create_teacher
            
            with pytest.raises(ValueError, match="Employee ID already exists"):
                create_teacher(mock_tenant.id, sample_teacher_data)
    
    def test_get_teachers_by_tenant(self, mock_db, mock_tenant):
        """Test retrieving teachers by tenant"""
        # Mock database response
        mock_teachers = [
            {
                "id": "teacher-1",
                "employee_id": "TCH001",
                "first_name": "Jane",
                "last_name": "Smith",
                "department": "Mathematics",
                "tenant_id": mock_tenant.id
            },
            {
                "id": "teacher-2",
                "employee_id": "TCH002",
                "first_name": "Mike",
                "last_name": "Davis",
                "department": "Science",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_teachers
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teachers_by_tenant
            
            result = get_teachers_by_tenant(mock_tenant.id)
            
            assert len(result) == 2
            assert result[0]["first_name"] == "Jane"
            assert result[1]["first_name"] == "Mike"
            assert all(teacher["tenant_id"] == mock_tenant.id for teacher in result)
    
    def test_get_teacher_by_id(self, mock_db, mock_tenant):
        """Test retrieving a specific teacher by ID"""
        mock_teacher = {
            "id": "teacher-123",
            "employee_id": "TCH001",
            "first_name": "Jane",
            "last_name": "Smith",
            "department": "Mathematics",
            "tenant_id": mock_tenant.id
        }
        mock_db.query.return_value.fetchone.return_value = mock_teacher
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teacher_by_id
            
            result = get_teacher_by_id("teacher-123", mock_tenant.id)
            
            assert result is not None
            assert result["id"] == "teacher-123"
            assert result["first_name"] == "Jane"
            assert result["tenant_id"] == mock_tenant.id
    
    def test_get_teachers_by_department(self, mock_db, mock_tenant):
        """Test filtering teachers by department"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employee_id": "TCH001",
                "first_name": "Jane",
                "last_name": "Smith",
                "department": "Mathematics",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_teachers
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teachers_by_department
            
            result = get_teachers_by_department(mock_tenant.id, "Mathematics")
            
            assert len(result) == 1
            assert result[0]["department"] == "Mathematics"
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_get_teachers_by_subject(self, mock_db, mock_tenant):
        """Test filtering teachers by subject taught"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employee_id": "TCH001",
                "first_name": "Jane",
                "last_name": "Smith",
                "subjects_taught": ["Algebra", "Geometry"],
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_teachers
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teachers_by_subject
            
            result = get_teachers_by_subject(mock_tenant.id, "Algebra")
            
            assert len(result) == 1
            assert "Algebra" in result[0]["subjects_taught"]
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_update_teacher(self, mock_db, mock_tenant):
        """Test updating teacher information"""
        update_data = {
            "department": "Advanced Mathematics",
            "years_experience": 6,
            "phone": "(217) 555-9999"
        }
        
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import update_teacher
            
            result = update_teacher("teacher-123", mock_tenant.id, update_data)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_delete_teacher(self, mock_db, mock_tenant):
        """Test soft deleting a teacher"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import delete_teacher
            
            result = delete_teacher("teacher-123", mock_tenant.id)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_search_teachers(self, mock_db, mock_tenant):
        """Test searching teachers by name or employee ID"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employee_id": "TCH001",
                "first_name": "Jane",
                "last_name": "Smith",
                "department": "Mathematics",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_teachers
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import search_teachers
            
            # Test search by name
            result = search_teachers(mock_tenant.id, "Jane")
            assert len(result) == 1
            assert "Jane" in result[0]["first_name"]
            
            # Test search by employee ID
            result = search_teachers(mock_tenant.id, "TCH001")
            assert len(result) == 1
            assert result[0]["employee_id"] == "TCH001"
    
    def test_validate_teacher_data(self, sample_teacher_data):
        """Test teacher data validation"""
        from services.teacherService import validate_teacher_data
        
        # Test valid data
        result = validate_teacher_data(sample_teacher_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        
        # Test invalid data
        invalid_data = sample_teacher_data.copy()
        invalid_data["first_name"] = ""  # Empty first name
        invalid_data["email"] = "invalid-email"  # Invalid email format
        
        result = validate_teacher_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("first name" in error.lower() for error in result["errors"])
        assert any("email" in error.lower() for error in result["errors"])
    
    def test_generate_employee_id(self, mock_db, mock_tenant):
        """Test automatic employee ID generation"""
        # Mock existing employee IDs
        mock_db.query.return_value.fetchall.return_value = [
            {"employee_id": "TCH001"},
            {"employee_id": "TCH002"},
            {"employee_id": "TCH003"}
        ]
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import generate_employee_id
            
            new_id = generate_employee_id(mock_tenant.id)
            
            assert new_id == "TCH004"  # Next sequential ID
    
    def test_get_teacher_schedule(self, mock_db, mock_tenant):
        """Test retrieving teacher's class schedule"""
        mock_schedule = [
            {
                "class_id": "class-1",
                "class_name": "Algebra I",
                "room_number": "A101",
                "schedule": {
                    "monday": ["08:00-08:50"],
                    "wednesday": ["08:00-08:50"],
                    "friday": ["08:00-08:50"]
                }
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_schedule
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teacher_schedule
            
            result = get_teacher_schedule("teacher-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["class_name"] == "Algebra I"
            assert "monday" in result[0]["schedule"]
    
    def test_get_teacher_students(self, mock_db, mock_tenant):
        """Test retrieving students taught by a teacher"""
        mock_students = [
            {
                "student_id": "student-1",
                "first_name": "Alice",
                "last_name": "Johnson",
                "class_name": "Algebra I",
                "grade_level": "10"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_students
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teacher_students
            
            result = get_teacher_students("teacher-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["first_name"] == "Alice"
            assert result[0]["class_name"] == "Algebra I"
    
    def test_tenant_isolation(self, mock_db, mock_tenant):
        """Test that teacher operations are properly isolated by tenant"""
        # Mock teachers from different tenants
        mock_db.query.return_value.fetchall.return_value = [
            {
                "id": "teacher-1",
                "employee_id": "TCH001",
                "first_name": "Jane",
                "last_name": "Smith",
                "tenant_id": mock_tenant.id
            }
        ]
        
        with patch('services.teacherService.db', mock_db):
            from services.teacherService import get_teachers_by_tenant
            
            result = get_teachers_by_tenant(mock_tenant.id)
            
            # Verify the query was called with tenant_id filter
            mock_db.query.assert_called_once()
            query_call = mock_db.query.call_args[0][0]
            assert "tenant_id" in query_call
            assert mock_tenant.id in query_call

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
