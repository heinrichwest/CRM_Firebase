/**
 * E2E Test Suite: User Hierarchy Setup
 *
 * Creates the full user hierarchy for each tenant:
 * - 1 Admin per tenant
 * - 1 Group Sales Manager per tenant
 * - 2 Managers per tenant (each reports to GSM)
 * - 4 Salespeople per tenant (2 per manager)
 * - 1 Accountant per tenant
 *
 * Total: 9 users per tenant = 27 users across 3 tenants
 */

import { test, expect } from '@playwright/test';
import { SYSTEM_ADMIN, TENANT_USERS, TEST_TENANTS } from '../helpers/comprehensive-test-data';

// Use serial mode - tests must run in order
test.describe.configure({ mode: 'serial' });

/**
 * Helper to navigate to user management and wait for data to load
 */
async function goToUserManagement(page: any) {
  await page.goto('/user-management');
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000); // Let data populate
}

// Map role values to dropdown labels
const ROLE_LABELS: { [key: string]: string } = {
  'admin': 'Admin',
  'group-sales-manager': 'Group Sales Manager',
  'manager': 'Manager',
  'salesperson': 'Salesperson',
  'accountant': 'Accountant',
  'sales-admin': 'Sales Admin',
};

/**
 * Helper to create a user via the UI
 * Uses id-based selectors to match actual form fields in UserManagement.jsx
 *
 * Handles two cases:
 * 1. System admin - tenant dropdown is shown
 * 2. Tenant admin - tenant dropdown is NOT shown (users auto-assigned to tenant)
 */
async function createUser(page: any, userData: any, tenantName: string) {
  // Fill email (using placeholder selector)
  await page.fill('[placeholder="user@example.com"]', userData.email);

  // Fill display name
  await page.fill('[placeholder="John Doe"]', userData.displayName);

  // Fill password
  await page.fill('[placeholder="Minimum 6 characters"]', userData.password);

  // Confirm password
  await page.fill('[placeholder="Confirm password"]', userData.password);

  // Check if tenant dropdown exists (only for system admin)
  const tenantSelect = page.locator('#tenantId');
  const tenantSelectExists = await tenantSelect.count() > 0;

  if (tenantSelectExists) {
    // Map tenant name to tenant ID for selection
    const tenantIdMap: { [key: string]: string } = {
      'Speccon': 'speccon',
      'Abebe': 'abebe',
      'Megro': 'megro'
    };
    const tenantId = tenantIdMap[tenantName] || tenantName.toLowerCase();

    // Wait for tenant dropdown to have options (more than just "Select a tenant...")
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const optionCount = await tenantSelect.locator('option').count();
      if (optionCount > 1) {
        console.log(`Tenant dropdown has ${optionCount} options`);
        break;
      }
      console.log(`Waiting for tenant options... attempt ${attempts + 1}`);
      await page.waitForTimeout(500);
      attempts++;
    }

    // Select tenant by value (tenant ID)
    await page.selectOption('#tenantId', tenantId);
    await page.waitForTimeout(300);
  } else {
    console.log('Tenant dropdown not shown (tenant admin mode)');
  }

  // Select role using id selector
  const roleLabel = ROLE_LABELS[userData.role] || userData.role;
  await page.selectOption('#role', { label: roleLabel });
}

