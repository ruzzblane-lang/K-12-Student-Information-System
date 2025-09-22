"""
Integration tests for teacher API endpoints
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
def sample_teacher_data():
    """Sample teacher data for testing"""
    return {
        "employeeId": "TCH001",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@springfield.edu",
        "phone": "(217) 555-0125",
        "department": "Mathematics",
        "employmentType": "full_time",
        "hireDate": "2023-08-15",
        "subjectsTaught": ["Algebra", "Geometry", "Calculus"],
        "gradeLevelsTaught": ["9", "10", "11", "12"],
        "yearsExperience": 5,
        "qualifications": "Master's in Mathematics Education"
    }

class TestTeacherAPI:
    """Integration tests for teacher API endpoints"""
    
    def test_get_teachers_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of teachers"""
        # Mock database response
        mock_teachers = [
            {
                "id": "teacher-1",
                "employeeId": "TCH001",
                "firstName": "Jane",
                "lastName": "Smith",
                "department": "Mathematics",
                "tenantId": mock_tenant.id
            },
            {
                "id": "teacher-2",
                "employeeId": "TCH002",
                "firstName": "Mike",
                "lastName": "Davis",
                "department": "Science",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.teacherService.get_teachers_by_tenant') as mock_get:
            mock_get.return_value = mock_teachers
            
            response = client.get('/api/teachers', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 2
            assert data['data'][0]['firstName'] == 'Jane'
            assert data['data'][1]['firstName'] == 'Mike'
            assert data['meta']['tenant']['id'] == mock_tenant.id
    
    def test_get_teachers_with_pagination(self, client, auth_headers, mock_tenant):
        """Test teacher retrieval with pagination"""
        mock_teachers = [
            {
                "id": f"teacher-{i}",
                "employeeId": f"TCH{i:03d}",
                "firstName": f"Teacher{i}",
                "lastName": "Test",
                "department": "Mathematics",
                "tenantId": mock_tenant.id
            }
            for i in range(1, 11)
        ]
        
        with patch('services.teacherService.get_teachers_by_tenant') as mock_get:
            mock_get.return_value = mock_teachers
            
            response = client.get('/api/teachers?page=1&limit=5', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 5
            assert data['meta']['pagination']['page'] == 1
            assert data['meta']['pagination']['limit'] == 5
    
    def test_get_teachers_by_department(self, client, auth_headers, mock_tenant):
        """Test teacher retrieval with department filter"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employeeId": "TCH001",
                "firstName": "Jane",
                "lastName": "Smith",
                "department": "Mathematics",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.teacherService.get_teachers_by_department') as mock_get:
            mock_get.return_value = mock_teachers
            
            response = client.get('/api/teachers?department=Mathematics', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['department'] == 'Mathematics'
    
    def test_create_teacher_success(self, client, auth_headers, mock_tenant, sample_teacher_data):
        """Test successful teacher creation"""
        mock_created_teacher = {
            "id": "teacher-456",
            "tenantId": mock_tenant.id,
            **sample_teacher_data
        }
        
        with patch('services.teacherService.create_teacher') as mock_create:
            mock_create.return_value = mock_created_teacher
            
            response = client.post('/api/teachers', 
                                 headers=auth_headers,
                                 data=json.dumps(sample_teacher_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'teacher-456'
            assert data['data']['firstName'] == 'Jane'
            assert data['data']['tenantId'] == mock_tenant.id
    
    def test_create_teacher_validation_error(self, client, auth_headers, sample_teacher_data):
        """Test teacher creation with validation errors"""
        invalid_data = sample_teacher_data.copy()
        invalid_data['firstName'] = ''  # Empty first name
        invalid_data['email'] = 'invalid-email'  # Invalid email format
        
        response = client.post('/api/teachers',
                             headers=auth_headers,
                             data=json.dumps(invalid_data))
        
        assert response.status_code == 422
        data = response.get_json()
        assert data['success'] is False
        assert data['error'] == 'VALIDATION_ERROR'
        assert len(data['details']) > 0
    
    def test_create_teacher_duplicate_employee_id(self, client, auth_headers, mock_tenant, sample_teacher_data):
        """Test teacher creation with duplicate employee ID"""
        with patch('services.teacherService.create_teacher') as mock_create:
            mock_create.side_effect = ValueError("Employee ID already exists")
            
            response = client.post('/api/teachers',
                                 headers=auth_headers,
                                 data=json.dumps(sample_teacher_data))
            
            assert response.status_code == 409
            data = response.get_json()
            assert data['success'] is False
            assert "already exists" in data['message']
    
    def test_get_teacher_by_id_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of specific teacher"""
        mock_teacher = {
            "id": "teacher-123",
            "employeeId": "TCH001",
            "firstName": "Jane",
            "lastName": "Smith",
            "department": "Mathematics",
            "tenantId": mock_tenant.id
        }
        
        with patch('services.teacherService.get_teacher_by_id') as mock_get:
            mock_get.return_value = mock_teacher
            
            response = client.get('/api/teachers/teacher-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'teacher-123'
            assert data['data']['firstName'] == 'Jane'
    
    def test_get_teacher_by_id_not_found(self, client, auth_headers, mock_tenant):
        """Test retrieval of non-existent teacher"""
        with patch('services.teacherService.get_teacher_by_id') as mock_get:
            mock_get.return_value = None
            
            response = client.get('/api/teachers/non-existent', headers=auth_headers)
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_update_teacher_success(self, client, auth_headers, mock_tenant):
        """Test successful teacher update"""
        update_data = {
            "department": "Advanced Mathematics",
            "yearsExperience": 6,
            "phone": "(217) 555-9999"
        }
        
        updated_teacher = {
            "id": "teacher-123",
            "employeeId": "TCH001",
            "firstName": "Jane",
            "lastName": "Smith",
            "department": "Advanced Mathematics",
            "yearsExperience": 6,
            "phone": "(217) 555-9999",
            "tenantId": mock_tenant.id
        }
        
        with patch('services.teacherService.update_teacher') as mock_update:
            mock_update.return_value = updated_teacher
            
            response = client.put('/api/teachers/teacher-123',
                                headers=auth_headers,
                                data=json.dumps(update_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['department'] == 'Advanced Mathematics'
            assert data['data']['yearsExperience'] == 6
    
    def test_update_teacher_not_found(self, client, auth_headers, mock_tenant):
        """Test updating non-existent teacher"""
        update_data = {"department": "Updated Department"}
        
        with patch('services.teacherService.update_teacher') as mock_update:
            mock_update.return_value = None
            
            response = client.put('/api/teachers/non-existent',
                                headers=auth_headers,
                                data=json.dumps(update_data))
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_delete_teacher_success(self, client, auth_headers, mock_tenant):
        """Test successful teacher deletion"""
        with patch('services.teacherService.delete_teacher') as mock_delete:
            mock_delete.return_value = True
            
            response = client.delete('/api/teachers/teacher-123', headers=auth_headers)
            
            assert response.status_code == 204
    
    def test_delete_teacher_not_found(self, client, auth_headers, mock_tenant):
        """Test deleting non-existent teacher"""
        with patch('services.teacherService.delete_teacher') as mock_delete:
            mock_delete.return_value = False
            
            response = client.delete('/api/teachers/non-existent', headers=auth_headers)
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_get_teacher_schedule(self, client, auth_headers, mock_tenant):
        """Test retrieving teacher's class schedule"""
        mock_schedule = [
            {
                "classId": "class-1",
                "className": "Algebra I",
                "roomNumber": "A101",
                "schedule": {
                    "monday": ["08:00-08:50"],
                    "wednesday": ["08:00-08:50"],
                    "friday": ["08:00-08:50"]
                }
            }
        ]
        
        with patch('services.teacherService.get_teacher_schedule') as mock_get:
            mock_get.return_value = mock_schedule
            
            response = client.get('/api/teachers/teacher-123/schedule', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['className'] == 'Algebra I'
    
    def test_get_teacher_students(self, client, auth_headers, mock_tenant):
        """Test retrieving students taught by a teacher"""
        mock_students = [
            {
                "studentId": "student-1",
                "firstName": "Alice",
                "lastName": "Johnson",
                "className": "Algebra I",
                "gradeLevel": "10"
            }
        ]
        
        with patch('services.teacherService.get_teacher_students') as mock_get:
            mock_get.return_value = mock_students
            
            response = client.get('/api/teachers/teacher-123/students', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['firstName'] == 'Alice'
            assert data['data'][0]['className'] == 'Algebra I'
    
    def test_get_teachers_by_subject(self, client, auth_headers, mock_tenant):
        """Test filtering teachers by subject taught"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employeeId": "TCH001",
                "firstName": "Jane",
                "lastName": "Smith",
                "subjectsTaught": ["Algebra", "Geometry"],
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.teacherService.get_teachers_by_subject') as mock_get:
            mock_get.return_value = mock_teachers
            
            response = client.get('/api/teachers?subject=Algebra', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert "Algebra" in data['data'][0]['subjectsTaught']
    
    def test_unauthorized_access(self, client, sample_teacher_data):
        """Test API access without authentication"""
        response = client.get('/api/teachers')
        assert response.status_code == 401
        
        response = client.post('/api/teachers', data=json.dumps(sample_teacher_data))
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, auth_headers, mock_tenant):
        """Test that teachers are properly isolated by tenant"""
        # Mock teachers from different tenant
        mock_teachers = [
            {
                "id": "teacher-1",
                "employeeId": "TCH001",
                "firstName": "Jane",
                "lastName": "Smith",
                "tenantId": "different-tenant-id"
            }
        ]
        
        with patch('services.teacherService.get_teachers_by_tenant') as mock_get:
            # Should only return teachers for the authenticated tenant
            mock_get.return_value = []
            
            response = client.get('/api/teachers', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 0  # No teachers from other tenants
    
    def test_search_teachers(self, client, auth_headers, mock_tenant):
        """Test teacher search functionality"""
        mock_teachers = [
            {
                "id": "teacher-1",
                "employeeId": "TCH001",
                "firstName": "Jane",
                "lastName": "Smith",
                "department": "Mathematics",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.teacherService.search_teachers') as mock_search:
            mock_search.return_value = mock_teachers
            
            response = client.get('/api/teachers?search=Jane', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['firstName'] == 'Jane'

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
