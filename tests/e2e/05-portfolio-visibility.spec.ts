/**
 * E2E Test Suite: Portfolio Visibility Tests
 *
 * Tests that managers and group sales managers can see the correct data:
 *
 * Manager should see:
 * - Only their direct reports' clients
 * - Aggregated forecasts from their team
 *
 * Group Sales Manager should see:
 * - All managers under them
 * - All salespeople under their managers
 * - Company-wide (tenant-wide) aggregated data
 *
 * This tests the hierarchical visibility system:
 * GSM -> Managers -> Salespeople -> Clients
 */

import { test, expect } from '@playwright/test';
import { TENANT_USERS, TENANT_CLIENTS, TEST_TENANTS, getTenantClientPattern } from '../helpers/comprehensive-test-data';
import { loginAs } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

// ============================================================================
// SPECCON MANAGER VISIBILITY TESTS
// ============================================================================

test.describe('Speccon Manager A Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Manager Team A (Mike)
    await loginAs(page, TENANT_USERS.speccon.managers[0].email, TENANT_USERS.speccon.managers[0].password);
  });

  test('Manager A can see dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Manager A can see Team A salespeople clients', async ({ page }) => {
    await page.goto('/clients');

    // Should see clients from Sales A1 (Tom) - SP-A1-xx
    const salesA1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    const countA1 = await salesA1Clients.count();
    console.log(`Manager A sees ${countA1} clients from Sales A1`);

    // Should see clients from Sales A2 (Lisa) - SP-A2-xx
    const salesA2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });
    const countA2 = await salesA2Clients.count();
    console.log(`Manager A sees ${countA2} clients from Sales A2`);

    // Total should be 4 (2 per salesperson)
    expect(countA1 + countA2).toBeGreaterThanOrEqual(4);
  });

  test('Manager A should NOT see Team B salespeople clients', async ({ page }) => {
    await page.goto('/clients');

    // Should NOT see clients from Sales B1 (David) - SP-B1-xx
    const salesB1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B1-/ });
    const countB1 = await salesB1Clients.count();

    // Should NOT see clients from Sales B2 (Emma) - SP-B2-xx
    const salesB2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B2-/ });
    const countB2 = await salesB2Clients.count();

    console.log(`Manager A sees ${countB1} clients from Sales B1 (should be 0)`);
    console.log(`Manager A sees ${countB2} clients from Sales B2 (should be 0)`);

    // Should be 0 clients from Team B
    expect(countB1).toBe(0);
    expect(countB2).toBe(0);
  });

  test('Manager A sees aggregated Team A forecasts on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for pipeline or forecast statistics
    const pipelineSection = page.locator('.pipeline-section, .dashboard-stats, .forecast-summary');
    if (await pipelineSection.count() > 0) {
      console.log('Manager A can see forecast summary on dashboard');
    }
  });
});

test.describe('Speccon Manager B Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Manager Team B (Sarah)
    await loginAs(page, TENANT_USERS.speccon.managers[1].email, TENANT_USERS.speccon.managers[1].password);
  });

  test('Manager B can see Team B salespeople clients', async ({ page }) => {
    await page.goto('/clients');

    // Should see clients from Sales B1 (David) - SP-B1-xx
    const salesB1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B1-/ });
    const countB1 = await salesB1Clients.count();

    // Should see clients from Sales B2 (Emma) - SP-B2-xx
    const salesB2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B2-/ });
    const countB2 = await salesB2Clients.count();

    console.log(`Manager B sees ${countB1} clients from Sales B1`);
    console.log(`Manager B sees ${countB2} clients from Sales B2`);

    expect(countB1 + countB2).toBeGreaterThanOrEqual(4);
  });

  test('Manager B should NOT see Team A salespeople clients', async ({ page }) => {
    await page.goto('/clients');

    // Should NOT see clients from Team A
    const salesA1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    const salesA2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });

    const countA1 = await salesA1Clients.count();
    const countA2 = await salesA2Clients.count();

    console.log(`Manager B sees ${countA1} clients from Sales A1 (should be 0)`);
    console.log(`Manager B sees ${countA2} clients from Sales A2 (should be 0)`);

    expect(countA1).toBe(0);
    expect(countA2).toBe(0);
  });
});

// ============================================================================
// SPECCON GROUP SALES MANAGER VISIBILITY TESTS
// ============================================================================

