// frontend/src/components/QueryInterface.jsx
import React, { useState, useEffect } from 'react';
import { submitQuery } from '../services/api';
import { Loader } from 'lucide-react';

const QueryInterface = ({ onQueryComplete }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryStats, setQueryStats] = useState(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      console.log('Sending query:', prompt);
      const result = await submitQuery(prompt);
      console.log('Query result:', result);
      
      setResponse(result.content);
      setQueryStats({
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        cost: result.cost,
        responseTime: result.responseTime
      });
      
      if (onQueryComplete) {
        onQueryComplete(result);
      }
    } catch (err) {
      console.error('Query error:', err);
      setError(err.message || 'An error occurred while processing your query');
    } finally {
      setLoading(false);
    }
  };

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="query-interface">
        <div className="error-message">
          You are currently offline. Please check your internet connection.
        </div>
      </div>
    );
  }

  return (
    <div className="query-interface">
      <textarea
        className="query-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        disabled={loading}
      />
      
      <button 
        className="query-button"
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
      >
        {loading ? (
          <>
            <Loader className="animate-spin" />
            Processing...
          </>
        ) : 'Send Query'}
      </button>

      {error && (
        <div className="error-message">
          Error: {error}
          <br />
          <small>If this persists, please try refreshing the page.</small>
        </div>
      )}

      {loading && (
        <div className="loading-message">
          <Loader className="animate-spin" />
          Processing your query...
        </div>
      )}

      {response && (
        <div className="response-container">
          <div className="response-content">{response}</div>
          
          {queryStats && (
            <div className="token-stats">
              <div className="token-stat">
                <span className="token-label">Prompt Tokens</span>
                <span className="token-value">{queryStats.promptTokens}</span>
              </div>
              <div className="token-stat">
                <span className="token-label">Completion Tokens</span>
                <span className="token-value">{queryStats.completionTokens}</span>
              </div>
              <div className="token-stat">
                <span className="token-label">Cost</span>
                <span className="token-value">${queryStats.cost.toFixed(4)}</span>
              </div>
              <div className="token-stat">
                <span className="token-label">Response Time</span>
                <span className="token-value">{queryStats.responseTime.toFixed(2)}s</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryInterface;
