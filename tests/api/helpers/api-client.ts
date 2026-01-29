/**
 * API Test Client
 *
 * Direct HTTP client for testing Azure REST API endpoints.
 * Uses Playwright's request API for making HTTP calls.
 */

import { APIRequestContext, request } from '@playwright/test';

// API Configuration
export const API_CONFIG = {
  // Use environment variable or default to Speccon CRM API
  baseUrl: process.env.REACT_APP_API_URL?.replace('https://https://', 'https://') || 'https://crm-service.speccon.co.za',
  timeout: 30000,
};

// Test credentials - System Admin
export const API_TEST_CREDENTIALS = {
  email: 'hein@speccon.co.za',
  password: 'Zuluzaan1!',
};

/**
 * API Response wrapper matching backend ResponseDto<T>
 */
export interface ApiResponse<T> {
  result: T;
  isError: boolean;
  errorMessage: string | null;
  message: string | null;
  statusCode: number;
}

/**
 * Paginated response wrapper (matching API format)
 * Note: Some endpoints return arrays directly, others use this wrapper
 */
export interface PagedResult<T> {
  results: T[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  rowCount: number;
  firstRowOnPage: number;
  lastRowOnPage: number;
}

/**
 * Legacy paginated result for backwards compatibility
 */
export interface LegacyPagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Normalize paginated response to consistent format
 */
export function normalizePagedResult<T>(data: PagedResult<T> | T[]): LegacyPagedResult<T> {
  if (Array.isArray(data)) {
    return {
      items: data,
      totalCount: data.length,
      page: 1,
      pageSize: data.length,
      totalPages: 1,
    };
  }
  return {
    items: data.results || [],
    totalCount: data.rowCount || 0,
    page: data.currentPage || 1,
    pageSize: data.pageSize || 10,
    totalPages: data.pageCount || 1,
  };
}

/**
 * Auth tokens from login
 */
export interface AuthTokens {
  token: string;
  refreshToken: string;
  validTo: string;
  refreshTokenExpiryTime: string;
  isAlreadyLoggedIn: boolean;
}

/**
 * Create API client with authentication
 */
export async function createApiClient(): Promise<{
  context: APIRequestContext;
  tokens: AuthTokens | null;
  baseUrl: string;
}> {
  const context = await request.newContext({
    baseURL: API_CONFIG.baseUrl,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    timeout: API_CONFIG.timeout,
  });

  return {
    context,
    tokens: null,
    baseUrl: API_CONFIG.baseUrl,
  };
}

/**
 * Login and get access token
 */
export async function login(
  context: APIRequestContext,
  email: string = API_TEST_CREDENTIALS.email,
  password: string = API_TEST_CREDENTIALS.password
): Promise<AuthTokens> {
  const response = await context.post('/api/User/Login', {
    data: { email, password },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Login failed: ${response.status()} - ${text}`);
  }

  const data: ApiResponse<AuthTokens> = await response.json();

  if (data.isError) {
    throw new Error(`Login error: ${data.errorMessage}`);
  }

  return data.result;
}

/**
 * Create authenticated API context
 */
export async function createAuthenticatedApiClient(
  email: string = API_TEST_CREDENTIALS.email,
  password: string = API_TEST_CREDENTIALS.password
): Promise<{
  context: APIRequestContext;
  tokens: AuthTokens;
  baseUrl: string;
}> {
  // First, create unauthenticated context for login
  const { context: loginContext } = await createApiClient();

  // Login to get tokens
  const tokens = await login(loginContext, email, password);

  // Create new context with auth header
  const context = await request.newContext({
    baseURL: API_CONFIG.baseUrl,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.token}`,
    },
    timeout: API_CONFIG.timeout,
  });

  // Dispose login context
  await loginContext.dispose();

  return {
    context,
    tokens,
    baseUrl: API_CONFIG.baseUrl,
  };
}

/**
 * Helper to unwrap API response and check for errors
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.isError) {
    throw new Error(`API Error: ${response.errorMessage}`);
  }
  return response.result;
}

/**
 * Helper to make GET request and unwrap response
 */
export async function apiGet<T>(
  context: APIRequestContext,
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  const response = await context.get(url);

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`GET ${url} failed: ${response.status()} - ${text}`);
  }

  const data: ApiResponse<T> = await response.json();
  return unwrapResponse(data);
}

/**
 * Helper to make POST request and unwrap response
 */
export async function apiPost<T>(
  context: APIRequestContext,
  endpoint: string,
  body?: unknown,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  const response = await context.post(url, {
    data: body,
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`POST ${url} failed: ${response.status()} - ${text}`);
  }

  const data: ApiResponse<T> = await response.json();
  return unwrapResponse(data);
}

/**
 * Helper to make DELETE request and unwrap response
 */
export async function apiDelete<T>(
  context: APIRequestContext,
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  const response = await context.delete(url);

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`DELETE ${url} failed: ${response.status()} - ${text}`);
  }

  const data: ApiResponse<T> = await response.json();
  return unwrapResponse(data);
}

/**
 * Generate unique test data
 */
export function generateUniqueId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateTestEmail(): string {
  return `test_${Date.now()}@example.com`;
}

export function generateTestName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}
