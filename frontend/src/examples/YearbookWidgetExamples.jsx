import React, { useState, useCallback } from 'react';
import YearbookPortalWidget from '../components/YearbookPortalWidget';
import { YearbookConfig, createCustomTheme, mergeConfig } from '../config/yearbookConfig';
import '../components/YearbookPortalWidget.css';

/**
 * Yearbook Portal Widget Examples
 * Demonstrates various configurations and use cases
 */

// Example 1: Basic Usage
export const BasicExample = () => {
  const handleYearbookSelect = useCallback((yearbook) => {
    console.log('Selected yearbook:', yearbook);
    alert(`Selected: ${yearbook.title}`);
  }, []);

  return (
    <div className="example-container">
      <h2>Basic Usage</h2>
      <YearbookPortalWidget
        schoolId="demo-school-123"
        onYearbookSelect={handleYearbookSelect}
      />
    </div>
  );
};

// Example 2: Custom Theme
export const CustomThemeExample = () => {
  const customTheme = createCustomTheme('default', {
    header: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)'
    },
    title: {
      color: '#ffffff',
      fontSize: '2rem'
    },
    card: {
      border: '2px solid #ff6b6b',
      borderRadius: '16px'
    }
  });

  const config = {
    title: 'Custom Themed Yearbooks',
    subtitle: 'With a beautiful gradient header',
    theme: customTheme
  };

  return (
    <div className="example-container">
      <h2>Custom Theme</h2>
      <YearbookPortalWidget
        schoolId="demo-school-123"
        config={config}
      />
    </div>
  );
};

// Example 3: Dark Theme
export const DarkThemeExample = () => {
  const config = {
    title: 'Dark Mode Yearbooks',
    subtitle: 'Perfect for evening browsing',
    theme: YearbookConfig.themes.dark
  };

  return (
    <div className="example-container dark-bg">
      <h2>Dark Theme</h2>
      <YearbookPortalWidget
        schoolId="demo-school-123"
        config={config}
        theme="dark"
      />
    </div>
  );
};

// Example 4: Minimal Theme
export const MinimalThemeExample = () => {
  const config = {
    title: 'Minimal Yearbooks',
    subtitle: 'Clean and simple design',
    theme: YearbookConfig.themes.minimal,
    showFooter: false
  };

  return (
    <div className="example-container">
      <h2>Minimal Theme</h2>
      <YearbookPortalWidget
        schoolId="demo-school-123"
        config={config}
        theme="minimal"
      />
    </div>
  );
};

// Example 5: School Branded Theme
export const SchoolBrandedExample = () => {
  const config = {
    title: 'Lincoln High School Yearbooks',
    subtitle: 'Celebrating our school\'s history since 1950',
    theme: YearbookConfig.themes.school,
    showDescription: true,
    maxDescriptionLength: 120
  };

  return (
    <div className="example-container">
      <h2>School Branded Theme</h2>
      <YearbookPortalWidget
        schoolId="lincoln-high-123"
        config={config}
        theme="school"
      />
    </div>
  );
};

// Example 6: Elementary School Preset
export const ElementarySchoolExample = () => {
  const config = YearbookConfig.presets.elementary;

  return (
    <div className="example-container">
      <h2>Elementary School Preset</h2>
      <YearbookPortalWidget
        schoolId="elementary-school-123"
        config={config}
      />
    </div>
  );
};

// Example 7: High School Preset
export const HighSchoolExample = () => {
  const config = YearbookConfig.presets.highSchool;

  return (
    <div className="example-container">
      <h2>High School Preset</h2>
      <YearbookPortalWidget
        schoolId="high-school-123"
        config={config}
      />
    </div>
  );
};

// Example 8: University Preset
export const UniversityExample = () => {
  const config = YearbookConfig.presets.university;

  return (
    <div className="example-container">
      <h2>University Preset</h2>
      <YearbookPortalWidget
        schoolId="university-123"
        config={config}
      />
    </div>
  );
};

// Example 9: Mobile Optimized
export const MobileOptimizedExample = () => {
  const config = YearbookConfig.presets.mobile;

  return (
    <div className="example-container mobile-container">
      <h2>Mobile Optimized</h2>
      <YearbookPortalWidget
        schoolId="mobile-school-123"
        config={config}
      />
    </div>
  );
};

// Example 10: Advanced Configuration
export const AdvancedConfigurationExample = () => {
  const [selectedYearbook, setSelectedYearbook] = useState(null);

  const handleYearbookSelect = useCallback((yearbook) => {
    setSelectedYearbook(yearbook);
  }, []);

  const customTheme = createCustomTheme('default', {
    container: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '20px'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px 20px 0 0'
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    actionButton: {
      backgroundColor: '#667eea',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px'
    }
  });

  const config = {
    title: 'Advanced Yearbook Portal',
    subtitle: 'Fully customized with advanced features',
    theme: customTheme,
    enableSearch: true,
    enableFilters: true,
    enableSorting: true,
    enablePreview: true,
    enableDownload: true,
    showStatusBadges: true,
    showPageCount: true,
    showPublishDate: true,
    showDescription: true,
    maxDescriptionLength: 150,
    itemsPerPage: 9,
    enablePagination: false,
    showFooter: true,
    footerText: 'Powered by School SIS Yearbook Portal'
  };

  return (
    <div className="example-container">
      <h2>Advanced Configuration</h2>
      <YearbookPortalWidget
        schoolId="advanced-school-123"
        config={config}
        onYearbookSelect={handleYearbookSelect}
        className="advanced-widget"
      />
      
      {selectedYearbook && (
        <div className="selected-yearbook-info">
          <h3>Selected Yearbook</h3>
          <p><strong>Title:</strong> {selectedYearbook.title}</p>
          <p><strong>Year:</strong> {selectedYearbook.academic_year}</p>
          <p><strong>Status:</strong> {selectedYearbook.is_published ? 'Published' : 'Draft'}</p>
        </div>
      )}
    </div>
  );
};

