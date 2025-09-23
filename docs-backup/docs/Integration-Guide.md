# Integration Guide - Frontend & SDK Development

## Overview

This guide provides comprehensive instructions for integrating with the K-12 Student Information System backend API. Since this is a backend-first project, frontend development is optional and can be handled by separate teams or clients.

## Integration Options

### 1. Direct API Integration
- **REST API**: Complete CRUD operations for all entities
- **Authentication**: JWT-based authentication with refresh tokens
- **Real-time Updates**: WebSocket support for live data
- **File Uploads**: Support for documents, images, and bulk imports

### 2. Client SDKs (Coming Soon)
- **JavaScript/TypeScript SDK**: For web applications
- **Python SDK**: For backend integrations
- **PHP SDK**: For PHP applications
- **Mobile SDKs**: React Native, Flutter, native iOS/Android

### 3. Third-Party Integrations
- **Webhooks**: Real-time event notifications
- **SSO Integration**: SAML, OAuth 2.0, OpenID Connect
- **LMS Integration**: Canvas, Blackboard, Moodle
- **SIS Integration**: PowerSchool, Infinite Campus, Skyward

## Authentication Integration

### JWT Token Flow

```javascript
// 1. Login to get tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@springfield.edu',
    password: 'secure-password',
    tenantSlug: 'springfield'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 2. Use access token for API requests
const studentsResponse = await fetch('/api/students', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// 3. Refresh token when expired
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

### Multi-Tenant Context

```javascript
// Option 1: Subdomain-based routing
const apiClient = new SISClient({
  baseUrl: 'https://springfield.sisplatform.com/api'
});

// Option 2: Header-based routing
const apiClient = new SISClient({
  baseUrl: 'https://api.sisplatform.com',
  headers: {
    'X-Tenant-Slug': 'springfield'
  }
});

// Option 3: Custom domain
const apiClient = new SISClient({
  baseUrl: 'https://sis.springfield.edu/api'
});
```

## Frontend Integration Examples

### React.js Integration

```jsx
// hooks/useSIS.js
import { useState, useEffect } from 'react';

export const useSIS = () => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);

  const login = async (email, password, tenantSlug) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug })
    });

    const data = await response.json();
    setToken(data.accessToken);
    setUser(data.user);
    setTenant(data.tenant);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const apiRequest = async (endpoint, options = {}) => {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await refreshToken();
      return apiRequest(endpoint, options);
    }

    return response.json();
  };

  return { login, apiRequest, user, tenant, token };
};

// components/StudentList.jsx
import React, { useState, useEffect } from 'react';
import { useSIS } from '../hooks/useSIS';

export const StudentList = () => {
  const { apiRequest } = useSIS();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await apiRequest('/students');
        setStudents(data.data);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Students</h2>
      <ul>
        {students.map(student => (
          <li key={student.id}>
            {student.firstName} {student.lastName} - Grade {student.gradeLevel}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Vue.js Integration

```vue
<!-- composables/useSIS.js -->
import { ref, computed } from 'vue';

export function useSIS() {
  const token = ref(localStorage.getItem('accessToken'));
  const user = ref(null);
  const tenant = ref(null);

  const login = async (email, password, tenantSlug) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug })
    });

    const data = await response.json();
    token.value = data.accessToken;
    user.value = data.user;
    tenant.value = data.tenant;
    localStorage.setItem('accessToken', data.accessToken);
  };

  const apiRequest = async (endpoint, options = {}) => {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response.json();
  };

  return { login, apiRequest, user, tenant, token };
}

<!-- components/StudentList.vue -->
<template>
  <div>
    <h2>Students</h2>
    <div v-if="loading">Loading...</div>
    <ul v-else>
      <li v-for="student in students" :key="student.id">
        {{ student.firstName }} {{ student.lastName }} - Grade {{ student.gradeLevel }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSIS } from '../composables/useSIS';

const { apiRequest } = useSIS();
const students = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await apiRequest('/students');
    students.value = data.data;
  } catch (error) {
    console.error('Failed to fetch students:', error);
  } finally {
    loading.value = false;
  }
});
</script>
```

### Angular Integration

```typescript
// services/sis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SISService {
  private baseUrl = '/api';
  private token = new BehaviorSubject<string | null>(localStorage.getItem('accessToken'));
  private user = new BehaviorSubject<any>(null);
  private tenant = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  login(email: string, password: string, tenantSlug: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, {
      email, password, tenantSlug
    });
  }

  getStudents(): Observable<any> {
    return this.http.get(`${this.baseUrl}/students`, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token.value}`,
      'Content-Type': 'application/json'
    });
  }
}

