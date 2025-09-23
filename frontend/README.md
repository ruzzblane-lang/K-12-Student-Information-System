# White-Label Frontend Shell - K-12 Student Information System

A comprehensive, modular React-based frontend shell for K-12 Student Information Systems with white-label theming, internationalization, and full API integration.

## 🚀 Features

### Core Functionality
- **Dashboard**: Overview with statistics, charts, and quick actions
- **Student Portal**: Academic progress, schedule, grades, and activities
- **Yearbook**: Photo galleries, signatures, and memory sharing
- **Payments**: Tuition, fees, and payment management
- **Archive**: Historical records, documents, and media access

### White-Label Capabilities
- **Dynamic Theming**: CSS variables for complete visual customization
- **Branding**: Logo, favicon, colors, and typography
- **Multi-tenant Support**: Tenant-specific configurations
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Internationalization
- **Multi-language Support**: English, Spanish, and extensible
- **Dynamic Language Switching**: Runtime language changes
- **RTL Support**: Right-to-left language compatibility
- **Localized Content**: All UI text and messages

### Technical Features
- **Modern React**: React 18 with hooks and functional components
- **Interactive Charts**: Chart.js integration for data visualization
- **Data Tables**: Sortable, filterable, and paginated tables
- **Real-time Updates**: WebSocket support for live data
- **Offline Support**: Service worker for offline functionality
- **Performance Optimized**: Code splitting and lazy loading

## 📁 Project Structure

```
frontend/
├── public/                     # Static assets
│   ├── logos/                 # Tenant logos
│   ├── favicons/              # Tenant favicons
│   └── themes/                # Theme configurations
├── src/
│   ├── components/
│   │   └── ui/               # Reusable UI components
│   │       ├── Card.jsx      # Card component
│   │       ├── Chart.jsx     # Chart component
│   │       ├── Table.jsx     # Data table
│   │       ├── Badge.jsx     # Status badges
│   │       └── Notification.jsx # Alerts
│   ├── config/
│   │   ├── theme.js          # Theme management
│   │   └── i18n.js           # Internationalization
│   ├── layouts/
│   │   └── MainLayout.jsx    # Main app layout
│   ├── pages/
│   │   ├── DashboardPage.jsx # Dashboard
│   │   ├── PortalPage.jsx    # Student portal
│   │   ├── YearbookPage.jsx  # Yearbook
│   │   ├── PaymentsPage.jsx  # Payments
│   │   └── ArchivePage.jsx   # Archive
│   ├── styles/
│   │   └── theme.css         # CSS variables
│   └── App.js                # Main app component
├── Dockerfile                # Docker configuration
├── nginx.conf                # Nginx configuration
└── package.json              # Dependencies
```

## 🛠️ Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Docker (for production deployment)

### Quick Setup
```bash
# Clone the repository
git clone <repository-url>
cd school-sis

# Run the setup script
./scripts/setup-white-label-frontend.sh
```

### Manual Setup
```bash
# Install dependencies
cd frontend
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm start
```

## 🎨 Theming

### Basic Theme Configuration
```javascript
// src/config/theme.js
const theme = {
  colors: {
    primary: '#3B82F6',      // Main brand color
    secondary: '#10B981',    // Secondary color
    accent: '#F59E0B',       // Accent color
    background: '#F9FAFB',   // Background
    surface: '#FFFFFF',      // Cards/surfaces
    text: '#111827',         // Text color
    textSecondary: '#6B7280' // Secondary text
  },
  fonts: {
    primary: 'Inter, sans-serif',
    secondary: 'Roboto, sans-serif'
  },
  branding: {
    logo: '/logos/your-logo.png',
    name: 'Your School Name',
    tagline: 'Your Tagline'
  }
};
```

### Using CSS Variables
```css
/* In your components */
.my-component {
  background-color: var(--color-primary);
  font-family: var(--font-primary);
  border-radius: var(--layout-borderRadius);
}
```

### Dynamic Theme Application
```javascript
import { applyTheme, getTheme } from './config/theme';

// Load and apply theme
const theme = await getTheme('tenant-id');
applyTheme(theme);
```

## 🌍 Internationalization

### Adding Translations
```javascript
// src/config/i18n.js
const translations = {
  en: {
    common: {
      dashboard: 'Dashboard',
      students: 'Students'
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome to your dashboard'
    }
  },
  es: {
    common: {
      dashboard: 'Panel de Control',
      students: 'Estudiantes'
    }
  }
};
```

### Using Translations in Components
```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('dashboard.title')}</h1>
  );
}
```

## 📊 Components

### Card Component
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

### Chart Component
```javascript
<Chart
  type="line"
  title="Attendance Trends"
  data={chartData}
  options={chartOptions}
/>
```

### Table Component
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

## 🔌 API Integration

### Backend Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/portal/student/{id}` - Student information
- `GET /api/yearbook/photos` - Yearbook photos
- `GET /api/payments/outstanding` - Outstanding payments
- `GET /api/archive/search` - Archive search

### Mock Data
All components include mock data for development and demonstration. Mock data is automatically used when API endpoints are unavailable.

### Error Handling
```javascript
// Components automatically handle:
// - Loading states
// - Error states
// - Empty states
// - Network failures
```

## 🐳 Docker Deployment

### Development
```bash
# Build and run with Docker Compose
docker-compose up frontend
```

### Production
```bash
# Build production image
docker build -t school-sis-frontend .

# Run container
docker run -p 80:80 school-sis-frontend
```

### Docker Compose
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Component Testing
```javascript
import { render, screen } from '@testing-library/react';
import Card from '../components/ui/Card';

test('renders card with title', () => {
  render(<Card title="Test Title">Content</Card>);
  expect(screen.getByText('Test Title')).toBeInTheDocument();
});
```

## 📱 Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Features
- Touch-friendly interface
- Swipe gestures
- Offline support
- Progressive Web App (PWA)

## 🔒 Security

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

### Best Practices
- Input validation
- XSS prevention
- CSRF protection
- Secure API communication

## 🚀 Performance

### Optimization Features
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis
- Caching strategies

### Performance Monitoring
```javascript
// Built-in performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🛠️ Development

### Available Scripts
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
```

### Code Style
- ESLint configuration
- Prettier formatting
- JSDoc comments
- TypeScript-like prop documentation

### Git Workflow
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request

## 📚 Documentation

### Additional Resources
- [White-Label Frontend Guide](./WHITE_LABEL_FRONTEND_GUIDE.md)
- [API Documentation](../backend/README.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

### Component Documentation
Each component includes:
- Purpose and usage
- Props documentation
- API endpoint information
- Customization points
- Examples

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Write meaningful commit messages
- Include JSDoc comments
- Test your changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the documentation
- Search existing issues
- Create a new issue
- Contact the development team

### Common Issues
- **Theme not applying**: Check CSS variables and theme configuration
- **API calls failing**: Verify endpoint URLs and CORS settings
- **Components not rendering**: Check for JavaScript errors and prop types

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainer**: School SIS Development Team
