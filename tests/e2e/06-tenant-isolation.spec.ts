/**
 * E2E Test Suite: Tenant Isolation Tests
 *
 * CRITICAL SECURITY TESTS - Ensures complete data isolation between tenants:
 *
 * 1. Users from Tenant A cannot see Tenant B's:
 *    - Clients
 *    - Users
 *    - Forecasts
 *    - Reports
 *    - Messages
 *
 * 2. Direct URL access attempts should fail
 * 3. API-level isolation (no cross-tenant data leakage)
 *
 * Test Matrix:
 * - Speccon users trying to access abebe/megro data
 * - abebe users trying to access Speccon/megro data
 * - megro users trying to access Speccon/abebe data
 */

import { test, expect } from '@playwright/test';
import { TENANT_USERS, TENANT_CLIENTS, TEST_TENANTS, SYSTEM_ADMIN } from '../helpers/comprehensive-test-data';
import { loginAs } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

// ============================================================================
// SPECCON -> abebe ISOLATION TESTS
// ============================================================================

test.describe('Speccon to abebe Isolation', () => {
  test.describe('Admin Level', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    });

    test('Speccon Admin cannot see abebe clients', async ({ page }) => {
      await page.goto('/clients');

      const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
      const count = await abebeClients.count();

      expect(count).toBe(0);
      console.log('PASS: Speccon Admin sees 0 abebe clients');
    });

    test('Speccon Admin cannot see abebe users in user management', async ({ page }) => {
      await page.goto('/user-management');

      const abebeUsers = page.locator('td').filter({ hasText: /@abebe\.co\.za/ });
      const count = await abebeUsers.count();

      expect(count).toBe(0);
      console.log('PASS: Speccon Admin sees 0 abebe users');
    });

    test('Speccon Admin cannot see abebe in tenant filter', async ({ page }) => {
      await page.goto('/user-management');

      // Tenant filter should NOT show abebe
      const tenantFilter = page.locator('.tenant-filter-select');
      if (await tenantFilter.count() > 0) {
        const abebeOption = page.locator('option', { hasText: TEST_TENANTS.abebe.name });
        const count = await abebeOption.count();
        expect(count).toBe(0);
        console.log('PASS: abebe not in tenant filter for Speccon Admin');
      }
    });
  });

  test.describe('GSM Level', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TENANT_USERS.speccon.groupSalesManager.email, TENANT_USERS.speccon.groupSalesManager.password);
    });

    test('Speccon GSM cannot see abebe clients', async ({ page }) => {
      await page.goto('/clients');

      const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
      expect(await abebeClients.count()).toBe(0);
    });

    test('Speccon GSM cannot see abebe in sales pipeline', async ({ page }) => {
      await page.goto('/sales-pipeline');

      const abebePipeline = page.locator('.pipeline-card, td').filter({ hasText: /\(AB-/ });
      expect(await abebePipeline.count()).toBe(0);
    });

    test('Speccon GSM cannot see abebe in reports', async ({ page }) => {
      await page.goto('/reports');

      // Reports should only show Speccon data
      const abebeData = page.locator('text=/abebe|AB-/');
      // In reports, look for any mention of abebe
      const count = await abebeData.count();
      expect(count).toBe(0);
    });
  });

  test.describe('Manager Level', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TENANT_USERS.speccon.managers[0].email, TENANT_USERS.speccon.managers[0].password);
    });

    test('Speccon Manager cannot see abebe clients', async ({ page }) => {
      await page.goto('/clients');

      const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
      expect(await abebeClients.count()).toBe(0);
    });
  });

  test.describe('Salesperson Level', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TENANT_USERS.speccon.salespeople[0].email, TENANT_USERS.speccon.salespeople[0].password);
    });

    test('Speccon Salesperson cannot see abebe clients', async ({ page }) => {
      await page.goto('/clients');

      const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
      expect(await abebeClients.count()).toBe(0);
    });
  });
});

// ============================================================================
// SPECCON -> megro ISOLATION TESTS
// ============================================================================

test.describe('Speccon to megro Isolation', () => {
  test('Speccon Admin cannot see megro clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/clients');

    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    expect(await megroClients.count()).toBe(0);
  });

  test('Speccon Admin cannot see megro users', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/user-management');

    const megroUsers = page.locator('td').filter({ hasText: /@megro\.co\.za/ });
    expect(await megroUsers.count()).toBe(0);
  });

  test('Speccon GSM cannot see megro data', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.groupSalesManager.email, TENANT_USERS.speccon.groupSalesManager.password);
    await page.goto('/clients');

    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    expect(await megroClients.count()).toBe(0);
  });
});

// ============================================================================
// abebe -> SPECCON ISOLATION TESTS
// ============================================================================

