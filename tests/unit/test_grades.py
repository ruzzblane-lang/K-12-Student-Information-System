"""
Unit tests for grade calculations and management
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
def sample_grade_data():
    """Sample grade data for testing"""
    return {
        "student_id": "student-123",
        "class_id": "class-123",
        "assignment_name": "Chapter 5 Test",
        "assignment_type": "test",
        "category": "tests",
        "points_possible": 100,
        "points_earned": 85,
        "assigned_date": date(2024, 1, 10),
        "due_date": date(2024, 1, 15),
        "graded_date": date(2024, 1, 16)
    }

class TestGradeService:
    """Test cases for grade management functions"""
    
    def test_create_grade_success(self, mock_db, mock_tenant, sample_grade_data):
        """Test successful grade creation"""
        # Mock the database operations
        mock_db.execute.return_value.lastrowid = "grade-456"
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import create_grade
            
            result = create_grade(mock_tenant.id, sample_grade_data)
            
            assert result is not None
            assert result["id"] == "grade-456"
            assert result["assignment_name"] == "Chapter 5 Test"
            assert result["points_possible"] == 100
            assert result["points_earned"] == 85
            assert result["tenant_id"] == mock_tenant.id
    
    def test_calculate_percentage(self, sample_grade_data):
        """Test percentage calculation"""
        from services.gradeService import calculate_percentage
        
        # Test normal calculation
        percentage = calculate_percentage(85, 100)
        assert percentage == 85.0
        
        # Test with zero points possible
        with pytest.raises(ValueError, match="Points possible cannot be zero"):
            calculate_percentage(85, 0)
        
        # Test with negative values
        with pytest.raises(ValueError, match="Points cannot be negative"):
            calculate_percentage(-5, 100)
    
    def test_calculate_letter_grade(self):
        """Test letter grade calculation"""
        from services.gradeService import calculate_letter_grade
        
        # Test standard grading scale
        assert calculate_letter_grade(95.0) == "A"
        assert calculate_letter_grade(87.0) == "B"
        assert calculate_letter_grade(78.0) == "C"
        assert calculate_letter_grade(65.0) == "D"
        assert calculate_letter_grade(45.0) == "F"
        
        # Test edge cases
        assert calculate_letter_grade(90.0) == "A-"
        assert calculate_letter_grade(100.0) == "A+"
        assert calculate_letter_grade(0.0) == "F"
    
    def test_calculate_gpa_points(self):
        """Test GPA points calculation"""
        from services.gradeService import calculate_gpa_points
        
        # Test standard GPA scale
        assert calculate_gpa_points("A+") == 4.0
        assert calculate_gpa_points("A") == 4.0
        assert calculate_gpa_points("A-") == 3.7
        assert calculate_gpa_points("B+") == 3.3
        assert calculate_gpa_points("B") == 3.0
        assert calculate_gpa_points("B-") == 2.7
        assert calculate_gpa_points("C+") == 2.3
        assert calculate_gpa_points("C") == 2.0
        assert calculate_gpa_points("C-") == 1.7
        assert calculate_gpa_points("D+") == 1.3
        assert calculate_gpa_points("D") == 1.0
        assert calculate_gpa_points("D-") == 0.7
        assert calculate_gpa_points("F") == 0.0
        
        # Test invalid grade
        with pytest.raises(ValueError, match="Invalid letter grade"):
            calculate_gpa_points("X")
    
    def test_get_grades_by_student(self, mock_db, mock_tenant):
        """Test retrieving grades for a specific student"""
        mock_grades = [
            {
                "id": "grade-1",
                "assignment_name": "Chapter 5 Test",
                "assignment_type": "test",
                "points_possible": 100,
                "points_earned": 85,
                "percentage": 85.0,
                "letter_grade": "B",
                "class_name": "Algebra I"
            },
            {
                "id": "grade-2",
                "assignment_name": "Homework 5.1",
                "assignment_type": "homework",
                "points_possible": 20,
                "points_earned": 18,
                "percentage": 90.0,
                "letter_grade": "A-",
                "class_name": "Algebra I"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_grades
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_grades_by_student
            
            result = get_grades_by_student("student-123", mock_tenant.id)
            
            assert len(result) == 2
            assert result[0]["assignment_name"] == "Chapter 5 Test"
            assert result[1]["assignment_name"] == "Homework 5.1"
            assert all(grade["tenant_id"] == mock_tenant.id for grade in result)
    
    def test_get_grades_by_class(self, mock_db, mock_tenant):
        """Test retrieving grades for a specific class"""
        mock_grades = [
            {
                "id": "grade-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "assignment_name": "Chapter 5 Test",
                "points_possible": 100,
                "points_earned": 85,
                "percentage": 85.0,
                "letter_grade": "B"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_grades
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_grades_by_class
            
            result = get_grades_by_class("class-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["assignment_name"] == "Chapter 5 Test"
    
    def test_get_grades_by_assignment(self, mock_db, mock_tenant):
        """Test retrieving grades for a specific assignment"""
        mock_grades = [
            {
                "id": "grade-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "points_possible": 100,
                "points_earned": 85,
                "percentage": 85.0,
                "letter_grade": "B"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_grades
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_grades_by_assignment
            
            result = get_grades_by_assignment("class-123", "Chapter 5 Test", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["points_earned"] == 85
    
    def test_calculate_class_average(self, mock_db, mock_tenant):
        """Test calculating class average for an assignment"""
        mock_grades = [
            {"points_earned": 85, "points_possible": 100},
            {"points_earned": 92, "points_possible": 100},
            {"points_earned": 78, "points_possible": 100},
            {"points_earned": 88, "points_possible": 100}
        ]
        mock_db.query.return_value.fetchall.return_value = mock_grades
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import calculate_class_average
            
            result = calculate_class_average("class-123", "Chapter 5 Test", mock_tenant.id)
            
            # Average of 85, 92, 78, 88 = 85.75
            assert result == 85.75
    
    def test_calculate_student_gpa(self, mock_db, mock_tenant):
        """Test calculating student GPA"""
        mock_grades = [
            {"letter_grade": "A", "credits": 1.0},
            {"letter_grade": "B", "credits": 1.0},
            {"letter_grade": "A-", "credits": 1.0},
            {"letter_grade": "B+", "credits": 1.0}
        ]
        mock_db.query.return_value.fetchall.return_value = mock_grades
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import calculate_student_gpa
            
            result = calculate_student_gpa("student-123", mock_tenant.id)
            
            # GPA calculation: (4.0 + 3.0 + 3.7 + 3.3) / 4 = 3.5
            assert result == 3.5
    
    def test_get_grade_statistics(self, mock_db, mock_tenant):
        """Test getting grade statistics for a class"""
        mock_stats = {
            "total_assignments": 10,
            "total_students": 25,
            "average_grade": 82.5,
            "highest_grade": 98.0,
            "lowest_grade": 65.0,
            "grade_distribution": {
                "A": 5,
                "B": 8,
                "C": 7,
                "D": 3,
                "F": 2
            }
        }
        mock_db.query.return_value.fetchone.return_value = mock_stats
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_grade_statistics
            
            result = get_grade_statistics("class-123", mock_tenant.id)
            
            assert result["total_assignments"] == 10
            assert result["total_students"] == 25
            assert result["average_grade"] == 82.5
            assert result["grade_distribution"]["A"] == 5
    
    def test_update_grade(self, mock_db, mock_tenant):
        """Test updating a grade"""
        update_data = {
            "points_earned": 90,
            "graded_date": date.today(),
            "teacher_comments": "Great improvement!"
        }
        
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import update_grade
            
            result = update_grade("grade-123", mock_tenant.id, update_data)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_delete_grade(self, mock_db, mock_tenant):
        """Test deleting a grade"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import delete_grade
            
            result = delete_grade("grade-123", mock_tenant.id)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_bulk_grade_entry(self, mock_db, mock_tenant):
        """Test bulk grade entry for a class"""
        bulk_data = {
            "class_id": "class-123",
            "assignment_name": "Quiz 3",
            "assignment_type": "quiz",
            "category": "quizzes",
            "points_possible": 50,
            "assigned_date": date(2024, 1, 15),
            "due_date": date(2024, 1, 17),
            "grades": [
                {"student_id": "student-1", "points_earned": 45},
                {"student_id": "student-2", "points_earned": 50},
                {"student_id": "student-3", "points_earned": 42}
            ]
        }
        
        mock_db.execute.return_value.lastrowid = "grade-456"
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import bulk_grade_entry
            
            result = bulk_grade_entry(mock_tenant.id, bulk_data)
            
            assert result is not None
            assert len(result["created_grades"]) == 3
            assert result["total_created"] == 3
    
    def test_validate_grade_data(self, sample_grade_data):
        """Test grade data validation"""
        from services.gradeService import validate_grade_data
        
        # Test valid data
        result = validate_grade_data(sample_grade_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        
        # Test invalid data
        invalid_data = sample_grade_data.copy()
        invalid_data["points_earned"] = 150  # More than possible
        invalid_data["assignment_name"] = ""  # Empty name
        
        result = validate_grade_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("points earned" in error.lower() for error in result["errors"])
        assert any("assignment name" in error.lower() for error in result["errors"])
    
    def test_get_missing_grades(self, mock_db, mock_tenant):
        """Test getting students with missing grades for an assignment"""
        mock_missing = [
            {
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "enrollment_id": "enrollment-1"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_missing
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_missing_grades
            
            result = get_missing_grades("class-123", "Chapter 5 Test", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
    
    def test_tenant_isolation(self, mock_db, mock_tenant):
        """Test that grade operations are properly isolated by tenant"""
        # Mock grades from different tenants
        mock_db.query.return_value.fetchall.return_value = [
            {
                "id": "grade-1",
                "assignment_name": "Chapter 5 Test",
                "points_earned": 85,
                "tenant_id": mock_tenant.id
            }
        ]
        
        with patch('services.gradeService.db', mock_db):
            from services.gradeService import get_grades_by_student
            
            result = get_grades_by_student("student-123", mock_tenant.id)
            
            # Verify the query was called with tenant_id filter
            mock_db.query.assert_called_once()
            query_call = mock_db.query.call_args[0][0]
            assert "tenant_id" in query_call
            assert mock_tenant.id in query_call

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
