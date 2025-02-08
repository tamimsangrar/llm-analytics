// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Sankey } from 'recharts';
import { MessageSquare, Timer, Award, AlertCircle, Trash2 } from 'lucide-react';
import { fetchMetrics, fetchHistory, connectWebSocket, resetMetrics } from '../services/api';
import '../styles/Dashboard.css';

const SankeyNode = ({ sourceLinks, targetLinks, x, y, width, height, payload }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#8884d8"
        fillOpacity={0.9}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12}
      >
        {payload.name}
      </text>
    </g>
  );
};

const ResetModal = ({ isOpen, onClose, onReset }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password === 'llm-suck') {
      onReset();
      onClose();
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Reset Dashboard</h2>
        <p>Enter password to reset all metrics:</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="modal-input"
          placeholder="Enter password"
        />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-buttons">
          <button onClick={onClose} className="modal-button cancel">Cancel</button>
          <button onClick={handleSubmit} className="modal-button reset">Reset</button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    successRate: 0,
    averageResponseTime: 0,
    totalCost: 0
  });

  const [timelineData, setTimelineData] = useState([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [sankeyData, setSankeyData] = useState({
    nodes: [
      { name: 'Total Queries' },
      { name: 'Successful' },
      { name: 'Failed' },
      { name: 'Within SLA' },
      { name: 'Over SLA' },
      { name: 'Optimized' },
      { name: 'High Usage' }
    ],
    links: []
  });

  useEffect(() => {
    // Initial data fetch
    const loadData = async () => {
      try {
        const [metricsData, historyData] = await Promise.all([
          fetchMetrics(),
          fetchHistory()
        ]);
        
        setMetrics(metricsData);
        
        // Process history data for timeline
        const processedData = historyData.map(entry => ({
          timestamp: new Date(entry.timestamp).toLocaleTimeString(),
          tokens: entry.promptTokens + entry.completionTokens,
          cost: entry.cost,
          success: entry.success ? 100 : 0,
          responseTime: entry.responseTime
        }));
        
        setTimelineData(processedData);
        updateSankeyData(historyData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();

    // Set up WebSocket connection
    const cleanup = connectWebSocket((updatedMetrics) => {
      console.log('Received metrics update:', updatedMetrics);
      setMetrics(updatedMetrics);
      // Refresh history data when metrics update
      fetchHistory()
        .then(historyData => {
          const processedData = historyData.map(entry => ({
            timestamp: new Date(entry.timestamp).toLocaleTimeString(),
            tokens: entry.promptTokens + entry.completionTokens,
            cost: entry.cost,
            success: entry.success ? 100 : 0,
            responseTime: entry.responseTime
          }));
          setTimelineData(processedData);
          updateSankeyData(historyData);
        })
        .catch(console.error);
    });

    return cleanup;
  }, []);

const updateSankeyData = (historyData) => {
  if (!historyData || historyData.length === 0) {
    // Set default values when no data is available
    setSankeyData({
      nodes: [
        { name: 'Total Queries' },
        { name: 'Successful' },
        { name: 'Failed' },
        { name: 'Within SLA' },
        { name: 'Over SLA' },
        { name: 'Optimized' },
        { name: 'High Usage' }
      ],
      links: [
        { source: 0, target: 1, value: 1 },
        { source: 0, target: 2, value: 1 },
        { source: 1, target: 3, value: 1 },
        { source: 1, target: 4, value: 1 },
        { source: 3, target: 5, value: 1 },
        { source: 3, target: 6, value: 1 }
      ]
    });
    return;
  }

  const totalQueries = Math.max(historyData.length, 1);
  const successfulQueries = Math.max(historyData.filter(q => q.success).length, 1);
  const withinSLA = Math.max(historyData.filter(q => q.responseTime < 2).length, 1);
  const tokenOptimized = Math.max(historyData.filter(q => (q.promptTokens + q.completionTokens) < 1000).length, 1);

  setSankeyData({
    nodes: [
      { name: 'Total Queries' },
      { name: 'Successful' },
      { name: 'Failed' },
      { name: 'Within SLA' },
      { name: 'Over SLA' },
      { name: 'Optimized' },
      { name: 'High Usage' }
    ],
    links: [
      { source: 0, target: 1, value: successfulQueries },
      { source: 0, target: 2, value: Math.max(totalQueries - successfulQueries, 1) },
      { source: 1, target: 3, value: withinSLA },
      { source: 1, target: 4, value: Math.max(successfulQueries - withinSLA, 1) },
      { source: 3, target: 5, value: tokenOptimized },
      { source: 3, target: 6, value: Math.max(withinSLA - tokenOptimized, 1) }
    ]
  });
};

  const handleReset = async () => {
    try {
      await resetMetrics();
      // Refresh data after reset
      const [metricsData, historyData] = await Promise.all([
        fetchMetrics(),
        fetchHistory()
      ]);
      setMetrics(metricsData);
      setTimelineData([]);
      updateSankeyData([]);
    } catch (error) {
      console.error('Error resetting metrics:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Claude Analytics Dashboard</h1>
          <button 
            className="reset-button"
            onClick={() => setIsResetModalOpen(true)}
          >
            <Trash2 className="icon" />
            Reset Metrics
          </button>
        </div>
        
        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Total Queries</span>
              <MessageSquare className="icon" />
            </div>
            <div className="metric-value">{metrics.totalQueries}</div>
            <div className="metric-subtitle">All time</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Avg Response Time</span>
              <Timer className="icon" />
            </div>
            <div className="metric-value">{metrics.averageResponseTime?.toFixed(2)}s</div>
            <div className="metric-subtitle">All time</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Success Rate</span>
              <Award className="icon" />
            </div>
            <div className="metric-value">{metrics.successRate?.toFixed(1)}%</div>
            <div className="metric-subtitle">All time</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Total Cost</span>
              <AlertCircle className="icon" />
            </div>
            <div className="metric-value">${metrics.totalCost?.toFixed(4)}</div>
            <div className="metric-subtitle">All time</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card">
            <h2 className="chart-title">Query Performance Timeline</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Total Tokens"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="success" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.3}
                    name="Success Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h2 className="chart-title">Response Time Distribution</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="responseTime" 
                    fill="#82ca9d" 
                    name="Response Time (s)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sankey Diagram */}
        <div className="chart-card">
          <h2 className="chart-title">Query Flow Analysis</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <Sankey
                data={sankeyData}
                node={<SankeyNode />}
                nodePadding={50}
                margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                link={{ stroke: '#8884d8' }}
              >
                <Tooltip />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>

        <ResetModal 
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onReset={handleReset}
        />
      </div>
    </div>
  );
};

export default Dashboard;
