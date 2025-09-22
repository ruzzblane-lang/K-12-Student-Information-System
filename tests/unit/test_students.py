"""
Unit tests for student service functions
Tests individual functions and methods without external dependencies
"""

import pytest
import sys
import os
from datetime import date, datetime
from unittest.mock import Mock, patch, MagicMock

# Add the backend directory to the path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock the database and external dependencies
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
def mock_user():
    """Mock user object"""
    user = Mock()
    user.id = "user-123"
    user.email = "admin@springfield.edu"
    user.role = "admin"
    user.tenant_id = "tenant-123"
    return user

@pytest.fixture
def sample_student_data():
    """Sample student data for testing"""
    return {
        "student_id": "STU001",
        "first_name": "Alice",
        "last_name": "Johnson",
        "grade_level": "10",
        "date_of_birth": date(2008, 5, 15),
        "email": "alice.johnson@springfield.edu",
        "phone": "(217) 555-0123",
        "address": "123 Student St, Springfield, IL 62701",
        "parent_guardian_1_name": "Bob Johnson",
        "parent_guardian_1_email": "bob.johnson@email.com",
        "parent_guardian_1_phone": "(217) 555-0124"
    }

class TestStudentService:
    """Test cases for student service functions"""
    
    def test_create_student_success(self, mock_db, mock_tenant, sample_student_data):
        """Test successful student creation"""
        # Mock the database operations
        mock_db.query.return_value.fetchone.return_value = None  # No duplicate
        mock_db.execute.return_value.lastrowid = "student-456"
        
        # Import and test the service function
        with patch('services.studentService.db', mock_db):
            from services.studentService import create_student
            
            result = create_student(mock_tenant.id, sample_student_data)
            
            assert result is not None
            assert result["id"] == "student-456"
            assert result["first_name"] == "Alice"
            assert result["last_name"] == "Johnson"
            assert result["tenant_id"] == mock_tenant.id
    
    def test_create_student_duplicate_id(self, mock_db, mock_tenant, sample_student_data):
        """Test student creation with duplicate student ID"""
        # Mock duplicate student ID found
        mock_db.query.return_value.fetchone.return_value = {"id": "existing-student"}
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import create_student
            
            with pytest.raises(ValueError, match="Student ID already exists"):
                create_student(mock_tenant.id, sample_student_data)
    
    def test_get_students_by_tenant(self, mock_db, mock_tenant):
        """Test retrieving students by tenant"""
        # Mock database response
        mock_students = [
            {
                "id": "student-1",
                "student_id": "STU001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "grade_level": "10",
                "tenant_id": mock_tenant.id
            },
            {
                "id": "student-2",
                "student_id": "STU002",
                "first_name": "Bob",
                "last_name": "Smith",
                "grade_level": "11",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_students
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import get_students_by_tenant
            
            result = get_students_by_tenant(mock_tenant.id)
            
            assert len(result) == 2
            assert result[0]["first_name"] == "Alice"
            assert result[1]["first_name"] == "Bob"
            assert all(student["tenant_id"] == mock_tenant.id for student in result)
    
    def test_get_student_by_id(self, mock_db, mock_tenant):
        """Test retrieving a specific student by ID"""
        mock_student = {
            "id": "student-123",
            "student_id": "STU001",
            "first_name": "Alice",
            "last_name": "Johnson",
            "grade_level": "10",
            "tenant_id": mock_tenant.id
        }
        mock_db.query.return_value.fetchone.return_value = mock_student
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import get_student_by_id
            
            result = get_student_by_id("student-123", mock_tenant.id)
            
            assert result is not None
            assert result["id"] == "student-123"
            assert result["first_name"] == "Alice"
            assert result["tenant_id"] == mock_tenant.id
    
    def test_get_student_by_id_not_found(self, mock_db, mock_tenant):
        """Test retrieving non-existent student"""
        mock_db.query.return_value.fetchone.return_value = None
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import get_student_by_id
            
            result = get_student_by_id("non-existent", mock_tenant.id)
            
            assert result is None
    
    def test_update_student(self, mock_db, mock_tenant):
        """Test updating student information"""
        update_data = {
            "first_name": "Alice Updated",
            "grade_level": "11",
            "phone": "(217) 555-9999"
        }
        
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import update_student
            
            result = update_student("student-123", mock_tenant.id, update_data)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_delete_student(self, mock_db, mock_tenant):
        """Test soft deleting a student"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import delete_student
            
            result = delete_student("student-123", mock_tenant.id)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_get_students_by_grade_level(self, mock_db, mock_tenant):
        """Test filtering students by grade level"""
        mock_students = [
            {
                "id": "student-1",
                "student_id": "STU001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "grade_level": "10",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_students
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import get_students_by_grade_level
            
            result = get_students_by_grade_level(mock_tenant.id, "10")
            
            assert len(result) == 1
            assert result[0]["grade_level"] == "10"
            assert result[0]["tenant_id"] == mock_tenant.id
    
    def test_search_students(self, mock_db, mock_tenant):
        """Test searching students by name or student ID"""
        mock_students = [
            {
                "id": "student-1",
                "student_id": "STU001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "grade_level": "10",
                "tenant_id": mock_tenant.id
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_students
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import search_students
            
            # Test search by name
            result = search_students(mock_tenant.id, "Alice")
            assert len(result) == 1
            assert "Alice" in result[0]["first_name"]
            
            # Test search by student ID
            result = search_students(mock_tenant.id, "STU001")
            assert len(result) == 1
            assert result[0]["student_id"] == "STU001"
    
    def test_validate_student_data(self, sample_student_data):
        """Test student data validation"""
        from services.studentService import validate_student_data
        
        # Test valid data
        result = validate_student_data(sample_student_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        
        # Test invalid data
        invalid_data = sample_student_data.copy()
        invalid_data["first_name"] = ""  # Empty first name
        invalid_data["email"] = "invalid-email"  # Invalid email format
        
        result = validate_student_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("first name" in error.lower() for error in result["errors"])
        assert any("email" in error.lower() for error in result["errors"])
    
    def test_calculate_student_age(self, sample_student_data):
        """Test student age calculation"""
        from services.studentService import calculate_student_age
        
        # Test with sample date of birth
        age = calculate_student_age(sample_student_data["date_of_birth"])
        
        # Should be approximately 15-16 years old (depending on current date)
        assert isinstance(age, int)
        assert 15 <= age <= 16
    
    def test_generate_student_id(self, mock_db, mock_tenant):
        """Test automatic student ID generation"""
        # Mock existing student IDs
        mock_db.query.return_value.fetchall.return_value = [
            {"student_id": "STU001"},
            {"student_id": "STU002"},
            {"student_id": "STU003"}
        ]
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import generate_student_id
            
            new_id = generate_student_id(mock_tenant.id)
            
            assert new_id == "STU004"  # Next sequential ID
    
    def test_tenant_isolation(self, mock_db, mock_tenant):
        """Test that student operations are properly isolated by tenant"""
        # Mock students from different tenants
        mock_db.query.return_value.fetchall.return_value = [
            {
                "id": "student-1",
                "student_id": "STU001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "tenant_id": mock_tenant.id
            }
        ]
        
        with patch('services.studentService.db', mock_db):
            from services.studentService import get_students_by_tenant
            
            result = get_students_by_tenant(mock_tenant.id)
            
            # Verify the query was called with tenant_id filter
            mock_db.query.assert_called_once()
            query_call = mock_db.query.call_args[0][0]
            assert "tenant_id" in query_call
            assert mock_tenant.id in query_call

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