// Example 11: Library/Archive Theme
export const LibraryArchiveExample = () => {
  const config = {
    title: 'Historical Yearbook Collection',
    subtitle: 'Preserving school history for future generations',
    theme: YearbookConfig.themes.minimal,
    showDescription: true,
    maxDescriptionLength: 200,
    enablePagination: true,
    itemsPerPage: 15,
    gridMinWidth: '300px'
  };

  return (
    <div className="example-container">
      <h2>Library/Archive Theme</h2>
      <YearbookPortalWidget
        schoolId="library-archive-123"
        config={config}
      />
    </div>
  );
};

// Example 12: Corporate/Organization Theme
export const CorporateThemeExample = () => {
  const corporateTheme = createCustomTheme('minimal', {
    header: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
      color: '#ffffff'
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '600'
    },
    card: {
      border: '1px solid #e5e7eb',
      borderRadius: '8px'
    },
    actionButton: {
      backgroundColor: '#1e3a8a',
      color: '#ffffff',
      border: 'none'
    }
  });

  const config = {
    title: 'Organization Yearbooks',
    subtitle: 'Professional yearbook collection',
    theme: corporateTheme,
    showFooter: true,
    footerText: '© 2024 Organization Name. All rights reserved.'
  };

  return (
    <div className="example-container">
      <h2>Corporate/Organization Theme</h2>
      <YearbookPortalWidget
        schoolId="corporate-org-123"
        config={config}
      />
    </div>
  );
};

// Main Examples Component
const YearbookWidgetExamples = () => {
  const [activeExample, setActiveExample] = useState('basic');

  const examples = {
    basic: { component: BasicExample, title: 'Basic Usage' },
    customTheme: { component: CustomThemeExample, title: 'Custom Theme' },
    darkTheme: { component: DarkThemeExample, title: 'Dark Theme' },
    minimalTheme: { component: MinimalThemeExample, title: 'Minimal Theme' },
    schoolBranded: { component: SchoolBrandedExample, title: 'School Branded' },
    elementary: { component: ElementarySchoolExample, title: 'Elementary School' },
    highSchool: { component: HighSchoolExample, title: 'High School' },
    university: { component: UniversityExample, title: 'University' },
    mobile: { component: MobileOptimizedExample, title: 'Mobile Optimized' },
    advanced: { component: AdvancedConfigurationExample, title: 'Advanced Config' },
    library: { component: LibraryArchiveExample, title: 'Library/Archive' },
    corporate: { component: CorporateThemeExample, title: 'Corporate Theme' }
  };

  const ActiveComponent = examples[activeExample].component;

  return (
    <div className="yearbook-examples">
      <header className="examples-header">
        <h1>Yearbook Portal Widget Examples</h1>
        <p>Explore different configurations and use cases</p>
      </header>

      <nav className="examples-nav">
        {Object.entries(examples).map(([key, example]) => (
          <button
            key={key}
            className={`nav-button ${activeExample === key ? 'active' : ''}`}
            onClick={() => setActiveExample(key)}
          >
            {example.title}
          </button>
        ))}
      </nav>

      <main className="examples-content">
        <ActiveComponent />
      </main>

      <footer className="examples-footer">
        <p>These examples demonstrate the flexibility and customization options of the Yearbook Portal Widget.</p>
        <p>Each example can be used as a starting point for your specific use case.</p>
      </footer>
    </div>
  );
};

export default YearbookWidgetExamples;

// Additional CSS for examples
const examplesStyles = `
.example-container {
  margin: 2rem 0;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background-color: #ffffff;
}

.example-container h2 {
  margin-top: 0;
  color: #111827;
  font-size: 1.5rem;
  font-weight: 600;
}

.dark-bg {
  background-color: #1f2937;
  color: #f9fafb;
}

.mobile-container {
  max-width: 400px;
  margin: 2rem auto;
}

.selected-yearbook-info {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f3f4f6;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.selected-yearbook-info h3 {
  margin-top: 0;
  color: #1f2937;
}

.yearbook-examples {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.examples-header {
  text-align: center;
  margin-bottom: 3rem;
}

.examples-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.examples-header p {
  font-size: 1.125rem;
  color: #6b7280;
}

.examples-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.nav-button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #ffffff;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-button:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.nav-button.active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.examples-content {
  min-height: 600px;
}

.examples-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  color: #6b7280;
}

.examples-footer p {
  margin: 0.5rem 0;
}

@media (max-width: 768px) {
  .examples-nav {
    flex-direction: column;
  }
  
  .nav-button {
    width: 100%;
    text-align: center;
  }
  
  .example-container {
    padding: 1rem;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = examplesStyles;
  document.head.appendChild(styleSheet);
}
