"""
Integration tests for grade API endpoints
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
def sample_grade_data():
    """Sample grade data for testing"""
    return {
        "studentId": "student-123",
        "classId": "class-123",
        "assignmentName": "Chapter 5 Test",
        "assignmentType": "test",
        "category": "tests",
        "pointsPossible": 100,
        "pointsEarned": 85,
        "assignedDate": "2024-01-10",
        "dueDate": "2024-01-15"
    }

class TestGradeAPI:
    """Integration tests for grade API endpoints"""
    
    def test_get_grades_success(self, client, auth_headers, mock_tenant):
        """Test successful retrieval of grades"""
        # Mock database response
        mock_grades = [
            {
                "id": "grade-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "classId": "class-1",
                "className": "Algebra I",
                "assignmentName": "Chapter 5 Test",
                "pointsPossible": 100,
                "pointsEarned": 85,
                "percentage": 85.0,
                "letterGrade": "B",
                "tenantId": mock_tenant.id
            }
        ]
        
        with patch('services.gradeService.get_grades_by_tenant') as mock_get:
            mock_get.return_value = mock_grades
            
            response = client.get('/api/grades', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['assignmentName'] == 'Chapter 5 Test'
            assert data['data'][0]['percentage'] == 85.0
            assert data['meta']['tenant']['id'] == mock_tenant.id
    
    def test_get_grades_by_student(self, client, auth_headers, mock_tenant):
        """Test retrieving grades for a specific student"""
        mock_grades = [
            {
                "id": "grade-1",
                "assignmentName": "Chapter 5 Test",
                "assignmentType": "test",
                "pointsPossible": 100,
                "pointsEarned": 85,
                "percentage": 85.0,
                "letterGrade": "B",
                "className": "Algebra I"
            }
        ]
        
        with patch('services.gradeService.get_grades_by_student') as mock_get:
            mock_get.return_value = mock_grades
            
            response = client.get('/api/grades?studentId=student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['assignmentName'] == 'Chapter 5 Test'
    
    def test_get_grades_by_class(self, client, auth_headers, mock_tenant):
        """Test retrieving grades for a specific class"""
        mock_grades = [
            {
                "id": "grade-1",
                "studentId": "student-1",
                "studentName": "Alice Johnson",
                "assignmentName": "Chapter 5 Test",
                "pointsPossible": 100,
                "pointsEarned": 85,
                "percentage": 85.0,
                "letterGrade": "B"
            }
        ]
        
        with patch('services.gradeService.get_grades_by_class') as mock_get:
            mock_get.return_value = mock_grades
            
            response = client.get('/api/grades?classId=class-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 1
            assert data['data'][0]['studentName'] == 'Alice Johnson'
    
    def test_create_grade_success(self, client, auth_headers, mock_tenant, sample_grade_data):
        """Test successful grade creation"""
        mock_created_grade = {
            "id": "grade-456",
            "tenantId": mock_tenant.id,
            **sample_grade_data,
            "percentage": 85.0,
            "letterGrade": "B",
            "gradedDate": date.today().isoformat()
        }
        
        with patch('services.gradeService.create_grade') as mock_create:
            mock_create.return_value = mock_created_grade
            
            response = client.post('/api/grades', 
                                 headers=auth_headers,
                                 data=json.dumps(sample_grade_data))
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['id'] == 'grade-456'
            assert data['data']['assignmentName'] == 'Chapter 5 Test'
            assert data['data']['percentage'] == 85.0
            assert data['data']['tenantId'] == mock_tenant.id
    
    def test_create_grade_validation_error(self, client, auth_headers, sample_grade_data):
        """Test grade creation with validation errors"""
        invalid_data = sample_grade_data.copy()
        invalid_data['pointsEarned'] = 150  # More than possible
        invalid_data['assignmentName'] = ''  # Empty name
        
        response = client.post('/api/grades',
                             headers=auth_headers,
                             data=json.dumps(invalid_data))
        
        assert response.status_code == 422
        data = response.get_json()
        assert data['success'] is False
        assert data['error'] == 'VALIDATION_ERROR'
        assert len(data['details']) > 0
    
    def test_bulk_grade_entry(self, client, auth_headers, mock_tenant):
        """Test bulk grade entry for a class"""
        bulk_data = {
            "classId": "class-123",
            "assignmentName": "Quiz 3",
            "assignmentType": "quiz",
            "category": "quizzes",
            "pointsPossible": 50,
            "assignedDate": "2024-01-15",
            "dueDate": "2024-01-17",
            "grades": [
                {"studentId": "student-1", "pointsEarned": 45},
                {"studentId": "student-2", "pointsEarned": 50},
                {"studentId": "student-3", "pointsEarned": 42}
            ]
        }
        
        mock_result = {
            "createdGrades": [
                {"id": "grade-1", "studentId": "student-1", "pointsEarned": 45},
                {"id": "grade-2", "studentId": "student-2", "pointsEarned": 50},
                {"id": "grade-3", "studentId": "student-3", "pointsEarned": 42}
            ],
            "totalCreated": 3
        }
        
        with patch('services.gradeService.bulk_grade_entry') as mock_bulk:
            mock_bulk.return_value = mock_result
            
            response = client.post('/api/grades/bulk-entry',
                                 headers=auth_headers,
                                 data=json.dumps(bulk_data))
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['totalCreated'] == 3
            assert len(data['data']['createdGrades']) == 3
    
    def test_get_grade_statistics(self, client, auth_headers, mock_tenant):
        """Test getting grade statistics for a class"""
        mock_stats = {
            "totalAssignments": 10,
            "totalStudents": 25,
            "averageGrade": 82.5,
            "highestGrade": 98.0,
            "lowestGrade": 65.0,
            "gradeDistribution": {
                "A": 5,
                "B": 8,
                "C": 7,
                "D": 3,
                "F": 2
            }
        }
        
        with patch('services.gradeService.get_grade_statistics') as mock_get:
            mock_get.return_value = mock_stats
            
            response = client.get('/api/grades/statistics?classId=class-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['totalAssignments'] == 10
            assert data['data']['averageGrade'] == 82.5
            assert data['data']['gradeDistribution']['A'] == 5
    
    def test_calculate_student_gpa(self, client, auth_headers, mock_tenant):
        """Test calculating student GPA"""
        mock_gpa = 3.5
        
        with patch('services.gradeService.calculate_student_gpa') as mock_calc:
            mock_calc.return_value = mock_gpa
            
            response = client.get('/api/grades/gpa?studentId=student-123', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['data']['gpa'] == 3.5
    
    def test_unauthorized_access(self, client, sample_grade_data):
        """Test API access without authentication"""
        response = client.get('/api/grades')
        assert response.status_code == 401
        
        response = client.post('/api/grades', data=json.dumps(sample_grade_data))
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, auth_headers, mock_tenant):
        """Test that grades are properly isolated by tenant"""
        # Mock grades from different tenant
        mock_grades = [
            {
                "id": "grade-1",
                "assignmentName": "Chapter 5 Test",
                "pointsEarned": 85,
                "tenantId": "different-tenant-id"
            }
        ]
        
        with patch('services.gradeService.get_grades_by_tenant') as mock_get:
            # Should only return grades for the authenticated tenant
            mock_get.return_value = []
            
            response = client.get('/api/grades', headers=auth_headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert len(data['data']) == 0  # No grades from other tenants

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
