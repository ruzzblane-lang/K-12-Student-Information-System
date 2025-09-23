import React, { useState, useRef, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import './YearbookPhotoUploader.css';

/**
 * Yearbook Photo Uploader Component
 * Handles photo uploads with tagging functionality
 */
const YearbookPhotoUploader = ({ 
  yearbookId, 
  onUploadComplete, 
  onClose,
  className = '',
  config = {}
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [photoMetadata, setPhotoMetadata] = useState({});
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const defaultConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 10,
    enableTagging: true,
    enableStudentTagging: true,
    enableClubTagging: true,
    enableEventTagging: true,
    enableMetadata: true,
    ...config
  };

  // Handle file selection
  const handleFileSelect = useCallback((files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!defaultConfig.allowedTypes.includes(file.type)) {
        setError(`File ${file.name} is not a supported image type`);
        return false;
      }
      if (file.size > defaultConfig.maxFileSize) {
        setError(`File ${file.name} is too large (max ${defaultConfig.maxFileSize / 1024 / 1024}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > defaultConfig.maxFiles) {
      setError(`Maximum ${defaultConfig.maxFiles} files allowed`);
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  }, [defaultConfig]);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  // Remove file from selection
  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Add custom tag
  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  // Remove tag
  const removeTag = useCallback((tagToRemove) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Handle student selection
  const toggleStudent = useCallback((student) => {
    setSelectedStudents(prev => 
      prev.includes(student.id) 
        ? prev.filter(id => id !== student.id)
        : [...prev, student.id]
    );
  }, []);

  // Handle club selection
  const toggleClub = useCallback((club) => {
    setSelectedClubs(prev => 
      prev.includes(club.id) 
        ? prev.filter(id => id !== club.id)
        : [...prev, club.id]
    );
  }, []);

  // Handle event selection
  const toggleEvent = useCallback((event) => {
    setSelectedEvents(prev => 
      prev.includes(event.id) 
        ? prev.filter(id => id !== event.id)
        : [...prev, event.id]
    );
  }, []);

  // Upload photos
  const uploadPhotos = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('yearbookId', yearbookId);
        formData.append('tags', JSON.stringify(tags));
        formData.append('students', JSON.stringify(selectedStudents));
        formData.append('clubs', JSON.stringify(selectedClubs));
        formData.append('events', JSON.stringify(selectedEvents));
        formData.append('metadata', JSON.stringify(photoMetadata));

        const response = await yearbookService.uploadYearbookPhoto(formData, (progress) => {
          setUploadProgress(prev => prev + (progress / selectedFiles.length));
        });

        return response;
      });

      const results = await Promise.all(uploadPromises);
      
      if (onUploadComplete) {
        onUploadComplete(results);
      }

      // Reset form
      setSelectedFiles([]);
      setTags([]);
      setSelectedStudents([]);
      setSelectedClubs([]);
      setSelectedEvents([]);
      setPhotoMetadata({});
      setUploadProgress(0);

    } catch (err) {
      setError(err.message || 'Failed to upload photos');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, yearbookId, tags, selectedStudents, selectedClubs, selectedEvents, photoMetadata, onUploadComplete]);

  // Preview file
  const previewFile = useCallback((file) => {
    return URL.createObjectURL(file);
  }, []);

  return (
    <div className={`yearbook-photo-uploader ${className}`}>
      <div className="uploader-header">
        <h2>Upload Photos to Yearbook</h2>
        <button onClick={onClose} className="close-button">
          ✕
        </button>
      </div>

      <div className="uploader-content">
        {/* File Upload Area */}
        <div className="upload-section">
          <div
            ref={dropZoneRef}
            className={`drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFiles.length > 0 ? 'has-files' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={defaultConfig.allowedTypes.join(',')}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            
            {selectedFiles.length === 0 ? (
              <div className="drop-zone-content">
                <div className="drop-zone-icon">📸</div>
                <h3>Drop photos here or click to browse</h3>
                <p>Supports JPG, PNG, GIF, WebP (max {defaultConfig.maxFileSize / 1024 / 1024}MB each)</p>
                <p>Maximum {defaultConfig.maxFiles} files</p>
              </div>
            ) : (
              <div className="selected-files">
                <h3>Selected Files ({selectedFiles.length})</h3>
                <div className="files-grid">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-preview">
                      <img 
                        src={previewFile(file)} 
                        alt={file.name}
                        className="preview-image"
                      />
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="remove-file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tagging Section */}
        {defaultConfig.enableTagging && (
          <div className="tagging-section">
            <h3>Tags</h3>
            <div className="tags-input">
              <input
                type="text"
                placeholder="Add custom tags..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="tag-input"
              />
              <button onClick={addTag} className="add-tag-button">
                Add
              </button>
            </div>
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="remove-tag">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Student Tagging */}
        {defaultConfig.enableStudentTagging && (
          <div className="student-tagging-section">
            <h3>Tag Students</h3>
            <div className="student-search">
              <input
                type="text"
                placeholder="Search students..."
                className="student-search-input"
              />
            </div>
            <div className="selected-students">
              {selectedStudents.map(studentId => (
                <span key={studentId} className="selected-student">
                  Student {studentId}
                  <button onClick={() => toggleStudent({ id: studentId })} className="remove-student">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Club Tagging */}
        {defaultConfig.enableClubTagging && (
          <div className="club-tagging-section">
            <h3>Tag Clubs/Organizations</h3>
            <div className="clubs-list">
              {/* Mock clubs - would be loaded from API */}
              {['Basketball Team', 'Drama Club', 'Student Council', 'Chess Club'].map(club => (
                <label key={club} className="club-option">
                  <input
                    type="checkbox"
                    checked={selectedClubs.includes(club)}
                    onChange={() => toggleClub({ id: club })}
                  />
                  <span>{club}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Event Tagging */}
        {defaultConfig.enableEventTagging && (
          <div className="event-tagging-section">
            <h3>Tag Events</h3>
            <div className="events-list">
              {/* Mock events - would be loaded from API */}
              {['Graduation', 'Homecoming', 'Prom', 'Sports Day'].map(event => (
                <label key={event} className="event-option">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent({ id: event })}
                  />
                  <span>{event}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Section */}
        {defaultConfig.enableMetadata && (
          <div className="metadata-section">
            <h3>Photo Information</h3>
            <div className="metadata-fields">
              <div className="field">
                <label>Description</label>
                <textarea
                  placeholder="Describe this photo..."
                  value={photoMetadata.description || ''}
                  onChange={(e) => setPhotoMetadata(prev => ({ ...prev, description: e.target.value }))}
                  className="metadata-textarea"
                />
              </div>
              <div className="field">
                <label>Photographer</label>
                <input
                  type="text"
                  placeholder="Who took this photo?"
                  value={photoMetadata.photographer || ''}
                  onChange={(e) => setPhotoMetadata(prev => ({ ...prev, photographer: e.target.value }))}
                  className="metadata-input"
                />
              </div>
              <div className="field">
                <label>Date Taken</label>
                <input
                  type="date"
                  value={photoMetadata.dateTaken || ''}
                  onChange={(e) => setPhotoMetadata(prev => ({ ...prev, dateTaken: e.target.value }))}
                  className="metadata-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">
              Uploading... {Math.round(uploadProgress)}%
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="uploader-actions">
          <button 
            onClick={onClose} 
            className="cancel-button"
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            onClick={uploadPhotos} 
            className="upload-button"
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YearbookPhotoUploader;
