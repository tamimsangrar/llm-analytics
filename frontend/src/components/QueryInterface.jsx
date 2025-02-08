// src/components/QueryInterface.jsx
import React, { useState } from 'react';
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
      const result = await submitQuery(prompt);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <Loader className="animate-spin mr-2" />
            Processing...
          </>
        ) : 'Send Query'}
      </button>

      {error && (
        <div className="response-container" style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="response-container response-pending">
          <Loader className="animate-spin mr-2" />
          Waiting for response...
        </div>
      )}

      {response && (
        <div className="response-container">
          <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
          
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