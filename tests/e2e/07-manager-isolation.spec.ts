/**
 * E2E Test Suite: Manager Isolation Tests Within Tenant
 *
 * Tests that within a single tenant, managers can only see their own team's data:
 *
 * Manager A should see:
 * - Salesperson A1's clients
 * - Salesperson A2's clients
 * - NOT Salesperson B1's clients (Manager B's team)
 * - NOT Salesperson B2's clients (Manager B's team)
 *
 * This tests the hierarchical isolation within a tenant:
 * - Manager can see direct reports' data
 * - Manager cannot see other managers' teams
 * - GSM can see all teams (different test file)
 */

import { test, expect } from '@playwright/test';
import { TENANT_USERS, TENANT_CLIENTS } from '../helpers/comprehensive-test-data';
import { loginAs } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

// ============================================================================
// SPECCON MANAGER ISOLATION TESTS
// ============================================================================

test.describe('Speccon Manager A - Team A Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Manager Team A (Mike)
    await loginAs(page, TENANT_USERS.speccon.managers[0].email, TENANT_USERS.speccon.managers[0].password);
  });

  test('Manager A CAN see Salesperson A1 (Tom) clients', async ({ page }) => {
    await page.goto('/clients');

    // Sales A1 creates clients with (SP-A1-xx) naming
    const salesA1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    const count = await salesA1Clients.count();

    console.log(`Manager A sees ${count} clients from Sales A1 (Tom)`);
    expect(count).toBeGreaterThanOrEqual(2); // Tom has 2 clients
  });

  test('Manager A CAN see Salesperson A2 (Lisa) clients', async ({ page }) => {
    await page.goto('/clients');

    // Sales A2 creates clients with (SP-A2-xx) naming
    const salesA2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });
    const count = await salesA2Clients.count();

    console.log(`Manager A sees ${count} clients from Sales A2 (Lisa)`);
    expect(count).toBeGreaterThanOrEqual(2); // Lisa has 2 clients
  });

  test('Manager A CANNOT see Salesperson B1 (David) clients', async ({ page }) => {
    await page.goto('/clients');

    // Sales B1 creates clients with (SP-B1-xx) naming - belongs to Manager B
    const salesB1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B1-/ });
    const count = await salesB1Clients.count();

    console.log(`Manager A sees ${count} clients from Sales B1 (David) - should be 0`);
    expect(count).toBe(0);
  });

  test('Manager A CANNOT see Salesperson B2 (Emma) clients', async ({ page }) => {
    await page.goto('/clients');

    // Sales B2 creates clients with (SP-B2-xx) naming - belongs to Manager B
    const salesB2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B2-/ });
    const count = await salesB2Clients.count();

    console.log(`Manager A sees ${count} clients from Sales B2 (Emma) - should be 0`);
    expect(count).toBe(0);
  });

  test('Manager A sees only 4 total clients (Team A)', async ({ page }) => {
    await page.goto('/clients');

    // Count all Speccon clients visible to Manager A
    const allClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const count = await allClients.count();

    console.log(`Manager A sees ${count} total Speccon clients (expected 4)`);
    // Should only see Team A's 4 clients (2 from A1 + 2 from A2)
    expect(count).toBe(4);
  });
});

test.describe('Speccon Manager B - Team B Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Manager Team B (Sarah)
    await loginAs(page, TENANT_USERS.speccon.managers[1].email, TENANT_USERS.speccon.managers[1].password);
  });

  test('Manager B CAN see Salesperson B1 (David) clients', async ({ page }) => {
    await page.goto('/clients');

    const salesB1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B1-/ });
    const count = await salesB1Clients.count();

    console.log(`Manager B sees ${count} clients from Sales B1 (David)`);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Manager B CAN see Salesperson B2 (Emma) clients', async ({ page }) => {
    await page.goto('/clients');

    const salesB2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-B2-/ });
    const count = await salesB2Clients.count();

    console.log(`Manager B sees ${count} clients from Sales B2 (Emma)`);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Manager B CANNOT see Salesperson A1 (Tom) clients', async ({ page }) => {
    await page.goto('/clients');

    const salesA1Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    const count = await salesA1Clients.count();

    console.log(`Manager B sees ${count} clients from Sales A1 (Tom) - should be 0`);
    expect(count).toBe(0);
  });

  test('Manager B CANNOT see Salesperson A2 (Lisa) clients', async ({ page }) => {
    await page.goto('/clients');

    const salesA2Clients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });
    const count = await salesA2Clients.count();

    console.log(`Manager B sees ${count} clients from Sales A2 (Lisa) - should be 0`);
    expect(count).toBe(0);
  });

  test('Manager B sees only 4 total clients (Team B)', async ({ page }) => {
    await page.goto('/clients');

    const allClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const count = await allClients.count();

    console.log(`Manager B sees ${count} total Speccon clients (expected 4)`);
    expect(count).toBe(4);
  });
});

