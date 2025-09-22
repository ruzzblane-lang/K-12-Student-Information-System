"""
Integration tests for student API endpoints
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
def sample_student_data():
    """Sample student data for testing"""
    return {
        "studentId": "STU001",
        "firstName": "Alice",
        "lastName": "Johnson",
        "gradeLevel": "10",
        "dateOfBirth": "2008-05-15",
        "email": "alice.johnson@springfield.edu",
        "phone": "(217) 555-0123",
        "address": "123 Student St, Springfield, IL 62701",
        "parentGuardian1Name": "Bob Johnson",
        "parentGuardian1Email": "bob.johnson@email.com",
        "parentGuardian1Phone": "(217) 555-0124"
    }

class TestStudentAPI:
    """Integration tests for student API endpoints"""
    
    def test_get_students_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of students"""
        # Mock database response
        mock_students = [
            {
                "id": "student-1",
                "studentId": "STU001",
                "firstName": "Alice",
                "lastName": "Johnson",
                "gradeLevel": "10",
                "tenantId": mock_tenant.id
            },
            {
                "id": "student-2",
                "studentId": "STU002",
                "firstName": "Bob",
                "lastName": "Smith",
                "gradeLevel": "11",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.studentService.get_students_by_tenant') as mock_get:
            mock_get.return_value = mock_students
            
            response = client.get('/api/students', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 2
            assert data['data'][0]['firstName'] == 'Alice'
            assert data['data'][1]['firstName'] == 'Bob'
            assert data['meta']['tenant']['id'] == mock_tenant.id
    
    def test_get_students_with_pagination(self, client, auth_headers, mock_tenant):
        """Test student retrieval with pagination"""
        mock_students = [
            {
                "id": f"student-{i}",
                "studentId": f"STU{i:03d}",
                "firstName": f"Student{i}",
                "lastName": "Test",
                "gradeLevel": "10",
                "tenantId": mock_tenant.id
            }
            for i in range(1, 11)
        ]
        
        with patch('services.studentService.get_students_by_tenant') as mock_get:
            mock_get.return_value = mock_students
            
            response = client.get('/api/students?page=1&limit=5', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 5
            assert data['meta']['pagination']['page'] == 1
            assert data['meta']['pagination']['limit'] == 5
    
    def test_get_students_with_filters(self, client, auth_headers, mock_tenant):
        """Test student retrieval with grade level filter"""
        mock_students = [
            {
                "id": "student-1",
                "studentId": "STU001",
                "firstName": "Alice",
                "lastName": "Johnson",
                "gradeLevel": "10",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.studentService.get_students_by_grade_level') as mock_get:
            mock_get.return_value = mock_students
            
            response = client.get('/api/students?gradeLevel=10', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['gradeLevel'] == '10'
    
    def test_create_student_success(self, client, auth_headers, mock_tenant, sample_student_data):
        """Test successful student creation"""
        mock_created_student = {
            "id": "student-456",
            "tenantId": mock_tenant.id,
            **sample_student_data
        }
        
        with patch('services.studentService.create_student') as mock_create:
            mock_create.return_value = mock_created_student
            
            response = client.post('/api/students', 
                                 headers=auth_headers,
                                 data=json.dumps(sample_student_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'student-456'
            assert data['data']['firstName'] == 'Alice'
            assert data['data']['tenantId'] == mock_tenant.id
    
    def test_create_student_validation_error(self, client, auth_headers, sample_student_data):
        """Test student creation with validation errors"""
        invalid_data = sample_student_data.copy()
        invalid_data['firstName'] = ''  # Empty first name
        invalid_data['email'] = 'invalid-email'  # Invalid email format
        
        response = client.post('/api/students',
                             headers=auth_headers,
                             data=json.dumps(invalid_data))
        
        assert response.status_code == 422
        data = response.get_json()
        assert data['success'] is False
        assert data['error'] == 'VALIDATION_ERROR'
        assert len(data['details']) > 0
    
    def test_create_student_duplicate_id(self, client, auth_headers, mock_tenant, sample_student_data):
        """Test student creation with duplicate student ID"""
        with patch('services.studentService.create_student') as mock_create:
            mock_create.side_effect = ValueError("Student ID already exists")
            
            response = client.post('/api/students',
                                 headers=auth_headers,
                                 data=json.dumps(sample_student_data))
            
            assert response.status_code == 409
            data = response.get_json()
            assert data['success'] is False
            assert "already exists" in data['message']
    
    def test_get_student_by_id_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of specific student"""
        mock_student = {
            "id": "student-123",
            "studentId": "STU001",
            "firstName": "Alice",
            "lastName": "Johnson",
            "gradeLevel": "10",
            "tenantId": mock_tenant.id
        }
        
        with patch('services.studentService.get_student_by_id') as mock_get:
            mock_get.return_value = mock_student
            
            response = client.get('/api/students/student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'student-123'
            assert data['data']['firstName'] == 'Alice'
    
    def test_get_student_by_id_not_found(self, client, auth_headers, mock_tenant):
        """Test retrieval of non-existent student"""
        with patch('services.studentService.get_student_by_id') as mock_get:
            mock_get.return_value = None
            
            response = client.get('/api/students/non-existent', headers=auth_headers)
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_update_student_success(self, client, auth_headers, mock_tenant):
        """Test successful student update"""
        update_data = {
            "firstName": "Alice Updated",
            "gradeLevel": "11",
            "phone": "(217) 555-9999"
        }
        
        updated_student = {
            "id": "student-123",
            "studentId": "STU001",
            "firstName": "Alice Updated",
            "lastName": "Johnson",
            "gradeLevel": "11",
            "phone": "(217) 555-9999",
            "tenantId": mock_tenant.id
        }
        
        with patch('services.studentService.update_student') as mock_update:
            mock_update.return_value = updated_student
            
            response = client.put('/api/students/student-123',
                                headers=auth_headers,
                                data=json.dumps(update_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['firstName'] == 'Alice Updated'
            assert data['data']['gradeLevel'] == '11'
    
    def test_update_student_not_found(self, client, auth_headers, mock_tenant):
        """Test updating non-existent student"""
        update_data = {"firstName": "Updated"}
        
        with patch('services.studentService.update_student') as mock_update:
            mock_update.return_value = None
            
            response = client.put('/api/students/non-existent',
                                headers=auth_headers,
                                data=json.dumps(update_data))
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_delete_student_success(self, client, auth_headers, mock_tenant):
        """Test successful student deletion"""
        with patch('services.studentService.delete_student') as mock_delete:
            mock_delete.return_value = True
            
            response = client.delete('/api/students/student-123', headers=auth_headers)
            
            assert response.status_code == 204
    
    def test_delete_student_not_found(self, client, auth_headers, mock_tenant):
        """Test deleting non-existent student"""
        with patch('services.studentService.delete_student') as mock_delete:
            mock_delete.return_value = False
            
            response = client.delete('/api/students/non-existent', headers=auth_headers)
            
            assert response.status_code == 404
            data = response.get_json()
            assert data['success'] is False
            assert "not found" in data['message']
    
    def test_bulk_import_students(self, client, auth_headers, mock_tenant):
        """Test bulk student import"""
        import_data = {
            "students": [
                {
                    "studentId": "STU001",
                    "firstName": "Alice",
                    "lastName": "Johnson",
                    "gradeLevel": "10"
                },
                {
                    "studentId": "STU002",
                    "firstName": "Bob",
                    "lastName": "Smith",
                    "gradeLevel": "11"
                }
            ]
        }
        
        mock_result = {
            "imported": 2,
            "failed": 0,
            "errors": []
        }
        
        with patch('services.studentService.bulk_import_students') as mock_import:
            mock_import.return_value = mock_result
            
            response = client.post('/api/students/bulk-import',
                                 headers=auth_headers,
                                 data=json.dumps(import_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['imported'] == 2
            assert data['data']['failed'] == 0
    
    def test_bulk_import_with_errors(self, client, auth_headers, mock_tenant):
        """Test bulk import with some failures"""
        import_data = {
            "students": [
                {
                    "studentId": "STU001",
                    "firstName": "Alice",
                    "lastName": "Johnson",
                    "gradeLevel": "10"
                },
                {
                    "studentId": "STU001",  # Duplicate
                    "firstName": "Bob",
                    "lastName": "Smith",
                    "gradeLevel": "11"
                }
            ]
        }
        
        mock_result = {
            "imported": 1,
            "failed": 1,
            "errors": [
                {
                    "row": 2,
                    "error": "Duplicate student ID"
                }
            ]
        }
        
        with patch('services.studentService.bulk_import_students') as mock_import:
            mock_import.return_value = mock_result
            
            response = client.post('/api/students/bulk-import',
                                 headers=auth_headers,
                                 data=json.dumps(import_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['imported'] == 1
            assert data['data']['failed'] == 1
            assert len(data['data']['errors']) == 1
    
    def test_unauthorized_access(self, client, sample_student_data):
        """Test API access without authentication"""
        response = client.get('/api/students')
        assert response.status_code == 401
        
        response = client.post('/api/students', data=json.dumps(sample_student_data))
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, auth_headers, mock_tenant):
        """Test that students are properly isolated by tenant"""
        # Mock students from different tenant
        mock_students = [
            {
                "id": "student-1",
                "studentId": "STU001",
                "firstName": "Alice",
                "lastName": "Johnson",
                "tenantId": "different-tenant-id"
            }
        ]
        
        with patch('services.studentService.get_students_by_tenant') as mock_get:
            # Should only return students for the authenticated tenant
            mock_get.return_value = []
            
            response = client.get('/api/students', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 0  # No students from other tenants
    
    def test_search_students(self, client, auth_headers, mock_tenant):
        """Test student search functionality"""
        mock_students = [
            {
                "id": "student-1",
                "studentId": "STU001",
                "firstName": "Alice",
                "lastName": "Johnson",
                "gradeLevel": "10",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.studentService.search_students') as mock_search:
            mock_search.return_value = mock_students
            
            response = client.get('/api/students?search=Alice', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['firstName'] == 'Alice'

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
