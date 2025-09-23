# White-Label Frontend Shell - K-12 Student Information System

## Overview

This document provides comprehensive guidance for the white-label frontend shell of the K-12 Student Information System. The shell is built with React and includes modular components, theming capabilities, internationalization support, and integration with backend APIs.

## Architecture

### Technology Stack
- **Framework**: React 18.2.0 with React Router DOM 6.8.0
- **Styling**: Tailwind CSS 3.2.0 with custom CSS variables
- **Charts**: Chart.js 4.2.1 with react-chartjs-2 5.2.0
- **Internationalization**: react-i18next 12.1.5
- **Icons**: Heroicons 2.0.0 and emoji icons
- **HTTP Client**: Axios 1.3.0

### Project Structure
```
frontend/src/
├── components/
│   └── ui/                    # Reusable UI components
│       ├── Card.jsx          # Card component with theming
│       ├── Chart.jsx         # Chart component with Chart.js
│       ├── Table.jsx         # Data table with sorting/filtering
│       ├── Badge.jsx         # Status badges and tags
│       └── Notification.jsx  # Alert notifications
├── config/
│   ├── theme.js              # Theme configuration and management
│   └── i18n.js               # Internationalization setup
├── layouts/
│   └── MainLayout.jsx        # Main application layout
├── pages/
│   ├── DashboardPage.jsx     # Main dashboard
│   ├── PortalPage.jsx        # Student portal
│   ├── YearbookPage.jsx      # Yearbook management
│   ├── PaymentsPage.jsx      # Payment management
│   └── ArchivePage.jsx       # Archive and records
├── styles/
│   └── theme.css             # CSS variables and theming
└── App.js                    # Main application component
```

## Core Features

### 1. White-Label Theming System

The theming system allows complete customization of the application's appearance through CSS custom properties.

#### Theme Configuration
```javascript
// config/theme.js
const theme = {
  colors: {
    primary: '#3B82F6',      // Main brand color
    secondary: '#10B981',    // Secondary brand color
    accent: '#F59E0B',       // Accent color
    background: '#F9FAFB',   // Background color
    surface: '#FFFFFF',      // Card/surface color
    text: '#111827',         // Primary text color
    textSecondary: '#6B7280' // Secondary text color
  },
  fonts: {
    primary: 'Inter, sans-serif',
    secondary: 'Roboto, sans-serif',
    monospace: 'Fira Code, monospace'
  },
  branding: {
    logo: '/logos/tenant-logo.png',
    favicon: '/favicons/tenant-favicon.ico',
    name: 'School Name',
    tagline: 'Excellence in Education'
  }
};
```

#### CSS Variables Usage
```css
/* styles/theme.css */
:root {
  --color-primary: #3B82F6;
  --color-secondary: #10B981;
  --font-primary: 'Inter', sans-serif;
  --layout-sidebarWidth: 16rem;
}
```

#### Dynamic Theme Application
```javascript
import { applyTheme, getTheme } from './config/theme';

// Load and apply theme
const theme = await getTheme('tenant-id');
applyTheme(theme);
```

### 2. Internationalization (i18n)

The application supports multiple languages with dynamic language switching.

#### Supported Languages
- English (en) - Default
- Spanish (es) - Partial support
- Extensible for additional languages

#### Usage in Components
```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('dashboard.title')}</h1>
  );
}
```

#### Translation Keys Structure
```javascript
{
  "common": {
    "dashboard": "Dashboard",
    "students": "Students",
    "loading": "Loading..."
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to your dashboard"
  }
}
```

### 3. Modular Component System

#### Card Component
```javascript
<Card
  title="Student Count"
  icon="👨‍🎓"
  variant="elevated"
  loading={false}
>
  <div>Content here</div>
</Card>
```

**Props:**
- `title`: Card title (optional)
- `subtitle`: Card subtitle (optional)
- `icon`: Icon component or emoji (optional)
- `variant`: 'default', 'elevated', 'outlined', 'filled'
- `size`: 'sm', 'md', 'lg', 'xl'
- `loading`: Show loading state (optional)
- `onClick`: Click handler (optional)

#### Chart Component
```javascript
<Chart
  type="line"
  title="Attendance Trends"
  data={chartData}
  options={chartOptions}
  loading={false}
/>
```

**Props:**
- `type`: 'line', 'bar', 'doughnut', 'pie', 'radar', 'polarArea'
- `data`: Chart data object
- `options`: Chart options object
- `title`: Chart title (optional)
- `loading`: Show loading state (optional)

#### Table Component
```javascript
<Table
  data={students}
  columns={columns}
  loading={false}
  sortable={true}
  filterable={true}
  pagination={true}
/>
```

**Props:**
- `data`: Array of data objects
- `columns`: Array of column definitions
- `loading`: Show loading state (optional)
- `sortable`: Enable sorting (default: true)
- `filterable`: Enable filtering (default: true)
- `pagination`: Enable pagination (default: true)

### 4. Page Components

#### Dashboard Page (`/dashboard`)
- Overview statistics cards
- Interactive charts for attendance and grades
- Recent activity feed
- Quick action buttons
- System status indicators

#### Portal Page (`/portal`)
- Student information display
- Academic progress tracking
- Class schedule
- Grades and assignments
- Attendance records
- Extracurricular activities

#### Yearbook Page (`/yearbook`)
- Photo gallery with upload capability
- Digital signatures
- Memory sharing
- Section organization
- Export functionality

