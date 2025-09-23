import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import MainLayout from './layouts/MainLayout';
import StudentsPage from './pages/StudentsPage';
import YearbookPortalPage from './pages/YearbookPortalPage';
import DashboardPage from './pages/DashboardPage';
import PortalPage from './pages/PortalPage';
import YearbookPage from './pages/YearbookPage';
import PaymentsPage from './pages/PaymentsPage';
import ArchivePage from './pages/ArchivePage';
import { applyTheme, getTheme } from './config/theme';
import './config/i18n';

function App() {
  useEffect(() => {
    // Initialize theme and i18n
    const initializeApp = async () => {
      try {
        // Load theme
        const theme = await getTheme('default');
        applyTheme(theme);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <MainLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/portal" element={<PortalPage />} />
              <Route path="/yearbook" element={<YearbookPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/yearbooks" element={<YearbookPortalPage />} />
              <Route path="/yearbooks/:schoolId" element={<YearbookPortalPage />} />
            </Routes>
          </MainLayout>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;