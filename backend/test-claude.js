// test-claude.js
require('dotenv').config();
const ClaudeService = require('./services/claudeService');

async function testClaudeService() {
  const claudeService = new ClaudeService();
  
  try {
    console.log('Testing Claude...');
    const response = await claudeService.query('What is 2+2?');
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testClaudeService();