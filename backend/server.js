// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'anthropic-version']
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// WebSocket connections
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast updates to all connected clients
const broadcastMetrics = async () => {
  if (wss.clients.size === 0) return;

  try {
    const metrics = await getMetricsSummary();
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'metrics-update',
          data: metrics
        }));
      }
    });
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
};

// Get metrics summary
async function getMetricsSummary() {
  const totalQueries = await prisma.queryMetric.count();
  
  if (totalQueries === 0) {
    return {
      totalQueries: 0,
      successRate: 0,
      averageResponseTime: 0,
      totalCost: 0
    };
  }
  
  const successfulQueries = await prisma.queryMetric.count({
    where: { success: true }
  });
  
  const avgResponseTime = await prisma.queryMetric.aggregate({
    _avg: { responseTime: true }
  });
  
  const totalCost = await prisma.queryMetric.aggregate({
    _sum: { cost: true }
  });

  return {
    totalQueries,
    successRate: (successfulQueries / totalQueries) * 100,
    averageResponseTime: avgResponseTime._avg.responseTime || 0,
    totalCost: totalCost._sum.cost || 0
  };
}

// Claude API handler
async function queryClaude(prompt) {
  const startTime = Date.now();
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const responseTime = (Date.now() - startTime) / 1000;
    const promptTokens = response.data.usage.input_tokens;
    const completionTokens = response.data.usage.output_tokens;
    
    // Calculate cost (Claude's rates as of 2024)
    const cost = (promptTokens * 0.0008 + completionTokens * 0.0024) / 1000;

    return {
      content: response.data.content[0].text,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      },
      cost,
      responseTime
    };
  } catch (error) {
    console.error('Claude API error:', error.response?.data || error.message);
    throw error;
  }
}

// Query endpoint
app.post('/api/query', async (req, res) => {
  try {
    console.log('Received query request:', req.body);
    const { prompt } = req.body;
    const result = await queryClaude(prompt);
    console.log('Claude response:', result);

    // Store metrics
    const metric = await prisma.queryMetric.create({
      data: {
        model: 'claude-3',
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        cost: result.cost,
        success: true,
        responseTime: result.responseTime,
        error: null
      }
    });

    console.log('Stored metric:', metric);

    // Broadcast updated metrics
    await broadcastMetrics();

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    
    // Store failed query metrics
    try {
      await prisma.queryMetric.create({
        data: {
          model: 'claude-3',
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          success: false,
          responseTime: 0,
          error: error.message
        }
      });
    } catch (dbError) {
      console.error('Error storing failed metric:', dbError);
    }

    res.status(500).json({ error: error.message });
  }
});

// Get metrics summary endpoint
app.get('/api/metrics/summary', async (req, res) => {
  try {
    const metrics = await getMetricsSummary();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get historical data
app.get('/api/metrics/history', async (req, res) => {
  try {
    const history = await prisma.queryMetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset metrics endpoint
app.post('/api/metrics/reset', async (req, res) => {
  try {
    // Delete all records
    await prisma.queryMetric.deleteMany({});
    
    // Broadcast updated metrics
    await broadcastMetrics();
    
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
