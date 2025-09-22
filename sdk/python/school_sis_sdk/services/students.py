"""
Students service for School SIS SDK
"""

from typing import Dict, List, Optional, Any
from ..client import SISClient
from ..models import Student, ListParams, PaginationInfo


class StudentsService:
    """Service for managing students"""
    
    def __init__(self, client: SISClient):
        self.client = client
    
    def list(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get list of students with optional filtering and pagination"""
        if params is None:
            params = {}
        
        response = self.client.get('/students', params=params)
        return response
    
    def get(self, student_id: str) -> Student:
        """Get a specific student by ID"""
        data = self.client.get(f'/students/{student_id}')
        return Student(**data)
    
    def create(self, student_data: Dict[str, Any]) -> Student:
        """Create a new student"""
        data = self.client.post('/students', json=student_data)
        return Student(**data)
    
    def update(self, student_id: str, student_data: Dict[str, Any]) -> Student:
        """Update a student"""
        data = self.client.put(f'/students/{student_id}', json=student_data)
        return Student(**data)
    
    def patch(self, student_id: str, student_data: Dict[str, Any]) -> Student:
        """Partially update a student"""
        data = self.client.patch(f'/students/{student_id}', json=student_data)
        return Student(**data)
    
    def delete(self, student_id: str) -> None:
        """Delete a student"""
        self.client.delete(f'/students/{student_id}')
    
    def search(self, query: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Search students by query"""
        if params is None:
            params = {}
        params['search'] = query
        return self.list(params)
    
    def get_by_grade_level(self, grade_level: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get students by grade level"""
        if params is None:
            params = {}
        params['gradeLevel'] = grade_level
        return self.list(params)
    
    def get_by_status(self, status: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get students by status"""
        if params is None:
            params = {}
        params['status'] = status
        return self.list(params)
    
    def get_by_academic_program(self, academic_program: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get students by academic program"""
        if params is None:
            params = {}
        params['academicProgram'] = academic_program
        return self.list(params)
    
    def bulk_create(self, students: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk create students"""
        return self.client.post('/students/bulk', json={'students': students})
    
    def bulk_update(self, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk update students"""
        return self.client.put('/students/bulk', json={'updates': updates})
    
    def bulk_delete(self, student_ids: List[str]) -> Dict[str, Any]:
        """Bulk delete students"""
        return self.client.delete('/students/bulk', json={'ids': student_ids})
    
    def export_csv(self, params: Optional[Dict[str, Any]] = None) -> None:
        """Export students to CSV"""
        from datetime import datetime
        filename = f"students_{datetime.now().strftime('%Y-%m-%d')}.csv"
        self.client.download_file('/students/export/csv', filename)
        print(f"Students exported to {filename}")
    
    def import_csv(self, file_path: str) -> Dict[str, Any]:
        """Import students from CSV"""
        return self.client.upload_file('/students/import/csv', file_path)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get student statistics"""
        return self.client.get('/students/statistics')
    
    def get_academic_history(self, student_id: str) -> Dict[str, Any]:
        """Get student's academic history"""
        return self.client.get(f'/students/{student_id}/academic-history')
    
    def get_emergency_contacts(self, student_id: str) -> Dict[str, Any]:
        """Get student's emergency contacts"""
        return self.client.get(f'/students/{student_id}/emergency-contacts')
    
    def update_emergency_contacts(self, student_id: str, contacts: Dict[str, Any]) -> Student:
        """Update student's emergency contacts"""
        data = self.client.put(f'/students/{student_id}/emergency-contacts', json=contacts)
        return Student(**data)
    
    def get_medical_info(self, student_id: str) -> Dict[str, Any]:
        """Get student's medical information"""
        return self.client.get(f'/students/{student_id}/medical')
    
    def update_medical_info(self, student_id: str, medical_info: Dict[str, Any]) -> Student:
        """Update student's medical information"""
        data = self.client.put(f'/students/{student_id}/medical', json=medical_info)
        return Student(**data)
    
    def upload_document(self, student_id: str, file_path: str, document_type: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Upload student document"""
        additional_data = {
            'documentType': document_type,
            'description': description
        }
        return self.client.upload_file(f'/students/{student_id}/documents', file_path, additional_data)
    
    def get_documents(self, student_id: str) -> List[Dict[str, Any]]:
        """Get student documents"""
        return self.client.get(f'/students/{student_id}/documents')
    
    def delete_document(self, student_id: str, document_id: str) -> None:
        """Delete student document"""
        self.client.delete(f'/students/{student_id}/documents/{document_id}')
    
    def upload_profile_picture(self, student_id: str, file_path: str) -> Dict[str, Any]:
        """Upload student profile picture"""
        return self.client.upload_file(f'/students/{student_id}/profile-picture', file_path)
    
    def get_family_members(self, student_id: str) -> List[Dict[str, Any]]:
        """Get student's family members (parents/guardians)"""
        return self.client.get(f'/students/{student_id}/family')
    
    def add_family_member(self, student_id: str, family_member: Dict[str, Any]) -> Dict[str, Any]:
        """Add family member to student"""
        return self.client.post(f'/students/{student_id}/family', json=family_member)
    
    def remove_family_member(self, student_id: str, family_member_id: str) -> None:
        """Remove family member from student"""
        self.client.delete(f'/students/{student_id}/family/{family_member_id}')
