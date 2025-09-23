/**
 * Internationalization (i18n) Configuration
 * 
 * This file configures react-i18next for dynamic language switching.
 * Supports multiple languages with fallback to English.
 * 
 * API Endpoints:
 * - GET /api/tenants/{tenantId}/translations/{language} - Fetch translations
 * - GET /api/tenants/{tenantId}/supported-languages - Get supported languages
 * 
 * Expected Data Structure:
 * {
 *   "en": {
 *     "common": {
 *       "dashboard": "Dashboard",
 *       "students": "Students",
 *       "teachers": "Teachers"
 *     },
 *     "navigation": {
 *       "home": "Home",
 *       "portal": "Portal",
 *       "yearbook": "Yearbook"
 *     }
 *   }
 * }
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Default translations
const defaultTranslations = {
  en: {
    common: {
      dashboard: 'Dashboard',
      portal: 'Portal',
      yearbook: 'Yearbook',
      payments: 'Payments',
      archive: 'Archive',
      students: 'Students',
      teachers: 'Teachers',
      courses: 'Courses',
      grades: 'Grades',
      attendance: 'Attendance',
      announcements: 'Announcements',
      messages: 'Messages',
      settings: 'Settings',
      reports: 'Reports',
      users: 'Users',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      logout: 'Logout',
      login: 'Login',
      register: 'Register',
      profile: 'Profile',
      notifications: 'Notifications',
      help: 'Help',
      support: 'Support',
      about: 'About',
      version: 'Version',
      lastUpdated: 'Last Updated',
      total: 'Total',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      yes: 'Yes',
      no: 'No',
      none: 'None',
      all: 'All',
      select: 'Select',
      clear: 'Clear',
      apply: 'Apply',
      reset: 'Reset',
      close: 'Close',
      open: 'Open',
      expand: 'Expand',
      collapse: 'Collapse',
      show: 'Show',
      hide: 'Hide',
      enable: 'Enable',
      disable: 'Disable',
      on: 'On',
      off: 'Off',
      true: 'True',
      false: 'False'
    },
    navigation: {
      home: 'Home',
      dashboard: 'Dashboard',
      portal: 'Portal',
      yearbook: 'Yearbook',
      payments: 'Payments',
      archive: 'Archive',
      students: 'Students',
      teachers: 'Teachers',
      courses: 'Courses',
      grades: 'Grades',
      attendance: 'Attendance',
      announcements: 'Announcements',
      messages: 'Messages',
      settings: 'Settings',
      reports: 'Reports',
      users: 'Users',
      admin: 'Administration'
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome to your dashboard',
      overview: 'Overview',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      statistics: 'Statistics',
      charts: 'Charts',
      notifications: 'Notifications',
      upcomingEvents: 'Upcoming Events',
      announcements: 'Announcements',
      studentCount: 'Total Students',
      teacherCount: 'Total Teachers',
      courseCount: 'Total Courses',
      attendanceRate: 'Attendance Rate',
      averageGrade: 'Average Grade',
      viewAll: 'View All',
      viewDetails: 'View Details'
    },
    portal: {
      title: 'Student Portal',
      studentInfo: 'Student Information',
      academicProgress: 'Academic Progress',
      schedule: 'Schedule',
      assignments: 'Assignments',
      grades: 'Grades',
      attendance: 'Attendance',
      clubs: 'Clubs & Activities',
      sports: 'Sports',
      events: 'Events',
      resources: 'Resources',
      announcements: 'Announcements',
      messages: 'Messages',
      profile: 'Profile',
      settings: 'Settings'
    },
    yearbook: {
      title: 'Yearbook',
      currentYear: 'Current Year',
      pastYears: 'Past Years',
      photos: 'Photos',
      signatures: 'Signatures',
      memories: 'Memories',
      upload: 'Upload Photo',
      view: 'View Yearbook',
      download: 'Download',
      share: 'Share',
      print: 'Print',
      edit: 'Edit',
      delete: 'Delete',
      caption: 'Caption',
      tags: 'Tags',
      date: 'Date',
      location: 'Location',
      people: 'People',
      events: 'Events',
      clubs: 'Clubs',
      sports: 'Sports',
      achievements: 'Achievements',
      quotes: 'Quotes',
      memories: 'Memories'
    },
    payments: {
      title: 'Payments',
      outstanding: 'Outstanding Payments',
      history: 'Payment History',
      methods: 'Payment Methods',
      receipts: 'Receipts',
      invoices: 'Invoices',
      fees: 'Fees',
      tuition: 'Tuition',
      books: 'Books & Supplies',
      activities: 'Activities',
      meals: 'Meals',
      transportation: 'Transportation',
      other: 'Other',
      amount: 'Amount',
      dueDate: 'Due Date',
      status: 'Status',
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
      payNow: 'Pay Now',
      schedulePayment: 'Schedule Payment',
      paymentMethod: 'Payment Method',
      card: 'Credit/Debit Card',
      bank: 'Bank Transfer',
      check: 'Check',
      cash: 'Cash',
      other: 'Other'
    },
    archive: {
      title: 'Archive',
      studentRecords: 'Student Records',
      academicHistory: 'Academic History',
      transcripts: 'Transcripts',
      certificates: 'Certificates',
      documents: 'Documents',
      photos: 'Photos',
      videos: 'Videos',
      audio: 'Audio',
      search: 'Search Archive',
      filter: 'Filter by',
      year: 'Year',
      grade: 'Grade',
      subject: 'Subject',
      type: 'Type',
      date: 'Date',
      student: 'Student',
      teacher: 'Teacher',
      download: 'Download',
      view: 'View',
      share: 'Share',
      export: 'Export',
      print: 'Print'
    },
    charts: {
      attendance: 'Attendance Trends',
      grades: 'Grade Distribution',
      enrollment: 'Enrollment Statistics',
      performance: 'Performance Metrics',
      demographics: 'Demographics',
      activities: 'Activity Participation',
      monthly: 'Monthly',
      weekly: 'Weekly',
      daily: 'Daily',
      yearly: 'Yearly',
      semester: 'Semester',
      quarter: 'Quarter',
      period: 'Period',
      subject: 'Subject',
      grade: 'Grade',
      class: 'Class',
      student: 'Student',
      teacher: 'Teacher',
      average: 'Average',
      total: 'Total',
      count: 'Count',
      percentage: 'Percentage',
      ratio: 'Ratio',
      trend: 'Trend',
      comparison: 'Comparison',
      distribution: 'Distribution',
      correlation: 'Correlation'
    },
    tables: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      grade: 'Grade',
      class: 'Class',
      subject: 'Subject',
      teacher: 'Teacher',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      action: 'Action',
      actions: 'Actions',
      id: 'ID',
      type: 'Type',
      description: 'Description',
      amount: 'Amount',
      balance: 'Balance',
      dueDate: 'Due Date',
      paidDate: 'Paid Date',
      method: 'Method',
      reference: 'Reference',
      notes: 'Notes',
      created: 'Created',
      updated: 'Updated',
      lastLogin: 'Last Login',
      role: 'Role',
      permissions: 'Permissions',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
      deleted: 'Deleted',
      noData: 'No data available',
      loading: 'Loading data...',
      error: 'Error loading data',
      retry: 'Retry',
      refresh: 'Refresh',
      export: 'Export',
      print: 'Print',
      selectAll: 'Select All',
      selectNone: 'Select None',
      selected: 'Selected',
      items: 'items',
      page: 'Page',
      of: 'of',
      rowsPerPage: 'Rows per page',
      goToPage: 'Go to page',
      firstPage: 'First page',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      lastPage: 'Last page'
    },
    notifications: {
      title: 'Notifications',
      new: 'New',
      unread: 'Unread',
      read: 'Read',
      all: 'All',
      markAsRead: 'Mark as Read',
      markAllAsRead: 'Mark All as Read',
      delete: 'Delete',
      deleteAll: 'Delete All',
      settings: 'Notification Settings',
      types: {
        announcement: 'Announcement',
        assignment: 'Assignment',
        grade: 'Grade',
        attendance: 'Attendance',
        payment: 'Payment',
        event: 'Event',
        message: 'Message',
        system: 'System',
        security: 'Security',
        maintenance: 'Maintenance'
      },
      noNotifications: 'No notifications',
      loading: 'Loading notifications...',
      error: 'Error loading notifications'
    },
    errors: {
      generic: 'An error occurred',
      network: 'Network error',
      unauthorized: 'Unauthorized access',
      forbidden: 'Access forbidden',
      notFound: 'Resource not found',
      serverError: 'Server error',
      validation: 'Validation error',
      timeout: 'Request timeout',
      offline: 'You are offline',
      retry: 'Retry',
      goBack: 'Go Back',
      contactSupport: 'Contact Support'
    }
  },
  es: {
    common: {
      dashboard: 'Panel de Control',
      portal: 'Portal',
      yearbook: 'Anuario',
      payments: 'Pagos',
      archive: 'Archivo',
      students: 'Estudiantes',
      teachers: 'Maestros',
      courses: 'Cursos',
      grades: 'Calificaciones',
      attendance: 'Asistencia',
      announcements: 'Anuncios',
      messages: 'Mensajes',
      settings: 'Configuración',
      reports: 'Reportes',
      users: 'Usuarios',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      view: 'Ver',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
      import: 'Importar',
      refresh: 'Actualizar',
      logout: 'Cerrar Sesión',
      login: 'Iniciar Sesión',
      register: 'Registrar',
      profile: 'Perfil',
      notifications: 'Notificaciones',
      help: 'Ayuda',
      support: 'Soporte',
      about: 'Acerca de',
      version: 'Versión',
      lastUpdated: 'Última Actualización',
      total: 'Total',
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      completed: 'Completado',
      failed: 'Fallido',
      yes: 'Sí',
      no: 'No',
      none: 'Ninguno',
      all: 'Todos',
      select: 'Seleccionar',
      clear: 'Limpiar',
      apply: 'Aplicar',
      reset: 'Restablecer',
      close: 'Cerrar',
      open: 'Abrir',
      expand: 'Expandir',
      collapse: 'Contraer',
      show: 'Mostrar',
      hide: 'Ocultar',
      enable: 'Habilitar',
      disable: 'Deshabilitar',
      on: 'Encendido',
      off: 'Apagado',
      true: 'Verdadero',
      false: 'Falso'
    }
  }
};

/**
 * Load translations from API
 * @param {string} tenantId - Tenant identifier
 * @param {string} language - Language code
 * @returns {Promise<Object>} Translations object
 */
export const loadTranslations = async (tenantId = 'default', language = 'en') => {
  try {
    const response = await fetch(`/api/tenants/${tenantId}/translations/${language}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error);
  }
  
  // Fallback to default translations
  return defaultTranslations[language] || defaultTranslations.en;
};

/**
 * Get supported languages from API
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Array>} Array of supported language codes
 */
export const getSupportedLanguages = async (tenantId = 'default') => {
  try {
    const response = await fetch(`/api/tenants/${tenantId}/supported-languages`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to load supported languages:', error);
  }
  
  // Fallback to default languages
  return ['en', 'es'];
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: defaultTranslations,
    lng: 'en',
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'navigation', 'dashboard', 'portal', 'yearbook', 'payments', 'archive', 'charts', 'tables', 'notifications', 'errors'],
    
    // Language detection
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // Backend configuration for dynamic loading
    backend: {
      loadPath: '/api/tenants/{{tenantId}}/translations/{{lng}}',
    },
  });

export default i18n;
