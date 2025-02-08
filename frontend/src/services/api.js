// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

let ws = null;
let metricsCallback = null;

// In frontend/src/services/api.js
export const connectWebSocket = (onMetricsUpdate) => {
  try {
    const wsUrl = `${WS_URL}/ws`;  // Add the /ws path
    console.log('Connecting to WebSocket:', wsUrl);
    
    ws = new WebSocket(wsUrl);

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

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      // Only reconnect if it wasn't closed intentionally
      if (event.code !== 1000) {
        setTimeout(() => connectWebSocket(onMetricsUpdate), 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws) {
        ws.close(1000, 'Closing normally');  // Clean closure
        ws = null;
      }
    };
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return () => {};  // Return empty cleanup function
  }
};

export const submitQuery = async (prompt) => {
  try {
    console.log('Submitting query to:', `${API_URL}/query`);
    const response = await axios.post(`${API_URL}/query`, 
      { prompt }, 
      {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true,
        timeout: 30000
      }
    );
    return response.data;
  } catch (error) {
    console.error('Query error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: `${API_URL}/query`
    });
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

export const fetchHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/metrics/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
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