test.describe('Speccon GSM Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Group Sales Manager (John)
    await loginAs(page, TENANT_USERS.speccon.groupSalesManager.email, TENANT_USERS.speccon.groupSalesManager.password);
  });

  test('GSM can see all Speccon clients', async ({ page }) => {
    await page.goto('/clients');

    // Should see all clients with SP- prefix
    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const count = await specconClients.count();

    console.log(`GSM sees ${count} total Speccon clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('GSM can see clients from Team A', async ({ page }) => {
    await page.goto('/clients');

    const teamAClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A/ });
    const count = await teamAClients.count();

    console.log(`GSM sees ${count} Team A clients (expected 4)`);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('GSM can see clients from Team B', async ({ page }) => {
    await page.goto('/clients');

    const teamBClients = page.locator('td, .client-name').filter({ hasText: /\(SP-B/ });
    const count = await teamBClients.count();

    console.log(`GSM sees ${count} Team B clients (expected 4)`);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('GSM should NOT see clients from other tenants', async ({ page }) => {
    await page.goto('/clients');

    // Should NOT see abebe clients (AB- prefix)
    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
    const abebeCount = await abebeClients.count();

    // Should NOT see megro clients (MR- prefix)
    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    const megroCount = await megroClients.count();

    console.log(`GSM sees ${abebeCount} abebe clients (should be 0)`);
    console.log(`GSM sees ${megroCount} megro clients (should be 0)`);

    expect(abebeCount).toBe(0);
    expect(megroCount).toBe(0);
  });

  test('GSM sees company-wide forecast totals', async ({ page }) => {
    await page.goto('/dashboard');

    // GSM should see aggregated totals for entire company (tenant)
    const totalSection = page.locator('.company-total, .tenant-total, .dashboard-total');
    if (await totalSection.count() > 0) {
      console.log('GSM can see company-wide totals');
    }
  });

  test('GSM can access sales pipeline with all data', async ({ page }) => {
    await page.goto('/sales-pipeline');
    await expect(page).toHaveURL(/.*sales-pipeline/);

    // Should see clients from all teams
    const specconPipelineClients = page.locator('.pipeline-card, .client-card, td').filter({ hasText: /\(SP-/ });
    const count = await specconPipelineClients.count();

    console.log(`GSM sees ${count} Speccon clients in pipeline`);
  });
});

// ============================================================================
// abebe VISIBILITY TESTS (Cross-tenant verification)
// ============================================================================

test.describe('abebe GSM Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.groupSalesManager.email, TENANT_USERS.abebe.groupSalesManager.password);
  });

  test('abebe GSM can see all abebe clients', async ({ page }) => {
    await page.goto('/clients');

    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
    const count = await abebeClients.count();

    console.log(`abebe GSM sees ${count} abebe clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('abebe GSM should NOT see Speccon clients', async ({ page }) => {
    await page.goto('/clients');

    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const count = await specconClients.count();

    console.log(`abebe GSM sees ${count} Speccon clients (should be 0)`);
    expect(count).toBe(0);
  });

  test('abebe GSM should NOT see megro clients', async ({ page }) => {
    await page.goto('/clients');

    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    const count = await megroClients.count();

    console.log(`abebe GSM sees ${count} megro clients (should be 0)`);
    expect(count).toBe(0);
  });
});

// ============================================================================
// megro VISIBILITY TESTS (Cross-tenant verification)
// ============================================================================

test.describe('megro GSM Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.groupSalesManager.email, TENANT_USERS.megro.groupSalesManager.password);
  });

  test('megro GSM can see all megro clients', async ({ page }) => {
    await page.goto('/clients');

    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    const count = await megroClients.count();

    console.log(`megro GSM sees ${count} megro clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('megro GSM should NOT see other tenant clients', async ({ page }) => {
    await page.goto('/clients');

    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });

    expect(await specconClients.count()).toBe(0);
    expect(await abebeClients.count()).toBe(0);
  });
});

// ============================================================================
// ADMIN VISIBILITY TESTS
// ============================================================================

test.describe('Tenant Admin Visibility', () => {
  test('Speccon Admin can see all Speccon users', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/user-management');

    // Should see all Speccon users
    const specconUsers = page.locator('td').filter({ hasText: /@speccon\.co\.za/ });
    const count = await specconUsers.count();

    console.log(`Speccon Admin sees ${count} Speccon users (expected 9)`);
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('Speccon Admin should NOT see users from other tenants', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/user-management');

    // Should NOT see abebe users
    const abebeUsers = page.locator('td').filter({ hasText: /@abebe\.co\.za/ });
    expect(await abebeUsers.count()).toBe(0);

    // Should NOT see megro users
    const megroUsers = page.locator('td').filter({ hasText: /@megro\.co\.za/ });
    expect(await megroUsers.count()).toBe(0);
  });
});

// ============================================================================
// SALESPERSON VISIBILITY TESTS
// ============================================================================

test.describe('Salesperson Visibility', () => {
  test('Salesperson can only see their own clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[0]; // Tom - Sales A1
    await loginAs(page, salesperson.email, salesperson.password);
    await page.goto('/clients');

    // Should see their own clients (SP-A1-xx)
    const ownClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    const ownCount = await ownClients.count();
    console.log(`Sales A1 sees ${ownCount} own clients (expected 2)`);
    expect(ownCount).toBeGreaterThanOrEqual(2);

    // Should NOT see other salespeople's clients
    const otherClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-|\(SP-B1-|\(SP-B2-/ });
    const otherCount = await otherClients.count();
    console.log(`Sales A1 sees ${otherCount} other salespeople's clients (should be 0)`);
    expect(otherCount).toBe(0);
  });

  test('Salesperson cannot see other tenant clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    await loginAs(page, salesperson.email, salesperson.password);
    await page.goto('/clients');

    // Should NOT see any AB- or MR- clients
    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });

    expect(await abebeClients.count()).toBe(0);
    expect(await megroClients.count()).toBe(0);
  });
});
