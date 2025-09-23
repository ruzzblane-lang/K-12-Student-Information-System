/**
 * Yearbook Portal Widget Configuration
 * Provides default settings and theme configurations for white-label customization
 */

export const YearbookConfig = {
  // Default configuration
  defaults: {
    title: 'Yearbook Portal',
    subtitle: 'Browse and access your school\'s yearbooks',
    showFooter: true,
    footerText: null, // Will be auto-generated if not provided
    enableSearch: true,
    enableFilters: true,
    enableSorting: true,
    itemsPerPage: 12,
    enablePagination: false,
    enablePreview: true,
    enableDownload: true,
    enableSelection: true,
    showStatusBadges: true,
    showPageCount: true,
    showPublishDate: true,
    showDescription: true,
    maxDescriptionLength: 100,
    cardAspectRatio: '4:3',
    gridColumns: 'auto-fill',
    gridMinWidth: '300px',
    animationDuration: 300,
    enableHoverEffects: true,
    enableClickToSelect: true,
    enableKeyboardNavigation: true,
    enableAccessibility: true,
    loadingMessage: 'Loading yearbooks...',
    errorMessage: 'Failed to load yearbooks',
    emptyMessage: 'No yearbooks found',
    retryButtonText: 'Try Again',
    clearSearchText: 'Clear Search',
    previewButtonText: 'Preview',
    downloadButtonText: 'Download',
    allYearsText: 'All Years',
    sortOptions: {
      'year-desc': 'Year (Newest First)',
      'year-asc': 'Year (Oldest First)',
      'title-asc': 'Title (A-Z)',
      'title-desc': 'Title (Z-A)',
      'publish_date-desc': 'Publish Date (Newest First)',
      'publish_date-asc': 'Publish Date (Oldest First)'
    }
  },

  // Theme configurations
  themes: {
    default: {
      container: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      },
      header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        padding: '1.5rem'
      },
      title: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.2'
      },
      subtitle: {
        fontSize: '0.875rem',
        opacity: '0.9',
        margin: '0',
        lineHeight: '1.4'
      },
      filters: {
        backgroundColor: '#f9fafb',
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb'
      },
      input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff'
      },
      select: {
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff',
        cursor: 'pointer'
      },
      card: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      },
      cardTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.3',
        color: '#111827'
      },
      cardSubtitle: {
        fontSize: '0.875rem',
        fontWeight: '500',
        margin: '0 0 0.75rem 0',
        color: '#6b7280'
      },
      cardText: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        margin: '0 0 1rem 0',
        color: '#4b5563'
      },
      metaText: {
        fontSize: '0.75rem',
        color: '#9ca3af'
      },
      statusBadge: {
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      actionButton: {
        flex: '1',
        padding: '0.5rem 0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      },
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'background-color 0.2s'
      },
      footer: {
        backgroundColor: '#f9fafb',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      },
      footerText: {
        margin: '0',
        fontSize: '0.875rem',
        color: '#6b7280'
      },
      text: {
        color: '#374151',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }
    },

    dark: {
      container: {
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        border: '1px solid #4b5563',
        color: '#f9fafb'
      },
      header: {
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        color: '#ffffff',
        padding: '1.5rem'
      },
      title: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.2',
        color: '#ffffff'
      },
      subtitle: {
        fontSize: '0.875rem',
        opacity: '0.9',
        margin: '0',
        lineHeight: '1.4',
        color: '#ffffff'
      },
      filters: {
        backgroundColor: '#374151',
        padding: '1.5rem',
        borderBottom: '1px solid #4b5563'
      },
      input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #4b5563',
        borderRadius: '8px',
        fontSize: '0.875rem',
        backgroundColor: '#1f2937',
        color: '#f9fafb'
      },
      select: {
        padding: '0.5rem',
        border: '1px solid #4b5563',
        borderRadius: '6px',
        fontSize: '0.875rem',
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        cursor: 'pointer'
      },
      card: {
        backgroundColor: '#374151',
        border: '1px solid #4b5563',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        color: '#f9fafb'
      },
      cardTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.3',
        color: '#f9fafb'
      },
      cardSubtitle: {
        fontSize: '0.875rem',
        fontWeight: '500',
        margin: '0 0 0.75rem 0',
        color: '#d1d5db'
      },
      cardText: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        margin: '0 0 1rem 0',
        color: '#e5e7eb'
      },
      metaText: {
        fontSize: '0.75rem',
        color: '#9ca3af'
      },
      statusBadge: {
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      actionButton: {
        flex: '1',
        padding: '0.5rem 0.75rem',
        border: '1px solid #4b5563',
        borderRadius: '6px',
        backgroundColor: '#374151',
        color: '#f9fafb',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      },
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'background-color 0.2s'
      },
      footer: {
        backgroundColor: '#374151',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #4b5563',
        textAlign: 'center'
      },
      footerText: {
        margin: '0',
        fontSize: '0.875rem',
        color: '#d1d5db'
      },
      text: {
        color: '#f9fafb',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }
    },

    minimal: {
      container: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: 'none',
        border: '1px solid #e5e7eb'
      },
      header: {
        background: '#ffffff',
        color: '#111827',
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb'
      },
      title: {
        fontSize: '1.25rem',
        fontWeight: '600',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.2',
        color: '#111827'
      },
      subtitle: {
        fontSize: '0.875rem',
        margin: '0',
        lineHeight: '1.4',
        color: '#6b7280'
      },
      filters: {
        backgroundColor: '#ffffff',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb'
      },
      input: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff'
      },
      select: {
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff',
        cursor: 'pointer'
      },
      card: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      cardTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.3',
        color: '#111827'
      },
      cardSubtitle: {
        fontSize: '0.875rem',
        fontWeight: '500',
        margin: '0 0 0.75rem 0',
        color: '#6b7280'
      },
      cardText: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        margin: '0 0 1rem 0',
        color: '#4b5563'
      },
      metaText: {
        fontSize: '0.75rem',
        color: '#9ca3af'
      },
      statusBadge: {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      actionButton: {
        flex: '1',
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      },
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#6b7280',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'background-color 0.2s'
      },
      footer: {
        backgroundColor: '#ffffff',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      },
      footerText: {
        margin: '0',
        fontSize: '0.875rem',
        color: '#6b7280'
      },
      text: {
        color: '#374151',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }
    },

    school: {
      container: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
      },
      header: {
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: '#ffffff',
        padding: '1.5rem'
      },
      title: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.2',
        color: '#ffffff'
      },
      subtitle: {
        fontSize: '0.875rem',
        opacity: '0.9',
        margin: '0',
        lineHeight: '1.4',
        color: '#ffffff'
      },
      filters: {
        backgroundColor: '#f0fdf4',
        padding: '1.5rem',
        borderBottom: '1px solid #bbf7d0'
      },
      input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff'
      },
      select: {
        padding: '0.5rem',
        border: '1px solid #bbf7d0',
        borderRadius: '6px',
        fontSize: '0.875rem',
        backgroundColor: '#ffffff',
        cursor: 'pointer'
      },
      card: {
        backgroundColor: '#ffffff',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      },
      cardTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        margin: '0 0 0.5rem 0',
        lineHeight: '1.3',
        color: '#111827'
      },
      cardSubtitle: {
        fontSize: '0.875rem',
        fontWeight: '500',
        margin: '0 0 0.75rem 0',
        color: '#059669'
      },
      cardText: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        margin: '0 0 1rem 0',
        color: '#4b5563'
      },
      metaText: {
        fontSize: '0.75rem',
        color: '#6b7280'
      },
      statusBadge: {
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      actionButton: {
        flex: '1',
        padding: '0.5rem 0.75rem',
        border: '1px solid #bbf7d0',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      },
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#059669',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'background-color 0.2s'
      },
      footer: {
        backgroundColor: '#f0fdf4',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #bbf7d0',
        textAlign: 'center'
      },
      footerText: {
        margin: '0',
        fontSize: '0.875rem',
        color: '#6b7280'
      },
      text: {
        color: '#374151',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }
    }
  },

  // Predefined configurations for common use cases
  presets: {
    // For elementary schools
    elementary: {
      title: 'Our Yearbooks',
      subtitle: 'Discover memories from our school year',
      theme: 'school',
      showDescription: true,
      maxDescriptionLength: 80,
      gridMinWidth: '280px'
    },

    // For high schools
    highSchool: {
      title: 'Yearbook Archive',
      subtitle: 'Browse through years of memories',
      theme: 'default',
      showDescription: true,
      maxDescriptionLength: 120,
      gridMinWidth: '320px',
      enablePagination: true,
      itemsPerPage: 9
    },

    // For universities
    university: {
      title: 'Yearbook Collection',
      subtitle: 'Academic yearbooks and publications',
      theme: 'minimal',
      showDescription: true,
      maxDescriptionLength: 150,
      gridMinWidth: '350px',
      enablePagination: true,
      itemsPerPage: 12
    },

    // For public libraries
    library: {
      title: 'Yearbook Collection',
      subtitle: 'Historical yearbooks and school publications',
      theme: 'minimal',
      showDescription: true,
      maxDescriptionLength: 200,
      gridMinWidth: '300px',
      enablePagination: true,
      itemsPerPage: 15
    },

    // For mobile/embedded use
    mobile: {
      title: 'Yearbooks',
      subtitle: null,
      theme: 'minimal',
      showDescription: false,
      gridMinWidth: '250px',
      enablePagination: true,
      itemsPerPage: 6,
      showFooter: false
    }
  }
};

// Helper function to create custom theme
export const createCustomTheme = (baseTheme = 'default', customizations = {}) => {
  const base = YearbookConfig.themes[baseTheme] || YearbookConfig.themes.default;
  return {
    ...base,
    ...customizations
  };
};

// Helper function to merge configurations
export const mergeConfig = (defaultConfig, customConfig) => {
  return {
    ...defaultConfig,
    ...customConfig,
    theme: {
      ...defaultConfig.theme,
      ...customConfig.theme
    }
  };
};

export default YearbookConfig;
