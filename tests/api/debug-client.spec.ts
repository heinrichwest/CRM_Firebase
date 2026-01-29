/**
 * Debug Client API Response Format
 */

import { test, expect, request } from '@playwright/test';
import { API_CONFIG, API_TEST_CREDENTIALS } from './helpers/api-client';

test.describe('Debug Client API', () => {
  test('inspect client list response format', async () => {
    console.log('=== Debug Client API Test ===');

    // Create basic context and login
    const context = await request.newContext({
      baseURL: API_CONFIG.baseUrl,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      timeout: API_CONFIG.timeout,
    });

    const loginResponse = await context.post('/api/User/Login', {
      data: { email: API_TEST_CREDENTIALS.email, password: API_TEST_CREDENTIALS.password },
    });
    const loginData = await loginResponse.json();
    const token = loginData.result.token;

    // Create authenticated context
    const authContext = await request.newContext({
      baseURL: API_CONFIG.baseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: API_CONFIG.timeout,
    });

    // Test Client GetList
    console.log('\n--- Client GetList ---');
    const clientResponse = await authContext.get('/api/Client/GetList?page=1&pageSize=5');
    console.log(`Status: ${clientResponse.status()}`);
    const clientText = await clientResponse.text();
    console.log(`Response: ${clientText.substring(0, 1000)}`);

    try {
      const data = JSON.parse(clientText);
      console.log('\nTop-level keys:', Object.keys(data));
      if (data.result) {
        console.log('data.result type:', typeof data.result);
        console.log('Is array:', Array.isArray(data.result));
        if (typeof data.result === 'object' && !Array.isArray(data.result)) {
          console.log('data.result keys:', Object.keys(data.result));
        }
        if (Array.isArray(data.result) && data.result.length > 0) {
          console.log('First item keys:', Object.keys(data.result[0]));
        }
      }
    } catch (e) {
      console.log('Parse error:', e);
    }

    // Test User GetList
    console.log('\n--- User GetList ---');
    const userResponse = await authContext.get('/api/User/GetList?page=1&pageSize=5');
    console.log(`Status: ${userResponse.status()}`);
    const userText = await userResponse.text();
    console.log(`Response: ${userText.substring(0, 1000)}`);

    try {
      const data = JSON.parse(userText);
      console.log('\nTop-level keys:', Object.keys(data));
      if (data.result) {
        console.log('data.result type:', typeof data.result);
        console.log('Is array:', Array.isArray(data.result));
        if (typeof data.result === 'object' && !Array.isArray(data.result)) {
          console.log('data.result keys:', Object.keys(data.result));
        }
      }
    } catch (e) {
      console.log('Parse error:', e);
    }

    // Test Deal GetList
    console.log('\n--- Deal GetList ---');
    const dealResponse = await authContext.get('/api/Deal/GetList?page=1&pageSize=5');
    console.log(`Status: ${dealResponse.status()}`);
    const dealText = await dealResponse.text();
    console.log(`Response: ${dealText.substring(0, 1000)}`);

    // Test Task GetList
    console.log('\n--- Task GetList ---');
    const taskResponse = await authContext.get('/api/Task/GetList?page=1&pageSize=5');
    console.log(`Status: ${taskResponse.status()}`);
    const taskText = await taskResponse.text();
    console.log(`Response: ${taskText.substring(0, 1000)}`);

    await context.dispose();
    await authContext.dispose();

    expect(true).toBe(true);
  });
});
