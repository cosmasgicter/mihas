#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://application.mihas.edu.zm';

function makeRequest(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body.substring(0, 200)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        body: error.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 'TIMEOUT',
        body: 'Request timeout'
      });
    });
    
    req.end();
  });
}

async function testEndpoints() {
  const endpoints = [
    '/api/test',
    '/api/catalog',
    '/api/analytics/telemetry',
    '/api/applications',
    '/api/admin/users',
    '/api/notifications'
  ];

  console.log('🧪 Testing API Endpoints');
  console.log('='.repeat(50));

  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    const status = result.status === 200 ? '✅' : 
                  result.status === 401 || result.status === 403 ? '🔒' : 
                  result.status === 503 ? '⚠️' : '❌';
    
    console.log(`${status} ${endpoint}: ${result.status}`);
    if (result.body && result.status !== 200) {
      console.log(`   ${result.body.substring(0, 100)}`);
    }
  }
}

testEndpoints().catch(console.error);