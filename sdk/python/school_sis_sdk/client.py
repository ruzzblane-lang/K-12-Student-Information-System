"""
Main client for School SIS SDK
"""

import requests
import time
from typing import Optional, Dict, Any, Union
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .models import SISConfig, APIResponse, AuthResponse, SISError


class SISClient:
    """Main client for interacting with the School SIS API"""
    
    def __init__(self, config: Union[SISConfig, Dict[str, Any]]):
        if isinstance(config, dict):
            config = SISConfig(**config)
        
        self.config = config
        self.token: Optional[str] = config.token
        self.refresh_token: Optional[str] = None
        self.session = requests.Session()
        
        # Setup retry strategy
        retry_strategy = Retry(
            total=config.retries,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SchoolSIS-PythonSDK/1.0.0'
        })
        
        if config.headers:
            self.session.headers.update(config.headers)
        
        # Set timeout
        self.session.timeout = config.timeout
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers"""
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if self.config.tenant_slug:
            headers['X-Tenant-Slug'] = self.config.tenant_slug
        
        if self.config.api_key:
            headers['X-API-Key'] = self.config.api_key
        
        return headers
    
    def _make_request(self, method: str, url: str, **kwargs) -> APIResponse:
        """Make HTTP request with error handling"""
        full_url = f"{self.config.base_url.rstrip('/')}/{url.lstrip('/')}"
        
        # Add auth headers
        headers = self._get_auth_headers()
        if 'headers' in kwargs:
            headers.update(kwargs['headers'])
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, full_url, **kwargs)
            
            # Handle 401 - try to refresh token
            if response.status_code == 401 and self.refresh_token:
                self._refresh_access_token()
                headers.update(self._get_auth_headers())
                response = self.session.request(method, full_url, **kwargs)
            
            response.raise_for_status()
            
            data = response.json()
            return APIResponse(**data)
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise SISError("Authentication failed", "AUTH_FAILED", 401)
            elif e.response.status_code == 403:
                raise SISError("Access forbidden", "FORBIDDEN", 403)
            elif e.response.status_code == 404:
                raise SISError("Resource not found", "NOT_FOUND", 404)
            elif e.response.status_code == 429:
                raise SISError("Rate limit exceeded", "RATE_LIMIT", 429)
            elif e.response.status_code >= 500:
                raise SISError("Server error", "SERVER_ERROR", e.response.status_code)
            else:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('error', {}).get('message', str(e))
                    error_code = error_data.get('error', {}).get('code', 'HTTP_ERROR')
                except:
                    error_msg = str(e)
                    error_code = 'HTTP_ERROR'
                
                raise SISError(error_msg, error_code, e.response.status_code)
        
        except requests.exceptions.RequestException as e:
            raise SISError(f"Network error: {str(e)}", "NETWORK_ERROR")
    
    def _refresh_access_token(self) -> None:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise SISError("No refresh token available", "NO_REFRESH_TOKEN")
        
        try:
            response = self._make_request('POST', '/auth/refresh', json={
                'refreshToken': self.refresh_token
            })
            
            data = response.data
            self.token = data['accessToken']
            self.refresh_token = data['refreshToken']
            
        except SISError:
            # Refresh failed, clear tokens
            self.token = None
            self.refresh_token = None
            raise
    
    def login(self, email: str, password: str, tenant_slug: Optional[str] = None) -> AuthResponse:
        """Authenticate user and get tokens"""
        response = self._make_request('POST', '/auth/login', json={
            'email': email,
            'password': password,
            'tenantSlug': tenant_slug or self.config.tenant_slug
        })
        
        data = response.data
        self.token = data['accessToken']
        self.refresh_token = data['refreshToken']
        
        return AuthResponse(
            success=True,
            data=data,
            message="Login successful"
        )
    
    def logout(self) -> None:
        """Logout user and clear tokens"""
        if self.refresh_token:
            try:
                self._make_request('POST', '/auth/logout', json={
                    'refreshToken': self.refresh_token
                })
            except SISError:
                # Ignore logout errors
                pass
        
        self.token = None
        self.refresh_token = None
    
    def set_token(self, token: str, refresh_token: Optional[str] = None) -> None:
        """Set authentication token manually"""
        self.token = token
        if refresh_token:
            self.refresh_token = refresh_token
    
    def get_token(self) -> Optional[str]:
        """Get current authentication token"""
        return self.token
    
    def set_tenant_slug(self, tenant_slug: str) -> None:
        """Set tenant slug for multi-tenant requests"""
        self.config.tenant_slug = tenant_slug
    
    def get_tenant_slug(self) -> Optional[str]:
        """Get current tenant slug"""
        return self.config.tenant_slug
    
    def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Make GET request"""
        response = self._make_request('GET', url, params=params)
        return response.data
    
    def post(self, url: str, data: Optional[Dict[str, Any]] = None, json: Optional[Dict[str, Any]] = None) -> Any:
        """Make POST request"""
        response = self._make_request('POST', url, data=data, json=json)
        return response.data
    
    def put(self, url: str, data: Optional[Dict[str, Any]] = None, json: Optional[Dict[str, Any]] = None) -> Any:
        """Make PUT request"""
        response = self._make_request('PUT', url, data=data, json=json)
        return response.data
    
    def patch(self, url: str, data: Optional[Dict[str, Any]] = None, json: Optional[Dict[str, Any]] = None) -> Any:
        """Make PATCH request"""
        response = self._make_request('PATCH', url, data=data, json=json)
        return response.data
    
    def delete(self, url: str) -> Any:
        """Make DELETE request"""
        response = self._make_request('DELETE', url)
        return response.data
    
    def upload_file(self, url: str, file_path: str, additional_data: Optional[Dict[str, Any]] = None) -> Any:
        """Upload a file"""
        files = {'file': open(file_path, 'rb')}
        
        try:
            # Remove Content-Type header for multipart
            headers = self._get_auth_headers()
            del headers['Content-Type']
            
            response = self._make_request('POST', url, files=files, data=additional_data, headers=headers)
            return response.data
        finally:
            files['file'].close()
    
    def download_file(self, url: str, file_path: str) -> None:
        """Download a file"""
        headers = self._get_auth_headers()
        response = self.session.get(f"{self.config.base_url.rstrip('/')}/{url.lstrip('/')}", headers=headers, stream=True)
        response.raise_for_status()
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    
    def update_config(self, **kwargs) -> None:
        """Update client configuration"""
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
        
        # Update session timeout if changed
        if 'timeout' in kwargs:
            self.session.timeout = kwargs['timeout']
        
        # Update headers if changed
        if 'headers' in kwargs:
            self.session.headers.update(kwargs['headers'])
