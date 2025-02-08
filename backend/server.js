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
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Get metrics summary
async function getMetricsSummary() {
  const totalQueries = await prisma.queryMetric.count();
  
  // Calculate success rate
  const successfulQueries = await prisma.queryMetric.count({
    where: { success: true }
  });
  const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0;

  // Get average response time
  const avgResponseTime = await prisma.queryMetric.aggregate({
    _avg: { responseTime: true }
  });

  // Get total cost
  const totalCost = await prisma.queryMetric.aggregate({
    _sum: { cost: true }
  });

  return {
    totalQueries,
    successRate,
    averageResponseTime: avgResponseTime._avg.responseTime || 0,
    totalCost: totalCost._sum.cost || 0
  };
}

// Broadcast updates to all connected clients
const broadcastMetrics = async () => {
  if (wss.clients.size === 0) return;

  const metrics = await getMetricsSummary();
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'metrics-update',
        data: metrics
      }));
    }
  });
};

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
    const { prompt } = req.body;
    const result = await queryClaude(prompt);

    // Store metrics
    await prisma.queryMetric.create({
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

    // Broadcast updated metrics
    await broadcastMetrics();

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    
    // Store failed query metrics
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

    res.status(500).json({ error: error.message });
  }
});

// Track LLM query metrics
app.post('/api/metrics', async (req, res) => {
  try {
    const metric = await prisma.queryMetric.create({
      data: {
        model: req.body.model,
        promptTokens: req.body.promptTokens,
        completionTokens: req.body.completionTokens,
        cost: req.body.cost,
        success: req.body.success,
        responseTime: req.body.responseTime,
        error: req.body.error
      }
    });

    // Broadcast updates
    await broadcastMetrics();

    res.json(metric);
  } catch (error) {
    console.error('Error creating metric:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get metrics summary endpoint
app.get('/api/metrics/summary', async (req, res) => {
  try {
    const metrics = await getMetricsSummary();
    res.json(metrics);
  } catch (error) {
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});