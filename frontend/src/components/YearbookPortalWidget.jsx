import React, { useState, useEffect, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import YearbookConfig from '../config/yearbookConfig';
import './YearbookPortalWidget.css';

const YearbookPortalWidget = ({ 
  schoolId, 
  config = {}, 
  onYearbookSelect,
  className = '',
  theme = 'default'
}) => {
  const [yearbooks, setYearbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState('desc');

  // Merge default config with provided config
  const widgetConfig = {
    ...YearbookConfig.defaults,
    ...config,
    theme: {
      ...YearbookConfig.themes[theme] || YearbookConfig.themes.default,
      ...config.theme
    }
  };

  const loadYearbooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await yearbookService.getYearbooksBySchool(schoolId, {
        search: searchTerm,
        year: filterYear,
        sortBy,
        sortOrder
      });
      setYearbooks(data);
    } catch (err) {
      setError(err.message || 'Failed to load yearbooks');
      console.error('Error loading yearbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, searchTerm, filterYear, sortBy, sortOrder]);

  useEffect(() => {
    if (schoolId) {
      loadYearbooks();
    }
  }, [schoolId, loadYearbooks]);

  const handleYearbookSelect = (yearbook) => {
    setSelectedYearbook(yearbook);
    if (onYearbookSelect) {
      onYearbookSelect(yearbook);
    }
  };

  const handleDownload = async (yearbook) => {
    try {
      await yearbookService.downloadYearbook(yearbook.id);
    } catch (err) {
      setError(err.message || 'Failed to download yearbook');
    }
  };

  const handlePreview = async (yearbook) => {
    try {
      const previewUrl = await yearbookService.getYearbookPreview(yearbook.id);
      window.open(previewUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to preview yearbook');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getYearbookStatus = (yearbook) => {
    const now = new Date();
    const publishDate = new Date(yearbook.publish_date);
    
    if (publishDate > now) {
      return { status: 'upcoming', label: 'Coming Soon', color: 'blue' };
    } else if (yearbook.is_published) {
      return { status: 'published', label: 'Published', color: 'green' };
    } else {
      return { status: 'draft', label: 'Draft', color: 'yellow' };
    }
  };

  const filteredYearbooks = yearbooks.filter(yearbook => {
    const matchesSearch = !searchTerm || 
      yearbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      yearbook.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !filterYear || yearbook.academic_year === filterYear;
    
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <div className={`yearbook-widget ${className}`} style={widgetConfig.theme.container}>
        <div className="yearbook-widget__loading">
          <div className="yearbook-widget__spinner"></div>
          <p style={widgetConfig.theme.text}>Loading yearbooks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`yearbook-widget ${className}`} style={widgetConfig.theme.container}>
        <div className="yearbook-widget__error">
          <div className="yearbook-widget__error-icon">⚠️</div>
          <p style={widgetConfig.theme.text}>{error}</p>
          <button 
            onClick={loadYearbooks}
            className="yearbook-widget__retry-btn"
            style={widgetConfig.theme.button}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`yearbook-widget ${className}`} style={widgetConfig.theme.container}>
      {/* Header */}
      <div className="yearbook-widget__header" style={widgetConfig.theme.header}>
        <h2 style={widgetConfig.theme.title}>
          {widgetConfig.title || 'Yearbook Portal'}
        </h2>
        {widgetConfig.subtitle && (
          <p style={widgetConfig.theme.subtitle}>{widgetConfig.subtitle}</p>
        )}
      </div>

      {/* Search and Filters */}
      <div className="yearbook-widget__filters" style={widgetConfig.theme.filters}>
        <div className="yearbook-widget__search">
          <input
            type="text"
            placeholder="Search yearbooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="yearbook-widget__search-input"
            style={widgetConfig.theme.input}
          />
        </div>
        
        <div className="yearbook-widget__filter-controls">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="yearbook-widget__filter-select"
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
            className="yearbook-widget__sort-select"
            style={widgetConfig.theme.select}
          >
            <option value="year-desc">Year (Newest First)</option>
            <option value="year-asc">Year (Oldest First)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="publish_date-desc">Publish Date (Newest First)</option>
            <option value="publish_date-asc">Publish Date (Oldest First)</option>
          </select>
        </div>
      </div>

      {/* Yearbooks Grid */}
      <div className="yearbook-widget__grid">
        {filteredYearbooks.length === 0 ? (
          <div className="yearbook-widget__empty">
            <div className="yearbook-widget__empty-icon">📚</div>
            <p style={widgetConfig.theme.text}>No yearbooks found</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="yearbook-widget__clear-search"
                style={widgetConfig.theme.button}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredYearbooks.map((yearbook) => {
            const status = getYearbookStatus(yearbook);
            return (
              <div 
                key={yearbook.id} 
                className={`yearbook-widget__card ${selectedYearbook?.id === yearbook.id ? 'selected' : ''}`}
                style={widgetConfig.theme.card}
                onClick={() => handleYearbookSelect(yearbook)}
              >
                {/* Yearbook Cover */}
                <div className="yearbook-widget__cover">
                  {yearbook.cover_image ? (
                    <img 
                      src={yearbook.cover_image} 
                      alt={yearbook.title}
                      className="yearbook-widget__cover-image"
                    />
                  ) : (
                    <div className="yearbook-widget__cover-placeholder">
                      <span className="yearbook-widget__cover-icon">📖</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div 
                    className={`yearbook-widget__status-badge yearbook-widget__status-badge--${status.status}`}
                    style={{
                      ...widgetConfig.theme.statusBadge,
                      backgroundColor: status.color === 'green' ? '#10B981' : 
                                     status.color === 'blue' ? '#3B82F6' : '#F59E0B'
                    }}
                  >
                    {status.label}
                  </div>
                </div>

                {/* Yearbook Info */}
                <div className="yearbook-widget__info">
                  <h3 className="yearbook-widget__title" style={widgetConfig.theme.cardTitle}>
                    {yearbook.title}
                  </h3>
                  
                  <p className="yearbook-widget__year" style={widgetConfig.theme.cardSubtitle}>
                    Academic Year: {yearbook.academic_year}
                  </p>
                  
                  {yearbook.description && (
                    <p className="yearbook-widget__description" style={widgetConfig.theme.cardText}>
                      {yearbook.description.length > 100 
                        ? `${yearbook.description.substring(0, 100)}...` 
                        : yearbook.description
                      }
                    </p>
                  )}
                  
                  <div className="yearbook-widget__meta">
                    <span className="yearbook-widget__publish-date" style={widgetConfig.theme.metaText}>
                      Published: {formatDate(yearbook.publish_date)}
                    </span>
                    {yearbook.page_count && (
                      <span className="yearbook-widget__page-count" style={widgetConfig.theme.metaText}>
                        {yearbook.page_count} pages
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="yearbook-widget__actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(yearbook);
                    }}
                    className="yearbook-widget__action-btn yearbook-widget__action-btn--preview"
                    style={widgetConfig.theme.actionButton}
                    disabled={!yearbook.is_published}
                  >
                    👁️ Preview
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(yearbook);
                    }}
                    className="yearbook-widget__action-btn yearbook-widget__action-btn--download"
                    style={widgetConfig.theme.actionButton}
                    disabled={!yearbook.is_published}
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {widgetConfig.showFooter && (
        <div className="yearbook-widget__footer" style={widgetConfig.theme.footer}>
          <p style={widgetConfig.theme.footerText}>
            {widgetConfig.footerText || `Showing ${filteredYearbooks.length} yearbook${filteredYearbooks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default YearbookPortalWidget;
