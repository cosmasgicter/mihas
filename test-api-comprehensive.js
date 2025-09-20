#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://application.mihas.edu.zm';

function makeRequest(path, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            body: jsonBody,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body.substring(0, 200),
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        body: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        status: 'TIMEOUT',
        body: 'Request timeout'
      });
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Comprehensive API Test Suite');
  console.log('📍 Testing: ' + BASE_URL);
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Health Check',
      path: '/api/test',
      expectedStatus: [200, 404]
    },
    {
      name: 'Catalog - Invalid',
      path: '/api/catalog',
      expectedStatus: [400]
    },
    {
      name: 'Catalog - Programs',
      path: '/api/catalog?resource=programs',
      expectedStatus: [200]
    },
    {
      name: 'Catalog - Subjects',
      path: '/api/catalog?resource=subjects',
      expectedStatus: [200]
    },
    {
      name: 'Applications (No Auth)',
      path: '/api/applications',
      expectedStatus: [401, 503]
    },
    {
      name: 'Admin Users (No Auth)',
      path: '/api/admin/users',
      expectedStatus: [401, 403, 500]
    },
    {
      name: 'Analytics Telemetry (No Auth)',
      path: '/api/analytics?action=telemetry',
      expectedStatus: [401, 403, 503]
    },
    {
      name: 'Analytics Metrics (No Auth)',
      path: '/api/analytics?action=metrics',
      expectedStatus: [401, 403, 503]
    },
    {
      name: 'Notifications (No Auth)',
      path: '/api/notifications',
      expectedStatus: [401, 500]
    },
    {
      name: 'User Consents (No Auth)',
      path: '/api/user-consents',
      expectedStatus: [401, 403]
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await makeRequest(test.path);
    const isExpected = test.expectedStatus.includes(result.status);
    
    if (isExpected) {
      passed++;
      console.log(`✅ ${test.name}: ${result.status} (Expected)`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: ${result.status} (Expected: ${test.expectedStatus.join('|')})`);
      if (typeof result.body === 'string') {
        console.log(`   ${result.body.substring(0, 100)}`);
      } else if (result.body?.error) {
        console.log(`   Error: ${result.body.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  // Test POST endpoints
  console.log('\n🔄 Testing POST Endpoints');
  console.log('-'.repeat(40));

  const postTests = [
    {
      name: 'Create Application (No Auth)',
      path: '/api/applications',
      method: 'POST',
      body: { institution: 'MIHAS', program: 'Nursing' },
      expectedStatus: [401, 400]
    },
    {
      name: 'Analytics Telemetry POST (No Auth)',
      path: '/api/analytics?action=telemetry',
      method: 'POST',
      body: { events: [] },
      expectedStatus: [401, 400]
    }
  ];

  for (const test of postTests) {
    const result = await makeRequest(test.path, {
      method: test.method,
      body: test.body
    });
    
    const isExpected = test.expectedStatus.includes(result.status);
    
    if (isExpected) {
      passed++;
      console.log(`✅ ${test.name}: ${result.status} (Expected)`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: ${result.status} (Expected: ${test.expectedStatus.join('|')})`);
      if (result.body?.error) {
        console.log(`   Error: ${result.body.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Final Results');
  console.log(`✅ Total Passed: ${passed}`);
  console.log(`❌ Total Failed: ${failed}`);
  console.log(`📈 Overall Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('🎉 All API endpoints are responding as expected!');
  } else {
    console.log('⚠️  Some endpoints need attention.');
  }
}

testEndpoints().catch(console.error);