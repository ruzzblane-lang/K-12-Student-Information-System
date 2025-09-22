#!/usr/bin/env python3
"""
Basic usage example for Python SDK
"""

import asyncio
from school_sis_sdk import SISClient, SISError

def main():
    """Main function demonstrating basic SDK usage"""
    
    # Initialize the client
    client = SISClient({
        'base_url': 'https://api.schoolsis.com',
        'tenant_slug': 'springfield-high'
    })

    try:
        # 1. Login to get authentication token
        print('Logging in...')
        auth = client.login('admin@springfield.edu', 'secure-password')
        print(f'Login successful: {auth.message}')

        # 2. Get list of students
        print('\nFetching students...')
        students_data = client.students.list({
            'page': 1,
            'limit': 10,
            'sort': 'last_name:asc'
        })

        students = students_data['students']
        pagination = students_data['pagination']
        
        print(f'Found {pagination["total"]} students')
        for student in students:
            print(f'- {student["first_name"]} {student["last_name"]} (Grade {student["grade_level"]})')

        # 3. Search for students
        print('\nSearching for students with "John"...')
        search_results = client.students.search('John')
        print(f'Found {len(search_results["students"])} students matching "John"')

        # 4. Get students by grade level
        print('\nFetching 10th grade students...')
        grade_10_students = client.students.get_by_grade_level('10')
        print(f'Found {len(grade_10_students["students"])} 10th grade students')

        # 5. Create a new student
        print('\nCreating new student...')
        new_student_data = {
            'student_id': 'SHS-2024-001',
            'first_name': 'Alice',
            'last_name': 'Johnson',
            'date_of_birth': '2008-05-15',
            'grade_level': '10',
            'enrollment_date': '2024-08-15',
            'primary_email': 'alice.johnson@student.springfield-high.edu',
            'address': '123 Main Street',
            'city': 'Springfield',
            'state': 'IL',
            'postal_code': '62701',
            'country': 'USA'
        }
        
        new_student = client.students.create(new_student_data)
        print(f'Student created: {new_student.id}')

        # 6. Update the student
        print('\nUpdating student...')
        update_data = {
            'preferred_name': 'Ali',
            'primary_phone': '555-123-4567'
        }
        
        updated_student = client.students.update(new_student.id, update_data)
        print(f'Student updated: {updated_student.preferred_name}')

        # 7. Get student statistics
        print('\nFetching student statistics...')
        stats = client.students.get_statistics()
        print('Student Statistics:')
        print(f'  Total: {stats["total"]}')
        print(f'  By Grade Level: {stats["by_grade_level"]}')
        print(f'  By Status: {stats["by_status"]}')

        # 8. Bulk operations
        print('\nPerforming bulk operations...')
        
        # Bulk create students
        bulk_students = [
            {
                'student_id': 'SHS-2024-002',
                'first_name': 'Bob',
                'last_name': 'Smith',
                'date_of_birth': '2007-06-20',
                'grade_level': '11',
                'enrollment_date': '2024-08-15'
            },
            {
                'student_id': 'SHS-2024-003',
                'first_name': 'Carol',
                'last_name': 'Williams',
                'date_of_birth': '2008-11-10',
                'grade_level': '10',
                'enrollment_date': '2024-08-15'
            }
        ]
        
        bulk_result = client.students.bulk_create(bulk_students)
        print(f'Bulk created {len(bulk_result["students"])} students')
        if bulk_result['errors']:
            print(f'Errors: {bulk_result["errors"]}')

        # 9. File operations
        print('\nFile operations...')
        
        # Export students to CSV
        print('Exporting students to CSV...')
        client.students.export_csv()
        print('CSV export completed')

        # Upload a document (example)
        # client.students.upload_document(
        #     new_student.id,
        #     'path/to/document.pdf',
        #     'transcript',
        #     'Student transcript'
        # )

        # 10. Get student details with related data
        print('\nGetting detailed student information...')
        
        # Get academic history
        academic_history = client.students.get_academic_history(new_student.id)
        print(f'Academic history retrieved for {new_student.first_name}')
        
        # Get emergency contacts
        emergency_contacts = client.students.get_emergency_contacts(new_student.id)
        print('Emergency contacts:', emergency_contacts)
        
        # Get medical information
        medical_info = client.students.get_medical_info(new_student.id)
        print('Medical information retrieved')

        # Get family members
        family_members = client.students.get_family_members(new_student.id)
        print(f'Family members: {len(family_members)}')

    except SISError as e:
        print(f'SIS Error: {e.message}')
        print(f'Error code: {e.code}')
        if e.status:
            print(f'HTTP status: {e.status}')
        if e.details:
            print(f'Details: {e.details}')
    except Exception as e:
        print(f'Unexpected error: {e}')
    finally:
        # 11. Logout
        print('\nLogging out...')
        client.logout()
        print('Logged out successfully')

def demonstrate_advanced_features():
    """Demonstrate advanced SDK features"""
    
    client = SISClient({
        'base_url': 'https://api.schoolsis.com',
        'tenant_slug': 'springfield-high',
        'timeout': 60,
        'retries': 5
    })

    try:
        # Login
        client.login('admin@springfield.edu', 'secure-password')

        # Advanced filtering
        print('\nAdvanced filtering examples:')
        
        # Filter by multiple criteria
        filtered_students = client.students.list({
            'grade_level': '10',
            'status': 'active',
            'academic_program': 'AP',
            'sort': 'gpa:desc',
            'limit': 5
        })
        
        print(f'Found {len(filtered_students["students"])} AP students in grade 10')

        # Pagination
        print('\nPagination example:')
        page = 1
        while True:
            students_page = client.students.list({'page': page, 'limit': 5})
            print(f'Page {page}: {len(students_page["students"])} students')
            
            if not students_page['pagination']['has_next']:
                break
            page += 1

        # Error handling with retries
        print('\nError handling demonstration:')
        try:
            # This will likely fail if student doesn't exist
            non_existent_student = client.students.get('non-existent-id')
        except SISError as e:
            print(f'Expected error caught: {e.message} ({e.code})')

        # Configuration updates
        print('\nConfiguration updates:')
        client.update_config(timeout=120, headers={'Custom-Header': 'value'})
        print('Configuration updated')

    except SISError as e:
        print(f'Error in advanced features demo: {e.message}')
    finally:
        client.logout()

if __name__ == '__main__':
    print('=== Basic Usage Demo ===')
    main()
    
    print('\n=== Advanced Features Demo ===')
    demonstrate_advanced_features()
    
    print('\nDemo completed!')
