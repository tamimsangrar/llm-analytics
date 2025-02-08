// src/App.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import QueryInterface from './components/QueryInterface';
import './styles/Tabs.css';

function App() {
  const [activeTab, setActiveTab] = useState('query');
  const [sessionStats, setSessionStats] = useState({
    queries: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0
  });

  const handleQueryComplete = (queryResult) => {
    setSessionStats(prev => {
      const newTotalTokens = prev.totalTokens + queryResult.usage.prompt_tokens + queryResult.usage.completion_tokens;
      const newQueries = prev.queries + 1;
      
      return {
        queries: newQueries,
        totalTokens: newTotalTokens,
        totalCost: prev.totalCost + queryResult.cost,
        avgResponseTime: (prev.avgResponseTime * (newQueries - 1) + queryResult.responseTime) / newQueries
      };
    });
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        <div className="tabs-nav">
          <button
            className={`tab-button ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            Query Interface
          </button>
          <button
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics Dashboard
          </button>
        </div>
      </div>

      <div className="query-container">
        {activeTab === 'query' ? (
          <QueryInterface onQueryComplete={handleQueryComplete} />
        ) : (
          <Dashboard sessionStats={sessionStats} />
        )}
      </div>
    </div>
  );
}

export default App;