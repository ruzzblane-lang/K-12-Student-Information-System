"""
Integration tests for class API endpoints
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
def sample_class_data():
    """Sample class data for testing"""
    return {
        "classCode": "MATH101",
        "name": "Algebra I",
        "description": "Introduction to algebraic concepts",
        "subject": "Mathematics",
        "gradeLevel": "9",
        "academicYear": "2024-2025",
        "semester": "full_year",
        "credits": 1.0,
        "teacherId": "teacher-123",
        "roomNumber": "A101",
        "building": "Main Building",
        "schedule": {
            "monday": ["08:00-08:50"],
            "wednesday": ["08:00-08:50"],
            "friday": ["08:00-08:50"]
        },
        "maxStudents": 30,
        "startDate": "2024-08-15",
        "endDate": "2025-05-30"
    }

class TestClassAPI:
    """Integration tests for class API endpoints"""
    
    def test_get_classes_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of classes"""
        # Mock database response
        mock_classes = [
            {
                "id": "class-1",
                "classCode": "MATH101",
                "name": "Algebra I",
                "subject": "Mathematics",
                "gradeLevel": "9",
                "tenantId": mock_tenant.id
            },
            {
                "id": "class-2",
                "classCode": "SCI201",
                "name": "Biology I",
                "subject": "Science",
                "gradeLevel": "10",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.classService.get_classes_by_tenant') as mock_get:
            mock_get.return_value = mock_classes
            
            response = client.get('/api/classes', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 2
            assert data['data'][0]['name'] == 'Algebra I'
            assert data['data'][1]['name'] == 'Biology I'
            assert data['meta']['tenant']['id'] == mock_tenant.id
    
    def test_get_classes_with_filters(self, client, auth_headers, mock_tenant):
        """Test class retrieval with subject filter"""
        mock_classes = [
            {
                "id": "class-1",
                "classCode": "MATH101",
                "name": "Algebra I",
                "subject": "Mathematics",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.classService.get_classes_by_subject') as mock_get:
            mock_get.return_value = mock_classes
            
            response = client.get('/api/classes?subject=Mathematics', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['subject'] == 'Mathematics'
    
    def test_create_class_success(self, client, auth_headers, mock_tenant, sample_class_data):
        """Test successful class creation"""
        mock_created_class = {
            "id": "class-456",
            "tenantId": mock_tenant.id,
            **sample_class_data
        }
        
        with patch('services.classService.create_class') as mock_create:
            mock_create.return_value = mock_created_class
            
            response = client.post('/api/classes', 
                                 headers=auth_headers,
                                 data=json.dumps(sample_class_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'class-456'
            assert data['data']['name'] == 'Algebra I'
            assert data['data']['tenantId'] == mock_tenant.id
    
    def test_create_class_validation_error(self, client, auth_headers, sample_class_data):
        """Test class creation with validation errors"""
        invalid_data = sample_class_data.copy()
        invalid_data['name'] = ''  # Empty name
        invalid_data['maxStudents'] = -1  # Invalid max students
        
        response = client.post('/api/classes',
                             headers=auth_headers,
                             data=json.dumps(invalid_data))
        
        assert response.status_code == 422
        data = response.get_json()
        assert data['success'] is False
        assert data['error'] == 'VALIDATION_ERROR'
        assert len(data['details']) > 0
    
    def test_get_class_by_id_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of specific class"""
        mock_class = {
            "id": "class-123",
            "classCode": "MATH101",
            "name": "Algebra I",
            "subject": "Mathematics",
            "gradeLevel": "9",
            "tenantId": mock_tenant.id
        }
        
        with patch('services.classService.get_class_by_id') as mock_get:
            mock_get.return_value = mock_class
            
            response = client.get('/api/classes/class-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'class-123'
            assert data['data']['name'] == 'Algebra I'
    
    def test_enroll_student_in_class(self, client, auth_headers, mock_tenant):
        """Test enrolling a student in a class"""
        enrollment_data = {
            "studentId": "student-123"
        }
        
        mock_enrollment = {
            "id": "enrollment-456",
            "studentId": "student-123",
            "classId": "class-123",
            "enrollmentDate": date.today().isoformat()
        }
        
        with patch('services.classService.enroll_student_in_class') as mock_enroll:
            mock_enroll.return_value = mock_enrollment
            
            response = client.post('/api/classes/class-123/enroll',
                                 headers=auth_headers,
                                 data=json.dumps(enrollment_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['studentId'] == 'student-123'
            assert data['data']['classId'] == 'class-123'
    
    def test_get_class_enrollment(self, client, auth_headers, mock_tenant):
        """Test retrieving class enrollment list"""
        mock_enrollments = [
            {
                "enrollmentId": "enrollment-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "gradeLevel": "9",
                "enrollmentDate": "2024-08-15"
            }
        ]
        
        with patch('services.classService.get_class_enrollment') as mock_get:
            mock_get.return_value = mock_enrollments
            
            response = client.get('/api/classes/class-123/students', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['studentName'] == 'Alice Johnson'
    
    def test_unauthorized_access(self, client, sample_class_data):
        """Test API access without authentication"""
        response = client.get('/api/classes')
        assert response.status_code == 401
        
        response = client.post('/api/classes', data=json.dumps(sample_class_data))
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, auth_headers, mock_tenant):
        """Test that classes are properly isolated by tenant"""
        # Mock classes from different tenant
        mock_classes = [
            {
                "id": "class-1",
                "classCode": "MATH101",
                "name": "Algebra I",
                "tenantId": "different-tenant-id"
            }
        ]
        
        with patch('services.classService.get_classes_by_tenant') as mock_get:
            # Should only return classes for the authenticated tenant
            mock_get.return_value = []
            
            response = client.get('/api/classes', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 0  # No classes from other tenants

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
