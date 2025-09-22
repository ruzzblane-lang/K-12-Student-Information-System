#!/usr/bin/env python3

"""
Load Test Client - Python

This script performs comprehensive load testing of the K-12 SIS API by simulating
multiple concurrent users performing realistic frontend operations. It goes beyond
simple API testing to simulate actual user behavior patterns and system load.
"""

import asyncio
import aiohttp
import json
import time
import random
import statistics
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class LoadTestConfig:
    """Load test configuration"""
    base_url: str = 'http://localhost:3000/api'
    tenant_slug: str = 'springfield'
    email: str = 'admin@springfield.edu'
    password: str = 'secure-password'
    
    # Load test parameters
    concurrent_users: int = 10
    duration_seconds: int = 60
    ramp_up_seconds: int = 10
    
    # User behavior simulation
    think_time_min: float = 1.0
    think_time_max: float = 5.0
    
    # Request limits
    max_requests_per_user: int = 100
    request_timeout: int = 30
    
    # Test scenarios
    scenarios: List[str] = field(default_factory=lambda: [
        'dashboard_load',
        'student_search',
        'student_crud',
        'bulk_operations',
        'mixed_workflow'
    ])

@dataclass
class LoadTestResult:
    """Load test result container"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: List[float] = field(default_factory=list)
    error_counts: Dict[str, int] = field(default_factory=dict)
    scenario_results: Dict[str, Dict] = field(default_factory=dict)
    
    def add_response(self, response_time: float, success: bool, error_type: Optional[str] = None):
        """Add response to results"""
        self.total_requests += 1
        self.response_times.append(response_time)
        
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if error_type:
                self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1

class VirtualUser:
    """Simulates a virtual user with realistic behavior"""
    
    def __init__(self, user_id: int, config: LoadTestConfig):
        self.user_id = user_id
        self.config = config
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=config.request_timeout)
        )
        
        # User state
        self.is_authenticated = False
        self.access_token = None
        self.refresh_token = None
        self.user_data = None
        self.tenant_data = None
        
        # Statistics
        self.requests_made = 0
        self.errors_encountered = 0
        self.start_time = None
        self.end_time = None
        
        # User behavior
        self.think_time = random.uniform(config.think_time_min, config.think_time_max)
        self.preferred_scenarios = random.sample(config.scenarios, k=random.randint(2, len(config.scenarios)))
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.session.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Tuple[float, bool, Optional[str]]:
        """Make HTTP request and return (response_time, success, error_type)"""
        url = f"{self.config.base_url}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': f'LoadTestClient/1.0.0 (User-{self.user_id})'
        }
        
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        if self.config.tenant_slug:
            headers['X-Tenant-Slug'] = self.config.tenant_slug
        
        start_time = time.time()
        
        try:
            async with self.session.request(method, url, json=data, headers=headers) as response:
                response_time = time.time() - start_time
                
                if response.status == 401 and self.refresh_token:
                    # Try to refresh token
                    try:
                        await self._refresh_token()
                        # Retry original request
                        return await self._make_request(method, endpoint, data)
                    except:
                        # Refresh failed, re-authenticate
                        await self._authenticate()
                        return await self._make_request(method, endpoint, data)
                
                if response.status < 400:
                    return response_time, True, None
                else:
                    error_type = f'HTTP_{response.status}'
                    return response_time, False, error_type
        
        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            return response_time, False, 'TIMEOUT'
        except Exception as e:
            response_time = time.time() - start_time
            return response_time, False, 'NETWORK_ERROR'
    
    async def _authenticate(self) -> bool:
        """Authenticate user"""
        try:
            response_time, success, error_type = await self._make_request('POST', '/auth/login', {
                'email': self.config.email,
                'password': self.config.password,
                'tenantSlug': self.config.tenant_slug
            })
            
            if success:
                # Simulate getting token from response (in real scenario, would parse JSON)
                self.is_authenticated = True
                self.access_token = f'token_{self.user_id}_{int(time.time())}'
                self.refresh_token = f'refresh_{self.user_id}_{int(time.time())}'
                return True
            else:
                logger.error(f"User {self.user_id}: Authentication failed - {error_type}")
                return False
        
        except Exception as e:
            logger.error(f"User {self.user_id}: Authentication error - {e}")
            return False
    
    async def _refresh_token(self) -> bool:
        """Refresh access token"""
        try:
            response_time, success, error_type = await self._make_request('POST', '/auth/refresh', {
                'refreshToken': self.refresh_token
            })
            
            if success:
                self.access_token = f'token_{self.user_id}_{int(time.time())}'
                return True
            else:
                raise Exception(f"Token refresh failed: {error_type}")
        
        except Exception as e:
            logger.error(f"User {self.user_id}: Token refresh error - {e}")
            raise
    
    async def _think(self) -> None:
        """Simulate user thinking time"""
        think_time = random.uniform(self.config.think_time_min, self.config.think_time_max)
        await asyncio.sleep(think_time)
    
    async def scenario_dashboard_load(self) -> List[Tuple[float, bool, Optional[str]]]:
        """Simulate dashboard loading scenario"""
        results = []
        
        # Load students list
        response_time, success, error_type = await self._make_request('GET', '/students?page=1&limit=20')
        results.append((response_time, success, error_type))
        
        await self._think()
        
        # Load statistics
        response_time, success, error_type = await self._make_request('GET', '/students/statistics')
        results.append((response_time, success, error_type))
        
        return results
    
    async def scenario_student_search(self) -> List[Tuple[float, bool, Optional[str]]]:
        """Simulate student search scenario"""
        results = []
        
        search_terms = ['test', 'john', 'smith', 'student', 'grade']
        search_term = random.choice(search_terms)
        
        # Search students
        response_time, success, error_type = await self._make_request(
            'GET', f'/students?search={search_term}&limit=10'
        )
        results.append((response_time, success, error_type))
        
        await self._think()
        
        # Filter by grade level
        grade_level = random.choice(['9', '10', '11', '12'])
        response_time, success, error_type = await self._make_request(
            'GET', f'/students?gradeLevel={grade_level}&limit=15'
        )
        results.append((response_time, success, error_type))
        
        return results
    
    async def scenario_student_crud(self) -> List[Tuple[float, bool, Optional[str]]]:
        """Simulate student CRUD operations scenario"""
        results = []
        
        # Create student
        student_data = {
            'studentId': f'LOADTEST-{self.user_id}-{int(time.time())}',
            'firstName': f'LoadTest{self.user_id}',
            'lastName': 'User',
            'dateOfBirth': '2008-01-01',
            'gradeLevel': '10',
            'enrollmentDate': datetime.now().strftime('%Y-%m-%d'),
            'primaryEmail': f'loadtest{self.user_id}@{int(time.time())}.com'
        }
        
        response_time, success, error_type = await self._make_request('POST', '/students', student_data)
        results.append((response_time, success, error_type))
        
        if success:
            await self._think()
            
            # Get student (simulate clicking on created student)
            student_id = f'student-{self.user_id}-{int(time.time())}'
            response_time, success, error_type = await self._make_request('GET', f'/students/{student_id}')
            results.append((response_time, success, error_type))
            
            await self._think()
            
            # Update student
            update_data = {
                'preferredName': f'LT{self.user_id}',
                'primaryPhone': f'555-{self.user_id:03d}-0000'
            }
            response_time, success, error_type = await self._make_request('PUT', f'/students/{student_id}', update_data)
            results.append((response_time, success, error_type))
        
        return results
    
    async def scenario_bulk_operations(self) -> List[Tuple[float, bool, Optional[str]]]:
        """Simulate bulk operations scenario"""
        results = []
        
        # Create bulk students data
        bulk_students = [
            {
                'studentId': f'BULK-{self.user_id}-{i}',
                'firstName': f'Bulk{i}',
                'lastName': f'User{self.user_id}',
                'dateOfBirth': '2008-01-01',
                'gradeLevel': '10',
                'enrollmentDate': datetime.now().strftime('%Y-%m-%d')
            }
            for i in range(random.randint(2, 5))
        ]
        
        # Bulk create students
        response_time, success, error_type = await self._make_request('POST', '/students/bulk', {
            'students': bulk_students
        })
        results.append((response_time, success, error_type))
        
        return results
    
    async def scenario_mixed_workflow(self) -> List[Tuple[float, bool, Optional[str]]]:
        """Simulate mixed workflow scenario"""
        results = []
        
        # Random sequence of operations
        operations = [
            lambda: self._make_request('GET', '/students?page=1&limit=10'),
            lambda: self._make_request('GET', '/students/statistics'),
            lambda: self._make_request('GET', '/students?search=test&limit=5'),
            lambda: self._make_request('GET', '/auth/me')
        ]
        
        for operation in random.sample(operations, k=random.randint(2, len(operations))):
            response_time, success, error_type = await operation()
            results.append((response_time, success, error_type))
            await self._think()
        
        return results
    
    async def run_scenario(self, scenario_name: str) -> List[Tuple[float, bool, Optional[str]]]:
        """Run a specific scenario"""
        scenario_methods = {
            'dashboard_load': self.scenario_dashboard_load,
            'student_search': self.scenario_student_search,
            'student_crud': self.scenario_student_crud,
            'bulk_operations': self.scenario_bulk_operations,
            'mixed_workflow': self.scenario_mixed_workflow
        }
        
        if scenario_name in scenario_methods:
            return await scenario_methods[scenario_name]()
        else:
            logger.warning(f"Unknown scenario: {scenario_name}")
            return []
    
    async def simulate_user_session(self, duration: int) -> Dict:
        """Simulate user session for specified duration"""
        self.start_time = time.time()
        end_time = start_time + duration
        
        session_results = {
            'user_id': self.user_id,
            'scenarios_run': [],
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'response_times': []
        }
        
        # Authenticate first
        if not await self._authenticate():
            logger.error(f"User {self.user_id}: Failed to authenticate, skipping session")
            return session_results
        
        # Run scenarios until time limit or max requests reached
        while (time.time() < end_time and 
               self.requests_made < self.config.max_requests_per_user):
            
            # Choose scenario
            scenario = random.choice(self.preferred_scenarios)
            
            try:
                # Run scenario
                scenario_results = await self.run_scenario(scenario)
                
                # Process results
                for response_time, success, error_type in scenario_results:
                    session_results['total_requests'] += 1
                    session_results['response_times'].append(response_time)
                    
                    if success:
                        session_results['successful_requests'] += 1
                    else:
                        session_results['failed_requests'] += 1
                
                session_results['scenarios_run'].append({
                    'scenario': scenario,
                    'requests': len(scenario_results),
                    'timestamp': time.time()
                })
                
                self.requests_made += len(scenario_results)
                
                # Think time between scenarios
                await self._think()
                
            except Exception as e:
                logger.error(f"User {self.user_id}: Scenario {scenario} failed - {e}")
                self.errors_encountered += 1
        
        self.end_time = time.time()
        session_results['session_duration'] = self.end_time - self.start_time
        
        return session_results

class LoadTestRunner:
    """Load test runner that manages multiple virtual users"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.results = LoadTestResult()
        self.virtual_users: List[VirtualUser] = []
        
    async def run_load_test(self) -> LoadTestResult:
        """Run the complete load test"""
        logger.info(f"🚀 Starting load test with {self.config.concurrent_users} users for {self.config.duration_seconds} seconds")
        logger.info(f"📊 Scenarios: {', '.join(self.config.scenarios)}")
        
        # Create virtual users
        self.virtual_users = [
            VirtualUser(i, self.config) 
            for i in range(self.config.concurrent_users)
        ]
        
        # Run load test
        start_time = time.time()
        
        # Ramp up users gradually
        ramp_up_delay = self.config.ramp_up_seconds / self.config.concurrent_users
        
        tasks = []
        for i, user in enumerate(self.virtual_users):
            # Stagger user start times
            await asyncio.sleep(ramp_up_delay)
            
            task = asyncio.create_task(
                self._run_user_session(user)
            )
            tasks.append(task)
        
        # Wait for all users to complete
        user_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_time = time.time() - start_time
        
        # Aggregate results
        await self._aggregate_results(user_results)
        
        logger.info(f"✅ Load test completed in {total_time:.2f} seconds")
        
        return self.results
    
    async def _run_user_session(self, user: VirtualUser) -> Dict:
        """Run a single user session"""
        try:
            async with user:
                return await user.simulate_user_session(self.config.duration_seconds)
        except Exception as e:
            logger.error(f"User {user.user_id} session failed: {e}")
            return {
                'user_id': user.user_id,
                'error': str(e),
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'response_times': []
            }
    
    async def _aggregate_results(self, user_results: List[Dict]) -> None:
        """Aggregate results from all users"""
        for user_result in user_results:
            if isinstance(user_result, Exception):
                logger.error(f"User session exception: {user_result}")
                continue
            
            # Add to total results
            self.results.total_requests += user_result.get('total_requests', 0)
            self.results.successful_requests += user_result.get('successful_requests', 0)
            self.results.failed_requests += user_result.get('failed_requests', 0)
            
            # Add response times
            response_times = user_result.get('response_times', [])
            self.results.response_times.extend(response_times)
            
            # Track scenario results
            for scenario_info in user_result.get('scenarios_run', []):
                scenario = scenario_info['scenario']
                if scenario not in self.results.scenario_results:
                    self.results.scenario_results[scenario] = {
                        'total_runs': 0,
                        'total_requests': 0,
                        'successful_requests': 0,
                        'failed_requests': 0,
                        'response_times': []
                    }
                
                self.results.scenario_results[scenario]['total_runs'] += 1
                self.results.scenario_results[scenario]['total_requests'] += scenario_info['requests']
    
    def generate_report(self) -> Dict:
        """Generate comprehensive load test report"""
        if not self.results.response_times:
            return {'error': 'No response times recorded'}
        
        response_times = self.results.response_times
        
        report = {
            'test_configuration': {
                'concurrent_users': self.config.concurrent_users,
                'duration_seconds': self.config.duration_seconds,
                'ramp_up_seconds': self.config.ramp_up_seconds,
                'scenarios': self.config.scenarios,
                'base_url': self.config.base_url
            },
            'summary': {
                'total_requests': self.results.total_requests,
                'successful_requests': self.results.successful_requests,
                'failed_requests': self.results.failed_requests,
                'success_rate': (self.results.successful_requests / max(self.results.total_requests, 1)) * 100,
                'requests_per_second': self.results.total_requests / self.config.duration_seconds if self.config.duration_seconds > 0 else 0
            },
            'response_time_stats': {
                'min': min(response_times),
                'max': max(response_times),
                'mean': statistics.mean(response_times),
                'median': statistics.median(response_times),
                'p95': self._percentile(response_times, 95),
                'p99': self._percentile(response_times, 99)
            },
            'error_breakdown': self.results.error_counts,
            'scenario_results': self.results.scenario_results,
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of response times"""
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance recommendations based on results"""
        recommendations = []
        
        success_rate = (self.results.successful_requests / max(self.results.total_requests, 1)) * 100
        
        if success_rate < 95:
            recommendations.append("Success rate is below 95%. Consider optimizing error handling or increasing server capacity.")
        
        if self.results.response_times:
            p95_response_time = self._percentile(self.results.response_times, 95)
            if p95_response_time > 2.0:
                recommendations.append("95th percentile response time is above 2 seconds. Consider performance optimization.")
            
            mean_response_time = statistics.mean(self.results.response_times)
            if mean_response_time > 1.0:
                recommendations.append("Average response time is above 1 second. Consider database or API optimization.")
        
        if self.results.failed_requests > 0:
            timeout_errors = self.results.error_counts.get('TIMEOUT', 0)
            if timeout_errors > 0:
                recommendations.append("Timeout errors detected. Consider increasing request timeout or optimizing slow endpoints.")
        
        if not recommendations:
            recommendations.append("Performance looks good! No immediate optimizations needed.")
        
        return recommendations

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='Load Test Client for K-12 SIS API')
    parser.add_argument('--users', type=int, default=10, help='Number of concurrent users')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--ramp-up', type=int, default=10, help='Ramp-up time in seconds')
    parser.add_argument('--base-url', default='http://localhost:3000/api', help='API base URL')
    parser.add_argument('--scenarios', nargs='+', 
                       default=['dashboard_load', 'student_search', 'student_crud', 'bulk_operations', 'mixed_workflow'],
                       help='Test scenarios to run')
    
    args = parser.parse_args()
    
    config = LoadTestConfig(
        base_url=args.base_url,
        concurrent_users=args.users,
        duration_seconds=args.duration,
        ramp_up_seconds=args.ramp_up,
        scenarios=args.scenarios
    )
    
    print("🔥 Load Test Client - K-12 SIS API")
    print("==================================\n")
    
    runner = LoadTestRunner(config)
    
    try:
        # Run load test
        results = await runner.run_load_test()
        
        # Generate report
        report = runner.generate_report()
        
        # Save report
        report_path = f'/tmp/load-test-report-{int(time.time())}.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n📊 Load Test Results Summary:")
        print("=" * 40)
        print(f"Total Requests: {report['summary']['total_requests']}")
        print(f"Successful Requests: {report['summary']['successful_requests']}")
        print(f"Failed Requests: {report['summary']['failed_requests']}")
        print(f"Success Rate: {report['summary']['success_rate']:.2f}%")
        print(f"Requests/Second: {report['summary']['requests_per_second']:.2f}")
        print(f"Mean Response Time: {report['summary']['response_time_stats']['mean']:.3f}s")
        print(f"95th Percentile: {report['summary']['response_time_stats']['p95']:.3f}s")
        print(f"99th Percentile: {report['summary']['response_time_stats']['p99']:.3f}s")
        
        print("\n🎯 Recommendations:")
        for recommendation in report['recommendations']:
            print(f"  • {recommendation}")
        
        print(f"\n📄 Full report saved to: {report_path}")
        
    except Exception as e:
        logger.error(f"Load test failed: {e}")
        raise

if __name__ == '__main__':
    asyncio.run(main())
