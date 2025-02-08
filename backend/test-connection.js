// test.js
const axios = require('axios');

async function testBackend() {
  try {
    // Test basic connection
    const testResponse = await axios.get('http://localhost:3001/api/test');
    console.log('Basic test:', testResponse.data);

    // Test metric creation
    const metricResponse = await axios.post('http://localhost:3001/api/metrics', {
      model: 'claude',
      promptTokens: 100,
      completionTokens: 50,
      cost: 0.002,
      success: true,
      responseTime: 0.8
    });
    console.log('Created metric:', metricResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBackend();