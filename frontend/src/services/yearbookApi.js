import api from './api';

/**
 * Yearbook API Service
 * Handles all yearbook-related API calls
 */
export const yearbookService = {
  /**
   * Get all yearbooks for a specific school
   * @param {string} schoolId - The school ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of yearbooks
   */
  getYearbooksBySchool: async (schoolId, params = {}) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}`, { params });
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbooks by school:', error);
      throw new Error(error.message || 'Failed to fetch yearbooks');
    }
  },

  /**
   * Get a specific yearbook by ID
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Object>} Yearbook details
   */
  getYearbookById: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook:', error);
      throw new Error(error.message || 'Failed to fetch yearbook');
    }
  },

  /**
   * Get yearbook preview URL
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<string>} Preview URL
   */
  getYearbookPreview: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/preview`);
      return response.data?.previewUrl || response.previewUrl;
    } catch (error) {
      console.error('Error getting yearbook preview:', error);
      throw new Error(error.message || 'Failed to get yearbook preview');
    }
  },

  /**
   * Download yearbook
   * @param {string} yearbookId - The yearbook ID
   * @param {string} format - Download format (pdf, epub, etc.)
   * @returns {Promise<Blob>} File blob
   */
  downloadYearbook: async (yearbookId, format = 'pdf') => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/download`, {
        params: { format },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yearbook-${yearbookId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    } catch (error) {
      console.error('Error downloading yearbook:', error);
      throw new Error(error.message || 'Failed to download yearbook');
    }
  },

  /**
   * Get yearbook statistics
   * @param {string} schoolId - The school ID
   * @returns {Promise<Object>} Yearbook statistics
   */
  getYearbookStats: async (schoolId) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/stats`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook stats:', error);
      throw new Error(error.message || 'Failed to fetch yearbook statistics');
    }
  },

  /**
   * Search yearbooks
   * @param {string} schoolId - The school ID
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results
   */
  searchYearbooks: async (schoolId, searchParams = {}) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/search`, {
        params: searchParams
      });
      return response.data || response;
    } catch (error) {
      console.error('Error searching yearbooks:', error);
      throw new Error(error.message || 'Failed to search yearbooks');
    }
  },

  /**
   * Get yearbook categories/tags
   * @param {string} schoolId - The school ID
   * @returns {Promise<Array>} Categories/tags
   */
  getYearbookCategories: async (schoolId) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/categories`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook categories:', error);
      throw new Error(error.message || 'Failed to fetch yearbook categories');
    }
  },

  /**
   * Get yearbook by category
   * @param {string} schoolId - The school ID
   * @param {string} category - The category name
   * @returns {Promise<Array>} Yearbooks in category
   */
  getYearbooksByCategory: async (schoolId, category) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/category/${category}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbooks by category:', error);
      throw new Error(error.message || 'Failed to fetch yearbooks by category');
    }
  },

  /**
   * Get recent yearbooks
   * @param {string} schoolId - The school ID
   * @param {number} limit - Number of recent yearbooks to fetch
   * @returns {Promise<Array>} Recent yearbooks
   */
  getRecentYearbooks: async (schoolId, limit = 5) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/recent`, {
        params: { limit }
      });
      return response.data || response;
    } catch (error) {
      console.error('Error fetching recent yearbooks:', error);
      throw new Error(error.message || 'Failed to fetch recent yearbooks');
    }
  },

  /**
   * Get featured yearbooks
   * @param {string} schoolId - The school ID
   * @returns {Promise<Array>} Featured yearbooks
   */
  getFeaturedYearbooks: async (schoolId) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/featured`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching featured yearbooks:', error);
      throw new Error(error.message || 'Failed to fetch featured yearbooks');
    }
  },

  /**
   * Get yearbook metadata
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Object>} Yearbook metadata
   */
  getYearbookMetadata: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/metadata`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook metadata:', error);
      throw new Error(error.message || 'Failed to fetch yearbook metadata');
    }
  },

  /**
   * Get yearbook pages
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} params - Query parameters (page, limit, etc.)
   * @returns {Promise<Array>} Yearbook pages
   */
  getYearbookPages: async (yearbookId, params = {}) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/pages`, { params });
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook pages:', error);
      throw new Error(error.message || 'Failed to fetch yearbook pages');
    }
  },

  /**
   * Get yearbook page by number
   * @param {string} yearbookId - The yearbook ID
   * @param {number} pageNumber - The page number
   * @returns {Promise<Object>} Page details
   */
  getYearbookPage: async (yearbookId, pageNumber) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/pages/${pageNumber}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook page:', error);
      throw new Error(error.message || 'Failed to fetch yearbook page');
    }
  },

  /**
   * Get yearbook contributors
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Array>} Contributors list
   */
  getYearbookContributors: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/contributors`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook contributors:', error);
      throw new Error(error.message || 'Failed to fetch yearbook contributors');
    }
  },

  /**
   * Get yearbook reviews/ratings
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Object>} Reviews and ratings
   */
  getYearbookReviews: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/reviews`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook reviews:', error);
      throw new Error(error.message || 'Failed to fetch yearbook reviews');
    }
  },

  /**
   * Add yearbook review
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Created review
   */
  addYearbookReview: async (yearbookId, reviewData) => {
    try {
      const response = await api.post(`/yearbooks/${yearbookId}/reviews`, reviewData);
      return response.data || response;
    } catch (error) {
      console.error('Error adding yearbook review:', error);
      throw new Error(error.message || 'Failed to add yearbook review');
    }
  },

  /**
   * Get yearbook sharing options
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Object>} Sharing options
   */
  getYearbookSharingOptions: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/sharing`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook sharing options:', error);
      throw new Error(error.message || 'Failed to fetch yearbook sharing options');
    }
  },

  /**
   * Share yearbook
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} shareData - Share data (platform, message, etc.)
   * @returns {Promise<Object>} Share result
   */
  shareYearbook: async (yearbookId, shareData) => {
    try {
      const response = await api.post(`/yearbooks/${yearbookId}/share`, shareData);
      return response.data || response;
    } catch (error) {
      console.error('Error sharing yearbook:', error);
      throw new Error(error.message || 'Failed to share yearbook');
    }
  },

  /**
   * Get yearbook analytics
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} params - Analytics parameters
   * @returns {Promise<Object>} Analytics data
   */
  getYearbookAnalytics: async (yearbookId, params = {}) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/analytics`, { params });
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook analytics:', error);
      throw new Error(error.message || 'Failed to fetch yearbook analytics');
    }
  },

  /**
   * Get yearbook export options
   * @param {string} yearbookId - The yearbook ID
   * @returns {Promise<Array>} Available export formats
   */
  getYearbookExportOptions: async (yearbookId) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/export-options`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook export options:', error);
      throw new Error(error.message || 'Failed to fetch yearbook export options');
    }
  },

  /**
   * Export yearbook
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} exportOptions - Export options
   * @returns {Promise<Blob>} Exported file
   */
  exportYearbook: async (yearbookId, exportOptions = {}) => {
    try {
      const response = await api.post(`/yearbooks/${yearbookId}/export`, exportOptions, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yearbook-export-${yearbookId}.${exportOptions.format || 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    } catch (error) {
      console.error('Error exporting yearbook:', error);
      throw new Error(error.message || 'Failed to export yearbook');
    }
  },

  // Additional API methods for new features

  /**
   * Search yearbook content by name/class
   * @param {string} yearbookId - The yearbook ID
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results
   */
  searchYearbookContent: async (yearbookId, searchParams = {}) => {
    try {
      const response = await api.get(`/yearbooks/${yearbookId}/search-content`, {
        params: searchParams
      });
      return response.data || response;
    } catch (error) {
      console.error('Error searching yearbook content:', error);
      throw new Error(error.message || 'Failed to search yearbook content');
    }
  },

  /**
   * Upload yearbook photo
   * @param {FormData} formData - Photo upload data
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  uploadYearbookPhoto: async (formData, onProgress) => {
    try {
      const response = await api.post('/yearbooks/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      });
      return response.data || response;
    } catch (error) {
      console.error('Error uploading yearbook photo:', error);
      throw new Error(error.message || 'Failed to upload yearbook photo');
    }
  },

  /**
   * Get yearbook signatures
   * @param {string} yearbookId - The yearbook ID
   * @param {string} pageId - The page ID (optional)
   * @returns {Promise<Array>} Signatures list
   */
  getYearbookSignatures: async (yearbookId, pageId = null) => {
    try {
      const url = pageId 
        ? `/yearbooks/${yearbookId}/pages/${pageId}/signatures`
        : `/yearbooks/${yearbookId}/signatures`;
      const response = await api.get(url);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook signatures:', error);
      throw new Error(error.message || 'Failed to fetch yearbook signatures');
    }
  },

  /**
   * Add yearbook signature
   * @param {Object} signatureData - Signature data
   * @returns {Promise<Object>} Created signature
   */
  addYearbookSignature: async (signatureData) => {
    try {
      const response = await api.post('/yearbooks/signatures', signatureData);
      return response.data || response;
    } catch (error) {
      console.error('Error adding yearbook signature:', error);
      throw new Error(error.message || 'Failed to add yearbook signature');
    }
  },

  /**
   * Update yearbook signature
   * @param {string} signatureId - The signature ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated signature
   */
  updateYearbookSignature: async (signatureId, updateData) => {
    try {
      const response = await api.put(`/yearbooks/signatures/${signatureId}`, updateData);
      return response.data || response;
    } catch (error) {
      console.error('Error updating yearbook signature:', error);
      throw new Error(error.message || 'Failed to update yearbook signature');
    }
  },

  /**
   * Delete yearbook signature
   * @param {string} signatureId - The signature ID
   * @returns {Promise<void>}
   */
  deleteYearbookSignature: async (signatureId) => {
    try {
      await api.delete(`/yearbooks/signatures/${signatureId}`);
    } catch (error) {
      console.error('Error deleting yearbook signature:', error);
      throw new Error(error.message || 'Failed to delete yearbook signature');
    }
  },

  /**
   * Get yearbook comments
   * @param {string} yearbookId - The yearbook ID
   * @param {string} pageId - The page ID (optional)
   * @returns {Promise<Array>} Comments list
   */
  getYearbookComments: async (yearbookId, pageId = null) => {
    try {
      const url = pageId 
        ? `/yearbooks/${yearbookId}/pages/${pageId}/comments`
        : `/yearbooks/${yearbookId}/comments`;
      const response = await api.get(url);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching yearbook comments:', error);
      throw new Error(error.message || 'Failed to fetch yearbook comments');
    }
  },

  /**
   * Add yearbook comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  addYearbookComment: async (commentData) => {
    try {
      const response = await api.post('/yearbooks/comments', commentData);
      return response.data || response;
    } catch (error) {
      console.error('Error adding yearbook comment:', error);
      throw new Error(error.message || 'Failed to add yearbook comment');
    }
  },

  /**
   * Update yearbook comment
   * @param {string} commentId - The comment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated comment
   */
  updateYearbookComment: async (commentId, updateData) => {
    try {
      const response = await api.put(`/yearbooks/comments/${commentId}`, updateData);
      return response.data || response;
    } catch (error) {
      console.error('Error updating yearbook comment:', error);
      throw new Error(error.message || 'Failed to update yearbook comment');
    }
  },

  /**
   * Delete yearbook comment
   * @param {string} commentId - The comment ID
   * @returns {Promise<void>}
   */
  deleteYearbookComment: async (commentId) => {
    try {
      await api.delete(`/yearbooks/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting yearbook comment:', error);
      throw new Error(error.message || 'Failed to delete yearbook comment');
    }
  },

  /**
   * Get alumni yearbooks
   * @param {string} schoolId - The school ID
   * @param {string} alumniId - The alumni ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Alumni yearbooks
   */
  getAlumniYearbooks: async (schoolId, alumniId, params = {}) => {
    try {
      const response = await api.get(`/yearbooks/school/${schoolId}/alumni/${alumniId}`, { params });
      return response.data || response;
    } catch (error) {
      console.error('Error fetching alumni yearbooks:', error);
      throw new Error(error.message || 'Failed to fetch alumni yearbooks');
    }
  },

  /**
   * Get alumni information
   * @param {string} alumniId - The alumni ID
   * @returns {Promise<Object>} Alumni information
   */
  getAlumniInfo: async (alumniId) => {
    try {
      const response = await api.get(`/alumni/${alumniId}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching alumni info:', error);
      throw new Error(error.message || 'Failed to fetch alumni information');
    }
  },

  /**
   * Submit alumni contact form
   * @param {Object} contactData - Contact form data
   * @returns {Promise<Object>} Submission result
   */
  submitAlumniContact: async (contactData) => {
    try {
      const response = await api.post('/alumni/contact', contactData);
      return response.data || response;
    } catch (error) {
      console.error('Error submitting alumni contact:', error);
      throw new Error(error.message || 'Failed to submit alumni contact');
    }
  }
};

export default yearbookService;
