// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

let ws = null;
let metricsCallback = null;

export const connectWebSocket = (onMetricsUpdate) => {
  try {
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

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected. Attempting to reconnect...');
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
  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
};

export const submitQuery = async (prompt) => {
  try {
    console.log('Submitting query to:', API_URL + '/query');
    const response = await axios.post(API_URL + '/query', { prompt }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Query error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: API_URL + '/query'
    });
    throw new Error(error.response?.data?.error || error.message);
  }
};
