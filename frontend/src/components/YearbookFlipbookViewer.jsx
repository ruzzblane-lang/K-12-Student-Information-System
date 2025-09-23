import React, { useState, useEffect, useRef, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import './YearbookFlipbookViewer.css';

/**
 * Yearbook Flipbook Viewer Component
 * Provides a realistic flipbook-style browsing experience
 */
const YearbookFlipbookViewer = ({ 
  yearbookId, 
  onClose, 
  className = '',
  config = {}
}) => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const flipbookRef = useRef(null);
  const pageRefs = useRef([]);

  const defaultConfig = {
    enableZoom: true,
    enableFullscreen: true,
    enableThumbnails: true,
    enableSearch: true,
    enableKeyboardNavigation: true,
    autoPlay: false,
    autoPlayDelay: 3000,
    showPageNumbers: true,
    showProgress: true,
    enableComments: true,
    enableSignatures: true,
    ...config
  };

  // Load yearbook pages
  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await yearbookService.getYearbookPages(yearbookId);
      setPages(data);
    } catch (err) {
      setError(err.message || 'Failed to load yearbook pages');
      console.error('Error loading yearbook pages:', err);
    } finally {
      setLoading(false);
    }
  }, [yearbookId]);

  // Search functionality
  const searchPages = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await yearbookService.searchYearbookContent(yearbookId, {
        query: term,
        searchType: 'name_class'
      });
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Error searching yearbook:', err);
    }
  }, [yearbookId]);

  // Handle page flip animation
  const flipPage = useCallback((direction) => {
    if (isFlipping) return;

    const newPage = direction === 'next' 
      ? Math.min(currentPage + 1, pages.length - 1)
      : Math.max(currentPage - 1, 0);

    if (newPage === currentPage) return;

    setIsFlipping(true);
    setCurrentPage(newPage);

    // Add flip animation
    if (flipbookRef.current) {
      flipbookRef.current.classList.add('flipping');
      setTimeout(() => {
        if (flipbookRef.current) {
          flipbookRef.current.classList.remove('flipping');
        }
        setIsFlipping(false);
      }, 600);
    }
  }, [currentPage, pages.length, isFlipping]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!defaultConfig.enableKeyboardNavigation) return;

    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          flipPage('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          flipPage('next');
          break;
        case 'Escape':
          onClose();
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.1, 3));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev - 0.1, 0.5));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [flipPage, onClose, isFullscreen, defaultConfig.enableKeyboardNavigation]);

  // Load pages on mount
  useEffect(() => {
    if (yearbookId) {
      loadPages();
    }
  }, [yearbookId, loadPages]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchPages(searchTerm);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchPages]);

  // Handle search result click
  const handleSearchResultClick = (result) => {
    setCurrentPage(result.pageNumber - 1);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  // Handle zoom
  const handleZoom = (newZoom) => {
    setZoom(newZoom);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className={`yearbook-flipbook-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="flipbook-loading">
          <div className="loading-spinner"></div>
          <p>Loading yearbook...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`yearbook-flipbook-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="flipbook-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadPages} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className={`yearbook-flipbook-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="flipbook-empty">
          <div className="empty-icon">📖</div>
          <p>No pages found in this yearbook</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`yearbook-flipbook-viewer ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header Controls */}
      <div className="flipbook-header">
        <div className="header-left">
          <button onClick={onClose} className="close-button">
            ✕
          </button>
          {defaultConfig.showPageNumbers && (
            <span className="page-counter">
              Page {currentPage + 1} of {pages.length}
            </span>
          )}
        </div>

        <div className="header-center">
          {defaultConfig.enableSearch && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {showSearchResults && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <span className="result-page">Page {result.pageNumber}</span>
                      <span className="result-text">{result.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          {defaultConfig.enableZoom && (
            <div className="zoom-controls">
              <button onClick={() => handleZoom(zoom - 0.1)} disabled={zoom <= 0.5}>
                −
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button onClick={() => handleZoom(zoom + 0.1)} disabled={zoom >= 3}>
                +
              </button>
            </div>
          )}
          
          {defaultConfig.enableFullscreen && (
            <button onClick={toggleFullscreen} className="fullscreen-button">
              {isFullscreen ? '⤓' : '⤢'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {defaultConfig.showProgress && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>
      )}

      {/* Main Flipbook */}
      <div className="flipbook-container" ref={flipbookRef}>
        <div 
          className="flipbook-pages"
          style={{ transform: `scale(${zoom})` }}
        >
          {pages.map((page, index) => (
            <div
              key={page.id}
              ref={el => pageRefs.current[index] = el}
              className={`flipbook-page ${index === currentPage ? 'active' : ''} ${
                index < currentPage ? 'turned' : ''
              }`}
              style={{
                zIndex: pages.length - Math.abs(index - currentPage)
              }}
            >
              <div className="page-content">
                <img 
                  src={page.imageUrl} 
                  alt={`Page ${index + 1}`}
                  className="page-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="page-placeholder" style={{ display: 'none' }}>
                  <span className="placeholder-icon">📄</span>
                  <span>Page {index + 1}</span>
                </div>
                
                {/* Page Comments/Signatures */}
                {defaultConfig.enableComments && page.comments && (
                  <div className="page-comments">
                    {page.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="comment-bubble">
                        <span className="comment-text">{comment.text}</span>
                        <span className="comment-author">{comment.author}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flipbook-controls">
        <button
          onClick={() => flipPage('prev')}
          disabled={currentPage === 0 || isFlipping}
          className="nav-button prev-button"
        >
          ← Previous
        </button>
        
        <div className="page-thumbnails">
          {defaultConfig.enableThumbnails && (
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="thumbnails-toggle"
            >
              {showThumbnails ? 'Hide' : 'Show'} Thumbnails
            </button>
          )}
        </div>
        
        <button
          onClick={() => flipPage('next')}
          disabled={currentPage === pages.length - 1 || isFlipping}
          className="nav-button next-button"
        >
          Next →
        </button>
      </div>

      {/* Thumbnails Panel */}
      {showThumbnails && (
        <div className="thumbnails-panel">
          <div className="thumbnails-header">
            <h3>Pages</h3>
            <button onClick={() => setShowThumbnails(false)} className="close-thumbnails">
              ✕
            </button>
          </div>
          <div className="thumbnails-grid">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`thumbnail ${index === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(index)}
              >
                <img src={page.thumbnailUrl || page.imageUrl} alt={`Page ${index + 1}`} />
                <span className="thumbnail-number">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments/Signatures Panel */}
      {defaultConfig.enableSignatures && (
        <div className="signatures-panel">
          <div className="signatures-header">
            <h3>Signatures & Comments</h3>
          </div>
          <div className="signatures-content">
            <div className="add-signature">
              <textarea
                placeholder="Leave a comment or signature..."
                className="signature-input"
              />
              <button className="add-signature-button">Add Signature</button>
            </div>
            <div className="signatures-list">
              {/* Existing signatures would be rendered here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearbookFlipbookViewer;
