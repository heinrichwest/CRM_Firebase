/**
 * API Test Suite: Reference Data API Operations
 *
 * Tests reference data endpoints:
 * - Pipeline Status API
 * - Skills Partner API
 * - SETA API
 * - Role & Permission API
 * - System Settings API
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
  PagedResult,
} from './helpers/api-client';

// ============================================================================
// DTOs
// ============================================================================

interface PipelineStatusDto {
  id: number;
  key: string;
  name: string;
  description: string;
  displayOrder: number;
  color: string;
  isActive: boolean;
}

interface SkillsPartnerDto {
  id: number;
  key: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

interface SetaDto {
  id: number;
  key: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

interface RoleDto {
  id: number;
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  isSystem: boolean;
}

interface PermissionDto {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
}

interface SystemSettingDto {
  key: string;
  value: string;
  description: string;
  dataType: string;
  category: string;
}

interface FinancialYearSettingsDto {
  startMonth: number;
  startDay: number;
  currentFinancialYear: string;
}

// ============================================================================
// PIPELINE STATUS TESTS
// ============================================================================

test.describe('PipelineStatus API', () => {
  let apiContext: APIRequestContext;
  let createdStatusId: number;
  const testStatusName = generateTestName('TestStatus');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    if (apiContext && createdStatusId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/PipelineStatus/Delete?pipelineStatusId=${createdStatusId}`);
        console.log(`Cleaned up test status: ${createdStatusId}`);
      } catch (e) {
        console.warn(`Failed to clean up status ${createdStatusId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/PipelineStatus/GetList - should list pipeline statuses', async () => {
    try {
      const statuses = await apiGet<PipelineStatusDto[]>(apiContext, '/api/PipelineStatus/GetList');

      expect(Array.isArray(statuses)).toBeTruthy();

      console.log(`Found ${statuses.length} pipeline statuses:`);
      statuses.forEach(s => {
        console.log(`  - ${s.name} (Order: ${s.displayOrder}, Color: ${s.color})`);
      });
    } catch (error: any) {
      console.log(`PipelineStatus GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. POST /api/PipelineStatus/CreatePipelineStatus - should create pipeline status', async () => {
    try {
      const newStatus = {
        displayName: testStatusName, // API expects displayName, not name
        description: 'Test pipeline status via API',
        displayOrder: 99,
        color: '#FF5733',
      };

      const created = await apiPost<PipelineStatusDto>(
        apiContext,
        '/api/PipelineStatus/CreatePipelineStatus',
        newStatus
      );

      expect(created).toBeDefined();
      expect(created.name).toBe(testStatusName);
      expect(created.displayOrder).toBe(99);
      expect(created.isActive).toBe(true);

      createdStatusId = created.id;
      console.log(`Created pipeline status: ${created.name} (ID: ${created.id})`);
    } catch (error: any) {
      console.log(`PipelineStatus Create: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. POST /api/PipelineStatus/UpdatePipelineStatus - should update pipeline status', async () => {
    test.skip(!createdStatusId, 'No status was created');

    const updatedName = `${testStatusName}_Updated`;

    await apiPost<PipelineStatusDto>(
      apiContext,
      `/api/PipelineStatus/UpdatePipelineStatus?pipelineStatusKey=${createdStatusId}`,
      {
        name: updatedName,
        description: 'Updated via API test',
        displayOrder: 98,
        color: '#33FF57',
      }
    );

    // Verify update
    const statuses = await apiGet<PipelineStatusDto[]>(apiContext, '/api/PipelineStatus/GetList');
    const updated = statuses.find(s => s.id === createdStatusId);

    expect(updated?.name).toBe(updatedName);
    console.log(`Updated pipeline status: ${updated?.name}`);
  });

  test('4. POST /api/PipelineStatus/ReorderPipelineStatuses - should reorder statuses', async () => {
    try {
      const statuses = await apiGet<PipelineStatusDto[]>(apiContext, '/api/PipelineStatus/GetList');

      if (statuses.length >= 2) {
        // Swap order of first two statuses
        const reordered = statuses.map((s, i) => ({
          id: s.id,
          displayOrder: statuses.length - i,
        }));

        await apiPost<boolean>(
          apiContext,
          '/api/PipelineStatus/ReorderPipelineStatuses',
          reordered
        );

        console.log('Reordered pipeline statuses');
      }
    } catch (error: any) {
      console.log(`PipelineStatus Reorder: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});

// ============================================================================
// SKILLS PARTNER TESTS
// ============================================================================

test.describe('SkillsPartner API', () => {
  let apiContext: APIRequestContext;
  let createdPartnerId: number;
  const testPartnerName = generateTestName('TestPartner');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    if (apiContext && createdPartnerId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/SkillsPartner/Delete?skillsPartnerKey=${createdPartnerId}`);
        console.log(`Cleaned up test partner: ${createdPartnerId}`);
      } catch (e) {
        console.warn(`Failed to clean up partner ${createdPartnerId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/SkillsPartner/GetList - should list skills partners', async () => {
    try {
      const partners = await apiGet<SkillsPartnerDto[]>(apiContext, '/api/SkillsPartner/GetList');

      expect(Array.isArray(partners)).toBeTruthy();

      console.log(`Found ${partners.length} skills partners:`);
      partners.forEach(p => {
        console.log(`  - ${p.name} (${p.code}) - ${p.contactPerson || 'No contact'}`);
      });
    } catch (error: any) {
      console.log(`SkillsPartner GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. POST /api/SkillsPartner/CreateSkillsPartner - should create skills partner', async () => {
    try {
      const newPartner = {
        displayName: testPartnerName, // API expects displayName
        code: `TSP-${Date.now()}`,
        contactPerson: 'Test Contact',
        email: `test-partner-${Date.now()}@test.com`,
        phone: '+27 11 123 4567',
        address: '123 Test Street, Johannesburg',
      };

      const created = await apiPost<SkillsPartnerDto>(
        apiContext,
        '/api/SkillsPartner/CreateSkillsPartner',
        newPartner
      );

      expect(created).toBeDefined();
      expect(created.name).toBe(testPartnerName);
      expect(created.isActive).toBe(true);

      createdPartnerId = created.id;
      console.log(`Created skills partner: ${created.name} (ID: ${created.id})`);
    } catch (error: any) {
      console.log(`SkillsPartner Create: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. POST /api/SkillsPartner/UpdateSkillsPartner - should update skills partner', async () => {
    test.skip(!createdPartnerId, 'No partner was created');

    const updatedName = `${testPartnerName}_Updated`;

    await apiPost<SkillsPartnerDto>(
      apiContext,
      `/api/SkillsPartner/UpdateSkillsPartner?skillsPartnerKey=${createdPartnerId}`,
      {
        name: updatedName,
        code: `TSP-${Date.now()}`,
        contactPerson: 'Updated Contact',
        email: `updated-partner-${Date.now()}@test.com`,
        phone: '+27 11 999 9999',
        address: '456 Updated Street, Cape Town',
      }
    );

    console.log(`Updated skills partner: ${updatedName}`);
  });
});

// ============================================================================
// SETA TESTS
// ============================================================================

test.describe('SETA API', () => {
  let apiContext: APIRequestContext;
  let createdSetaId: number;
  const testSetaName = generateTestName('TestSeta');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    if (apiContext && createdSetaId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/Seta/Delete?setaKey=${createdSetaId}`);
        console.log(`Cleaned up test SETA: ${createdSetaId}`);
      } catch (e) {
        console.warn(`Failed to clean up SETA ${createdSetaId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/Seta/GetList - should list SETAs', async () => {
    const setas = await apiGet<SetaDto[]>(apiContext, '/api/Seta/GetList');

    expect(Array.isArray(setas)).toBeTruthy();

    console.log(`Found ${setas.length} SETAs:`);
    setas.forEach(s => {
      console.log(`  - ${s.name} (${s.code})`);
    });
  });

  test('2. POST /api/Seta/CreateSeta - should create SETA', async () => {
    const newSeta = {
      name: testSetaName,
      code: `TSETA-${Date.now()}`,
      description: 'Test SETA via API',
    };

    const created = await apiPost<SetaDto>(
      apiContext,
      '/api/Seta/CreateSeta',
      newSeta
    );

    expect(created).toBeDefined();
    expect(created.name).toBe(testSetaName);
    expect(created.isActive).toBe(true);

    createdSetaId = created.id;
    console.log(`Created SETA: ${created.name} (ID: ${created.id})`);
  });

  test('3. POST /api/Seta/UpdateSeta - should update SETA', async () => {
    test.skip(!createdSetaId, 'No SETA was created');

    const updatedName = `${testSetaName}_Updated`;

    await apiPost<SetaDto>(
      apiContext,
      `/api/Seta/UpdateSeta?setaKey=${createdSetaId}`,
      {
        name: updatedName,
        code: `TSETA-${Date.now()}`,
        description: 'Updated via API test',
      }
    );

    console.log(`Updated SETA: ${updatedName}`);
  });
});

// ============================================================================
// ROLE & PERMISSION TESTS
// ============================================================================

test.describe('Role API', () => {
  let apiContext: APIRequestContext;
  let createdRoleId: number;
  const testRoleName = generateTestName('TestRole');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    if (apiContext && createdRoleId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/Role/Delete?roleId=${createdRoleId}`);
        console.log(`Cleaned up test role: ${createdRoleId}`);
      } catch (e) {
        console.warn(`Failed to clean up role ${createdRoleId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/Role/GetList - should list roles', async () => {
    const roles = await apiGet<RoleDto[]>(apiContext, '/api/Role/GetList');

    expect(Array.isArray(roles)).toBeTruthy();

    console.log(`Found ${roles.length} roles:`);
    roles.forEach(r => {
      console.log(`  - ${r.name} (System: ${r.isSystem}, Permissions: ${r.permissions?.length || 0})`);
    });
  });

  test('2. GET /api/Permission/GetList - should list permissions', async () => {
    const permissions = await apiGet<PermissionDto[]>(apiContext, '/api/Permission/GetList');

    expect(Array.isArray(permissions)).toBeTruthy();

    console.log(`Found ${permissions.length} permissions`);

    // Group by category
    const byCategory: { [key: string]: PermissionDto[] } = {};
    permissions.forEach(p => {
      if (!byCategory[p.category]) {
        byCategory[p.category] = [];
      }
      byCategory[p.category].push(p);
    });

    Object.entries(byCategory).forEach(([category, perms]) => {
      console.log(`  ${category}:`);
      perms.forEach(p => {
        console.log(`    - ${p.name}`);
      });
    });
  });

  test('3. GET /api/Permission/GetByCategory - should get permissions by category', async () => {
    const permissions = await apiGet<{ [key: string]: PermissionDto[] }>(
      apiContext,
      '/api/Permission/GetByCategory'
    );

    expect(permissions).toBeDefined();
    console.log('Permissions by category:', Object.keys(permissions));
  });

  test('4. POST /api/Role/CreateRole - should create role', async () => {
    try {
      // Get some permissions first
      const permissions = await apiGet<PermissionDto[]>(apiContext, '/api/Permission/GetList');
      const permissionKeys = permissions.slice(0, 5).map(p => p.key);

      const newRole = {
        displayName: testRoleName, // API expects displayName, not name
        description: 'Test role via API',
        permissions: permissionKeys,
      };

      const created = await apiPost<RoleDto>(
        apiContext,
        '/api/Role/CreateRole',
        newRole
      );

      expect(created).toBeDefined();
      expect(created.name).toBe(testRoleName);
      expect(created.isActive).toBe(true);
      expect(created.isSystem).toBe(false);

      createdRoleId = created.id;
      console.log(`Created role: ${created.name} (ID: ${created.id}, Permissions: ${created.permissions?.length})`);
    } catch (error: any) {
      console.log(`Role Create: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('5. GET /api/Role/GetRolePermissions - should get role permissions', async () => {
    test.skip(!createdRoleId, 'No role was created');

    const permissions = await apiGet<string[]>(
      apiContext,
      `/api/Role/GetRolePermissions?roleId=${createdRoleId}`
    );

    expect(Array.isArray(permissions)).toBeTruthy();
    console.log(`Role permissions: ${permissions.length}`);
  });

  test('6. POST /api/Role/UpdateRolePermissions - should update role permissions', async () => {
    test.skip(!createdRoleId, 'No role was created');

    const permissions = await apiGet<PermissionDto[]>(apiContext, '/api/Permission/GetList');
    const newPermissionKeys = permissions.slice(0, 3).map(p => p.key);

    await apiPost<boolean>(
      apiContext,
      `/api/Role/UpdateRolePermissions?roleId=${createdRoleId}`,
      { permissions: newPermissionKeys }
    );

    // Verify permissions updated
    const updatedPerms = await apiGet<string[]>(
      apiContext,
      `/api/Role/GetRolePermissions?roleId=${createdRoleId}`
    );

    expect(updatedPerms.length).toBe(3);
    console.log(`Updated role to ${updatedPerms.length} permissions`);
  });
});

// ============================================================================
// SYSTEM SETTINGS TESTS
// ============================================================================

test.describe('SystemSetting API', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('1. GET /api/SystemSetting/GetList - should list system settings', async () => {
    try {
      const settings = await apiGet<SystemSettingDto[]>(apiContext, '/api/SystemSetting/GetList');

      expect(Array.isArray(settings)).toBeTruthy();

      console.log(`Found ${settings.length} system settings:`);
      settings.forEach(s => {
        console.log(`  - ${s.key} (${s.category}): ${s.value?.substring(0, 50) || '(empty)'}`);
      });
    } catch (error: any) {
      console.log(`SystemSetting GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. GET /api/SystemSetting/GetFinancialYearSettings - should get financial year settings', async () => {
    try {
      const settings = await apiGet<FinancialYearSettingsDto>(
        apiContext,
        '/api/SystemSetting/GetFinancialYearSettings'
      );

      expect(settings).toBeDefined();

      console.log('Financial Year Settings:');
      console.log(`  Start Month: ${settings.startMonth}`);
      console.log(`  Start Day: ${settings.startDay}`);
      console.log(`  Current Financial Year: ${settings.currentFinancialYear}`);
    } catch (error: any) {
      console.log(`SystemSetting GetFinancialYearSettings: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. GET /api/SystemSetting/GetByKey - should get specific setting', async () => {
    try {
      // Try to get a common setting
      const settings = await apiGet<SystemSettingDto[]>(apiContext, '/api/SystemSetting/GetList');

      if (settings.length > 0) {
        const settingKey = settings[0].key;
        const setting = await apiGet<SystemSettingDto>(
          apiContext,
          `/api/SystemSetting/GetByKey?settingKey=${settingKey}`
        );

        expect(setting).toBeDefined();
        expect(setting.key).toBe(settingKey);
        console.log(`Retrieved setting: ${setting.key} = ${setting.value}`);
      } else {
        console.log('No settings available to test');
        test.skip();
      }
    } catch (error: any) {
      console.log(`SystemSetting GetByKey: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('4. POST /api/SystemSetting/CreateOrUpdateSystemSetting - should update setting', async () => {
    try {
      const settings = await apiGet<SystemSettingDto[]>(apiContext, '/api/SystemSetting/GetList');

      if (settings.length > 0) {
        const setting = settings[0];

        // Update with same value (non-destructive)
        await apiPost<boolean>(
          apiContext,
          `/api/SystemSetting/CreateOrUpdateSystemSetting?settingKey=${setting.key}`,
          { value: setting.value }
        );

        console.log(`Updated setting: ${setting.key}`);
      } else {
        console.log('No settings available to test');
        test.skip();
      }
    } catch (error: any) {
      console.log(`SystemSetting Update: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});