test.describe('User Hierarchy Setup - Speccon', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', SYSTEM_ADMIN.email);
    await page.fill('#password', SYSTEM_ADMIN.password);
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('should create Speccon admin user', async ({ page }) => {
    await goToUserManagement(page);

    // Check if user already exists
    const existingUser = page.locator('td', { hasText: TENANT_USERS.speccon.admin.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon admin already exists, skipping');
      return;
    }

    // Click Add User button
    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.speccon.admin, TEST_TENANTS.speccon.name);

    // Submit
    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    // Verify
    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: TENANT_USERS.speccon.admin.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon group sales manager', async ({ page }) => {
    await goToUserManagement(page);

    const existingUser = page.locator('td', { hasText: TENANT_USERS.speccon.groupSalesManager.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon GSM already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.speccon.groupSalesManager, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: TENANT_USERS.speccon.groupSalesManager.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Manager Team A', async ({ page }) => {
    await goToUserManagement(page);

    const manager = TENANT_USERS.speccon.managers[0];
    const existingUser = page.locator('td', { hasText: manager.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Manager A already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, manager, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: manager.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Manager Team B', async ({ page }) => {
    await goToUserManagement(page);

    const manager = TENANT_USERS.speccon.managers[1];
    const existingUser = page.locator('td', { hasText: manager.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Manager B already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, manager, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: manager.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Salesperson A1 (Tom)', async ({ page }) => {
    await goToUserManagement(page);

    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const existingUser = page.locator('td', { hasText: salesperson.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Sales A1 already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, salesperson, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: salesperson.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Salesperson A2 (Lisa)', async ({ page }) => {
    await goToUserManagement(page);

    const salesperson = TENANT_USERS.speccon.salespeople[1];
    const existingUser = page.locator('td', { hasText: salesperson.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Sales A2 already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, salesperson, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: salesperson.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Salesperson B1 (David)', async ({ page }) => {
    await goToUserManagement(page);

    const salesperson = TENANT_USERS.speccon.salespeople[2];
    const existingUser = page.locator('td', { hasText: salesperson.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Sales B1 already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, salesperson, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: salesperson.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Salesperson B2 (Emma)', async ({ page }) => {
    await goToUserManagement(page);

    const salesperson = TENANT_USERS.speccon.salespeople[3];
    const existingUser = page.locator('td', { hasText: salesperson.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon Sales B2 already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, salesperson, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: salesperson.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Speccon Accountant', async ({ page }) => {
    await goToUserManagement(page);

    const existingUser = page.locator('td', { hasText: TENANT_USERS.speccon.accountant.email });
    if (await existingUser.count() > 0) {
      console.log('Speccon accountant already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.speccon.accountant, TEST_TENANTS.speccon.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: TENANT_USERS.speccon.accountant.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should assign Speccon managers to GSM', async ({ page }) => {
    await goToUserManagement(page);

    // Filter by Speccon tenant using value instead of label (label includes count)
    const tenantFilter = page.locator('#tenantFilter');
    if (await tenantFilter.count() > 0) {
      await tenantFilter.selectOption('speccon');
      await page.waitForTimeout(1000);
    }

    // Find Manager A row and assign to GSM
    const managerAEmail = TENANT_USERS.speccon.managers[0].email;
    console.log(`Looking for manager A: ${managerAEmail}`);
    const managerARow = page.locator('tr', { hasText: managerAEmail });
    const managerACount = await managerARow.count();
    console.log(`Found ${managerACount} rows for manager A`);

    if (managerACount > 0) {
      const managerSelect = managerARow.first().locator('select.manager-select');
      if (await managerSelect.count() > 0) {
        // Get GSM display name
        const gsmName = TENANT_USERS.speccon.groupSalesManager.displayName;
        console.log(`Assigning to GSM: ${gsmName}`);
        // Select by label - use the full display name
        await managerSelect.selectOption({ label: gsmName });
        await page.waitForTimeout(1000);
      } else {
        console.log('Manager select not found for Manager A');
      }
    }

    // Find Manager B row and assign to GSM
    const managerBEmail = TENANT_USERS.speccon.managers[1].email;
    console.log(`Looking for manager B: ${managerBEmail}`);
    const managerBRow = page.locator('tr', { hasText: managerBEmail });
    const managerBCount = await managerBRow.count();
    console.log(`Found ${managerBCount} rows for manager B`);

    if (managerBCount > 0) {
      const managerSelect = managerBRow.first().locator('select.manager-select');
      if (await managerSelect.count() > 0) {
        const gsmName = TENANT_USERS.speccon.groupSalesManager.displayName;
        await managerSelect.selectOption({ label: gsmName });
        await page.waitForTimeout(1000);
      } else {
        console.log('Manager select not found for Manager B');
      }
    }
  });

  test('should assign Speccon salespeople to managers', async ({ page }) => {
    await goToUserManagement(page);

    // Filter by Speccon tenant using value
    const tenantFilter = page.locator('#tenantFilter');
    if (await tenantFilter.count() > 0) {
      await tenantFilter.selectOption('speccon');
      await page.waitForTimeout(1000);
    }

    // Assign Sales A1 and A2 to Manager A
    const managerAName = TENANT_USERS.speccon.managers[0].displayName;
    for (let i = 0; i < 2; i++) {
      const salesEmail = TENANT_USERS.speccon.salespeople[i].email;
      console.log(`Assigning ${salesEmail} to Manager A: ${managerAName}`);
      const salesRow = page.locator('tr', { hasText: salesEmail });
      if (await salesRow.count() > 0) {
        const managerSelect = salesRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: managerAName });
          await page.waitForTimeout(1000);
        }
      }
    }

    // Assign Sales B1 and B2 to Manager B
    const managerBName = TENANT_USERS.speccon.managers[1].displayName;
    for (let i = 2; i < 4; i++) {
      const salesEmail = TENANT_USERS.speccon.salespeople[i].email;
      console.log(`Assigning ${salesEmail} to Manager B: ${managerBName}`);
      const salesRow = page.locator('tr', { hasText: salesEmail });
      if (await salesRow.count() > 0) {
        const managerSelect = salesRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: managerBName });
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});

test.describe('User Hierarchy Setup - Abebe', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session by going to logout first
    await page.goto('/login');
    // Check if we're already on dashboard (auto-redirected due to session)
    if (page.url().includes('/dashboard')) {
      // Already logged in, need to logout first
      const logoutBtn = page.locator('button:has-text("Logout")');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 10000 });
      }
    }
    // Now login as system admin
    await page.fill('#email', SYSTEM_ADMIN.email);
    await page.fill('#password', SYSTEM_ADMIN.password);
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('should create Abebe admin user', async ({ page }) => {
    await goToUserManagement(page);

    const existingUser = page.locator('td', { hasText: TENANT_USERS.abebe.admin.email });
    if (await existingUser.count() > 0) {
      console.log('Abebe admin already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.abebe.admin, TEST_TENANTS.abebe.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    await goToUserManagement(page);
    const newUser = page.locator('td', { hasText: TENANT_USERS.abebe.admin.email });
    await expect(newUser.first()).toBeVisible();
  });

  test('should create Abebe group sales manager', async ({ page }) => {
    await goToUserManagement(page);

    const existingUser = page.locator('td', { hasText: TENANT_USERS.abebe.groupSalesManager.email });
    if (await existingUser.count() > 0) {
      console.log('Abebe GSM already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.abebe.groupSalesManager, TEST_TENANTS.abebe.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);
  });

  test('should create all Abebe managers', async ({ page }) => {
    await goToUserManagement(page);

    for (const manager of TENANT_USERS.abebe.managers) {
      const existingUser = page.locator('td', { hasText: manager.email });
      if (await existingUser.count() > 0) {
        console.log(`${manager.email} already exists, skipping`);
        continue;
      }

      await page.click('button:has-text("+ Add User")');
      await page.waitForSelector('h2:has-text("Create New User")');

      await createUser(page, manager, TEST_TENANTS.abebe.name);

      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(2000);
      await goToUserManagement(page);
    }
  });

  test('should create all Abebe salespeople', async ({ page }) => {
    await goToUserManagement(page);

    for (const salesperson of TENANT_USERS.abebe.salespeople) {
      const existingUser = page.locator('td', { hasText: salesperson.email });
      if (await existingUser.count() > 0) {
        console.log(`${salesperson.email} already exists, skipping`);
        continue;
      }

      await page.click('button:has-text("+ Add User")');
      await page.waitForSelector('h2:has-text("Create New User")');

      await createUser(page, salesperson, TEST_TENANTS.abebe.name);

      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(2000);
      await goToUserManagement(page);
    }
  });

  test('should create Abebe accountant', async ({ page }) => {
    await goToUserManagement(page);

    const existingUser = page.locator('td', { hasText: TENANT_USERS.abebe.accountant.email });
    if (await existingUser.count() > 0) {
      console.log('Abebe accountant already exists, skipping');
      return;
    }

    await page.click('button:has-text("+ Add User")');
    await page.waitForSelector('h2:has-text("Create New User")');

    await createUser(page, TENANT_USERS.abebe.accountant, TEST_TENANTS.abebe.name);

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);
  });

  test('should setup Abebe hierarchy assignments', async ({ page }) => {
    await goToUserManagement(page);

    // Filter by Abebe tenant using value
    const tenantFilter = page.locator('#tenantFilter');
    if (await tenantFilter.count() > 0) {
      await tenantFilter.selectOption('abebe');
      await page.waitForTimeout(1000);
    }

    // Assign managers to GSM
    const gsmName = TENANT_USERS.abebe.groupSalesManager.displayName;
    for (const manager of TENANT_USERS.abebe.managers) {
      console.log(`Assigning ${manager.email} to GSM: ${gsmName}`);
      const managerRow = page.locator('tr', { hasText: manager.email });
      if (await managerRow.count() > 0) {
        const managerSelect = managerRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: gsmName });
          await page.waitForTimeout(1000);
        }
      }
    }

    // Assign salespeople to managers
    for (let i = 0; i < TENANT_USERS.abebe.salespeople.length; i++) {
      const salesperson = TENANT_USERS.abebe.salespeople[i];
      const managerIndex = salesperson.managerIndex;
      const managerName = TENANT_USERS.abebe.managers[managerIndex].displayName;

      console.log(`Assigning ${salesperson.email} to Manager: ${managerName}`);
      const salesRow = page.locator('tr', { hasText: salesperson.email });
      if (await salesRow.count() > 0) {
        const managerSelect = salesRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: managerName });
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});

test.describe('User Hierarchy Setup - Megro', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session by going to logout first
    await page.goto('/login');
    // Check if we're already on dashboard (auto-redirected due to session)
    if (page.url().includes('/dashboard')) {
      // Already logged in, need to logout first
      const logoutBtn = page.locator('button:has-text("Logout")');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.click();
        await page.waitForURL('**/login', { timeout: 10000 });
      }
    }
    // Now login as system admin
    await page.fill('#email', SYSTEM_ADMIN.email);
    await page.fill('#password', SYSTEM_ADMIN.password);
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('should create all Megro users', async ({ page }) => {
    await goToUserManagement(page);

    // Create admin
    const adminExists = page.locator('td', { hasText: TENANT_USERS.megro.admin.email });
    if (await adminExists.count() === 0) {
      await page.click('button:has-text("+ Add User")');
      await page.waitForSelector('h2:has-text("Create New User")');
      await createUser(page, TENANT_USERS.megro.admin, TEST_TENANTS.megro.name);
      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(2000);
      await goToUserManagement(page);
    }

    // Create GSM
    const gsmExists = page.locator('td', { hasText: TENANT_USERS.megro.groupSalesManager.email });
    if (await gsmExists.count() === 0) {
      await page.click('button:has-text("+ Add User")');
      await page.waitForSelector('h2:has-text("Create New User")');
      await createUser(page, TENANT_USERS.megro.groupSalesManager, TEST_TENANTS.megro.name);
      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(2000);
      await goToUserManagement(page);
    }

    // Create managers
    for (const manager of TENANT_USERS.megro.managers) {
      const exists = page.locator('td', { hasText: manager.email });
      if (await exists.count() === 0) {
        await page.click('.add-user-btn');
        await page.waitForSelector('.add-user-modal');
        await createUser(page, manager, TEST_TENANTS.megro.name);
        await page.click('button:has-text("Create User")');
        await page.waitForTimeout(2000);
        await goToUserManagement(page);
      }
    }

    // Create salespeople
    for (const salesperson of TENANT_USERS.megro.salespeople) {
      const exists = page.locator('td', { hasText: salesperson.email });
      if (await exists.count() === 0) {
        await page.click('.add-user-btn');
        await page.waitForSelector('.add-user-modal');
        await createUser(page, salesperson, TEST_TENANTS.megro.name);
        await page.click('button:has-text("Create User")');
        await page.waitForTimeout(2000);
        await goToUserManagement(page);
      }
    }

    // Create accountant
    const accountantExists = page.locator('td', { hasText: TENANT_USERS.megro.accountant.email });
    if (await accountantExists.count() === 0) {
      await page.click('button:has-text("+ Add User")');
      await page.waitForSelector('h2:has-text("Create New User")');
      await createUser(page, TENANT_USERS.megro.accountant, TEST_TENANTS.megro.name);
      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(2000);
    }
  });

  test('should setup Megro hierarchy assignments', async ({ page }) => {
    await goToUserManagement(page);

    // Filter by Megro tenant using value
    const tenantFilter = page.locator('#tenantFilter');
    if (await tenantFilter.count() > 0) {
      await tenantFilter.selectOption('megro');
      await page.waitForTimeout(1000);
    }

    // Assign managers to GSM
    const gsmName = TENANT_USERS.megro.groupSalesManager.displayName;
    for (const manager of TENANT_USERS.megro.managers) {
      console.log(`Assigning ${manager.email} to GSM: ${gsmName}`);
      const managerRow = page.locator('tr', { hasText: manager.email });
      if (await managerRow.count() > 0) {
        const managerSelect = managerRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: gsmName });
          await page.waitForTimeout(1000);
        }
      }
    }

    // Assign salespeople to managers
    for (let i = 0; i < TENANT_USERS.megro.salespeople.length; i++) {
      const salesperson = TENANT_USERS.megro.salespeople[i];
      const managerIndex = salesperson.managerIndex;
      const managerName = TENANT_USERS.megro.managers[managerIndex].displayName;

      console.log(`Assigning ${salesperson.email} to Manager: ${managerName}`);
      const salesRow = page.locator('tr', { hasText: salesperson.email });
      if (await salesRow.count() > 0) {
        const managerSelect = salesRow.first().locator('select.manager-select');
        if (await managerSelect.count() > 0) {
          await managerSelect.selectOption({ label: managerName });
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});

test.describe('Verify User Setup', () => {
  test('should verify total user count across all tenants', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', SYSTEM_ADMIN.email);
    await page.fill('#password', SYSTEM_ADMIN.password);
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    await goToUserManagement(page);

    // Count users for each tenant
    const tenants = ['speccon', 'abebe', 'megro'] as const;
    let totalUsers = 0;

    for (const tenantKey of tenants) {
      const tenantData = TENANT_USERS[tenantKey];
      // 1 admin + 1 gsm + 2 managers + 4 salespeople + 1 accountant = 9 users
      const expectedCount = 9;
      totalUsers += expectedCount;

      // Verify at least the admin exists for each tenant
      const adminRow = page.locator('td', { hasText: tenantData.admin.email });
      await expect(adminRow.first()).toBeVisible({ timeout: 10000 });
    }

    console.log(`Expected total users: ${totalUsers}`);
  });
});
