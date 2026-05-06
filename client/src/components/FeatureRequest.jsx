import React, { useState } from 'react';
import api from '../services/api';

const FeatureRequest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      await api.post('/feedback', { content });
      setStatus('success');
      setContent('');
      setTimeout(() => {
        setIsOpen(false);
        setStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feature-request-container">
      {isOpen && (
        <div className="feature-request-bubble">
          <div className="bubble-header">
            <span>Suggest a Feature</span>
            <button className="bubble-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleSubmit} className="bubble-form">
            <textarea
              placeholder="What should I add next? (e.g. 'Add a dark mode toggle' or 'Show album art')"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting || status === 'success'}
            />
            <div className="bubble-footer">
              {status === 'success' && <span className="status-ok">Thanks! Recorded. 💩</span>}
              {status === 'error' && <span className="status-err">Error! Try again.</span>}
              <button
                type="submit"
                className="btn-submit-feedback"
                disabled={isSubmitting || !content.trim() || status === 'success'}
              >
                {isSubmitting ? 'Sending...' : 'Send Prompt'}
              </button>
            </div>
          </form>
        </div>
      )}
      <button
        className={`feature-request-fab ${isOpen ? 'fab-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Request a Feature"
      >
        💡
      </button>
    </div>
  );
};

export default FeatureRequest;
