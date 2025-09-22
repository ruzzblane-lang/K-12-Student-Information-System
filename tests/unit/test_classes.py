"""
Unit tests for class management functions
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
def sample_class_data():
    """Sample class data for testing"""
    return {
        "class_code": "MATH101",
        "name": "Algebra I",
        "description": "Introduction to algebraic concepts",
        "subject": "Mathematics",
        "grade_level": "9",
        "academic_year": "2024-2025",
        "semester": "full_year",
        "credits": 1.0,
        "teacher_id": "teacher-123",
        "room_number": "A101",
        "building": "Main Building",
        "schedule": {
            "monday": ["08:00-08:50"],
            "wednesday": ["08:00-08:50"],
            "friday": ["08:00-08:50"]
        },
        "max_students": 30,
        "start_date": date(2024, 8, 15),
        "end_date": date(2025, 5, 30)
    }

class TestClassService:
    """Test cases for class management functions"""
    
    def test_create_class_success(self, mock_db, mock_tenant, sample_class_data):
        """Test successful class creation"""
        # Mock the database operations
        mock_db.query.return_value.fetchone.return_value = None  # No duplicate
        mock_db.execute.return_value.lastrowid = "class-456"
        
        with patch('services.classService.db', mock_db):
            from services.classService import create_class
            
            result = create_class(mock_tenant.id, sample_class_data)
            
            assert result is not None
            assert result["id"] == "class-456"
            assert result["name"] == "Algebra I"
            assert result["class_code"] == "MATH101"
            assert result["tenant_id"] == mock_tenant.id
            assert result["subject"] == "Mathematics"
    
    def test_create_class_duplicate_code(self, mock_db, mock_tenant, sample_class_data):
        """Test class creation with duplicate class code"""
        # Mock duplicate class code found
        mock_db.query.return_value.fetchone.return_value = {"id": "existing-class"}
        
        with patch('services.classService.db', mock_db):
            from services.classService import create_class
            
            with pytest.raises(ValueError, match="Class code already exists"):
                create_class(mock_tenant.id, sample_class_data)
    
    def test_get_classes_by_tenant(self, mock_db, mock_tenant):
        """Test retrieving classes by tenant"""
        # Mock database response
        mock_classes = [
            {
                "id": "class-1",
                "class_code": "MATH101",
                "name": "Algebra I",
                "subject": "Mathematics",
                "grade_level": "9",
                "tenant_id": mock_tenant.id
            },
            {
                "id": "class-2",
                "class_code": "SCI201",
                "name": "Biology I",
                "subject": "Science",
                "grade_level": "10",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_classes
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_classes_by_tenant
            
            result = get_classes_by_tenant(mock_tenant.id)
            
            assert len(result) == 2
            assert result[0]["name"] == "Algebra I"
            assert result[1]["name"] == "Biology I"
            assert all(class_item["tenant_id"] == mock_tenant.id for class_item in result)
    
    def test_get_class_by_id(self, mock_db, mock_tenant):
        """Test retrieving a specific class by ID"""
        mock_class = {
            "id": "class-123",
            "class_code": "MATH101",
            "name": "Algebra I",
            "subject": "Mathematics",
            "grade_level": "9",
            "tenant_id": mock_tenant.id
        }
        mock_db.query.return_value.fetchone.return_value = mock_class
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_class_by_id
            
            result = get_class_by_id("class-123", mock_tenant.id)
            
            assert result is not None
            assert result["id"] == "class-123"
            assert result["name"] == "Algebra I"
            assert result["tenant_id"] == mock_tenant.id
    
    def test_get_classes_by_subject(self, mock_db, mock_tenant):
        """Test filtering classes by subject"""
        mock_classes = [
            {
                "id": "class-1",
                "class_code": "MATH101",
                "name": "Algebra I",
                "subject": "Mathematics",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_classes
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_classes_by_subject
            
            result = get_classes_by_subject(mock_tenant.id, "Mathematics")
            
            assert len(result) == 1
            assert result[0]["subject"] == "Mathematics"
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_get_classes_by_grade_level(self, mock_db, mock_tenant):
        """Test filtering classes by grade level"""
        mock_classes = [
            {
                "id": "class-1",
                "class_code": "MATH101",
                "name": "Algebra I",
                "grade_level": "9",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_classes
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_classes_by_grade_level
            
            result = get_classes_by_grade_level(mock_tenant.id, "9")
            
            assert len(result) == 1
            assert result[0]["grade_level"] == "9"
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_get_classes_by_teacher(self, mock_db, mock_tenant):
        """Test filtering classes by teacher"""
        mock_classes = [
            {
                "id": "class-1",
                "class_code": "MATH101",
                "name": "Algebra I",
                "teacher_id": "teacher-123",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_classes
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_classes_by_teacher
            
            result = get_classes_by_teacher(mock_tenant.id, "teacher-123")
            
            assert len(result) == 1
            assert result[0]["teacher_id"] == "teacher-123"
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_update_class(self, mock_db, mock_tenant):
        """Test updating class information"""
        update_data = {
            "name": "Advanced Algebra I",
            "max_students": 25,
            "room_number": "A102"
        }
        
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.classService.db', mock_db):
            from services.classService import update_class
            
            result = update_class("class-123", mock_tenant.id, update_data)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_delete_class(self, mock_db, mock_tenant):
        """Test soft deleting a class"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.classService.db', mock_db):
            from services.classService import delete_class
            
            result = delete_class("class-123", mock_tenant.id)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_enroll_student_in_class(self, mock_db, mock_tenant):
        """Test enrolling a student in a class"""
        enrollment_data = {
            "student_id": "student-123",
            "class_id": "class-123",
            "enrollment_date": date.today()
        }
        
        # Mock class capacity check
        mock_db.query.return_value.fetchone.return_value = {
            "current_enrollment": 25,
            "max_students": 30
        }
        
        mock_db.execute.return_value.lastrowid = "enrollment-456"
        
        with patch('services.classService.db', mock_db):
            from services.classService import enroll_student_in_class
            
            result = enroll_student_in_class(mock_tenant.id, enrollment_data)
            
            assert result is not None
            assert result["id"] == "enrollment-456"
            assert result["student_id"] == "student-123"
            assert result["class_id"] == "class-123"
    
    def test_enroll_student_class_full(self, mock_db, mock_tenant):
        """Test enrolling student in full class"""
        enrollment_data = {
            "student_id": "student-123",
            "class_id": "class-123",
            "enrollment_date": date.today()
        }
        
        # Mock class at capacity
        mock_db.query.return_value.fetchone.return_value = {
            "current_enrollment": 30,
            "max_students": 30
        }
        
        with patch('services.classService.db', mock_db):
            from services.classService import enroll_student_in_class
            
            with pytest.raises(ValueError, match="Class is at maximum capacity"):
                enroll_student_in_class(mock_tenant.id, enrollment_data)
    
    def test_unenroll_student_from_class(self, mock_db, mock_tenant):
        """Test unenrolling a student from a class"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.classService.db', mock_db):
            from services.classService import unenroll_student_from_class
            
            result = unenroll_student_from_class(
                mock_tenant.id, 
                "student-123", 
                "class-123"
            )
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_get_class_enrollment(self, mock_db, mock_tenant):
        """Test retrieving class enrollment list"""
        mock_enrollments = [
            {
                "enrollment_id": "enrollment-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "grade_level": "9",
                "enrollment_date": date(2024, 8, 15)
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_enrollments
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_class_enrollment
            
            result = get_class_enrollment("class-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["grade_level"] == "9"
    
    def test_get_student_schedule(self, mock_db, mock_tenant):
        """Test retrieving student's class schedule"""
        mock_schedule = [
            {
                "class_id": "class-1",
                "class_name": "Algebra I",
                "subject": "Mathematics",
                "teacher_name": "Jane Smith",
                "room_number": "A101",
                "schedule": {
                    "monday": ["08:00-08:50"],
                    "wednesday": ["08:00-08:50"],
                    "friday": ["08:00-08:50"]
                }
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_schedule
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_student_schedule
            
            result = get_student_schedule("student-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["class_name"] == "Algebra I"
            assert result[0]["teacher_name"] == "Jane Smith"
    
    def test_validate_class_data(self, sample_class_data):
        """Test class data validation"""
        from services.classService import validate_class_data
        
        # Test valid data
        result = validate_class_data(sample_class_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        
        # Test invalid data
        invalid_data = sample_class_data.copy()
        invalid_data["name"] = ""  # Empty name
        invalid_data["max_students"] = -1  # Invalid max students
        
        result = validate_class_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("name" in error.lower() for error in result["errors"])
        assert any("max students" in error.lower() for error in result["errors"])
    
    def test_generate_class_code(self, mock_db, mock_tenant):
        """Test automatic class code generation"""
        # Mock existing class codes
        mock_db.query.return_value.fetchall.return_value = [
            {"class_code": "MATH101"},
            {"class_code": "MATH102"},
            {"class_code": "MATH103"}
        ]
        
        with patch('services.classService.db', mock_db):
            from services.classService import generate_class_code
            
            new_code = generate_class_code(mock_tenant.id, "MATH")
            
            assert new_code == "MATH104"  # Next sequential code
    
    def test_tenant_isolation(self, mock_db, mock_tenant):
        """Test that class operations are properly isolated by tenant"""
        # Mock classes from different tenants
        mock_db.query.return_value.fetchall.return_value = [
            {
                "id": "class-1",
                "class_code": "MATH101",
                "name": "Algebra I",
                "tenant_id": mock_tenant.id
            }
        ]
        
        with patch('services.classService.db', mock_db):
            from services.classService import get_classes_by_tenant
            
            result = get_classes_by_tenant(mock_tenant.id)
            
            # Verify the query was called with tenant_id filter
            mock_db.query.assert_called_once()
            query_call = mock_db.query.call_args[0][0]
            assert "tenant_id" in query_call
            assert mock_tenant.id in query_call

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
