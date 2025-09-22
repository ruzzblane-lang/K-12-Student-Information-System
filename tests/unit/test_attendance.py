"""
Unit tests for attendance logic and management
Tests individual functions and methods without external dependencies
"""

import pytest
import sys
import os
from datetime import date, datetime, timedelta
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
def sample_attendance_data():
    """Sample attendance data for testing"""
    return {
        "student_id": "student-123",
        "class_id": "class-123",
        "attendance_date": date(2024, 1, 15),
        "status": "present",
        "period": "1st",
        "reason": None,
        "notes": None,
        "is_excused": False
    }

class TestAttendanceService:
    """Test cases for attendance management functions"""
    
    def test_create_attendance_success(self, mock_db, mock_tenant, sample_attendance_data):
        """Test successful attendance creation"""
        # Mock the database operations
        mock_db.execute.return_value.lastrowid = "attendance-456"
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import create_attendance
            
            result = create_attendance(mock_tenant.id, sample_attendance_data)
            
            assert result is not None
            assert result["id"] == "attendance-456"
            assert result["status"] == "present"
            assert result["attendance_date"] == date(2024, 1, 15)
            assert result["tenant_id"] == mock_tenant.id
    
    def test_create_attendance_duplicate(self, mock_db, mock_tenant, sample_attendance_data):
        """Test creating duplicate attendance record"""
        # Mock duplicate attendance found
        mock_db.query.return_value.fetchone.return_value = {"id": "existing-attendance"}
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import create_attendance
            
            with pytest.raises(ValueError, match="Attendance already recorded"):
                create_attendance(mock_tenant.id, sample_attendance_data)
    
    def test_get_attendance_by_student(self, mock_db, mock_tenant):
        """Test retrieving attendance for a specific student"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "attendance_date": date(2024, 1, 15),
                "status": "present",
                "period": "1st",
                "class_name": "Algebra I"
            },
            {
                "id": "attendance-2",
                "attendance_date": date(2024, 1, 16),
                "status": "absent",
                "period": "1st",
                "class_name": "Algebra I"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_attendance
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_by_student
            
            result = get_attendance_by_student("student-123", mock_tenant.id)
            
            assert len(result) == 2
            assert result[0]["status"] == "present"
            assert result[1]["status"] == "absent"
            assert all(att["tenant_id"] == mock_tenant.id for att in result)
    
    def test_get_attendance_by_class(self, mock_db, mock_tenant):
        """Test retrieving attendance for a specific class"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "attendance_date": date(2024, 1, 15),
                "status": "present"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_attendance
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_by_class
            
            result = get_attendance_by_class("class-123", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["status"] == "present"
    
    def test_get_attendance_by_date(self, mock_db, mock_tenant):
        """Test retrieving attendance for a specific date"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "status": "present",
                "class_name": "Algebra I"
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_attendance
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_by_date
            
            result = get_attendance_by_date(date(2024, 1, 15), mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["status"] == "present"
    
    def test_bulk_attendance_entry(self, mock_db, mock_tenant):
        """Test bulk attendance entry for a class"""
        bulk_data = {
            "class_id": "class-123",
            "attendance_date": date(2024, 1, 15),
            "period": "1st",
            "records": [
                {"student_id": "student-1", "status": "present"},
                {"student_id": "student-2", "status": "absent", "reason": "Sick"},
                {"student_id": "student-3", "status": "tardy"}
            ]
        }
        
        mock_db.execute.return_value.lastrowid = "attendance-456"
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import bulk_attendance_entry
            
            result = bulk_attendance_entry(mock_tenant.id, bulk_data)
            
            assert result is not None
            assert len(result["created_records"]) == 3
            assert result["total_created"] == 3
    
    def test_update_attendance(self, mock_db, mock_tenant):
        """Test updating attendance record"""
        update_data = {
            "status": "excused",
            "reason": "Medical appointment",
            "is_excused": True,
            "notes": "Doctor's note provided"
        }
        
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import update_attendance
            
            result = update_attendance("attendance-123", mock_tenant.id, update_data)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_delete_attendance(self, mock_db, mock_tenant):
        """Test deleting attendance record"""
        mock_db.execute.return_value.rowcount = 1
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import delete_attendance
            
            result = delete_attendance("attendance-123", mock_tenant.id)
            
            assert result is True
            mock_db.execute.assert_called_once()
    
    def test_calculate_attendance_rate(self, mock_db, mock_tenant):
        """Test calculating attendance rate for a student"""
        mock_attendance = [
            {"status": "present"},
            {"status": "present"},
            {"status": "absent"},
            {"status": "present"},
            {"status": "tardy"}
        ]
        mock_db.query.return_value.fetchall.return_value = mock_attendance
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import calculate_attendance_rate
            
            result = calculate_attendance_rate("student-123", mock_tenant.id)
            
            # 3 present + 1 tardy = 4 attended out of 5 total = 80%
            assert result == 80.0
    
    def test_get_attendance_statistics(self, mock_db, mock_tenant):
        """Test getting attendance statistics for a class"""
        mock_stats = {
            "total_days": 20,
            "total_students": 25,
            "average_attendance_rate": 85.5,
            "present_count": 400,
            "absent_count": 50,
            "tardy_count": 25,
            "excused_count": 15
        }
        mock_db.query.return_value.fetchone.return_value = mock_stats
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_statistics
            
            result = get_attendance_statistics("class-123", mock_tenant.id)
            
            assert result["total_days"] == 20
            assert result["total_students"] == 25
            assert result["average_attendance_rate"] == 85.5
            assert result["present_count"] == 400
    
    def test_get_attendance_trends(self, mock_db, mock_tenant):
        """Test getting attendance trends over time"""
        mock_trends = [
            {"date": date(2024, 1, 15), "attendance_rate": 85.0},
            {"date": date(2024, 1, 16), "attendance_rate": 88.0},
            {"date": date(2024, 1, 17), "attendance_rate": 82.0}
        ]
        mock_db.query.return_value.fetchall.return_value = mock_trends
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_trends
            
            result = get_attendance_trends("class-123", mock_tenant.id, 30)
            
            assert len(result) == 3
            assert result[0]["attendance_rate"] == 85.0
            assert result[1]["attendance_rate"] == 88.0
    
    def test_get_chronically_absent_students(self, mock_db, mock_tenant):
        """Test getting students with chronic absenteeism"""
        mock_students = [
            {
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "total_absences": 15,
                "attendance_rate": 65.0
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_students
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_chronically_absent_students
            
            result = get_chronically_absent_students(mock_tenant.id, 10)
            
            assert len(result) == 1
            assert result[0]["student_name"] == "Alice Johnson"
            assert result[0]["total_absences"] == 15
            assert result[0]["attendance_rate"] == 65.0
    
    def test_validate_attendance_data(self, sample_attendance_data):
        """Test attendance data validation"""
        from services.attendanceService import validate_attendance_data
        
        # Test valid data
        result = validate_attendance_data(sample_attendance_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        
        # Test invalid data
        invalid_data = sample_attendance_data.copy()
        invalid_data["status"] = "invalid_status"  # Invalid status
        invalid_data["attendance_date"] = date.today() + timedelta(days=1)  # Future date
        
        result = validate_attendance_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert any("status" in error.lower() for error in result["errors"])
        assert any("date" in error.lower() for error in result["errors"])
    
    def test_get_attendance_by_status(self, mock_db, mock_tenant):
        """Test filtering attendance by status"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "student_id": "student-1",
                "student_name": "Alice Johnson",
                "status": "absent",
                "attendance_date": date(2024, 1, 15)
            }
        ]
        mock_db.query.return_value.fetchall.return_value = mock_attendance
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_by_status
            
            result = get_attendance_by_status("absent", mock_tenant.id)
            
            assert len(result) == 1
            assert result[0]["status"] == "absent"
            assert result[0]["student_name"] == "Alice Johnson"
    
    def test_get_attendance_summary(self, mock_db, mock_tenant):
        """Test getting attendance summary for a student"""
        mock_summary = {
            "total_days": 20,
            "present_days": 18,
            "absent_days": 2,
            "tardy_days": 1,
            "excused_days": 1,
            "attendance_rate": 90.0,
            "unexcused_absences": 1
        }
        mock_db.query.return_value.fetchone.return_value = mock_summary
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_summary
            
            result = get_attendance_summary("student-123", mock_tenant.id)
            
            assert result["total_days"] == 20
            assert result["present_days"] == 18
            assert result["attendance_rate"] == 90.0
            assert result["unexcused_absences"] == 1
    
    def test_tenant_isolation(self, mock_db, mock_tenant):
        """Test that attendance operations are properly isolated by tenant"""
        # Mock attendance from different tenants
        mock_db.query.return_value.fetchall.return_value = [
            {
                "id": "attendance-1",
                "student_id": "student-1",
                "status": "present",
                "tenant_id": mock_tenant.id
            }
        ]
        
        with patch('services.attendanceService.db', mock_db):
            from services.attendanceService import get_attendance_by_student
            
            result = get_attendance_by_student("student-123", mock_tenant.id)
            
            # Verify the query was called with tenant_id filter
            mock_db.query.assert_called_once()
            query_call = mock_db.query.call_args[0][0]
            assert "tenant_id" in query_call
            assert mock_tenant.id in query_call

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
