/**
 * E2E Test Suite: Client Creation
 *
 * Each salesperson creates their designated clients with tenant-specific naming.
 * This tests:
 * - Client creation functionality
 * - Client assignment to salespeople
 * - Tenant-specific client naming convention
 *
 * Naming Convention: [ClientName] ([TenantCode]-[SalespersonCode]-[Number])
 * Example: "ABC Construction (SP-A1-01)" = Client 1 for Salesperson A1 in Speccon
 */

import { test, expect } from '@playwright/test';
import { TENANT_USERS, TENANT_CLIENTS, TEST_TENANTS } from '../helpers/comprehensive-test-data';
import { loginAs } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

/**
 * Helper to create a client
 */
async function createClient(page: any, clientData: any) {
  await page.goto('/clients/new');
  await page.waitForSelector('#name');

  // Fill in client details
  await page.fill('#name', clientData.name);

  // Legal name
  const legalNameField = page.locator('#legalName');
  if (await legalNameField.count() > 0) {
    await legalNameField.fill(clientData.legalName);
  }

  // Type
  const typeSelect = page.locator('#type');
  if (await typeSelect.count() > 0) {
    await typeSelect.selectOption(clientData.type);
  }

  // Status
  const statusSelect = page.locator('#status');
  if (await statusSelect.count() > 0) {
    await statusSelect.selectOption(clientData.status);
  }

  // Industry
  const industrySelect = page.locator('#industry');
  if (await industrySelect.count() > 0) {
    await industrySelect.selectOption(clientData.industry);
  }

  // Country
  const countryField = page.locator('#country');
  if (await countryField.count() > 0) {
    await countryField.fill(clientData.country);
  }

  // Primary Contact
  const primaryContactField = page.locator('#primaryContact');
  if (await primaryContactField.count() > 0) {
    await primaryContactField.fill(clientData.primaryContact);
  }

  // Contact Email
  const contactEmailField = page.locator('#contactEmail');
  if (await contactEmailField.count() > 0) {
    await contactEmailField.fill(clientData.contactEmail);
  }

  // Phone
  const phoneField = page.locator('#phone');
  if (await phoneField.count() > 0) {
    await phoneField.fill(clientData.phone);
  }

  // Notes
  const notesField = page.locator('#notes, textarea[name="notes"]');
  if (await notesField.count() > 0) {
    await notesField.fill(clientData.notes);
  }

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/, { timeout: 10000 });
}

/**
 * Helper to check if client exists
 */
async function clientExists(page: any, clientName: string): Promise<boolean> {
  await page.goto('/clients');
  const client = page.locator('td, .client-name', { hasText: clientName });
  return (await client.count()) > 0;
}

// ============================================================================
// SPECCON CLIENT CREATION
// ============================================================================

test.describe('Speccon Client Creation - Sales Team A', () => {
  test('Salesperson A1 (Tom) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.speccon.salesA1) {
      // Check if client already exists
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }

    // Verify clients are visible
    await page.goto('/clients');
    for (const client of TENANT_CLIENTS.speccon.salesA1) {
      const clientRow = page.locator('td, .client-name', { hasText: client.name });
      await expect(clientRow.first()).toBeVisible();
    }
  });

  test('Salesperson A2 (Lisa) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[1];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.speccon.salesA2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }

    // Verify clients
    await page.goto('/clients');
    for (const client of TENANT_CLIENTS.speccon.salesA2) {
      const clientRow = page.locator('td, .client-name', { hasText: client.name });
      await expect(clientRow.first()).toBeVisible();
    }
  });
});

test.describe('Speccon Client Creation - Sales Team B', () => {
  test('Salesperson B1 (David) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[2];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.speccon.salesB1) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }

    await page.goto('/clients');
    for (const client of TENANT_CLIENTS.speccon.salesB1) {
      const clientRow = page.locator('td, .client-name', { hasText: client.name });
      await expect(clientRow.first()).toBeVisible();
    }
  });

  test('Salesperson B2 (Emma) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[3];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.speccon.salesB2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }

    await page.goto('/clients');
    for (const client of TENANT_CLIENTS.speccon.salesB2) {
      const clientRow = page.locator('td, .client-name', { hasText: client.name });
      await expect(clientRow.first()).toBeVisible();
    }
  });
});

// ============================================================================
// ABEBE CLIENT CREATION
// ============================================================================

test.describe('Abebe Client Creation - Sales Team A', () => {
  test('Abebe Salesperson A1 (Grace) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[0];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.abebe.salesA1) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }

    await page.goto('/clients');
    for (const client of TENANT_CLIENTS.abebe.salesA1) {
      const clientRow = page.locator('td, .client-name', { hasText: client.name });
      await expect(clientRow.first()).toBeVisible();
    }
  });

  test('Abebe Salesperson A2 (Brian) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[1];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.abebe.salesA2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });
});

test.describe('Abebe Client Creation - Sales Team B', () => {
  test('Abebe Salesperson B1 (Amanda) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[2];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.abebe.salesB1) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });

  test('Abebe Salesperson B2 (Chris) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[3];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.abebe.salesB2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });
});

// ============================================================================
// MEGRO CLIENT CREATION
// ============================================================================

test.describe('Megro Client Creation - Sales Team A', () => {
  test('Megro Salesperson A1 (Sandra) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[0];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.megro.salesA1) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });

  test('Megro Salesperson A2 (Paul) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[1];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.megro.salesA2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });
});

test.describe('Megro Client Creation - Sales Team B', () => {
  test('Megro Salesperson B1 (Michelle) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[2];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.megro.salesB1) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });

  test('Megro Salesperson B2 (Steven) creates clients', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[3];
    await loginAs(page, salesperson.email, salesperson.password);

    for (const client of TENANT_CLIENTS.megro.salesB2) {
      if (await clientExists(page, client.name)) {
        console.log(`Client ${client.name} already exists, skipping`);
        continue;
      }

      await createClient(page, client);
      console.log(`Created client: ${client.name}`);
    }
  });
});

// ============================================================================
// VERIFY CLIENT COUNTS
// ============================================================================

test.describe('Verify Client Creation', () => {
  test('Speccon admin should see all 8 Speccon clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.speccon.admin.email, TENANT_USERS.speccon.admin.password);
    await page.goto('/clients');

    // Count clients with SP- prefix (Speccon clients)
    const specconClients = page.locator('td, .client-name').filter({ hasText: /\(SP-/ });
    const count = await specconClients.count();

    console.log(`Found ${count} Speccon clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('Abebe admin should see all 8 Abebe clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.abebe.admin.email, TENANT_USERS.abebe.admin.password);
    await page.goto('/clients');

    // Count clients with AB- prefix (Abebe clients)
    const abebeClients = page.locator('td, .client-name').filter({ hasText: /\(AB-/ });
    const count = await abebeClients.count();

    console.log(`Found ${count} Abebe clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('Megro admin should see all 8 Megro clients', async ({ page }) => {
    await loginAs(page, TENANT_USERS.megro.admin.email, TENANT_USERS.megro.admin.password);
    await page.goto('/clients');

    // Count clients with MR- prefix (Megro clients)
    const megroClients = page.locator('td, .client-name').filter({ hasText: /\(MR-/ });
    const count = await megroClients.count();

    console.log(`Found ${count} Megro clients (expected 8)`);
    expect(count).toBeGreaterThanOrEqual(8);
  });
});
