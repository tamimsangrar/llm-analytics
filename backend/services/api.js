// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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

export const submitQuery = async (prompt) => {
  try {
    const response = await axios.post(`${API_URL}/query`, { prompt });
    return response.data;
  } catch (error) {
    console.error('Error submitting query:', error);
    throw error;
  }
};