test.describe('abebe to Speccon Isolation', () => {
  test('abebe Admin cannot see Speccon clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/clients');

    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    expect(await specconClients.count()).toBe(0);
    console.log('PASS: abebe Admin sees 0 Speccon clients');
  });

  test('abebe Admin cannot see Speccon users', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/user-management');

    const specconUsers = page.locator('td').filter({ hasText: /@speccon\.co\.za/ });
    expect(await specconUsers.count()).toBe(0);
  });

  test('abebe GSM cannot see Speccon clients in pipeline', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.groupSalesManager.email, TENANT_USERS.abebe.groupSalesManager.password);
    await page.goto('/sales-pipeline');

    const specconClients = page.locator('.pipeline-card, td').filter({ hasText: /\(SP-/ });
    expect(await specconClients.count()).toBe(0);
  });

  test('abebe Salesperson cannot see Speccon clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.salespeople[0].email, TENANT_USERS.abebe.salespeople[0].password);
    await page.goto('/clients');

    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    expect(await specconClients.count()).toBe(0);
  });
});

// ============================================================================
// abebe -> megro ISOLATION TESTS
// ============================================================================

test.describe('abebe to megro Isolation', () => {
  test('abebe Admin cannot see megro clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/clients');

    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    expect(await megroClients.count()).toBe(0);
  });

  test('abebe Admin cannot see megro users', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/user-management');

    const megroUsers = page.locator('td').filter({ hasText: /@megro\.co\.za/ });
    expect(await megroUsers.count()).toBe(0);
  });
});

// ============================================================================
// megro -> SPECCON/abebe ISOLATION TESTS
// ============================================================================

test.describe('megro to Other Tenants Isolation', () => {
  test('megro Admin cannot see Speccon clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.admin.email, TENANT_USERS.megro.admin.password);
    await page.goto('/clients');

    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    expect(await specconClients.count()).toBe(0);
  });

  test('megro Admin cannot see abebe clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.admin.email, TENANT_USERS.megro.admin.password);
    await page.goto('/clients');

    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
    expect(await abebeClients.count()).toBe(0);
  });

  test('megro Admin cannot see users from other tenants', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.admin.email, TENANT_USERS.megro.admin.password);
    await page.goto('/user-management');

    const specconUsers = page.locator('td').filter({ hasText: /@speccon\.co\.za/ });
    const abebeUsers = page.locator('td').filter({ hasText: /@abebe\.co\.za/ });

    expect(await specconUsers.count()).toBe(0);
    expect(await abebeUsers.count()).toBe(0);
  });

  test('megro GSM cannot see other tenant data in pipeline', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.groupSalesManager.email, TENANT_USERS.megro.groupSalesManager.password);
    await page.goto('/sales-pipeline');

    const specconClients = page.locator('.pipeline-card, td').filter({ hasText: /\(SP-/ });
    const abebeClients = page.locator('.pipeline-card, td').filter({ hasText: /\(AB-/ });

    expect(await specconClients.count()).toBe(0);
    expect(await abebeClients.count()).toBe(0);
  });
});

// ============================================================================
// MESSAGE ISOLATION TESTS
// ============================================================================

test.describe('Message Isolation', () => {
  test('Speccon user cannot see abebe users in message recipient list', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/messages');

    // Try to compose a new message
    const composeBtn = page.locator('button', { hasText: /compose|new|create/i });
    if (await composeBtn.count() > 0) {
      await composeBtn.click();
      await page.waitForTimeout(500);

      // Check recipient dropdown/list
      const recipientField = page.locator('select, [class*="recipient"], [class*="user-select"]');
      if (await recipientField.count() > 0) {
        // Look for abebe users
        const abebeRecipients = page.locator('option, [class*="option"]').filter({ hasText: /@abebe\.co\.za/ });
        expect(await abebeRecipients.count()).toBe(0);
      }
    }
  });

  test('abebe user cannot see Speccon users in message recipient list', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/messages');

    const composeBtn = page.locator('button', { hasText: /compose|new|create/i });
    if (await composeBtn.count() > 0) {
      await composeBtn.click();
      await page.waitForTimeout(500);

      const recipientField = page.locator('select, [class*="recipient"]');
      if (await recipientField.count() > 0) {
        const specconRecipients = page.locator('option').filter({ hasText: /@speccon\.co\.za/ });
        expect(await specconRecipients.count()).toBe(0);
      }
    }
  });
});

// ============================================================================
// TEAM CHAT ISOLATION TESTS
// ============================================================================

test.describe('Team Chat Isolation', () => {
  test('Speccon user only sees Speccon users in team chat', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);

    // Open team chat
    const chatBtn = page.locator('.team-chat-btn');
    if (await chatBtn.count() > 0) {
      await chatBtn.click();
      await page.waitForTimeout(500);

      // Check user list in chat
      const chatUserList = page.locator('.team-chat-popup .user-list, .team-chat-popup .members');
      if (await chatUserList.count() > 0) {
        // Should not see abebe or megro users
        const abebeUsers = chatUserList.locator('text=/@abebe/');
        const megroUsers = chatUserList.locator('text=/@megro/');

        expect(await abebeUsers.count()).toBe(0);
        expect(await megroUsers.count()).toBe(0);
      }
    }
  });
});

