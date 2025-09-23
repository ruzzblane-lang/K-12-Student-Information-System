import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import StudentsPage from './pages/StudentsPage';
import YearbookPortalPage from './pages/YearbookPortalPage';

function App() {
  return (
    <Router>
      <div className="App">
        <MainLayout>
          <Routes>
            <Route path="/" element={<StudentsPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/yearbooks" element={<YearbookPortalPage />} />
            <Route path="/yearbooks/:schoolId" element={<YearbookPortalPage />} />
          </Routes>
        </MainLayout>
      </div>
    </Router>
  );
}

export default App;