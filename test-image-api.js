#!/usr/bin/env node

const http = require('http');

// Test data for image generation
const testData = {
  prompt: "A beautiful sunset over mountains",
  styleName: "none",
  negativePrompt: "",
  size: "1024*1024",
  seed: 42
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/generate-image',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing image generation API...');
console.log('Request data:', testData);

const req = http.request(options, (res) => {
  console.log(`\nResponse status: ${res.statusCode}`);
  console.log('Response headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();