#### Payments Page (`/payments`)
- Outstanding payment tracking
- Payment history
- Payment method management
- Invoice management
- Payment processing

#### Archive Page (`/archive`)
- Historical record search
- Document management
- Media file access
- Transcript archives
- Export capabilities

## API Integration

### Backend Endpoints

#### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/activity` - Recent activity feed
- `GET /api/dashboard/charts` - Chart data

#### Portal
- `GET /api/portal/student/{studentId}` - Student information
- `GET /api/portal/schedule/{studentId}` - Student schedule
- `GET /api/portal/grades/{studentId}` - Student grades
- `GET /api/portal/assignments/{studentId}` - Student assignments

#### Yearbook
- `GET /api/yearbook/photos` - Fetch yearbook photos
- `POST /api/yearbook/upload` - Upload photos
- `GET /api/yearbook/signatures` - Fetch signatures
- `POST /api/yearbook/signatures` - Add signature

#### Payments
- `GET /api/payments/outstanding` - Outstanding payments
- `GET /api/payments/history` - Payment history
- `POST /api/payments/process` - Process payment

#### Archive
- `GET /api/archive/search` - Search archived content
- `GET /api/archive/students` - Archived student records
- `GET /api/archive/transcripts` - Archived transcripts

### Mock Data Fallbacks

All components include mock data for development and demonstration purposes. The mock data is automatically used when API endpoints are unavailable.

## Customization Guide

### 1. Branding Customization

#### Logo and Favicon
```javascript
const theme = {
  branding: {
    logo: '/logos/your-school-logo.png',
    favicon: '/favicons/your-school-favicon.ico',
    name: 'Your School Name',
    tagline: 'Your School Tagline'
  }
};
```

#### Color Scheme
```javascript
const theme = {
  colors: {
    primary: '#your-primary-color',
    secondary: '#your-secondary-color',
    accent: '#your-accent-color'
  }
};
```

### 2. Adding New Pages

1. Create a new page component in `src/pages/`
2. Add the route to `App.js`
3. Update navigation in `MainLayout.jsx`
4. Add translations to `config/i18n.js`

```javascript
// src/pages/NewPage.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';

const NewPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <Card title={t('newPage.title')}>
        <div>New page content</div>
      </Card>
    </div>
  );
};

export default NewPage;
```

### 3. Adding New Components

1. Create component in `src/components/ui/`
2. Include developer documentation in component header
3. Add TypeScript-like prop documentation
4. Include usage examples

```javascript
/**
 * NewComponent
 * 
 * Description of the component and its purpose.
 * 
 * Props:
 * - prop1: Description of prop1
 * - prop2: Description of prop2
 * 
 * Usage:
 * <NewComponent prop1="value1" prop2="value2" />
 */

import React from 'react';

const NewComponent = ({ prop1, prop2, ...props }) => {
  return (
    <div {...props}>
      {/* Component implementation */}
    </div>
  );
};

export default NewComponent;
```

### 4. Adding New Languages

1. Add translations to `config/i18n.js`
2. Update the `defaultTranslations` object
3. Test language switching functionality

```javascript
// config/i18n.js
const defaultTranslations = {
  en: { /* English translations */ },
  es: { /* Spanish translations */ },
  fr: { /* French translations */ }  // New language
};
```

## Development Setup

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm start
```

### Building for Production
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Docker Configuration

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Testing

### Component Testing
```javascript
import { render, screen } from '@testing-library/react';
import Card from '../components/ui/Card';

test('renders card with title', () => {
  render(<Card title="Test Title">Content</Card>);
  expect(screen.getByText('Test Title')).toBeInTheDocument();
});
```

### Theme Testing
```javascript
import { applyTheme } from '../config/theme';

test('applies theme correctly', () => {
  const theme = {
    colors: { primary: '#FF0000' }
  };
  
  applyTheme(theme);
  
  const root = document.documentElement;
  expect(root.style.getPropertyValue('--color-primary')).toBe('#FF0000');
});
```

## Performance Optimization

### Code Splitting
```javascript
import { lazy, Suspense } from 'react';

const LazyPage = lazy(() => import('./pages/HeavyPage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyPage />
    </Suspense>
  );
}
```

### Image Optimization
- Use WebP format for images
- Implement lazy loading for images
- Optimize image sizes for different screen densities

### Bundle Optimization
- Use dynamic imports for large components
- Implement tree shaking
- Optimize bundle size with webpack-bundle-analyzer

## Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

### API Security
- Use HTTPS for all API calls
- Implement proper authentication headers
- Validate all user inputs
- Sanitize data before rendering

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills
- Include polyfills for older browsers if needed
- Use Babel for JavaScript transpilation
- Implement CSS fallbacks for modern features

## Troubleshooting

### Common Issues

#### Theme Not Applying
- Check if CSS variables are properly defined
- Verify theme application in browser dev tools
- Ensure CSS file is loaded before JavaScript

#### API Calls Failing
- Check network connectivity
- Verify API endpoint URLs
- Check CORS configuration
- Review authentication headers

#### Components Not Rendering
- Check for JavaScript errors in console
- Verify component imports
- Check prop types and required props
- Review React DevTools for component state

### Debug Mode
Enable debug mode in development:
```javascript
// config/i18n.js
i18n.init({
  debug: process.env.NODE_ENV === 'development'
});
```

## Contributing

### Code Style
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages
- Include JSDoc comments for functions

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description
5. Address review feedback

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Review the documentation
- Check the troubleshooting section

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintainer**: School SIS Development Team
