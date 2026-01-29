/**
 * Debug Authentication Test
 *
 * Investigates the login response format to fix 401 errors.
 */

import { test, expect, request } from '@playwright/test';
import { API_CONFIG, API_TEST_CREDENTIALS } from './helpers/api-client';

test.describe('Debug Authentication', () => {
  test('inspect login response format', async () => {
    console.log('=== Debug Authentication Test ===');
    console.log(`API Base URL: ${API_CONFIG.baseUrl}`);
    console.log(`Login Email: ${API_TEST_CREDENTIALS.email}`);

    // Create basic context
    const context = await request.newContext({
      baseURL: API_CONFIG.baseUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.timeout,
    });

    // Make login request
    console.log('\n--- Attempting Login ---');
    const loginResponse = await context.post('/api/User/Login', {
      data: {
        email: API_TEST_CREDENTIALS.email,
        password: API_TEST_CREDENTIALS.password,
      },
    });

    console.log(`Login Status: ${loginResponse.status()}`);
    console.log(`Login Status Text: ${loginResponse.statusText()}`);

    const responseText = await loginResponse.text();
    console.log(`\nRaw Login Response:\n${responseText}`);

    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log('\n--- Parsed Response Structure ---');
      console.log('Top-level keys:', Object.keys(data));

      if (data.result) {
        console.log('data.result keys:', Object.keys(data.result));
        console.log('data.result:', JSON.stringify(data.result, null, 2));
      }

      if (data.accessToken) {
        console.log('Direct accessToken found at top level');
      }

      if (data.token) {
        console.log('Direct token found at top level');
      }

      // Check for token in various locations
      const possibleTokens = [
        data.result?.accessToken,
        data.result?.token,
        data.result?.access_token,
        data.accessToken,
        data.token,
        data.access_token,
      ].filter(Boolean);

      console.log('\nPossible tokens found:', possibleTokens.length);
      if (possibleTokens.length > 0) {
        const token = possibleTokens[0];
        console.log(`Token preview: ${token.substring(0, 50)}...`);

        // Try using the token
        console.log('\n--- Testing Token ---');
        const authContext = await request.newContext({
          baseURL: API_CONFIG.baseUrl,
          extraHTTPHeaders: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: API_CONFIG.timeout,
        });

        // Try a simple API call
        const testResponse = await authContext.get('/api/User/GetCurrentUser');
        console.log(`GetCurrentUser Status: ${testResponse.status()}`);

        if (testResponse.ok()) {
          const userData = await testResponse.text();
          console.log(`GetCurrentUser Response:\n${userData.substring(0, 500)}`);
        } else {
          const errorText = await testResponse.text();
          console.log(`GetCurrentUser Error:\n${errorText}`);
        }

        // Try tenant endpoint
        const tenantResponse = await authContext.get('/api/Tenant/GetList');
        console.log(`\nGetList Tenant Status: ${tenantResponse.status()}`);

        if (tenantResponse.ok()) {
          const tenantData = await tenantResponse.text();
          console.log(`Tenant Response:\n${tenantData.substring(0, 500)}`);
        } else {
          const errorText = await tenantResponse.text();
          console.log(`Tenant Error:\n${errorText}`);
        }

        await authContext.dispose();
      }
    } catch (e) {
      console.log('Failed to parse response as JSON:', e);
    }

    await context.dispose();

    // This test is for debugging - always pass
    expect(true).toBe(true);
  });
});
