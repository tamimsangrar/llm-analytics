// frontend/src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

let ws = null;
let metricsCallback = null;

export const connectWebSocket = (onMetricsUpdate) => {
  metricsCallback = onMetricsUpdate;
  ws = new WebSocket(WS_URL);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics-update' && metricsCallback) {
        metricsCallback(data.data);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting...');
    setTimeout(() => connectWebSocket(onMetricsUpdate), 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  };
};

export const submitQuery = async (prompt) => {
  try {
    const response = await axios.post(`${API_URL}/query`, { prompt });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
};

export const fetchMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/metrics/summary`);
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};

export const resetMetrics = async () => {
    try {
      const response = await axios.post(`${API_URL}/metrics/reset`);
      return response.data;
    } catch (error) {
      console.error('Error resetting metrics:', error);
      throw error;
    }
  };

export const fetchHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/metrics/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};