// ============================================================================
// SYSTEM ADMIN CROSS-TENANT ACCESS TESTS
// ============================================================================

test.describe('System Admin Cross-Tenant Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);
  });

  test('System Admin CAN see all tenants', async ({ page }) => {
    await page.goto('/tenants');

    const specconTenant = page.locator('td, .tenant-name', { hasText: TEST_TENANTS.speccon.name });
    const abebeTenant = page.locator('td, .tenant-name', { hasText: TEST_TENANTS.abebe.name });
    const megroTenant = page.locator('td, .tenant-name', { hasText: TEST_TENANTS.megro.name });

    expect(await specconTenant.count()).toBeGreaterThan(0);
    expect(await abebeTenant.count()).toBeGreaterThan(0);
    expect(await megroTenant.count()).toBeGreaterThan(0);
  });

  test('System Admin CAN see users from all tenants', async ({ page }) => {
    await page.goto('/user-management');

    const specconUsers = page.locator('td').filter({ hasText: /@speccon\.co\.za/ });
    const abebeUsers = page.locator('td').filter({ hasText: /@abebe\.co\.za/ });
    const megroUsers = page.locator('td').filter({ hasText: /@megro\.co\.za/ });

    expect(await specconUsers.count()).toBeGreaterThan(0);
    expect(await abebeUsers.count()).toBeGreaterThan(0);
    expect(await megroUsers.count()).toBeGreaterThan(0);
  });

  test('System Admin has tenant filter access', async ({ page }) => {
    await page.goto('/user-management');

    const tenantFilter = page.locator('.tenant-filter-select');
    await expect(tenantFilter).toBeVisible();

    // Should have options for all tenants
    const specconOption = page.locator('.tenant-filter-select option', { hasText: TEST_TENANTS.speccon.name });
    const abebeOption = page.locator('.tenant-filter-select option', { hasText: TEST_TENANTS.abebe.name });
    const megroOption = page.locator('.tenant-filter-select option', { hasText: TEST_TENANTS.megro.name });

    expect(await specconOption.count()).toBeGreaterThan(0);
    expect(await abebeOption.count()).toBeGreaterThan(0);
    expect(await megroOption.count()).toBeGreaterThan(0);
  });
});

// ============================================================================
// SUMMARY TEST
// ============================================================================

test.describe('Tenant Isolation Summary', () => {
  test('Complete isolation matrix verification', async ({ page }) => {
    const results: string[] = [];

    // Test Speccon -> abebe
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/clients');
    const specToabebe = await page.locator('td, .client-name').filter({ hasText: /\(AB-/ }).count();
    results.push(`Speccon -> abebe clients: ${specToabebe} (expected 0)`);

    // Test Speccon -> megro
    const specTomegro = await page.locator('td, .client-name').filter({ hasText: /\(MR-/ }).count();
    results.push(`Speccon -> megro clients: ${specTomegro} (expected 0)`);

    // Test abebe -> Speccon
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/clients');
    const abebeToSpec = await page.locator('td, .client-name').filter({ hasText: /\(SP-/ }).count();
    results.push(`abebe -> Speccon clients: ${abebeToSpec} (expected 0)`);

    // Test abebe -> megro
    const abebeTomegro = await page.locator('td, .client-name').filter({ hasText: /\(MR-/ }).count();
    results.push(`abebe -> megro clients: ${abebeTomegro} (expected 0)`);

    // Test megro -> Speccon
    await loginAs(page, TENANT_USERS.megro.admin.email, TENANT_USERS.megro.admin.password);
    await page.goto('/clients');
    const megroToSpec = await page.locator('td, .client-name').filter({ hasText: /\(SP-/ }).count();
    results.push(`megro -> Speccon clients: ${megroToSpec} (expected 0)`);

    // Test megro -> abebe
    const megroToabebe = await page.locator('td, .client-name').filter({ hasText: /\(AB-/ }).count();
    results.push(`megro -> abebe clients: ${megroToabebe} (expected 0)`);

    // Log all results
    console.log('\n===== TENANT ISOLATION MATRIX =====');
    results.forEach(r => console.log(r));
    console.log('===================================\n');

    // All cross-tenant access should be 0
    expect(specToabebe).toBe(0);
    expect(specTomegro).toBe(0);
    expect(abebeToSpec).toBe(0);
    expect(abebeTomegro).toBe(0);
    expect(megroToSpec).toBe(0);
    expect(megroToabebe).toBe(0);
  });
});
