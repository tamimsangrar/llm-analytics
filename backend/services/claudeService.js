// services/claudeService.js
const axios = require('axios');
require('dotenv').config();

class ClaudeService {
  constructor() {
    this.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    this.CLAUDE_API = 'https://api.anthropic.com/v1/messages';
    
    // Claude cost per 1K tokens (as of 2024)
    this.costs = {
      prompt: 0.0008,
      completion: 0.0024
    };
  }

  async query(prompt) {
    const startTime = Date.now();
    let success = true;
    let error = null;

    try {
      const response = await axios.post(
        this.CLAUDE_API,
        {
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const responseTime = (Date.now() - startTime) / 1000; // Convert to seconds
      
      // Calculate costs
      const cost = this.calculateCost({
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens
      });

      // Track metrics
      await this.trackMetrics({
        model: 'claude-3',
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens,
        cost,
        success: true,
        responseTime,
        error: null
      });

      return {
        content: response.data.content[0].text,
        usage: {
          prompt_tokens: response.data.usage.input_tokens,
          completion_tokens: response.data.usage.output_tokens
        },
        cost,
        responseTime
      };

    } catch (err) {
      const responseTime = (Date.now() - startTime) / 1000;
      
      // Track failed attempt
      await this.trackMetrics({
        model: 'claude-3',
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        success: false,
        responseTime,
        error: err.message
      });

      throw err;
    }
  }

  calculateCost(usage) {
    return (
      (usage.promptTokens / 1000) * this.costs.prompt +
      (usage.completionTokens / 1000) * this.costs.completion
    );
  }

  async trackMetrics(metrics) {
    try {
      await axios.post('http://localhost:3001/api/metrics', metrics);
    } catch (error) {
      console.error('Error tracking metrics:', error);
    }
  }
}

module.exports = ClaudeService;