// ============================================================================
// abebe MANAGER ISOLATION TESTS
// ============================================================================

test.describe('abebe Manager A - Team A Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.managers[0].email, TENANT_USERS.abebe.managers[0].password);
  });

  test('abebe Manager A CAN see their team clients', async ({ page }) => {
    await page.goto('/clients');

    // Team A clients: AB-A1-xx and AB-A2-xx
    const teamAClients = page.locator('td, .client-name').filter({ hasText: /\(AB-A/ });
    const count = await teamAClients.count();

    console.log(`abebe Manager A sees ${count} Team A clients`);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('abebe Manager A CANNOT see Team B clients', async ({ page }) => {
    await page.goto('/clients');

    const teamBClients = page.locator('td, .client-name').filter({ hasText: /\(AB-B/ });
    const count = await teamBClients.count();

    console.log(`abebe Manager A sees ${count} Team B clients - should be 0`);
    expect(count).toBe(0);
  });
});

test.describe('abebe Manager B - Team B Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.managers[1].email, TENANT_USERS.abebe.managers[1].password);
  });

  test('abebe Manager B CAN see their team clients', async ({ page }) => {
    await page.goto('/clients');

    const teamBClients = page.locator('td, .client-name').filter({ hasText: /\(AB-B/ });
    const count = await teamBClients.count();

    console.log(`abebe Manager B sees ${count} Team B clients`);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('abebe Manager B CANNOT see Team A clients', async ({ page }) => {
    await page.goto('/clients');

    const teamAClients = page.locator('td, .client-name').filter({ hasText: /\(AB-A/ });
    const count = await teamAClients.count();

    console.log(`abebe Manager B sees ${count} Team A clients - should be 0`);
    expect(count).toBe(0);
  });
});

// ============================================================================
// megro MANAGER ISOLATION TESTS
// ============================================================================

test.describe('megro Manager Isolation', () => {
  test('megro Manager A can only see Team A clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.managers[0].email, TENANT_USERS.megro.managers[0].password);
    await page.goto('/clients');

    const teamAClients = page.locator('td, .client-name').filter({ hasText: /\(MR-A/ });
    const teamBClients = page.locator('td, .client-name').filter({ hasText: /\(MR-B/ });

    expect(await teamAClients.count()).toBeGreaterThanOrEqual(4);
    expect(await teamBClients.count()).toBe(0);
  });

  test('megro Manager B can only see Team B clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.managers[1].email, TENANT_USERS.megro.managers[1].password);
    await page.goto('/clients');

    const teamAClients = page.locator('td, .client-name').filter({ hasText: /\(MR-A/ });
    const teamBClients = page.locator('td, .client-name').filter({ hasText: /\(MR-B/ });

    expect(await teamAClients.count()).toBe(0);
    expect(await teamBClients.count()).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// SALESPERSON ISOLATION TESTS
// ============================================================================

test.describe('Salesperson Can Only See Own Clients', () => {
  test('Speccon Sales A1 (Tom) sees only own clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.salespeople[0].email, TENANT_USERS.speccon.salespeople[0].password);
    await page.goto('/clients');

    // Should see own clients (SP-A1-xx)
    const ownClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    expect(await ownClients.count()).toBeGreaterThanOrEqual(2);

    // Should NOT see teammate's clients (SP-A2-xx)
    const teammateClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });
    expect(await teammateClients.count()).toBe(0);

    // Should NOT see other team's clients (SP-B1-xx, SP-B2-xx)
    const otherTeamClients = page.locator('td, .client-name').filter({ hasText: /\(SP-B/ });
    expect(await otherTeamClients.count()).toBe(0);
  });

  test('Speccon Sales A2 (Lisa) sees only own clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.salespeople[1].email, TENANT_USERS.speccon.salespeople[1].password);
    await page.goto('/clients');

    const ownClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A2-/ });
    expect(await ownClients.count()).toBeGreaterThanOrEqual(2);

    const teammateClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A1-/ });
    expect(await teammateClients.count()).toBe(0);

    const otherTeamClients = page.locator('td, .client-name').filter({ hasText: /\(SP-B/ });
    expect(await otherTeamClients.count()).toBe(0);
  });

  test('Speccon Sales B1 (David) sees only own clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.salespeople[2].email, TENANT_USERS.speccon.salespeople[2].password);
    await page.goto('/clients');

    const ownClients = page.locator('td, .client-name').filter({ hasText: /\(SP-B1-/ });
    expect(await ownClients.count()).toBeGreaterThanOrEqual(2);

    const otherClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A|\(SP-B2-/ });
    expect(await otherClients.count()).toBe(0);
  });

  test('Speccon Sales B2 (Emma) sees only own clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.salespeople[3].email, TENANT_USERS.speccon.salespeople[3].password);
    await page.goto('/clients');

    const ownClients = page.locator('td, .client-name').filter({ hasText: /\(SP-B2-/ });
    expect(await ownClients.count()).toBeGreaterThanOrEqual(2);

    const otherClients = page.locator('td, .client-name').filter({ hasText: /\(SP-A|\(SP-B1-/ });
    expect(await otherClients.count()).toBe(0);
  });
});

// ============================================================================
// PIPELINE ISOLATION TESTS
// ============================================================================

test.describe('Sales Pipeline Manager Isolation', () => {
  test('Manager A sees only Team A in pipeline', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.managers[0].email, TENANT_USERS.speccon.managers[0].password);
    await page.goto('/sales-pipeline');

    const teamAInPipeline = page.locator('.pipeline-card, td, .client-name').filter({ hasText: /\(SP-A/ });
    const teamBInPipeline = page.locator('.pipeline-card, td, .client-name').filter({ hasText: /\(SP-B/ });

    expect(await teamAInPipeline.count()).toBeGreaterThanOrEqual(4);
    expect(await teamBInPipeline.count()).toBe(0);
  });

  test('Manager B sees only Team B in pipeline', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.managers[1].email, TENANT_USERS.speccon.managers[1].password);
    await page.goto('/sales-pipeline');

    const teamAInPipeline = page.locator('.pipeline-card, td, .client-name').filter({ hasText: /\(SP-A/ });
    const teamBInPipeline = page.locator('.pipeline-card, td, .client-name').filter({ hasText: /\(SP-B/ });

    expect(await teamAInPipeline.count()).toBe(0);
    expect(await teamBInPipeline.count()).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// FOLLOW-UP TASKS ISOLATION TESTS
// ============================================================================

test.describe('Follow-Up Tasks Manager Isolation', () => {
  test('Manager A sees only Team A follow-ups', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.managers[0].email, TENANT_USERS.speccon.managers[0].password);
    await page.goto('/follow-up-tasks');

    // If there are follow-ups, they should only be for Team A clients
    const teamBFollowups = page.locator('td, .task-row, .client-name').filter({ hasText: /\(SP-B/ });
    expect(await teamBFollowups.count()).toBe(0);
  });

  test('Manager B sees only Team B follow-ups', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.managers[1].email, TENANT_USERS.speccon.managers[1].password);
    await page.goto('/follow-up-tasks');

    const teamAFollowups = page.locator('td, .task-row, .client-name').filter({ hasText: /\(SP-A/ });
    expect(await teamAFollowups.count()).toBe(0);
  });
});

// ============================================================================
// SUMMARY TEST
// ============================================================================

test.describe('Manager Isolation Summary', () => {
  test('Complete manager isolation matrix', async ({ page }) => {
    const results: string[] = [];

    // Test all Speccon managers
    for (let i = 0; i < 2; i++) {
      const manager = TENANT_USERS.speccon.managers[i];
      const teamLetter = i === 0 ? 'A' : 'B';
      const otherTeamLetter = i === 0 ? 'B' : 'A';

      await loginAs(page, manager.email, manager.password);
      await page.goto('/clients');

      const ownTeamClients = await page.locator('td, .client-name').filter({ hasText: new RegExp(`\\(SP-${teamLetter}`) }).count();
      const otherTeamClients = await page.locator('td, .client-name').filter({ hasText: new RegExp(`\\(SP-${otherTeamLetter}`) }).count();

      results.push(`Manager ${teamLetter}: Own team=${ownTeamClients} (>=4), Other team=${otherTeamClients} (=0)`);

      expect(ownTeamClients).toBeGreaterThanOrEqual(4);
      expect(otherTeamClients).toBe(0);
    }

    console.log('\n===== MANAGER ISOLATION MATRIX =====');
    results.forEach(r => console.log(r));
    console.log('=====================================\n');
  });
});
