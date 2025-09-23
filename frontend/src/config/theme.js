/**
 * White-Label Theme Configuration
 * 
 * This file contains CSS custom properties and theme configurations
 * for tenant-specific branding. White-labelers can customize:
 * - Colors (primary, secondary, accent)
 * - Fonts (primary, secondary, monospace)
 * - Logo URLs and branding elements
 * - Component-specific styling
 * 
 * API Endpoints:
 * - GET /api/tenants/{tenantId}/theme - Fetch tenant theme
 * - PUT /api/tenants/{tenantId}/theme - Update tenant theme
 * 
 * Expected Data Structure:
 * {
 *   "colors": {
 *     "primary": "#3B82F6",
 *     "secondary": "#10B981",
 *     "accent": "#F59E0B",
 *     "background": "#F9FAFB",
 *     "surface": "#FFFFFF",
 *     "text": "#111827",
 *     "textSecondary": "#6B7280"
 *   },
 *   "fonts": {
 *     "primary": "Inter, sans-serif",
 *     "secondary": "Roboto, sans-serif",
 *     "monospace": "Fira Code, monospace"
 *   },
 *   "branding": {
 *     "logo": "/logos/tenant-logo.png",
 *     "favicon": "/favicons/tenant-favicon.ico",
 *     "name": "School Name",
 *     "tagline": "Excellence in Education"
 *   },
 *   "layout": {
 *     "sidebarWidth": "16rem",
 *     "headerHeight": "4rem",
 *     "borderRadius": "0.5rem"
 *   }
 * }
 */

export const defaultTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  },
  fonts: {
    primary: 'Inter, system-ui, -apple-system, sans-serif',
    secondary: 'Roboto, system-ui, sans-serif',
    monospace: 'Fira Code, Consolas, monospace'
  },
  branding: {
    logo: '/logos/default-logo.png',
    favicon: '/favicons/default-favicon.ico',
    name: 'School SIS',
    tagline: 'Student Information System'
  },
  layout: {
    sidebarWidth: '16rem',
    headerHeight: '4rem',
    borderRadius: '0.5rem'
  }
};

/**
 * Apply theme to CSS custom properties
 * @param {Object} theme - Theme configuration object
 */
export const applyTheme = (theme = defaultTheme) => {
  const root = document.documentElement;
  
  // Apply colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Apply fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });
  
  // Apply layout
  Object.entries(theme.layout).forEach(([key, value]) => {
    root.style.setProperty(`--layout-${key}`, value);
  });
  
  // Update document title and favicon
  if (theme.branding.name) {
    document.title = theme.branding.name;
  }
  
  if (theme.branding.favicon) {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = theme.branding.favicon;
    }
  }
};

/**
 * Get theme from localStorage or API
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} Theme configuration
 */
export const getTheme = async (tenantId = 'default') => {
  try {
    // Try to fetch from API first
    const response = await fetch(`/api/tenants/${tenantId}/theme`);
    if (response.ok) {
      const theme = await response.json();
      return { ...defaultTheme, ...theme };
    }
  } catch (error) {
    console.warn('Failed to fetch theme from API:', error);
  }
  
  // Fallback to localStorage
  const storedTheme = localStorage.getItem(`theme-${tenantId}`);
  if (storedTheme) {
    try {
      return { ...defaultTheme, ...JSON.parse(storedTheme) };
    } catch (error) {
      console.warn('Failed to parse stored theme:', error);
    }
  }
  
  // Return default theme
  return defaultTheme;
};

/**
 * Save theme to localStorage and optionally API
 * @param {string} tenantId - Tenant identifier
 * @param {Object} theme - Theme configuration
 * @param {boolean} persistToApi - Whether to save to API
 */
export const saveTheme = async (tenantId = 'default', theme, persistToApi = false) => {
  // Save to localStorage
  localStorage.setItem(`theme-${tenantId}`, JSON.stringify(theme));
  
  // Optionally save to API
  if (persistToApi) {
    try {
      await fetch(`/api/tenants/${tenantId}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(theme),
      });
    } catch (error) {
      console.warn('Failed to save theme to API:', error);
    }
  }
};
