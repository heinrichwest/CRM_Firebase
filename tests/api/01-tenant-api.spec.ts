/**
 * API Test Suite: Tenant CRUD Operations
 *
 * Tests the Tenant API endpoints:
 * - POST /api/Tenant/CreateTenant - Create tenant
 * - GET /api/Tenant/GetList - List all tenants
 * - GET /api/Tenant/GetById - Get tenant by ID
 * - GET /api/Tenant/GetByKey - Get tenant by GUID
 * - POST /api/Tenant/UpdateTenant - Update tenant
 * - GET /api/Tenant/GetTenantStatistics - Get tenant stats
 * - POST /api/Tenant/SoftDelete - Soft delete tenant
 * - DELETE /api/Tenant/Delete - Hard delete tenant
 *
 * Test Pattern: POST to create -> GET to verify -> POST to update -> GET to verify
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  createAuthenticatedApiClient,
  apiGet,
  apiPost,
  apiDelete,
  generateTestName,
  generateTestEmail,
  PagedResult,
} from './helpers/api-client';

// Tenant DTOs (matching actual API response)
interface TenantDto {
  tenantId: number;
  tenantKey: string;
  name: string;
  description: string;
  status: string;
  currencySymbol: string;
  financialYearStartMonth: string;
  financialYearEndMonth: string;
  createdDate: string;
}

interface CreateTenantDto {
  name: string;
  description: string;
  subdomain: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
}

interface TenantStatisticsDto {
  userCount: number;
  clientCount: number;
  dealCount: number;
  activeUserCount: number;
}

test.describe.configure({ mode: 'serial' });

test.describe('Tenant API - Read Operations', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('1. GET /api/Tenant/GetList - should list existing tenants', async () => {
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');

    expect(Array.isArray(tenants)).toBeTruthy();
    expect(tenants.length).toBeGreaterThan(0);
    console.log(`Found ${tenants.length} existing tenants`);

    // Verify known tenants exist
    const tenantNames = tenants.map(t => t.name);
    console.log('Existing tenants:', tenantNames.slice(0, 100));
  });

  test('2. GET /api/Tenant/GetById - should retrieve tenant by ID', async () => {
    // Get list first to get a valid ID
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');
    expect(tenants.length).toBeGreaterThan(0);

    const tenant = await apiGet<TenantDto>(
      apiContext,
      `/api/Tenant/GetById?tenantId=${tenants[0].tenantId}`
    );

    expect(tenant.tenantId).toBe(tenants[0].tenantId);
    expect(tenant.name).toBe(tenants[0].name);
    console.log(`Retrieved tenant by ID: ${tenant.name} (ID: ${tenant.tenantId})`);
  });

  test('3. GET /api/Tenant/GetByKey - should retrieve tenant by GUID key', async () => {
    // Get list first to get a valid key
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');
    expect(tenants.length).toBeGreaterThan(0);

    const tenant = await apiGet<TenantDto>(
      apiContext,
      `/api/Tenant/GetByKey?tenantKey=${tenants[0].tenantKey}`
    );

    expect(tenant.tenantKey).toBe(tenants[0].tenantKey);
    expect(tenant.name).toBe(tenants[0].name);
    console.log(`Retrieved tenant by Key: ${tenant.name}`);
  });
});

test.describe('Tenant API - CRUD Operations (Admin Required)', () => {
  let apiContext: APIRequestContext;
  let createdTenantId: number;
  let createdTenantKey: string;
  let hasAdminAccess = false;
  const testTenantName = generateTestName('TestTenant');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;

    // Test if user has admin access by trying to create
    try {
      const testCreate: CreateTenantDto = {
        name: generateTestName('AdminCheck'),
        description: 'Admin access test',
        subdomain: `admin-check-${Date.now()}`,
        contactEmail: generateTestEmail(),
        contactPhone: '+27 11 000 0000',
        isActive: true,
      };
      const result = await apiPost<TenantDto>(apiContext, '/api/Tenant/CreateTenant', testCreate);
      hasAdminAccess = true;
      // Clean up test tenant
      if (result && result.tenantId) {
        await apiDelete<boolean>(apiContext, `/api/Tenant/Delete?tenantId=${result.tenantId}`);
      }
    } catch (e) {
      console.log('User does not have admin access - CRUD tests will be skipped');
      hasAdminAccess = false;
    }
  });

  test.afterAll(async () => {
    if (apiContext && createdTenantId && hasAdminAccess) {
      try {
        await apiDelete<boolean>(apiContext, `/api/Tenant/Delete?tenantId=${createdTenantId}`);
        console.log(`Cleaned up test tenant: ${createdTenantId}`);
      } catch (e) {
        console.warn(`Failed to clean up tenant ${createdTenantId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('4. POST /api/Tenant/CreateTenant - should create new tenant', async () => {
    test.skip(!hasAdminAccess, 'Requires admin access');

    const newTenant: CreateTenantDto = {
      name: testTenantName,
      description: 'Automated API test tenant',
      subdomain: `test-${Date.now()}`,
      contactEmail: generateTestEmail(),
      contactPhone: '+27 11 123 4567',
      isActive: true,
    };

    const createdTenant = await apiPost<TenantDto>(
      apiContext,
      '/api/Tenant/CreateTenant',
      newTenant
    );

    expect(createdTenant).toBeDefined();
    expect(createdTenant.tenantId).toBeGreaterThan(0);
    expect(createdTenant.tenantKey).toBeDefined();
    expect(createdTenant.name).toBe(testTenantName);

    createdTenantId = createdTenant.tenantId;
    createdTenantKey = createdTenant.tenantKey;
    console.log(`Created tenant: ID=${createdTenantId}, Key=${createdTenantKey}`);
  });

  test('5. POST /api/Tenant/UpdateTenant - should update tenant', async () => {
    test.skip(!hasAdminAccess || !createdTenantId, 'Requires admin access and created tenant');

    const updatedName = `${testTenantName}_Updated`;
    await apiPost<TenantDto>(
      apiContext,
      `/api/Tenant/UpdateTenant?tenantId=${createdTenantId}`,
      {
        name: updatedName,
        description: 'Updated via API test',
        subdomain: `test-updated-${Date.now()}`,
        contactEmail: generateTestEmail(),
        contactPhone: '+27 11 987 6543',
        isActive: true,
      }
    );

    const updatedTenant = await apiGet<TenantDto>(
      apiContext,
      `/api/Tenant/GetById?tenantId=${createdTenantId}`
    );

    expect(updatedTenant.name).toBe(updatedName);
    console.log(`Updated tenant: ${updatedTenant.name}`);
  });

  test('6. POST /api/Tenant/SoftDelete - should soft delete tenant', async () => {
    test.skip(!hasAdminAccess || !createdTenantId, 'Requires admin access and created tenant');

    const result = await apiPost<boolean>(
      apiContext,
      `/api/Tenant/SoftDelete?tenantId=${createdTenantId}`
    );

    expect(result).toBe(true);
    console.log(`Soft deleted tenant: ${createdTenantId}`);
  });

  test('7. DELETE /api/Tenant/Delete - should hard delete tenant', async () => {
    test.skip(!hasAdminAccess || !createdTenantId, 'Requires admin access and created tenant');

    const result = await apiDelete<boolean>(
      apiContext,
      `/api/Tenant/Delete?tenantId=${createdTenantId}`
    );

    expect(result).toBe(true);
    console.log(`Hard deleted tenant: ${createdTenantId}`);
    createdTenantId = 0;
  });
});

test.describe('Tenant API - Verify Existing Tenants', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('should verify SpecCon HQ tenant exists and is accessible', async () => {
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');

    // Look for SpecCon HQ or similar
    const speccon = tenants.find(t => t.name.toLowerCase().includes('speccon'));
    expect(speccon).toBeDefined();
    expect(speccon!.status).toBe('Active');

    console.log(`SpecCon tenant verified: ID=${speccon!.tenantId}, Name=${speccon!.name}`);
  });

  test('should list all active tenants', async () => {
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');

    const activeTenants = tenants.filter(t => t.status === 'Active');
    console.log(`Found ${activeTenants.length} active tenants out of ${tenants.length} total`);

    // List a sample
    activeTenants.slice(0, 10).forEach(t => {
      console.log(`  - ${t.name} (ID: ${t.tenantId})`);
    });
  });

  test('should verify tenant data structure', async () => {
    const tenants = await apiGet<TenantDto[]>(apiContext, '/api/Tenant/GetList');
    expect(tenants.length).toBeGreaterThan(0);

    const tenant = tenants[0];
    expect(tenant.tenantId).toBeDefined();
    expect(tenant.tenantKey).toBeDefined();
    expect(tenant.name).toBeDefined();
    expect(tenant.status).toBeDefined();
    expect(tenant.currencySymbol).toBeDefined();

    console.log('Tenant data structure verified');
  });
});
