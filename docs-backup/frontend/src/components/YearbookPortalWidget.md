# Yearbook Portal Widget

A comprehensive, white-label enabled React component for displaying and managing school yearbooks. This widget provides a modern, responsive interface for browsing, previewing, and downloading yearbooks with extensive customization options.

## Features

- **White-label Support**: Fully customizable themes and branding
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Search & Filter**: Advanced search and filtering capabilities
- **Preview & Download**: Built-in preview and download functionality
- **Multiple Themes**: Pre-built themes for different use cases
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Performance Optimized**: Lazy loading and efficient rendering

## Installation

The widget is already included in the project. Import it in your React component:

```jsx
import YearbookPortalWidget from './components/YearbookPortalWidget';
import './components/YearbookPortalWidget.css';
```

## Basic Usage

```jsx
import React from 'react';
import YearbookPortalWidget from './components/YearbookPortalWidget';

function App() {
  const handleYearbookSelect = (yearbook) => {
    console.log('Selected yearbook:', yearbook);
  };

  return (
    <div className="App">
      <YearbookPortalWidget
        schoolId="school-123"
        onYearbookSelect={handleYearbookSelect}
      />
    </div>
  );
}

export default App;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schoolId` | `string` | **Required** | The school ID to fetch yearbooks for |
| `config` | `object` | `{}` | Configuration object for customization |
| `onYearbookSelect` | `function` | `undefined` | Callback when a yearbook is selected |
| `className` | `string` | `''` | Additional CSS classes |
| `theme` | `string` | `'default'` | Theme name (`'default'`, `'dark'`, `'minimal'`, `'school'`) |

## Configuration Options

### Basic Configuration

```jsx
const config = {
  title: 'Our Yearbooks',
  subtitle: 'Browse through years of memories',
  showFooter: true,
  enableSearch: true,
  enableFilters: true,
  enableSorting: true,
  itemsPerPage: 12,
  enablePagination: false,
  enablePreview: true,
  enableDownload: true,
  showStatusBadges: true,
  showPageCount: true,
  showPublishDate: true,
  showDescription: true,
  maxDescriptionLength: 100
};
```

### Theme Customization

```jsx
const customTheme = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700'
  }
  // ... more theme properties
};

const config = {
  theme: customTheme
};
```

## Pre-built Themes

### Default Theme
```jsx
<YearbookPortalWidget
  schoolId="school-123"
  theme="default"
/>
```

### Dark Theme
```jsx
<YearbookPortalWidget
  schoolId="school-123"
  theme="dark"
/>
```

### Minimal Theme
```jsx
<YearbookPortalWidget
  schoolId="school-123"
  theme="minimal"
/>
```

### School Theme (Green)
```jsx
<YearbookPortalWidget
  schoolId="school-123"
  theme="school"
/>
```

## Predefined Presets

### Elementary School
```jsx
import { YearbookConfig } from './config/yearbookConfig';

const config = YearbookConfig.presets.elementary;

<YearbookPortalWidget
  schoolId="school-123"
  config={config}
/>
```

### High School
```jsx
const config = YearbookConfig.presets.highSchool;

<YearbookPortalWidget
  schoolId="school-123"
  config={config}
/>
```

### University
```jsx
const config = YearbookConfig.presets.university;

<YearbookPortalWidget
  schoolId="school-123"
  config={config}
/>
```

### Mobile/Embedded
```jsx
const config = YearbookConfig.presets.mobile;

<YearbookPortalWidget
  schoolId="school-123"
  config={config}
/>
```

## Advanced Customization

### Custom Theme Creation
```jsx
import { createCustomTheme } from './config/yearbookConfig';

const customTheme = createCustomTheme('default', {
  header: {
    background: 'linear-gradient(135deg, #your-brand-color-1 0%, #your-brand-color-2 100%)'
  },
  title: {
    color: '#your-text-color'
  }
});

const config = {
  theme: customTheme,
  title: 'Your School Yearbooks',
  subtitle: 'Custom subtitle here'
};
```

### Configuration Merging
```jsx
import { mergeConfig, YearbookConfig } from './config/yearbookConfig';

const baseConfig = YearbookConfig.presets.elementary;
const customConfig = {
  title: 'Custom Title',
  theme: {
    header: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)'
    }
  }
};

const finalConfig = mergeConfig(baseConfig, customConfig);
```

## Event Handlers

### Yearbook Selection
```jsx
const handleYearbookSelect = (yearbook) => {
  console.log('Selected yearbook:', yearbook);
  // Navigate to yearbook detail page
  // Show yearbook modal
  // Update parent component state
};
```

## API Integration

The widget uses the `yearbookService` for all API calls. Make sure your backend API endpoints are properly configured:

### Required Endpoints
- `GET /api/yearbooks/school/:schoolId` - Get yearbooks by school
- `GET /api/yearbooks/:id` - Get yearbook details
- `GET /api/yearbooks/:id/preview` - Get preview URL
- `GET /api/yearbooks/:id/download` - Download yearbook

