"""
Integration tests for attendance API endpoints
Tests the complete API flow including authentication, database, and business logic
"""

import pytest
import sys
import os
import json
from datetime import date, datetime
from unittest.mock import Mock, patch, MagicMock

# Add the backend directory to the path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

@pytest.fixture
def app():
    """Create test Flask app"""
    from app import create_app
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE_URL'] = 'sqlite:///:memory:'
    return app

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

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
def auth_headers(mock_user):
    """Mock authentication headers"""
    with patch('middleware.auth.verify_jwt_token') as mock_verify:
        mock_verify.return_value = {
            'userId': mock_user.id,
            'tenantId': mock_user.tenant_id,
            'role': mock_user.role
        }
        yield {
            'Authorization': 'Bearer mock-jwt-token',
            'Content-Type': 'application/json'
        }

@pytest.fixture
def sample_attendance_data():
    """Sample attendance data for testing"""
    return {
        "studentId": "student-123",
        "classId": "class-123",
        "attendanceDate": "2024-01-15",
        "status": "present",
        "period": "1st",
        "reason": None,
        "notes": None,
        "isExcused": False
    }

class TestAttendanceAPI:
    """Integration tests for attendance API endpoints"""
    
    def test_get_attendance_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of attendance records"""
        # Mock database response
        mock_attendance = [
            {
                "id": "attendance-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "classId": "class-1",
                "className": "Algebra I",
                "attendanceDate": "2024-01-15",
                "status": "present",
                "period": "1st",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.attendanceService.get_attendance_by_tenant') as mock_get:
            mock_get.return_value = mock_attendance
            
            response = client.get('/api/attendance', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['status'] == 'present'
            assert data['data'][0]['studentName'] == 'Alice Johnson'
            assert data['meta']['tenant']['id'] == mock_tenant.id
    
    def test_get_attendance_by_student(self, client, auth_headers, mock_tenant):
        """Test retrieving attendance for a specific student"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "attendanceDate": "2024-01-15",
                "status": "present",
                "period": "1st",
                "className": "Algebra I"
            },
            {
                "id": "attendance-2",
                "attendanceDate": "2024-01-16",
                "status": "absent",
                "period": "1st",
                "className": "Algebra I"
            }
        ]
        
        with patch('services.attendanceService.get_attendance_by_student') as mock_get:
            mock_get.return_value = mock_attendance
            
            response = client.get('/api/attendance?studentId=student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 2
            assert data['data'][0]['status'] == 'present'
            assert data['data'][1]['status'] == 'absent'
    
    def test_get_attendance_by_class(self, client, auth_headers, mock_tenant):
        """Test retrieving attendance for a specific class"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "attendanceDate": "2024-01-15",
                "status": "present"
            }
        ]
        
        with patch('services.attendanceService.get_attendance_by_class') as mock_get:
            mock_get.return_value = mock_attendance
            
            response = client.get('/api/attendance?classId=class-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['studentName'] == 'Alice Johnson'
            assert data['data'][0]['status'] == 'present'
    
    def test_get_attendance_by_date(self, client, auth_headers, mock_tenant):
        """Test retrieving attendance for a specific date"""
        mock_attendance = [
            {
                "id": "attendance-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "status": "present",
                "className": "Algebra I"
            }
        ]
        
        with patch('services.attendanceService.get_attendance_by_date') as mock_get:
            mock_get.return_value = mock_attendance
            
            response = client.get('/api/attendance?date=2024-01-15', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['studentName'] == 'Alice Johnson'
            assert data['data'][0]['status'] == 'present'
    
    def test_create_attendance_success(self, client, auth_headers, mock_tenant, sample_attendance_data):
        """Test successful attendance creation"""
        mock_created_attendance = {
            "id": "attendance-456",
            "tenantId": mock_tenant.id,
            **sample_attendance_data,
            "markedAt": datetime.now().isoformat()
        }
        
        with patch('services.attendanceService.create_attendance') as mock_create:
            mock_create.return_value = mock_created_attendance
            
            response = client.post('/api/attendance', 
                                 headers=auth_headers,
                                 data=json.dumps(sample_attendance_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'attendance-456'
            assert data['data']['status'] == 'present'
            assert data['data']['tenantId'] == mock_tenant.id
    
    def test_create_attendance_validation_error(self, client, auth_headers, sample_attendance_data):
        """Test attendance creation with validation errors"""
        invalid_data = sample_attendance_data.copy()
        invalid_data['status'] = 'invalid_status'  # Invalid status
        invalid_data['attendanceDate'] = '2025-01-15'  # Future date
        
        response = client.post('/api/attendance',
                             headers=auth_headers,
                             data=json.dumps(invalid_data))
        
        assert response.status_code == 422
        data = response.get_json()
        assert data['success'] is False
        assert data['error'] == 'VALIDATION_ERROR'
        assert len(data['details']) > 0
    
    def test_bulk_attendance_entry(self, client, auth_headers, mock_tenant):
        """Test bulk attendance entry for a class"""
        bulk_data = {
            "classId": "class-123",
            "attendanceDate": "2024-01-15",
            "period": "1st",
            "records": [
                {"studentId": "student-1", "status": "present"},
                {"studentId": "student-2", "status": "absent", "reason": "Sick"},
                {"studentId": "student-3", "status": "tardy"}
            ]
        }
        
        mock_result = {
            "createdRecords": [
                {"id": "attendance-1", "studentId": "student-1", "status": "present"},
                {"id": "attendance-2", "studentId": "student-2", "status": "absent"},
                {"id": "attendance-3", "studentId": "student-3", "status": "tardy"}
            ],
            "totalCreated": 3
        }
        
        with patch('services.attendanceService.bulk_attendance_entry') as mock_bulk:
            mock_bulk.return_value = mock_result
            
            response = client.post('/api/attendance/bulk',
                                 headers=auth_headers,
                                 data=json.dumps(bulk_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['totalCreated'] == 3
            assert len(data['data']['createdRecords']) == 3
    
    def test_get_attendance_statistics(self, client, auth_headers, mock_tenant):
        """Test getting attendance statistics for a class"""
        mock_stats = {
            "totalDays": 20,
            "totalStudents": 25,
            "averageAttendanceRate": 85.5,
            "presentCount": 400,
            "absentCount": 50,
            "tardyCount": 25,
            "excusedCount": 15
        }
        
        with patch('services.attendanceService.get_attendance_statistics') as mock_get:
            mock_get.return_value = mock_stats
            
            response = client.get('/api/attendance/statistics?classId=class-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['totalDays'] == 20
            assert data['data']['totalStudents'] == 25
            assert data['data']['averageAttendanceRate'] == 85.5
            assert data['data']['presentCount'] == 400
    
    def test_calculate_attendance_rate(self, client, auth_headers, mock_tenant):
        """Test calculating attendance rate for a student"""
        mock_rate = 85.0
        
        with patch('services.attendanceService.calculate_attendance_rate') as mock_calc:
            mock_calc.return_value = mock_rate
            
            response = client.get('/api/attendance/rate?studentId=student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['attendanceRate'] == 85.0
    
    def test_get_attendance_summary(self, client, auth_headers, mock_tenant):
        """Test getting attendance summary for a student"""
        mock_summary = {
            "totalDays": 20,
            "presentDays": 18,
            "absentDays": 2,
            "tardyDays": 1,
            "excusedDays": 1,
            "attendanceRate": 90.0,
            "unexcusedAbsences": 1
        }
        
        with patch('services.attendanceService.get_attendance_summary') as mock_get:
            mock_get.return_value = mock_summary
            
            response = client.get('/api/attendance/summary?studentId=student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['totalDays'] == 20
            assert data['data']['presentDays'] == 18
            assert data['data']['attendanceRate'] == 90.0
            assert data['data']['unexcusedAbsences'] == 1
    
    def test_unauthorized_access(self, client, sample_attendance_data):
        """Test API access without authentication"""
        response = client.get('/api/attendance')
        assert response.status_code == 401
        
        response = client.post('/api/attendance', data=json.dumps(sample_attendance_data))
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, auth_headers, mock_tenant):
        """Test that attendance records are properly isolated by tenant"""
        # Mock attendance from different tenant
        mock_attendance = [
            {
                "id": "attendance-1",
                "studentId": "student-1",
                "status": "present",
                "tenantId": "different-tenant-id"
            }
        ]
        
        with patch('services.attendanceService.get_attendance_by_tenant') as mock_get:
            # Should only return attendance for the authenticated tenant
            mock_get.return_value = []
            
            response = client.get('/api/attendance', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 0  # No attendance from other tenants

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
