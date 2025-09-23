import React, { useState, useEffect, useCallback } from 'react';
import { yearbookService } from '../services/yearbookApi';
import './YearbookSignatures.css';

/**
 * Yearbook Signatures and Comments Component
 * Handles digital signatures and comments for yearbooks
 */
const YearbookSignatures = ({ 
  yearbookId, 
  pageId, 
  onClose,
  className = '',
  config = {}
}) => {
  const [signatures, setSignatures] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newSignature, setNewSignature] = useState('');
  const [signatureAuthor, setSignatureAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddSignature, setShowAddSignature] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editingSignature, setEditingSignature] = useState(null);

  const defaultConfig = {
    enableSignatures: true,
    enableComments: true,
    enableEditing: true,
    enableDeletion: true,
    maxCommentLength: 500,
    maxSignatureLength: 200,
    allowAnonymous: false,
    requireModeration: false,
    ...config
  };

  // Load signatures and comments
  const loadSignaturesAndComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [signaturesData, commentsData] = await Promise.all([
        yearbookService.getYearbookSignatures(yearbookId, pageId),
        yearbookService.getYearbookComments(yearbookId, pageId)
      ]);
      
      setSignatures(signaturesData);
      setComments(commentsData);
    } catch (err) {
      setError(err.message || 'Failed to load signatures and comments');
      console.error('Error loading signatures and comments:', err);
    } finally {
      setLoading(false);
    }
  }, [yearbookId, pageId]);

  useEffect(() => {
    if (yearbookId && pageId) {
      loadSignaturesAndComments();
    }
  }, [yearbookId, pageId, loadSignaturesAndComments]);

  // Add new signature
  const addSignature = useCallback(async () => {
    if (!newSignature.trim() || !signatureAuthor.trim()) return;

    setIsSubmitting(true);
    try {
      const signatureData = {
        yearbookId,
        pageId,
        text: newSignature.trim(),
        author: signatureAuthor.trim(),
        timestamp: new Date().toISOString()
      };

      const response = await yearbookService.addYearbookSignature(signatureData);
      setSignatures(prev => [response, ...prev]);
      setNewSignature('');
      setSignatureAuthor('');
      setShowAddSignature(false);
    } catch (err) {
      setError(err.message || 'Failed to add signature');
      console.error('Error adding signature:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [yearbookId, pageId, newSignature, signatureAuthor]);

  // Add new comment
  const addComment = useCallback(async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        yearbookId,
        pageId,
        text: newComment.trim(),
        timestamp: new Date().toISOString()
      };

      const response = await yearbookService.addYearbookComment(commentData);
      setComments(prev => [response, ...prev]);
      setNewComment('');
      setShowAddComment(false);
    } catch (err) {
      setError(err.message || 'Failed to add comment');
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [yearbookId, pageId, newComment]);

  // Edit signature
  const editSignature = useCallback(async (signatureId, newText) => {
    try {
      const response = await yearbookService.updateYearbookSignature(signatureId, { text: newText });
      setSignatures(prev => prev.map(sig => 
        sig.id === signatureId ? { ...sig, text: newText, updatedAt: new Date().toISOString() } : sig
      ));
      setEditingSignature(null);
    } catch (err) {
      setError(err.message || 'Failed to update signature');
      console.error('Error updating signature:', err);
    }
  }, []);

  // Edit comment
  const editComment = useCallback(async (commentId, newText) => {
    try {
      const response = await yearbookService.updateYearbookComment(commentId, { text: newText });
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? { ...comment, text: newText, updatedAt: new Date().toISOString() } : comment
      ));
      setEditingComment(null);
    } catch (err) {
      setError(err.message || 'Failed to update comment');
      console.error('Error updating comment:', err);
    }
  }, []);

  // Delete signature
  const deleteSignature = useCallback(async (signatureId) => {
    if (!window.confirm('Are you sure you want to delete this signature?')) return;

    try {
      await yearbookService.deleteYearbookSignature(signatureId);
      setSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    } catch (err) {
      setError(err.message || 'Failed to delete signature');
      console.error('Error deleting signature:', err);
    }
  }, []);

  // Delete comment
  const deleteComment = useCallback(async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await yearbookService.deleteYearbookComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      setError(err.message || 'Failed to delete comment');
      console.error('Error deleting comment:', err);
    }
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`yearbook-signatures ${className}`}>
        <div className="signatures-loading">
          <div className="loading-spinner"></div>
          <p>Loading signatures and comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`yearbook-signatures ${className}`}>
      <div className="signatures-header">
        <h2>Signatures & Comments</h2>
        <button onClick={onClose} className="close-button">
          ✕
        </button>
      </div>

      <div className="signatures-content">
        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Signatures Section */}
        {defaultConfig.enableSignatures && (
          <div className="signatures-section">
            <div className="section-header">
              <h3>Digital Signatures ({signatures.length})</h3>
              <button 
                onClick={() => setShowAddSignature(true)}
                className="add-button"
              >
                + Add Signature
              </button>
            </div>

            {/* Add Signature Form */}
            {showAddSignature && (
              <div className="add-form">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={signatureAuthor}
                    onChange={(e) => setSignatureAuthor(e.target.value)}
                    placeholder="Enter your name..."
                    className="form-input"
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label>Signature Message</label>
                  <textarea
                    value={newSignature}
                    onChange={(e) => setNewSignature(e.target.value)}
                    placeholder="Leave your signature message..."
                    className="form-textarea"
                    maxLength={defaultConfig.maxSignatureLength}
                    rows={3}
                  />
                  <div className="character-count">
                    {newSignature.length}/{defaultConfig.maxSignatureLength}
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    onClick={() => {
                      setShowAddSignature(false);
                      setNewSignature('');
                      setSignatureAuthor('');
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addSignature}
                    disabled={!newSignature.trim() || !signatureAuthor.trim() || isSubmitting}
                    className="submit-button"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Signature'}
                  </button>
                </div>
              </div>
            )}

            {/* Signatures List */}
            <div className="signatures-list">
              {signatures.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✍️</div>
                  <p>No signatures yet. Be the first to sign!</p>
                </div>
              ) : (
                signatures.map((signature) => (
                  <div key={signature.id} className="signature-item">
                    <div className="signature-content">
                      {editingSignature === signature.id ? (
                        <div className="edit-form">
                          <textarea
                            defaultValue={signature.text}
                            className="edit-textarea"
                            maxLength={defaultConfig.maxSignatureLength}
                            rows={2}
                          />
                          <div className="edit-actions">
                            <button 
                              onClick={() => {
                                const newText = document.querySelector('.edit-textarea').value;
                                editSignature(signature.id, newText);
                              }}
                              className="save-button"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingSignature(null)}
                              className="cancel-button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="signature-text">{signature.text}</div>
                          <div className="signature-meta">
                            <span className="signature-author">— {signature.author}</span>
                            <span className="signature-date">
                              {formatTimestamp(signature.timestamp)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {defaultConfig.enableEditing && (
                      <div className="signature-actions">
                        <button 
                          onClick={() => setEditingSignature(signature.id)}
                          className="edit-button"
                        >
                          ✏️
                        </button>
                        {defaultConfig.enableDeletion && (
                          <button 
                            onClick={() => deleteSignature(signature.id)}
                            className="delete-button"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {defaultConfig.enableComments && (
          <div className="comments-section">
            <div className="section-header">
              <h3>Comments ({comments.length})</h3>
              <button 
                onClick={() => setShowAddComment(true)}
                className="add-button"
              >
                + Add Comment
              </button>
            </div>

            {/* Add Comment Form */}
            {showAddComment && (
              <div className="add-form">
                <div className="form-group">
                  <label>Your Comment</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this yearbook..."
                    className="form-textarea"
                    maxLength={defaultConfig.maxCommentLength}
                    rows={4}
                  />
                  <div className="character-count">
                    {newComment.length}/{defaultConfig.maxCommentLength}
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    onClick={() => {
                      setShowAddComment(false);
                      setNewComment('');
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="submit-button"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>No comments yet. Share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-content">
                      {editingComment === comment.id ? (
                        <div className="edit-form">
                          <textarea
                            defaultValue={comment.text}
                            className="edit-textarea"
                            maxLength={defaultConfig.maxCommentLength}
                            rows={3}
                          />
                          <div className="edit-actions">
                            <button 
                              onClick={() => {
                                const newText = document.querySelector('.edit-textarea').value;
                                editComment(comment.id, newText);
                              }}
                              className="save-button"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingComment(null)}
                              className="cancel-button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="comment-text">{comment.text}</div>
                          <div className="comment-meta">
                            <span className="comment-date">
                              {formatTimestamp(comment.timestamp)}
                            </span>
                            {comment.updatedAt && (
                              <span className="comment-updated">
                                (edited)
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {defaultConfig.enableEditing && (
                      <div className="comment-actions">
                        <button 
                          onClick={() => setEditingComment(comment.id)}
                          className="edit-button"
                        >
                          ✏️
                        </button>
                        {defaultConfig.enableDeletion && (
                          <button 
                            onClick={() => deleteComment(comment.id)}
                            className="delete-button"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearbookSignatures;
