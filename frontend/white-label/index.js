/**
 * White-Label Frontend Module
 * 
 * Provides embeddable white-label frontend components for schools
 * to integrate archive browsing and media access into their websites.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container, Typography, Alert, CircularProgress } from '@mui/material';

// Import components
import ArchiveBrowser from './components/ArchiveBrowser';
import MediaViewer from './components/MediaViewer';
import SearchInterface from './components/SearchInterface';
import UserAuth from './components/UserAuth';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

// Import services
import { WhiteLabelService } from './services/WhiteLabelService';
import { ArchiveService } from './services/ArchiveService';
import { AuthService } from './services/AuthService';

// Import hooks
import { useTenantConfig } from './hooks/useTenantConfig';
import { useArchiveData } from './hooks/useArchiveData';
import { useAuth } from './hooks/useAuth';

/**
 * Main White-Label Application Component
 */
const WhiteLabelApp = ({ tenantId, config = {} }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(null);
  
  // Custom hooks
  const { tenantConfig, loading: configLoading } = useTenantConfig(tenantId);
  const { user, login, logout, loading: authLoading } = useAuth();
  const { archives, loading: archivesLoading } = useArchiveData(tenantId);

  // Initialize white-label service
  const whiteLabelService = new WhiteLabelService(tenantId, config);
  const archiveService = new ArchiveService(tenantId);
  const authService = new AuthService(tenantId);

  useEffect(() => {
    initializeApp();
  }, [tenantId]);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tenant configuration
      await whiteLabelService.loadConfiguration();

      // Create theme based on tenant branding
      const customTheme = createTheme({
        palette: {
          primary: {
            main: tenantConfig?.branding?.primaryColor || '#1976d2',
          },
          secondary: {
            main: tenantConfig?.branding?.secondaryColor || '#dc004e',
          },
          background: {
            default: tenantConfig?.branding?.backgroundColor || '#f5f5f5',
          },
        },
        typography: {
          fontFamily: tenantConfig?.branding?.fontFamily || '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: tenantConfig?.branding?.buttonRadius || 4,
              },
            },
          },
        },
      });

      setTheme(customTheme);
      setLoading(false);

    } catch (err) {
      console.error('Failed to initialize white-label app:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = useCallback(async (credentials) => {
    try {
      await login(credentials);
    } catch (err) {
      throw err;
    }
  }, [login]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [logout]);

  if (loading || configLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Failed to Load</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!theme) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Navigation */}
          <Navigation
            tenantConfig={tenantConfig}
            user={user}
            onLogout={handleLogout}
            loading={authLoading}
          />

          {/* Main Content */}
          <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
            <Container maxWidth="xl">
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/"
                  element={
                    <ArchiveBrowser
                      archives={archives}
                      loading={archivesLoading}
                      tenantConfig={tenantConfig}
                      user={user}
                    />
                  }
                />
                <Route
                  path="/search"
                  element={
                    <SearchInterface
                      tenantConfig={tenantConfig}
                      user={user}
                    />
                  }
                />
                <Route
                  path="/media/:itemId"
                  element={
                    <MediaViewer
                      tenantConfig={tenantConfig}
                      user={user}
                    />
                  }
                />

                {/* Authentication Routes */}
                <Route
                  path="/login"
                  element={
                    user ? (
                      <Navigate to="/" replace />
                    ) : (
                      <UserAuth
                        onLogin={handleLogin}
                        tenantConfig={tenantConfig}
                        loading={authLoading}
                      />
                    )
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/admin/*"
                  element={
                    user ? (
                      <AdminPanel
                        tenantConfig={tenantConfig}
                        user={user}
                      />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />

                {/* 404 Route */}
                <Route
                  path="*"
                  element={
                    <Box textAlign="center" py={8}>
                      <Typography variant="h4" gutterBottom>
                        404 - Page Not Found
                      </Typography>
                      <Typography variant="body1">
                        The page you're looking for doesn't exist.
                      </Typography>
                    </Box>
                  }
                />
              </Routes>
            </Container>
          </Box>

          {/* Footer */}
          <Footer tenantConfig={tenantConfig} />
        </Box>
      </Router>
    </ThemeProvider>
  );
};

