import React, { useState, useEffect, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import YearbookConfig from '../config/yearbookConfig';
import './AlumniPortal.css';

/**
 * Alumni Portal Component
 * Extended yearbook access for alumni with long-term access
 */
const AlumniPortal = ({ 
  schoolId, 
  alumniId,
  onClose,
  className = '',
  config = {}
}) => {
  const [yearbooks, setYearbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  const [showFlipbook, setShowFlipbook] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState('desc');
  const [alumniInfo, setAlumniInfo] = useState(null);
  const [showAlumniProfile, setShowAlumniProfile] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
    graduationYear: ''
  });

  // Merge default config with provided config
  const widgetConfig = {
    ...YearbookConfig.defaults,
    ...config,
    theme: {
      ...YearbookConfig.themes.alumni || YearbookConfig.themes.default,
      ...config.theme
    }
  };

  // Load alumni yearbooks
  const loadAlumniYearbooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await yearbookService.getAlumniYearbooks(schoolId, alumniId, {
        search: searchTerm,
        year: filterYear,
        sortBy,
        sortOrder
      });
      setYearbooks(data);
    } catch (err) {
      setError(err.message || 'Failed to load alumni yearbooks');
      console.error('Error loading alumni yearbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, alumniId, searchTerm, filterYear, sortBy, sortOrder]);

  // Load alumni information
  const loadAlumniInfo = useCallback(async () => {
    try {
      const data = await yearbookService.getAlumniInfo(alumniId);
      setAlumniInfo(data);
    } catch (err) {
      console.error('Error loading alumni info:', err);
    }
  }, [alumniId]);

  useEffect(() => {
    if (schoolId && alumniId) {
      loadAlumniYearbooks();
      loadAlumniInfo();
    }
  }, [schoolId, alumniId, loadAlumniYearbooks, loadAlumniInfo]);

  // Handle yearbook selection
  const handleYearbookSelect = (yearbook) => {
    setSelectedYearbook(yearbook);
    setShowFlipbook(true);
  };

  // Handle preview
  const handlePreview = async (yearbook) => {
    try {
      const previewUrl = await yearbookService.getYearbookPreview(yearbook.id);
      window.open(previewUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to preview yearbook');
    }
  };

  // Handle download
  const handleDownload = async (yearbook) => {
    try {
      await yearbookService.downloadYearbook(yearbook.id);
    } catch (err) {
      setError(err.message || 'Failed to download yearbook');
    }
  };

  // Handle contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await yearbookService.submitAlumniContact({
        alumniId,
        schoolId,
        ...contactForm
      });
      alert('Message sent successfully!');
      setContactForm({ name: '', email: '', message: '', graduationYear: '' });
      setShowContactForm(false);
    } catch (err) {
      setError(err.message || 'Failed to send message');
    }
  };

  // Filter yearbooks
  const filteredYearbooks = yearbooks.filter(yearbook => {
    const matchesSearch = !searchTerm || 
      yearbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      yearbook.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !filterYear || yearbook.academic_year === filterYear;
    
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <div className={`alumni-portal ${className}`}>
        <div className="alumni-loading">
          <div className="loading-spinner"></div>
          <p>Loading alumni portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alumni-portal ${className}`}>
        <div className="alumni-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadAlumniYearbooks} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`alumni-portal ${className}`} style={widgetConfig.theme.container}>
      {/* Header */}
      <div className="alumni-header" style={widgetConfig.theme.header}>
        <div className="header-content">
          <h1 style={widgetConfig.theme.title}>
            Alumni Portal
          </h1>
          <p style={widgetConfig.theme.subtitle}>
            Welcome back! Access your school's yearbook collection
          </p>
          
          {alumniInfo && (
            <div className="alumni-welcome">
              <p>Welcome, {alumniInfo.name} (Class of {alumniInfo.graduationYear})</p>
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAlumniProfile(true)}
            className="profile-button"
          >
            👤 Profile
          </button>
          <button 
            onClick={() => setShowContactForm(true)}
            className="contact-button"
          >
            📧 Contact School
          </button>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="alumni-filters" style={widgetConfig.theme.filters}>
        <div className="search-section">
          <input
            type="text"
            placeholder="Search yearbooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={widgetConfig.theme.input}
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="filter-select"
            style={widgetConfig.theme.select}
          >
            <option value="">All Years</option>
            {[...new Set(yearbooks.map(yb => yb.academic_year))].sort().reverse().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="sort-select"
            style={widgetConfig.theme.select}
          >
            <option value="year-desc">Year (Newest First)</option>
            <option value="year-asc">Year (Oldest First)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Alumni Stats */}
      <div className="alumni-stats">
        <div className="stat-card">
          <div className="stat-number">{yearbooks.length}</div>
          <div className="stat-label">Available Yearbooks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{alumniInfo?.graduationYear || 'N/A'}</div>
          <div className="stat-label">Graduation Year</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{filteredYearbooks.length}</div>
          <div className="stat-label">Filtered Results</div>
        </div>
      </div>

      {/* Yearbooks Grid */}
      <div className="alumni-grid">
        {filteredYearbooks.length === 0 ? (
          <div className="alumni-empty">
            <div className="empty-icon">📚</div>
            <p>No yearbooks found matching your criteria</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="clear-search"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredYearbooks.map((yearbook) => (
            <div 
              key={yearbook.id} 
              className="alumni-card"
              style={widgetConfig.theme.card}
              onClick={() => handleYearbookSelect(yearbook)}
            >
              {/* Yearbook Cover */}
              <div className="alumni-cover">
                {yearbook.cover_image ? (
                  <img 
                    src={yearbook.cover_image} 
                    alt={yearbook.title}
                    className="alumni-cover-image"
                  />
                ) : (
                  <div className="alumni-cover-placeholder">
                    <span className="alumni-cover-icon">📖</span>
                  </div>
                )}
                
                {/* Alumni Badge */}
                <div className="alumni-badge">
                  Alumni Access
                </div>
              </div>

              {/* Yearbook Info */}
              <div className="alumni-info">
                <h3 className="alumni-title" style={widgetConfig.theme.cardTitle}>
                  {yearbook.title}
                </h3>
                
                <p className="alumni-year" style={widgetConfig.theme.cardSubtitle}>
                  Academic Year: {yearbook.academic_year}
                </p>
                
                {yearbook.description && (
                  <p className="alumni-description" style={widgetConfig.theme.cardText}>
                    {yearbook.description.length > 100 
                      ? `${yearbook.description.substring(0, 100)}...` 
                      : yearbook.description
                    }
                  </p>
                )}
                
                <div className="alumni-meta">
                  <span className="alumni-publish-date" style={widgetConfig.theme.metaText}>
                    Published: {new Date(yearbook.publish_date).toLocaleDateString()}
                  </span>
                  {yearbook.page_count && (
                    <span className="alumni-page-count" style={widgetConfig.theme.metaText}>
                      {yearbook.page_count} pages
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="alumni-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(yearbook);
                  }}
                  className="alumni-action-btn alumni-preview-btn"
                  style={widgetConfig.theme.actionButton}
                >
                  👁️ Preview
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(yearbook);
                  }}
                  className="alumni-action-btn alumni-download-btn"
                  style={widgetConfig.theme.actionButton}
                >
                  📥 Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="alumni-footer" style={widgetConfig.theme.footer}>
        <p style={widgetConfig.theme.footerText}>
          Alumni Portal - Long-term access to your school's yearbook collection
        </p>
        <p className="alumni-powered-by" style={widgetConfig.theme.footerText}>
          Powered by School SIS Alumni Portal
        </p>
      </div>

      {/* Alumni Profile Modal */}
      {showAlumniProfile && alumniInfo && (
        <div className="alumni-modal-overlay" onClick={() => setShowAlumniProfile(false)}>
          <div className="alumni-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Alumni Profile</h3>
              <button onClick={() => setShowAlumniProfile(false)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="profile-info">
                <div className="profile-field">
                  <label>Name:</label>
                  <span>{alumniInfo.name}</span>
                </div>
                <div className="profile-field">
                  <label>Graduation Year:</label>
                  <span>{alumniInfo.graduationYear}</span>
                </div>
                <div className="profile-field">
                  <label>Email:</label>
                  <span>{alumniInfo.email}</span>
                </div>
                <div className="profile-field">
                  <label>Access Level:</label>
                  <span className="access-level">Alumni</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="alumni-modal-overlay" onClick={() => setShowContactForm(false)}>
          <div className="alumni-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Contact School</h3>
              <button onClick={() => setShowContactForm(false)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year</label>
                  <input
                    type="number"
                    value={contactForm.graduationYear}
                    onChange={(e) => setContactForm(prev => ({ ...prev, graduationYear: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    required
                    rows={4}
                    className="form-textarea"
                    placeholder="Your message to the school..."
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowContactForm(false)} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="submit-button">
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniPortal;
