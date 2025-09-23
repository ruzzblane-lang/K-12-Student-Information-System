import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YearbookPortalWidget from '../components/YearbookPortalWidget';
import { YearbookConfig } from '../config/yearbookConfig';
import { useYearbookWidget } from '../hooks/useYearbookWidget';
import '../components/YearbookPortalWidget.css';

/**
 * Yearbook Portal Page
 * A complete page implementation showcasing the Yearbook Portal Widget
 */
const YearbookPortalPage = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Use the custom hook for state management
  const {
    yearbooks,
    loading,
    error,
    searchTerm,
    filterYear,
    sortBy,
    sortOrder,
    availableYears,
    yearbookCount,
    handleYearbookSelect,
    downloadYearbook,
    previewYearbook,
    updateSearchTerm,
    updateFilterYear,
    updateSortOptions,
    resetFilters
  } = useYearbookWidget(schoolId || 'demo-school-123');

  // Handle yearbook selection
  const handleYearbookClick = useCallback((yearbook) => {
    setSelectedYearbook(yearbook);
    setShowModal(true);
    handleYearbookSelect(yearbook);
  }, [handleYearbookSelect]);

  // Handle download
  const handleDownload = useCallback(async (yearbook) => {
    try {
      await downloadYearbook(yearbook.id);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [downloadYearbook]);

  // Handle preview
  const handlePreview = useCallback(async (yearbook) => {
    try {
      const previewUrl = await previewYearbook(yearbook.id);
      window.open(previewUrl, '_blank');
    } catch (err) {
      console.error('Preview failed:', err);
    }
  }, [previewYearbook]);

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedYearbook(null);
  }, []);

  // Configuration for the widget
  const widgetConfig = {
    title: 'Yearbook Portal',
    subtitle: 'Browse and access your school\'s yearbooks',
    theme: YearbookConfig.themes.default,
    enableSearch: true,
    enableFilters: true,
    enableSorting: true,
    enablePreview: true,
    enableDownload: true,
    showStatusBadges: true,
    showPageCount: true,
    showPublishDate: true,
    showDescription: true,
    maxDescriptionLength: 100,
    showFooter: true,
    footerText: `Showing ${yearbookCount.filtered} of ${yearbookCount.total} yearbooks`
  };

  return (
    <div className="yearbook-portal-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Yearbook Portal</h1>
          <p>Discover and explore your school's yearbook collection</p>
          
          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-number">{yearbookCount.total}</span>
              <span className="stat-label">Total Yearbooks</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{yearbookCount.published}</span>
              <span className="stat-label">Published</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{availableYears.length}</span>
              <span className="stat-label">Years Available</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        {/* Yearbook Widget */}
        <section className="yearbook-widget-section">
          <YearbookPortalWidget
            schoolId={schoolId || 'demo-school-123'}
            config={widgetConfig}
            onYearbookSelect={handleYearbookClick}
            className="main-yearbook-widget"
          />
        </section>

        {/* Additional Information */}
        <section className="additional-info">
          <div className="info-grid">
            <div className="info-card">
              <h3>📚 About Our Yearbooks</h3>
              <p>
                Our yearbook collection spans decades of school history, capturing 
                memories, achievements, and milestones of our students and community.
              </p>
            </div>
            
            <div className="info-card">
              <h3>🔍 How to Use</h3>
              <p>
                Use the search bar to find specific yearbooks, filter by year, 
                or sort by different criteria. Click on any yearbook to preview or download.
              </p>
            </div>
            
            <div className="info-card">
              <h3>📱 Mobile Friendly</h3>
              <p>
                The yearbook portal is fully responsive and works great on 
                mobile devices, tablets, and desktop computers.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Yearbook Detail Modal */}
      {showModal && selectedYearbook && (
        <div className="yearbook-modal-overlay" onClick={closeModal}>
          <div className="yearbook-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedYearbook.title}</h2>
              <button className="close-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="yearbook-details">
                <div className="yearbook-cover">
                  {selectedYearbook.cover_image ? (
                    <img 
                      src={selectedYearbook.cover_image} 
                      alt={selectedYearbook.title}
                      className="cover-image"
                    />
                  ) : (
                    <div className="cover-placeholder">
                      <span className="cover-icon">📖</span>
                    </div>
                  )}
                </div>
                
                <div className="yearbook-info">
                  <div className="info-row">
                    <strong>Academic Year:</strong>
                    <span>{selectedYearbook.academic_year}</span>
                  </div>
                  
                  <div className="info-row">
                    <strong>Published:</strong>
                    <span>{new Date(selectedYearbook.publish_date).toLocaleDateString()}</span>
                  </div>
                  
                  {selectedYearbook.page_count && (
                    <div className="info-row">
                      <strong>Pages:</strong>
                      <span>{selectedYearbook.page_count}</span>
                    </div>
                  )}
                  
                  <div className="info-row">
                    <strong>Status:</strong>
                    <span className={`status ${selectedYearbook.is_published ? 'published' : 'draft'}`}>
                      {selectedYearbook.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  {selectedYearbook.description && (
                    <div className="description">
                      <strong>Description:</strong>
                      <p>{selectedYearbook.description}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  className="action-button preview-button"
                  onClick={() => handlePreview(selectedYearbook)}
                  disabled={!selectedYearbook.is_published}
                >
                  👁️ Preview Yearbook
                </button>
                
                <button
                  className="action-button download-button"
                  onClick={() => handleDownload(selectedYearbook)}
                  disabled={!selectedYearbook.is_published}
                >
                  📥 Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="page-footer">
        <div className="footer-content">
          <p>&copy; 2024 School SIS. All rights reserved.</p>
          <p>Powered by the Yearbook Portal Widget</p>
        </div>
      </footer>
    </div>
  );
};

export default YearbookPortalPage;

// Additional CSS for the page
const pageStyles = `
.yearbook-portal-page {
  min-height: 100vh;
  background-color: #f8fafc;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 0;
  text-align: center;
}

.header-content h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.header-content p {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.quick-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.yearbook-widget-section {
  margin-bottom: 4rem;
}

.additional-info {
  margin-top: 4rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.info-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.info-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;
}

.info-card p {
  color: #6b7280;
  line-height: 1.6;
}

/* Modal Styles */
.yearbook-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.yearbook-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-content {
  padding: 1.5rem;
}

.yearbook-details {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.yearbook-cover {
  text-align: center;
}

.cover-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.cover-placeholder {
  width: 100%;
  height: 250px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.yearbook-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row strong {
  color: #374151;
  font-weight: 600;
}

.info-row span {
  color: #6b7280;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status.published {
  background-color: #dcfce7;
  color: #166534;
}

.status.draft {
  background-color: #fef3c7;
  color: #92400e;
}

.description {
  margin-top: 1rem;
}

.description strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
}

.description p {
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.action-button {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-button:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-button:hover:not(:disabled) {
  background-color: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.download-button:hover:not(:disabled) {
  background-color: #f0fdf4;
  border-color: #10b981;
  color: #059669;
}

.page-footer {
  background-color: #1f2937;
  color: #f9fafb;
  padding: 2rem 0;
  text-align: center;
  margin-top: 4rem;
}

.footer-content p {
  margin: 0.5rem 0;
  color: #d1d5db;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content h1 {
    font-size: 2rem;
  }
  
  .quick-stats {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .page-content {
    padding: 1rem;
  }
  
  .yearbook-details {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .yearbook-modal-overlay {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .header-content h1 {
    font-size: 1.75rem;
  }
  
  .stat-number {
    font-size: 2rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pageStyles;
  document.head.appendChild(styleSheet);
}
