import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import StudentsPage from './pages/StudentsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <MainLayout>
          <Routes>
            <Route path="/" element={<StudentsPage />} />
            <Route path="/students" element={<StudentsPage />} />
          </Routes>
        </MainLayout>
      </div>
    </Router>
  );
}

export default App;
