#!/usr/bin/env python3

"""
Frontend Simulator - Python Client

This script simulates real frontend behavior by performing complete user workflows
that a web application would perform when interacting with the K-12 SIS API.

Features:
- Complete authentication flow with token refresh
- Realistic user session management
- Multi-tenant switching simulation
- Student management workflows
- Error handling and retry logic
- Performance monitoring
- Realistic delays and user behavior patterns
"""

import asyncio
import aiohttp
import json
import time
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class SessionData:
    """Session data container"""
    is_authenticated: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[Dict] = None
    tenant: Optional[Dict] = None
    last_activity: Optional[datetime] = None
    requests_count: int = 0
    errors_count: int = 0

class FrontendSimulator:
    """Frontend behavior simulator for K-12 SIS API"""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = {
            'base_url': 'http://localhost:3000/api',
            'tenant_slug': 'springfield',
            'email': 'admin@springfield.edu',
            'password': 'secure-password',
            'user_agent': 'FrontendSimulator-Python/1.0.0',
            'request_timeout': 10,
            'max_retries': 3,
            'retry_delay': 1.0,
            **(config or {})
        }
        
        self.session = SessionData()
        self.session_id = f"sim_{int(time.time())}"
        
        # Statistics
        self.stats = {
            'start_time': datetime.now(),
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_response_time': 0,
            'workflows_completed': 0
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session_obj = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config['request_timeout']),
            headers={
                'User-Agent': self.config['user_agent'],
                'Content-Type': 'application/json'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if hasattr(self, 'session_obj'):
            await self.session_obj.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                           retry_count: int = 0) -> Dict:
        """Make HTTP request with retry logic"""
        url = f"{self.config['base_url']}{endpoint}"
        headers = {}
        
        if self.session.access_token:
            headers['Authorization'] = f'Bearer {self.session.access_token}'
        
        if self.config['tenant_slug']:
            headers['X-Tenant-Slug'] = self.config['tenant_slug']
        
        start_time = time.time()
        
        try:
            async with self.session_obj.request(
                method, url, json=data, headers=headers
            ) as response:
                response_time = time.time() - start_time
                self.stats['total_response_time'] += response_time
                
                response_data = await response.json()
                
                if response.status == 401 and self.session.refresh_token and retry_count < self.config['max_retries']:
                    logger.info("🔄 Token expired, attempting refresh...")
                    try:
                        await self._refresh_token()
                        return await self._make_request(method, endpoint, data, retry_count + 1)
                    except Exception as e:
                        logger.warning(f"Token refresh failed: {e}, re-authenticating...")
                        await self._authenticate()
                        return await self._make_request(method, endpoint, data, retry_count + 1)
                
                self.stats['total_requests'] += 1
                self.session.requests_count += 1
                self.session.last_activity = datetime.now()
                
                if response.status < 400:
                    self.stats['successful_requests'] += 1
                else:
                    self.stats['failed_requests'] += 1
                    self.session.errors_count += 1
                
                return {
                    'status': response.status,
                    'data': response_data,
                    'response_time': response_time
                }
        
        except Exception as e:
            self.stats['failed_requests'] += 1
            self.session.errors_count += 1
            logger.error(f"Request failed: {e}")
            raise
    
    async def _authenticate(self) -> bool:
        """Authenticate user and establish session"""
        logger.info("🔐 Authenticating user...")
        
        try:
            response = await self._make_request('POST', '/auth/login', {
                'email': self.config['email'],
                'password': self.config['password'],
                'tenantSlug': self.config['tenant_slug']
            })
            
            if response['data'].get('success'):
                data = response['data']['data']
                self.session.is_authenticated = True
                self.session.access_token = data['accessToken']
                self.session.refresh_token = data['refreshToken']
                self.session.user = data['user']
                self.session.tenant = data['tenant']
                self.session.last_activity = datetime.now()
                
                logger.info(f"✅ Authenticated as {self.session.user['email']}")
                logger.info(f"🏫 Tenant: {self.session.tenant['schoolName']}")
                return True
            else:
                raise Exception(f"Authentication failed: {response['data'].get('message', 'Unknown error')}")
        
        except Exception as e:
            logger.error(f"❌ Authentication failed: {e}")
            raise
    
    async def _refresh_token(self) -> bool:
        """Refresh access token"""
        if not self.session.refresh_token:
            raise Exception("No refresh token available")
        
        response = await self._make_request('POST', '/auth/refresh', {
            'refreshToken': self.session.refresh_token
        })
        
        if response['data'].get('success'):
            data = response['data']['data']
            self.session.access_token = data['accessToken']
            self.session.refresh_token = data['refreshToken']
            logger.info("✅ Token refreshed successfully")
            return True
        else:
            raise Exception("Token refresh failed")
    
    async def get_current_user(self) -> Dict:
        """Get current user information"""
        logger.info("👤 Getting current user info...")
        
        response = await self._make_request('GET', '/auth/me')
        
        if response['data'].get('success'):
            data = response['data']['data']
            self.session.user = data['user']
            self.session.tenant = data['tenant']
            logger.info(f"👤 User: {self.session.user['firstName']} {self.session.user['lastName']}")
            logger.info(f"🎭 Role: {self.session.user['role']}")
            return data
        else:
            raise Exception("Failed to get user info")
    
    async def load_student_dashboard(self) -> Dict:
        """Simulate student dashboard loading"""
        logger.info("📊 Loading student dashboard...")
        
        start_time = time.time()
        
        try:
            # Load students with pagination
            students_response = await self._make_request('GET', '/students?page=1&limit=20&sort=last_name:asc')
            
            # Load student statistics
            stats_response = await self._make_request('GET', '/students/statistics')
            
            load_time = time.time() - start_time
            
            students_data = students_response['data'].get('data', [])
            stats_data = stats_response['data'].get('data', {})
            
            logger.info(f"✅ Dashboard loaded in {load_time:.2f}s")
            logger.info(f"📈 Found {len(students_data)} students")
            logger.info(f"📊 Total students: {stats_data.get('total', 'N/A')}")
            
            return {
                'students': students_data,
                'statistics': stats_data,
                'load_time': load_time
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to load dashboard: {e}")
            raise
    
    async def search_students(self, search_term: str, filters: Optional[Dict] = None) -> Dict:
        """Simulate student search workflow"""
        logger.info(f"🔍 Searching students for: \"{search_term}\"")
        
        start_time = time.time()
        
        try:
            url = f"/students?search={search_term}"
            
            if filters:
                if filters.get('gradeLevel'):
                    url += f"&gradeLevel={filters['gradeLevel']}"
                if filters.get('status'):
                    url += f"&status={filters['status']}"
                if filters.get('limit'):
                    url += f"&limit={filters['limit']}"
            
            response = await self._make_request('GET', url)
            search_time = time.time() - start_time
            
            results = response['data'].get('data', [])
            pagination = response['data'].get('meta', {}).get('pagination', {})
            
            logger.info(f"✅ Search completed in {search_time:.2f}s")
            logger.info(f"🎯 Found {len(results)} matching students")
            
            return {
                'results': results,
                'search_time': search_time,
                'total_results': pagination.get('total', len(results))
            }
        
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            raise
    
    async def create_student(self, student_data: Dict) -> Dict:
        """Simulate student creation workflow"""
        logger.info(f"➕ Creating new student: {student_data['firstName']} {student_data['lastName']}")
        
        start_time = time.time()
        
        try:
            response = await self._make_request('POST', '/students', student_data)
            create_time = time.time() - start_time
            
            if response['data'].get('success'):
                student = response['data']['data']
                logger.info(f"✅ Student created in {create_time:.2f}s")
                logger.info(f"🆔 Student ID: {student['id']}")
                logger.info(f"🎓 Student ID: {student['student_id']}")
                
                return {
                    'student': student,
                    'create_time': create_time
                }
            else:
                raise Exception("Student creation failed")
        
        except Exception as e:
            logger.error(f"❌ Student creation failed: {e}")
            if 'details' in response.get('data', {}):
                logger.error(f"📝 Validation errors: {response['data']['details']}")
            raise
    
    async def update_student(self, student_id: str, update_data: Dict) -> Dict:
        """Simulate student update workflow"""
        logger.info(f"✏️ Updating student: {student_id}")
        
        start_time = time.time()
        
        try:
            # First get the current student data
            get_response = await self._make_request('GET', f'/students/{student_id}')
            current_student = get_response['data']['data']
            
            # Then update with new data
            update_response = await self._make_request('PUT', f'/students/{student_id}', update_data)
            update_time = time.time() - start_time
            
            if update_response['data'].get('success'):
                student = update_response['data']['data']
                logger.info(f"✅ Student updated in {update_time:.2f}s")
                logger.info(f"📝 Updated fields: {', '.join(update_data.keys())}")
                
                return {
                    'student': student,
                    'update_time': update_time,
                    'changes': update_data
                }
            else:
                raise Exception("Student update failed")
        
        except Exception as e:
            logger.error(f"❌ Student update failed: {e}")
            raise
    
    async def bulk_create_students(self, students_data: List[Dict]) -> Dict:
        """Simulate bulk operations workflow"""
        logger.info(f"📦 Bulk creating {len(students_data)} students...")
        
        start_time = time.time()
        
        try:
            response = await self._make_request('POST', '/students/bulk', {
                'students': students_data
            })
            
            bulk_time = time.time() - start_time
            
            if response['data'].get('success'):
                result_data = response['data']['data']
                created = result_data.get('created', [])
                errors = result_data.get('errors', [])
                
                logger.info(f"✅ Bulk operation completed in {bulk_time:.2f}s")
                logger.info(f"✅ Created: {len(created)} students")
                logger.info(f"❌ Errors: {len(errors)} failures")
                
                if errors:
                    logger.info("📝 Error details:")
                    for i, error in enumerate(errors, 1):
                        logger.info(f"  {i}. {error.get('error', 'Unknown error')}")
                
                return {
                    'created': created,
                    'errors': errors,
                    'bulk_time': bulk_time,
                    'success_rate': len(created) / len(students_data)
                }
            else:
                raise Exception("Bulk operation failed")
        
        except Exception as e:
            logger.error(f"❌ Bulk creation failed: {e}")
            raise
    
    async def upload_student_document(self, student_id: str, document_path: str, 
                                    document_type: str) -> Dict:
        """Simulate file upload workflow"""
        logger.info(f"📎 Uploading document for student: {student_id}")
        
        try:
            # Create sample document if it doesn't exist
            if not Path(document_path).exists():
                await self._create_sample_document(document_path)
            
            # Prepare multipart form data
            data = aiohttp.FormData()
            data.add_field('file', open(document_path, 'rb'), filename='sample-document.txt')
            data.add_field('documentType', document_type)
            data.add_field('description', f'Sample {document_type} document')
            
            # Make upload request
            url = f"{self.config['base_url']}/students/{student_id}/documents"
            headers = {}
            
            if self.session.access_token:
                headers['Authorization'] = f'Bearer {self.session.access_token}'
            
            async with self.session_obj.post(url, data=data, headers=headers) as response:
                response_data = await response.json()
                
                if response.status == 200 and response_data.get('success'):
                    document = response_data['data']
                    logger.info("✅ Document uploaded successfully")
                    logger.info(f"📁 File: {document['filename']}")
                    logger.info(f"🔗 URL: {document['url']}")
                    
                    return document
                else:
                    raise Exception("Document upload failed")
        
        except Exception as e:
            logger.error(f"❌ Document upload failed: {e}")
            raise
    
    async def _create_sample_document(self, file_path: str):
        """Create a sample document for testing"""
        content = f"""Sample Document
This is a test document created by the Frontend Simulator.
Generated at: {datetime.now().isoformat()}
Student ID: TEST-STUDENT
Document Type: Test Document
"""
        Path(file_path).write_text(content)
    
    async def simulate_user_session(self, duration: int = 300) -> None:
        """Simulate realistic user session with delays"""
        logger.info(f"🎭 Starting user session simulation ({duration}s)...")
        
        start_time = time.time()
        end_time = start_time + duration
        
        actions = [
            self.load_student_dashboard,
            lambda: self.search_students('test'),
            self.get_current_user,
            self.load_student_dashboard  # More likely action
        ]
        
        while time.time() < end_time:
            try:
                # Randomly choose an action
                action = random.choice(actions)
                await action()
                
                # Simulate realistic delay between actions (1-5 seconds)
                delay = random.uniform(1, 5)
                await asyncio.sleep(delay)
                
            except Exception as e:
                logger.error(f"❌ Action failed during session simulation: {e}")
                await asyncio.sleep(2)  # Wait before retry
        
        session_time = time.time() - start_time
        logger.info(f"✅ Session simulation completed ({session_time:.2f}s)")
        logger.info(f"📊 Session stats:")
        logger.info(f"  - Requests made: {self.session.requests_count}")
        logger.info(f"  - Errors encountered: {self.session.errors_count}")
        
        if self.session.requests_count > 0:
            success_rate = ((self.session.requests_count - self.session.errors_count) / 
                          self.session.requests_count * 100)
            logger.info(f"  - Success rate: {success_rate:.1f}%")
    
    async def logout(self) -> None:
        """Simulate logout workflow"""
        logger.info("👋 Logging out...")
        
        try:
            await self._make_request('POST', '/auth/logout', {
                'refreshToken': self.session.refresh_token
            })
            
            # Clear session data
            self.session.is_authenticated = False
            self.session.access_token = None
            self.session.refresh_token = None
            self.session.user = None
            self.session.tenant = None
            self.session.last_activity = None
            
            logger.info("✅ Logged out successfully")
        
        except Exception as e:
            logger.warning(f"⚠️ Logout request failed: {e}, but clearing local session")
            self.session.is_authenticated = False
    
    def generate_session_report(self) -> Dict:
        """Generate session report"""
        end_time = datetime.now()
        session_duration = (end_time - self.stats['start_time']).total_seconds()
        
        report = {
            'timestamp': end_time.isoformat(),
            'session_id': self.session_id,
            'config': {
                'base_url': self.config['base_url'],
                'tenant_slug': self.config['tenant_slug'],
                'email': self.config['email']
            },
            'session': {
                'is_authenticated': self.session.is_authenticated,
                'user': self.session.user['email'] if self.session.user else 'Not authenticated',
                'tenant': self.session.tenant['schoolName'] if self.session.tenant else 'No tenant',
                'requests_count': self.session.requests_count,
                'errors_count': self.session.errors_count,
                'success_rate': f"{(self.session.requests_count - self.session.errors_count) / max(self.session.requests_count, 1) * 100:.1f}%" if self.session.requests_count > 0 else 'N/A',
                'last_activity': self.session.last_activity.isoformat() if self.session.last_activity else None
            },
            'statistics': {
                'session_duration': session_duration,
                'total_requests': self.stats['total_requests'],
                'successful_requests': self.stats['successful_requests'],
                'failed_requests': self.stats['failed_requests'],
                'average_response_time': self.stats['total_response_time'] / max(self.stats['total_requests'], 1),
                'workflows_completed': self.stats['workflows_completed']
            }
        }
        
        return report

async def main():
    """Main execution function"""
    print("🚀 Frontend Simulator - K-12 SIS API (Python)")
    print("=============================================\n")
    
    config = {
        'base_url': 'http://localhost:3000/api',
        'tenant_slug': 'springfield',
        'email': 'admin@springfield.edu',
        'password': 'secure-password'
    }
    
    async with FrontendSimulator(config) as simulator:
        try:
            # Authenticate
            await simulator._authenticate()
            
            # Get current user
            await simulator.get_current_user()
            
            # Load dashboard
            dashboard = await simulator.load_student_dashboard()
            
            # Search for students
            search_results = await simulator.search_students('test', {'gradeLevel': '10', 'limit': 5})
            
            # Create a new student
            student_data = {
                'studentId': f'SIM{int(time.time())}',
                'firstName': 'Simulator',
                'lastName': 'Test',
                'dateOfBirth': '2008-01-01',
                'gradeLevel': '10',
                'enrollmentDate': datetime.now().strftime('%Y-%m-%d'),
                'primaryEmail': f'simulator.{int(time.time())}@example.com'
            }
            
            new_student = await simulator.create_student(student_data)
            
            # Update the student
            await simulator.update_student(new_student['student']['id'], {
                'preferredName': 'Sim',
                'primaryPhone': '555-123-4567'
            })
            
            # Bulk create students
            bulk_students = [
                {
                    'studentId': f'BULK{int(time.time())}-{i}',
                    'firstName': f'Bulk{i}',
                    'lastName': 'Student',
                    'dateOfBirth': '2008-01-01',
                    'gradeLevel': '10',
                    'enrollmentDate': datetime.now().strftime('%Y-%m-%d')
                }
                for i in range(3)
            ]
            
            await simulator.bulk_create_students(bulk_students)
            
            # Upload a document
            document_path = '/tmp/sample-document.txt'
            await simulator.upload_student_document(new_student['student']['id'], document_path, 'transcript')
            
            # Simulate user session
            await simulator.simulate_user_session(30)  # 30 seconds
            
            # Generate and save report
            report = simulator.generate_session_report()
            
            # Save report to file
            report_path = '/tmp/frontend-simulator-python-report.json'
            Path(report_path).write_text(json.dumps(report, indent=2))
            
            print('\n📊 Session Report:')
            print(json.dumps(report, indent=2))
            
            # Logout
            await simulator.logout()
            
            print('\n🎉 Frontend simulation completed successfully!')
            print(f'📄 Report saved to: {report_path}')
            
        except Exception as e:
            logger.error(f'\n❌ Frontend simulation failed: {e}')
            raise

if __name__ == '__main__':
    asyncio.run(main())