// components/student-list.component.ts
import { Component, OnInit } from '@angular/core';
import { SISService } from '../services/sis.service';

@Component({
  selector: 'app-student-list',
  template: `
    <div>
      <h2>Students</h2>
      <div *ngIf="loading">Loading...</div>
      <ul *ngIf="!loading">
        <li *ngFor="let student of students">
          {{ student.firstName }} {{ student.lastName }} - Grade {{ student.gradeLevel }}
        </li>
      </ul>
    </div>
  `
})
export class StudentListComponent implements OnInit {
  students: any[] = [];
  loading = true;

  constructor(private sisService: SISService) {}

  ngOnInit() {
    this.sisService.getStudents().subscribe({
      next: (data) => {
        this.students = data.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to fetch students:', error);
        this.loading = false;
      }
    });
  }
}
```

## Mobile Integration

### React Native Integration

```javascript
// services/SISService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class SISService {
  constructor() {
    this.baseUrl = 'https://api.sisplatform.com';
    this.token = null;
  }

  async login(email, password, tenantSlug) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug })
    });

    const data = await response.json();
    this.token = data.accessToken;
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    
    return data;
  }

  async getStudents() {
    const response = await fetch(`${this.baseUrl}/students`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  }
}

export default new SISService();

// components/StudentList.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import SISService from '../services/SISService';

export const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await SISService.getStudents();
        setStudents(data.data);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View>
      <Text>Students</Text>
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.firstName} {item.lastName} - Grade {item.gradeLevel}</Text>
        )}
      />
    </View>
  );
};
```

### Flutter Integration

```dart
// services/sis_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SISService {
  static const String baseUrl = 'https://api.sisplatform.com';
  String? _token;

  Future<Map<String, dynamic>> login(String email, String password, String tenantSlug) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'tenantSlug': tenantSlug,
      }),
    );

    final data = jsonDecode(response.body);
    _token = data['data']['accessToken'];
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', _token!);
    
    return data;
  }

  Future<Map<String, dynamic>> getStudents() async {
    final response = await http.get(
      Uri.parse('$baseUrl/students'),
      headers: {
        'Authorization': 'Bearer $_token',
        'Content-Type': 'application/json',
      },
    );

    return jsonDecode(response.body);
  }
}

// widgets/student_list.dart
import 'package:flutter/material.dart';
import '../services/sis_service.dart';

class StudentList extends StatefulWidget {
  @override
  _StudentListState createState() => _StudentListState();
}

class _StudentListState extends State<StudentList> {
  final SISService _sisService = SISService();
  List<dynamic> students = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _fetchStudents();
  }

  Future<void> _fetchStudents() async {
    try {
      final data = await _sisService.getStudents();
      setState(() {
        students = data['data'];
        loading = false;
      });
    } catch (error) {
      print('Failed to fetch students: $error');
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Students')),
      body: loading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: students.length,
              itemBuilder: (context, index) {
                final student = students[index];
                return ListTile(
                  title: Text('${student['firstName']} ${student['lastName']}'),
                  subtitle: Text('Grade ${student['gradeLevel']}'),
                );
              },
            ),
    );
  }
}
```

## SDK Development (Coming Soon)

### JavaScript/TypeScript SDK

```typescript
// sdk/sis-client.ts
export class SISClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: SISClientConfig) {
    this.baseUrl = config.baseUrl;
    this.token = config.token || null;
  }

  async login(email: string, password: string, tenantSlug: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug })
    });

    const data = await response.json();
    this.token = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    
    return data;
  }

  async getStudents(options?: GetStudentsOptions): Promise<Student[]> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.gradeLevel) params.append('gradeLevel', options.gradeLevel);

    const response = await this.request(`/students?${params}`);
    return response.data;
  }

  async createStudent(studentData: CreateStudentData): Promise<Student> {
    const response = await this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    return response.data;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    return response.json();
  }
}