### Optional Endpoints
- `GET /api/yearbooks/school/:schoolId/stats` - Get statistics
- `GET /api/yearbooks/school/:schoolId/search` - Search yearbooks
- `GET /api/yearbooks/school/:schoolId/categories` - Get categories
- `GET /api/yearbooks/school/:schoolId/recent` - Get recent yearbooks
- `GET /api/yearbooks/school/:schoolId/featured` - Get featured yearbooks

## Styling

### CSS Classes
The widget uses BEM methodology for CSS classes:

```css
.yearbook-widget                    /* Main container */
.yearbook-widget__header           /* Header section */
.yearbook-widget__title            /* Title */
.yearbook-widget__subtitle         /* Subtitle */
.yearbook-widget__filters          /* Search and filters */
.yearbook-widget__grid             /* Yearbooks grid */
.yearbook-widget__card             /* Individual yearbook card */
.yearbook-widget__cover            /* Yearbook cover image */
.yearbook-widget__status-badge     /* Status badge */
.yearbook-widget__actions          /* Action buttons */
.yearbook-widget__loading          /* Loading state */
.yearbook-widget__error            /* Error state */
.yearbook-widget__empty            /* Empty state */
```

### Custom Styling
```css
/* Override specific styles */
.yearbook-widget__title {
  font-family: 'Your Custom Font', sans-serif;
  color: #your-brand-color;
}

.yearbook-widget__card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

## Responsive Design

The widget is fully responsive and adapts to different screen sizes:

- **Desktop**: Full grid layout with hover effects
- **Tablet**: Adjusted grid columns and spacing
- **Mobile**: Single column layout with stacked actions

### Breakpoints
- Mobile: `< 480px`
- Tablet: `480px - 768px`
- Desktop: `> 768px`

## Accessibility

The widget includes comprehensive accessibility features:

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant color schemes
- **Semantic HTML**: Proper heading structure and landmarks

## Performance

### Optimization Features
- **Lazy Loading**: Images load as needed
- **Virtual Scrolling**: For large yearbook lists
- **Memoization**: Prevents unnecessary re-renders
- **Debounced Search**: Optimized search input
- **Efficient Filtering**: Client-side filtering for better UX

### Best Practices
```jsx
// Use React.memo for performance
const MemoizedYearbookWidget = React.memo(YearbookPortalWidget);

// Implement proper loading states
const [loading, setLoading] = useState(true);

// Use useCallback for event handlers
const handleYearbookSelect = useCallback((yearbook) => {
  // Handle selection
}, []);
```

## Error Handling

The widget includes comprehensive error handling:

```jsx
// Error states are automatically handled
// Custom error handling
const handleError = (error) => {
  console.error('Yearbook widget error:', error);
  // Show custom error message
  // Log to analytics
  // Fallback to cached data
};
```

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Browsers**: iOS Safari 13+, Chrome Mobile 80+
- **Features Used**: CSS Grid, Flexbox, ES6+, Fetch API

## Troubleshooting

### Common Issues

1. **Yearbooks not loading**
   - Check API endpoints are accessible
   - Verify schoolId is correct
   - Check network connectivity

2. **Styling issues**
   - Ensure CSS file is imported
   - Check for CSS conflicts
   - Verify theme configuration

3. **Performance issues**
   - Reduce itemsPerPage
   - Enable pagination
   - Check for memory leaks

### Debug Mode
```jsx
const config = {
  debug: true, // Enable console logging
  showPerformanceMetrics: true
};
```

## Examples

### Complete Example
```jsx
import React, { useState, useCallback } from 'react';
import YearbookPortalWidget from './components/YearbookPortalWidget';
import { YearbookConfig } from './config/yearbookConfig';
import './components/YearbookPortalWidget.css';

function YearbookPage() {
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  
  const handleYearbookSelect = useCallback((yearbook) => {
    setSelectedYearbook(yearbook);
    // Navigate to yearbook detail or show modal
  }, []);

  const config = {
    ...YearbookConfig.presets.highSchool,
    title: 'Lincoln High School Yearbooks',
    subtitle: 'Celebrating our school\'s history since 1950',
    theme: {
      ...YearbookConfig.themes.school,
      header: {
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)'
      }
    }
  };

  return (
    <div className="yearbook-page">
      <header className="page-header">
        <h1>Yearbook Archive</h1>
        <p>Browse through decades of school memories</p>
      </header>
      
      <main className="page-content">
        <YearbookPortalWidget
          schoolId="lincoln-high-123"
          config={config}
          onYearbookSelect={handleYearbookSelect}
          className="main-yearbook-widget"
        />
      </main>
      
      {selectedYearbook && (
        <div className="yearbook-modal">
          {/* Yearbook detail modal */}
        </div>
      )}
    </div>
  );
}

export default YearbookPage;
```

## Contributing

When contributing to the Yearbook Portal Widget:

1. Follow the existing code style
2. Add proper TypeScript types if using TypeScript
3. Include comprehensive tests
4. Update documentation
5. Ensure accessibility compliance
6. Test across different browsers and devices

## License

This component is part of the School SIS project and follows the same licensing terms.