/**
 * Admin Panel Component (Protected)
 */
const AdminPanel = ({ tenantConfig, user }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      <Typography variant="body1">
        Welcome, {user.name}! This is the admin panel for managing archives and settings.
      </Typography>
      {/* Admin functionality would be implemented here */}
    </Box>
  );
};

/**
 * Archive Browser Component
 */
const ArchiveBrowser = ({ archives, loading, tenantConfig, user }) => {
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          {tenantConfig?.branding?.title || 'Digital Archive'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {tenantConfig?.branding?.subtitle || 'Browse and access your school\'s digital resources'}
        </Typography>
      </Box>

      {/* Archive Selection */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Select Archive
        </Typography>
        {/* Archive selection component would be implemented here */}
      </Box>

      {/* Archive Content */}
      {selectedArchive && (
        <Box>
          <Typography variant="h5" gutterBottom>
            {selectedArchive.name}
          </Typography>
          {/* Archive content browser would be implemented here */}
        </Box>
      )}
    </Box>
  );
};

/**
 * Media Viewer Component
 */
const MediaViewer = ({ tenantConfig, user }) => {
  const [mediaItem, setMediaItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load media item based on URL parameter
    // Implementation would go here
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Media Viewer
      </Typography>
      {/* Media viewer implementation would go here */}
    </Box>
  );
};

/**
 * Search Interface Component
 */
const SearchInterface = ({ tenantConfig, user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Implement search functionality
      // const results = await archiveService.search(query);
      // setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Search Archive
      </Typography>
      {/* Search interface implementation would go here */}
    </Box>
  );
};

/**
 * User Authentication Component
 */
const UserAuth = ({ onLogin, tenantConfig, loading }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onLogin(credentials);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Box maxWidth="sm" mx="auto" mt={8}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Sign In
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
        Access your school's digital archive
      </Typography>
      
      {/* Login form implementation would go here */}
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        {/* Form fields would be implemented here */}
      </Box>
    </Box>
  );
};

/**
 * Navigation Component
 */
const Navigation = ({ tenantConfig, user, onLogout, loading }) => {
  return (
    <Box
      component="nav"
      sx={{
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        py: 1,
        px: 2
      }}
    >
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {/* Logo/Brand */}
          <Box display="flex" alignItems="center">
            {tenantConfig?.branding?.logo && (
              <Box
                component="img"
                src={tenantConfig.branding.logo}
                alt={tenantConfig.branding.title}
                sx={{ height: 40, mr: 2 }}
              />
            )}
            <Typography variant="h6" component="div">
              {tenantConfig?.branding?.title || 'Digital Archive'}
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box display="flex" gap={2}>
            <Typography variant="body2" component="a" href="/" sx={{ color: 'inherit', textDecoration: 'none' }}>
              Browse
            </Typography>
            <Typography variant="body2" component="a" href="/search" sx={{ color: 'inherit', textDecoration: 'none' }}>
              Search
            </Typography>
            {user && (
              <Typography variant="body2" component="a" href="/admin" sx={{ color: 'inherit', textDecoration: 'none' }}>
                Admin
              </Typography>
            )}
          </Box>

          {/* User Menu */}
          <Box display="flex" alignItems="center" gap={2}>
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : user ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2">
                  {user.name}
                </Typography>
                <Typography
                  variant="body2"
                  component="button"
                  onClick={onLogout}
                  sx={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Logout
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" component="a" href="/login" sx={{ color: 'inherit', textDecoration: 'none' }}>
                Sign In
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

/**
 * Footer Component
 */
const Footer = ({ tenantConfig }) => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'grey.100',
        py: 3,
        mt: 'auto'
      }}
    >
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {tenantConfig?.branding?.title || 'Digital Archive'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Powered by School SIS
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default WhiteLabelApp;