// Usage
const client = new SISClient({
  baseUrl: 'https://api.sisplatform.com'
});

await client.login('admin@springfield.edu', 'password', 'springfield');
const students = await client.getStudents({ gradeLevel: '10' });
```

### Python SDK

```python
# sdk/sis_client.py
import requests
from typing import List, Dict, Optional

class SISClient:
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            })

    def login(self, email: str, password: str, tenant_slug: str) -> Dict:
        response = self.session.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password, 'tenantSlug': tenant_slug}
        )
        
        data = response.json()
        self.token = data['data']['accessToken']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        
        return data

    def get_students(self, page: int = 1, limit: int = 20, grade_level: Optional[str] = None) -> List[Dict]:
        params = {'page': page, 'limit': limit}
        if grade_level:
            params['gradeLevel'] = grade_level
            
        response = self.session.get(f'{self.base_url}/students', params=params)
        return response.json()['data']

    def create_student(self, student_data: Dict) -> Dict:
        response = self.session.post(
            f'{self.base_url}/students',
            json=student_data
        )
        return response.json()['data']

# Usage
client = SISClient('https://api.sisplatform.com')
client.login('admin@springfield.edu', 'password', 'springfield')
students = client.get_students(grade_level='10')
```

## Webhook Integration

### Webhook Configuration

```javascript
// Configure webhooks for real-time updates
const webhookConfig = {
  url: 'https://your-app.com/webhooks/sis',
  events: [
    'student.created',
    'student.updated',
    'student.deleted',
    'grade.created',
    'grade.updated',
    'attendance.marked'
  ],
  secret: 'webhook-secret-key'
};

// Register webhook
await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookConfig)
});
```

### Webhook Handler

```javascript
// Express.js webhook handler
app.post('/webhooks/sis', (req, res) => {
  const signature = req.headers['x-sis-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'student.created':
      handleStudentCreated(data);
      break;
    case 'grade.updated':
      handleGradeUpdated(data);
      break;
    // Handle other events
  }
  
  res.status(200).send('OK');
});
```

## Error Handling

### Standard Error Responses

```javascript
// Handle API errors consistently
const handleApiError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.status === 403) {
    // Show permission denied message
    showError('You do not have permission to perform this action');
  } else if (error.status === 429) {
    // Handle rate limiting
    showError('Too many requests. Please try again later.');
  } else {
    // Generic error handling
    showError(error.message || 'An unexpected error occurred');
  }
};
```

### Retry Logic

```javascript
// Implement retry logic for transient errors
const apiRequestWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status >= 500 && i < maxRetries - 1) {
        // Retry on server errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## Best Practices

### Security

1. **Token Storage**: Store tokens securely (HttpOnly cookies, secure storage)
2. **HTTPS Only**: Always use HTTPS in production
3. **Input Validation**: Validate all user input on the client side
4. **Error Handling**: Don't expose sensitive information in error messages

### Performance

1. **Caching**: Implement appropriate caching strategies
2. **Pagination**: Use pagination for large datasets
3. **Lazy Loading**: Load data as needed
4. **Optimistic Updates**: Update UI before server confirmation

### User Experience

1. **Loading States**: Show loading indicators during API calls
2. **Error Messages**: Provide clear, actionable error messages
3. **Offline Support**: Handle offline scenarios gracefully
4. **Real-time Updates**: Use webhooks for live data updates

This integration guide provides everything needed to build frontend applications or SDKs that work seamlessly with the K-12 Student Information System backend API.
