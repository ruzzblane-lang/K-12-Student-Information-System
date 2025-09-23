import React, { useState, useEffect, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import YearbookConfig from '../config/yearbookConfig';
import './YearbookEmbedWidget.css';

/**
 * Yearbook Embed Widget
 * Lightweight, embeddable widget for public websites
 */
const YearbookEmbedWidget = ({ 
  schoolId, 
  config = {}, 
  className = '',
  theme = 'embed'
}) => {
  const [yearbooks, setYearbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  const [showFlipbook, setShowFlipbook] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Merge default config with provided config
  const widgetConfig = {
    ...YearbookConfig.defaults,
    ...config,
    theme: {
      ...YearbookConfig.themes[theme] || YearbookConfig.themes.minimal,
      ...config.theme
    }
  };

  // Load yearbooks
  const loadYearbooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await yearbookService.getYearbooksBySchool(schoolId, {
        search: searchTerm,
        year: filterYear,
        published: true // Only show published yearbooks in embed
      });
      setYearbooks(data);
    } catch (err) {
      setError(err.message || 'Failed to load yearbooks');
      console.error('Error loading yearbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, searchTerm, filterYear]);

  useEffect(() => {
    if (schoolId) {
      loadYearbooks();
    }
  }, [schoolId, loadYearbooks]);

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
      <div className={`yearbook-embed-widget ${className}`} style={widgetConfig.theme.container}>
        <div className="embed-loading">
          <div className="embed-spinner"></div>
          <p style={widgetConfig.theme.text}>Loading yearbooks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`yearbook-embed-widget ${className}`} style={widgetConfig.theme.container}>
        <div className="embed-error">
          <div className="embed-error-icon">⚠️</div>
          <p style={widgetConfig.theme.text}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`yearbook-embed-widget ${className}`} style={widgetConfig.theme.container}>
        {/* Header */}
        <div className="embed-header" style={widgetConfig.theme.header}>
          <h2 style={widgetConfig.theme.title}>
            {widgetConfig.title || 'Yearbook Collection'}
          </h2>
          {widgetConfig.subtitle && (
            <p style={widgetConfig.theme.subtitle}>{widgetConfig.subtitle}</p>
          )}
        </div>

        {/* Search and Filters */}
        <div className="embed-filters" style={widgetConfig.theme.filters}>
          <div className="embed-search">
            <input
              type="text"
              placeholder="Search yearbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="embed-search-input"
              style={widgetConfig.theme.input}
            />
          </div>
          
          <div className="embed-filter-controls">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="embed-filter-select"
              style={widgetConfig.theme.select}
            >
              <option value="">All Years</option>
              {[...new Set(yearbooks.map(yb => yb.academic_year))].sort().reverse().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Yearbooks Grid */}
        <div className="embed-grid">
          {filteredYearbooks.length === 0 ? (
            <div className="embed-empty">
              <div className="embed-empty-icon">📚</div>
              <p style={widgetConfig.theme.text}>No yearbooks found</p>
            </div>
          ) : (
            filteredYearbooks.map((yearbook) => (
              <div 
                key={yearbook.id} 
                className="embed-card"
                style={widgetConfig.theme.card}
                onClick={() => handleYearbookSelect(yearbook)}
              >
                {/* Yearbook Cover */}
                <div className="embed-cover">
                  {yearbook.cover_image ? (
                    <img 
                      src={yearbook.cover_image} 
                      alt={yearbook.title}
                      className="embed-cover-image"
                    />
                  ) : (
                    <div className="embed-cover-placeholder">
                      <span className="embed-cover-icon">📖</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="embed-status-badge">
                    Published
                  </div>
                </div>

                {/* Yearbook Info */}
                <div className="embed-info">
                  <h3 className="embed-title" style={widgetConfig.theme.cardTitle}>
                    {yearbook.title}
                  </h3>
                  
                  <p className="embed-year" style={widgetConfig.theme.cardSubtitle}>
                    Academic Year: {yearbook.academic_year}
                  </p>
                  
                  {yearbook.description && (
                    <p className="embed-description" style={widgetConfig.theme.cardText}>
                      {yearbook.description.length > 80 
                        ? `${yearbook.description.substring(0, 80)}...` 
                        : yearbook.description
                      }
                    </p>
                  )}
                  
                  <div className="embed-meta">
                    <span className="embed-publish-date" style={widgetConfig.theme.metaText}>
                      Published: {new Date(yearbook.publish_date).toLocaleDateString()}
                    </span>
                    {yearbook.page_count && (
                      <span className="embed-page-count" style={widgetConfig.theme.metaText}>
                        {yearbook.page_count} pages
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="embed-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(yearbook);
                    }}
                    className="embed-action-btn embed-preview-btn"
                    style={widgetConfig.theme.actionButton}
                  >
                    👁️ Preview
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(yearbook);
                    }}
                    className="embed-action-btn embed-download-btn"
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
        {widgetConfig.showFooter && (
          <div className="embed-footer" style={widgetConfig.theme.footer}>
            <p style={widgetConfig.theme.footerText}>
              {widgetConfig.footerText || `Showing ${filteredYearbooks.length} yearbook${filteredYearbooks.length !== 1 ? 's' : ''}`}
            </p>
            {widgetConfig.showPoweredBy !== false && (
              <p className="embed-powered-by" style={widgetConfig.theme.footerText}>
                Powered by School SIS
              </p>
            )}
          </div>
        )}
      </div>

      {/* Flipbook Viewer Modal */}
      {showFlipbook && selectedYearbook && (
        <div className="embed-flipbook-modal">
          <div className="embed-modal-overlay" onClick={() => setShowFlipbook(false)}>
            <div className="embed-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="embed-modal-header">
                <h3>{selectedYearbook.title}</h3>
                <button 
                  onClick={() => setShowFlipbook(false)}
                  className="embed-modal-close"
                >
                  ✕
                </button>
              </div>
              <div className="embed-modal-body">
                <p>Click "Open in Full View" to browse this yearbook with our interactive flipbook viewer.</p>
                <div className="embed-modal-actions">
                  <button
                    onClick={() => {
                      setShowFlipbook(false);
                      handlePreview(selectedYearbook);
                    }}
                    className="embed-modal-btn embed-modal-preview"
                  >
                    👁️ Open in Full View
                  </button>
                  <button
                    onClick={() => {
                      setShowFlipbook(false);
                      handleDownload(selectedYearbook);
                    }}
                    className="embed-modal-btn embed-modal-download"
                  >
                    📥 Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default YearbookEmbedWidget;
