/**
 * Debug Client Create API Request Format
 */

import { test, expect, request } from '@playwright/test';
import { API_CONFIG, API_TEST_CREDENTIALS } from './helpers/api-client';

test.describe('Debug Client Create API', () => {
  test('test minimal client create', async () => {
    console.log('=== Debug Client Create API Test ===');

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

    const authContext = await request.newContext({
      baseURL: API_CONFIG.baseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: API_CONFIG.timeout,
    });

    // Try minimal client creation
    console.log('\n--- Testing Minimal Client Creation ---');
    const minimalClient = {
      name: `Test_${Date.now()}`,
    };

    const response1 = await authContext.post('/api/Client/CreateClient', {
      data: minimalClient,
    });
    console.log(`Minimal create status: ${response1.status()}`);
    console.log(`Response: ${await response1.text()}`);

    // Try with email in different formats
    console.log('\n--- Testing with ContactEmail ---');
    const withContactEmail = {
      name: `Test_${Date.now()}`,
      contactEmail: 'test@example.com',
    };

    const response2 = await authContext.post('/api/Client/CreateClient', {
      data: withContactEmail,
    });
    console.log(`With contactEmail status: ${response2.status()}`);
    console.log(`Response: ${await response2.text()}`);

    // Try with both email fields
    console.log('\n--- Testing with both email fields ---');
    const withBothEmails = {
      name: `Test_${Date.now()}`,
      contactEmail: 'test@example.com',
      hrContactEmail: 'hr@example.com',
    };

    const response3 = await authContext.post('/api/Client/CreateClient', {
      data: withBothEmails,
    });
    console.log(`With both emails status: ${response3.status()}`);
    const resp3Text = await response3.text();
    console.log(`Response: ${resp3Text.substring(0, 500)}`);

    // Get existing client to understand structure
    console.log('\n--- Getting existing client structure ---');
    const listResponse = await authContext.get('/api/Client/GetList?pageSize=1');
    const listText = await listResponse.text();
    console.log(`List response: ${listText}`);

    const listData = JSON.parse(listText);
    if (listData.result?.results?.[0]) {
      const clientData = listData.result.results[0];
      console.log('\n--- Client list item keys ---');
      console.log(Object.keys(clientData).join(', '));
      console.log(`ID field: ${clientData.id}`);
      console.log(`clientId field: ${clientData.clientId}`);

      // Try GetByKey instead
      console.log('\n--- Testing GetByKey ---');
      const keyResponse = await authContext.get(`/api/Client/GetByKey?clientKey=${clientData.id}`);
      console.log(`GetByKey status: ${keyResponse.status()}`);
      const keyText = await keyResponse.text();
      console.log(`GetByKey response: ${keyText.substring(0, 1000)}`);
    }

    await context.dispose();
    await authContext.dispose();

    expect(true).toBe(true);
  });
});
