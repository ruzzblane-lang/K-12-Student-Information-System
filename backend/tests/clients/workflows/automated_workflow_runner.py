#!/usr/bin/env python3

"""
Automated Workflow Runner

This script runs predefined workflows that simulate complete user journeys
in the K-12 Student Information System. It's designed to test end-to-end
functionality and user experience scenarios.
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
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class WorkflowStep:
    """Individual step in a workflow"""
    name: str
    action: str
    endpoint: str
    method: str = 'GET'
    data: Optional[Dict] = None
    expected_status: int = 200
    validation_rules: Optional[Dict] = None
    delay_before: float = 0.0
    delay_after: float = 0.0

@dataclass
class Workflow:
    """Complete workflow definition"""
    id: str
    name: str
    description: str
    steps: List[WorkflowStep]
    prerequisites: Optional[List[str]] = None
    expected_duration: Optional[float] = None

class WorkflowRunner:
    """Runs predefined workflows against the API"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        # Authentication state
        self.is_authenticated = False
        self.access_token = None
        self.refresh_token = None
        self.user_data = None
        self.tenant_data = None
        
        # Workflow state
        self.workflow_results = []
        self.created_resources = {}  # Track created resources for cleanup
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.session.close()
    
    async def authenticate(self) -> bool:
        """Authenticate with the API"""
        logger.info("🔐 Authenticating...")
        
        try:
            async with self.session.post(
                f"{self.config['base_url']}/auth/login",
                json={
                    'email': self.config['email'],
                    'password': self.config['password'],
                    'tenantSlug': self.config['tenant_slug']
                }
            ) as response:
                data = await response.json()
                
                if response.status == 200 and data.get('success'):
                    auth_data = data['data']
                    self.is_authenticated = True
                    self.access_token = auth_data['accessToken']
                    self.refresh_token = auth_data['refreshToken']
                    self.user_data = auth_data['user']
                    self.tenant_data = auth_data['tenant']
                    
                    logger.info(f"✅ Authenticated as {self.user_data['email']}")
                    return True
                else:
                    logger.error(f"❌ Authentication failed: {data.get('message', 'Unknown error')}")
                    return False
        
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            return False
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make authenticated API request"""
        url = f"{self.config['base_url']}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.access_token}'
        }
        
        try:
            async with self.session.request(method, url, json=data, headers=headers) as response:
                response_data = await response.json()
                return {
                    'status': response.status,
                    'data': response_data,
                    'success': response.status < 400 and response_data.get('success', True)
                }
        
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {
                'status': 0,
                'data': {'error': str(e)},
                'success': False
            }
    
    async def execute_step(self, step: WorkflowStep) -> Dict:
        """Execute a single workflow step"""
        logger.info(f"🔄 Executing step: {step.name}")
        
        # Apply delay before step
        if step.delay_before > 0:
            await asyncio.sleep(step.delay_before)
        
        # Execute the request
        start_time = time.time()
        response = await self._make_request(step.method, step.endpoint, step.data)
        execution_time = time.time() - start_time
        
        # Validate response
        validation_result = self._validate_step_response(step, response)
        
        # Apply delay after step
        if step.delay_after > 0:
            await asyncio.sleep(step.delay_after)
        
        step_result = {
            'step_name': step.name,
            'action': step.action,
            'endpoint': step.endpoint,
            'method': step.method,
            'execution_time': execution_time,
            'response': response,
            'validation': validation_result,
            'timestamp': datetime.now().isoformat()
        }
        
        # Track created resources
        if step.action == 'create' and response['success']:
            resource_type = step.endpoint.split('/')[-1]
            resource_id = response['data'].get('data', {}).get('id')
            if resource_id:
                if resource_type not in self.created_resources:
                    self.created_resources[resource_type] = []
                self.created_resources[resource_type].append(resource_id)
        
        if validation_result['passed']:
            logger.info(f"✅ Step completed successfully ({execution_time:.2f}s)")
        else:
            logger.error(f"❌ Step failed: {validation_result['errors']}")
        
        return step_result
    
    def _validate_step_response(self, step: WorkflowStep, response: Dict) -> Dict:
        """Validate step response against expected criteria"""
        validation_result = {
            'passed': True,
            'errors': []
        }
        
        # Check status code
        if response['status'] != step.expected_status:
            validation_result['passed'] = False
            validation_result['errors'].append(
                f"Expected status {step.expected_status}, got {response['status']}"
            )
        
        # Check API success
        if not response['success']:
            validation_result['passed'] = False
            validation_result['errors'].append("API returned success=false")
        
        # Apply custom validation rules
        if step.validation_rules and response['success']:
            data = response['data'].get('data', {})
            
            for field, expected_value in step.validation_rules.items():
                actual_value = data.get(field)
                
                if field.endswith('_exists'):
                    # Check if field exists and is not None/empty
                    base_field = field[:-7]  # Remove '_exists' suffix
                    if not data.get(base_field):
                        validation_result['passed'] = False
                        validation_result['errors'].append(f"Field '{base_field}' should exist")
                
                elif field.endswith('_type'):
                    # Check field type
                    base_field = field[:-5]  # Remove '_type' suffix
                    actual_value = data.get(base_field)
                    expected_type = expected_value
                    
                    if not isinstance(actual_value, expected_type):
                        validation_result['passed'] = False
                        validation_result['errors'].append(
                            f"Field '{base_field}' should be {expected_type.__name__}, got {type(actual_value).__name__}"
                        )
                
                else:
                    # Direct value comparison
                    if actual_value != expected_value:
                        validation_result['passed'] = False
                        validation_result['errors'].append(
                            f"Field '{field}' expected '{expected_value}', got '{actual_value}'"
                        )
        
        return validation_result
    
    async def execute_workflow(self, workflow: Workflow) -> Dict:
        """Execute a complete workflow"""
        logger.info(f"🎭 Starting workflow: {workflow.name}")
        logger.info(f"📝 Description: {workflow.description}")
        
        workflow_result = {
            'workflow_id': workflow.id,
            'workflow_name': workflow.name,
            'start_time': datetime.now().isoformat(),
            'steps': [],
            'success': True,
            'total_duration': 0,
            'errors': []
        }
        
        start_time = time.time()
        
        try:
            # Execute each step
            for step in workflow.steps:
                step_result = await self.execute_step(step)
                workflow_result['steps'].append(step_result)
                
                # If step failed and it's critical, stop workflow
                if not step_result['validation']['passed']:
                    workflow_result['success'] = False
                    workflow_result['errors'].extend(step_result['validation']['errors'])
                    
                    # Check if this is a critical failure
                    if step.action in ['authenticate', 'create']:
                        logger.error(f"❌ Critical step failed, stopping workflow")
                        break
            
            workflow_result['total_duration'] = time.time() - start_time
            
            if workflow_result['success']:
                logger.info(f"✅ Workflow completed successfully ({workflow_result['total_duration']:.2f}s)")
            else:
                logger.error(f"❌ Workflow completed with errors")
            
        except Exception as e:
            workflow_result['success'] = False
            workflow_result['errors'].append(f"Workflow execution error: {str(e)}")
            workflow_result['total_duration'] = time.time() - start_time
            logger.error(f"❌ Workflow execution failed: {e}")
        
        workflow_result['end_time'] = datetime.now().isoformat()
        self.workflow_results.append(workflow_result)
        
        return workflow_result
    
    async def cleanup_created_resources(self) -> None:
        """Clean up resources created during workflow execution"""
        logger.info("🧹 Cleaning up created resources...")
        
        cleanup_count = 0
        
        # Delete students (most common resource)
        if 'students' in self.created_resources:
            for student_id in self.created_resources['students']:
                try:
                    response = await self._make_request('DELETE', f'/students/{student_id}')
                    if response['success']:
                        cleanup_count += 1
                except Exception as e:
                    logger.warning(f"Failed to cleanup student {student_id}: {e}")
        
        # Add cleanup for other resource types as needed
        
        logger.info(f"✅ Cleaned up {cleanup_count} resources")

def load_workflows_from_yaml(yaml_path: str) -> List[Workflow]:
    """Load workflow definitions from YAML file"""
    with open(yaml_path, 'r') as f:
        workflows_data = yaml.safe_load(f)
    
    workflows = []
    
    for workflow_data in workflows_data.get('workflows', []):
        steps = []
        
        for step_data in workflow_data.get('steps', []):
            step = WorkflowStep(
                name=step_data['name'],
                action=step_data['action'],
                endpoint=step_data['endpoint'],
                method=step_data.get('method', 'GET'),
                data=step_data.get('data'),
                expected_status=step_data.get('expected_status', 200),
                validation_rules=step_data.get('validation_rules'),
                delay_before=step_data.get('delay_before', 0.0),
                delay_after=step_data.get('delay_after', 0.0)
            )
            steps.append(step)
        
        workflow = Workflow(
            id=workflow_data['id'],
            name=workflow_data['name'],
            description=workflow_data['description'],
            steps=steps,
            prerequisites=workflow_data.get('prerequisites'),
            expected_duration=workflow_data.get('expected_duration')
        )
        
        workflows.append(workflow)
    
    return workflows

async def main():
    """Main execution function"""
    print("🎭 Automated Workflow Runner - K-12 SIS API")
    print("===========================================\n")
    
    # Configuration
    config = {
        'base_url': 'http://localhost:3000/api',
        'tenant_slug': 'springfield',
        'email': 'admin@springfield.edu',
        'password': 'secure-password'
    }
    
    # Define sample workflows
    workflows = [
        # Workflow 1: Student Enrollment Process
        Workflow(
            id='student_enrollment',
            name='Student Enrollment Process',
            description='Complete process of enrolling a new student',
            steps=[
                WorkflowStep(
                    name='Get Dashboard',
                    action='load_dashboard',
                    endpoint='/students?page=1&limit=10',
                    method='GET',
                    expected_status=200
                ),
                WorkflowStep(
                    name='Create New Student',
                    action='create',
                    endpoint='/students',
                    method='POST',
                    data={
                        'studentId': f'ENROLL-{int(time.time())}',
                        'firstName': 'Workflow',
                        'lastName': 'Test',
                        'dateOfBirth': '2008-01-01',
                        'gradeLevel': '10',
                        'enrollmentDate': datetime.now().strftime('%Y-%m-%d'),
                        'primaryEmail': f'workflow.{int(time.time())}@example.com'
                    },
                    expected_status=201,
                    validation_rules={'id_exists': True, 'student_id': f'ENROLL-{int(time.time())}'},
                    delay_after=1.0
                ),
                WorkflowStep(
                    name='Verify Student Created',
                    action='verify',
                    endpoint=f'/students/{{student_id}}',  # This would be replaced with actual ID
                    method='GET',
                    expected_status=200,
                    validation_rules={'firstName': 'Workflow', 'lastName': 'Test'}
                ),
                WorkflowStep(
                    name='Update Student Information',
                    action='update',
                    endpoint=f'/students/{{student_id}}',
                    method='PUT',
                    data={'preferredName': 'Workflow Test', 'primaryPhone': '555-123-4567'},
                    expected_status=200,
                    delay_after=0.5
                )
            ]
        ),
        
        # Workflow 2: Student Search and Filter
        Workflow(
            id='student_search_filter',
            name='Student Search and Filter',
            description='Search for students and apply various filters',
            steps=[
                WorkflowStep(
                    name='Search by Name',
                    action='search',
                    endpoint='/students?search=test&limit=5',
                    method='GET',
                    expected_status=200,
                    validation_rules={'data_type': list}
                ),
                WorkflowStep(
                    name='Filter by Grade Level',
                    action='filter',
                    endpoint='/students?gradeLevel=10&limit=10',
                    method='GET',
                    expected_status=200
                ),
                WorkflowStep(
                    name='Filter by Status',
                    action='filter',
                    endpoint='/students?status=active&limit=10',
                    method='GET',
                    expected_status=200
                ),
                WorkflowStep(
                    name='Combined Search and Filter',
                    action='search_filter',
                    endpoint='/students?search=test&gradeLevel=10&status=active&limit=5',
                    method='GET',
                    expected_status=200
                )
            ]
        ),
        
        # Workflow 3: Bulk Operations
        Workflow(
            id='bulk_operations',
            name='Bulk Student Operations',
            description='Test bulk student creation and management',
            steps=[
                WorkflowStep(
                    name='Prepare Bulk Data',
                    action='prepare',
                    endpoint='/students/statistics',
                    method='GET',
                    expected_status=200,
                    delay_before=1.0
                ),
                WorkflowStep(
                    name='Bulk Create Students',
                    action='bulk_create',
                    endpoint='/students/bulk',
                    method='POST',
                    data={
                        'students': [
                            {
                                'studentId': f'BULK-{int(time.time())}-{i}',
                                'firstName': f'Bulk{i}',
                                'lastName': 'Test',
                                'dateOfBirth': '2008-01-01',
                                'gradeLevel': '10',
                                'enrollmentDate': datetime.now().strftime('%Y-%m-%d')
                            }
                            for i in range(3)
                        ]
                    },
                    expected_status=201,
                    validation_rules={'created_type': list},
                    delay_after=2.0
                ),
                WorkflowStep(
                    name='Verify Bulk Creation',
                    action='verify_bulk',
                    endpoint='/students?search=Bulk&limit=10',
                    method='GET',
                    expected_status=200
                )
            ]
        )
    ]
    
    async with WorkflowRunner(config) as runner:
        try:
            # Authenticate
            if not await runner.authenticate():
                logger.error("❌ Authentication failed, cannot proceed")
                return
            
            # Execute workflows
            all_successful = True
            
            for workflow in workflows:
                result = await runner.execute_workflow(workflow)
                
                if not result['success']:
                    all_successful = False
                    logger.error(f"❌ Workflow '{workflow.name}' failed")
                    for error in result['errors']:
                        logger.error(f"   - {error}")
                
                # Add delay between workflows
                await asyncio.sleep(2)
            
            # Cleanup
            await runner.cleanup_created_resources()
            
            # Generate report
            report = {
                'timestamp': datetime.now().isoformat(),
                'config': config,
                'total_workflows': len(workflows),
                'successful_workflows': sum(1 for r in runner.workflow_results if r['success']),
                'failed_workflows': sum(1 for r in runner.workflow_results if not r['success']),
                'workflow_results': runner.workflow_results,
                'summary': {
                    'overall_success': all_successful,
                    'total_duration': sum(r['total_duration'] for r in runner.workflow_results),
                    'average_duration': sum(r['total_duration'] for r in runner.workflow_results) / len(workflows) if workflows else 0
                }
            }
            
            # Save report
            report_path = f'/tmp/workflow-runner-report-{int(time.time())}.json'
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            # Print summary
            print("\n📊 Workflow Execution Summary:")
            print("=" * 40)
            print(f"Total Workflows: {report['total_workflows']}")
            print(f"Successful: {report['successful_workflows']}")
            print(f"Failed: {report['failed_workflows']}")
            print(f"Success Rate: {(report['successful_workflows'] / report['total_workflows'] * 100):.1f}%")
            print(f"Total Duration: {report['summary']['total_duration']:.2f}s")
            print(f"Average Duration: {report['summary']['average_duration']:.2f}s")
            
            if all_successful:
                print("\n🎉 All workflows completed successfully!")
            else:
                print("\n⚠️ Some workflows failed. Check the report for details.")
            
            print(f"\n📄 Full report saved to: {report_path}")
            
        except Exception as e:
            logger.error(f"❌ Workflow execution failed: {e}")
            raise

if __name__ == '__main__':
    asyncio.run(main())
