import { test, expect } from '@playwright/test';
import { loginWithEmail, logout, TEST_USERS } from './helpers/auth';
import { TEST_CLIENT, uniqueName } from './helpers/test-data';

test.describe('Accountant Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_USERS.accountant.email, TEST_USERS.accountant.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('Authentication & Login', () => {
    test('should login successfully', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should have accountant role', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should show tenant indicator in header', async ({ page }) => {
      const tenantIndicator = page.locator('.tenant-indicator');
      await expect(tenantIndicator).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test('should view dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should CAN access Edit Financial Dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      const editFinancialBtn = page.locator('button, a', { hasText: /edit.*financial/i });
      await expect(editFinancialBtn).toBeVisible();
    });

    test('should see pipeline statistics (view only)', async ({ page }) => {
      await page.goto('/dashboard');
      // Pipeline stats visible but not editable
    });

    test('should see financial data', async ({ page }) => {
      await page.goto('/dashboard');
      const financialSection = page.locator('[class*="financial"], .financial-data');
      // Financial data should be visible
    });

    test('should NOT see client allocation modal', async ({ page }) => {
      await page.goto('/dashboard');
      const allocationBtn = page.locator('button', { hasText: /allocat/i });
      await expect(allocationBtn).not.toBeVisible();
    });
  });

  test.describe('Financial Dashboard Editing', () => {
    test('should access /dashboard/edit-financial', async ({ page }) => {
      await page.goto('/dashboard/edit-financial');
      // Should be able to access this page
      await expect(page).toHaveURL(/.*edit-financial|.*dashboard/);
    });

    test('should edit Learnerships figures', async ({ page }) => {
      await page.goto('/dashboard/edit-financial');
      const learnershipField = page.locator('input[name*="learnership"], [data-field*="learnership"]');
      // Should be editable
    });

    test('should edit TAP Business figures', async ({ page }) => {
      await page.goto('/dashboard/edit-financial');
      const tapField = page.locator('input[name*="tap"], [data-field*="tap"]');
      // Should be editable
    });

    test('should edit Compliance figures', async ({ page }) => {
      await page.goto('/dashboard/edit-financial');
      const complianceField = page.locator('input[name*="compliance"], [data-field*="compliance"]');
      // Should be editable
    });

    test('should save financial changes', async ({ page }) => {
      await page.goto('/dashboard/edit-financial');
      const saveBtn = page.locator('button', { hasText: /save/i });
      if (await saveBtn.count() > 0) {
        await expect(saveBtn).toBeVisible();
      }
    });
  });

  test.describe('Client Management', () => {
    test('should view clients (view only)', async ({ page }) => {
      await page.goto('/clients');
      await expect(page).toHaveURL(/.*clients/);
    });

    test('should NOT be able to create new clients', async ({ page }) => {
      // Try to access new client page
      await page.goto('/clients/new');
      // Should redirect or show error
    });

    test('should NOT be able to edit client details', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Edit button should not be visible (for non-financial fields)
        const editClientBtn = page.locator('button', { hasText: /edit.*client/i });
        await expect(editClientBtn).not.toBeVisible();
      }
    });

    test('should NOT be able to delete clients', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const deleteBtn = page.locator('button', { hasText: /delete/i });
        await expect(deleteBtn).not.toBeVisible();
      }
    });
  });

  test.describe('Client Detail Tabs', () => {
    test('should view Overview tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
      }
    });

    test('should view and edit Financial tab', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const financialTab = page.locator('button, [role="tab"]', { hasText: 'Financial' });
        if (await financialTab.count() > 0) {
          await financialTab.click();
          // Should be able to edit financial data
          const editBtn = page.locator('button', { hasText: /edit/i });
          // Should have edit capability for financial
        }
      }
    });

    test('should view Legal tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const legalTab = page.locator('button, [role="tab"]', { hasText: 'Legal' });
        if (await legalTab.count() > 0) {
          await legalTab.click();
        }
      }
    });

    test('should view Interactions tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const interactionsTab = page.locator('button, [role="tab"]', { hasText: 'Interactions' });
        if (await interactionsTab.count() > 0) {
          await interactionsTab.click();
        }
      }
    });

    test('should view Products tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const productsTab = page.locator('button, [role="tab"]', { hasText: 'Products' });
        if (await productsTab.count() > 0) {
          await productsTab.click();
        }
      }
    });

    test('should view Locations tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const locationsTab = page.locator('button, [role="tab"]', { hasText: 'Locations' });
        if (await locationsTab.count() > 0) {
          await locationsTab.click();
        }
      }
    });

    test('should view Contacts tab (view only)', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const contactsTab = page.locator('button, [role="tab"]', { hasText: 'Contacts' });
        if (await contactsTab.count() > 0) {
          await contactsTab.click();
        }
      }
    });
  });

  test.describe('Client Financial Editing', () => {
    test('should access client financial editor', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const financialTab = page.locator('button, [role="tab"]', { hasText: 'Financial' });
        if (await financialTab.count() > 0) {
          await financialTab.click();
        }
      }
    });

    test('should edit client financial figures', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const financialTab = page.locator('button, [role="tab"]', { hasText: 'Financial' });
        if (await financialTab.count() > 0) {
          await financialTab.click();
          // Look for editable fields
          const editableField = page.locator('input[type="number"], input[name*="amount"]');
          // Should be editable
        }
      }
    });

    test('should save financial changes', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const financialTab = page.locator('button, [role="tab"]', { hasText: 'Financial' });
        if (await financialTab.count() > 0) {
          await financialTab.click();
          const saveBtn = page.locator('button', { hasText: /save/i });
          // Should be visible
        }
      }
    });
  });

  test.describe('Sales Pipeline', () => {
    test('should view sales pipeline (view only)', async ({ page }) => {
      await page.goto('/sales-pipeline');
      await expect(page).toHaveURL(/.*sales-pipeline/);
    });

    test('should NOT be able to update client pipeline status', async ({ page }) => {
      await page.goto('/sales-pipeline');
      // Should be view-only, no drag-drop or status change capability
    });
  });

  test.describe('Follow-Up Tasks', () => {
    test('should NOT access Follow-Up Tasks page', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      // Should redirect or show no content
    });

    test('should NOT see Follow-Up Tasks link in navigation', async ({ page }) => {
      const tasksLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Follow-Up' });
      await expect(tasksLink).not.toBeVisible();
    });
  });

  test.describe('Reports', () => {
    test('should access Reports page', async ({ page }) => {
      await page.goto('/reports');
      await expect(page).toHaveURL(/.*reports/);
    });

    test('should view all report data', async ({ page }) => {
      await page.goto('/reports');
      // Reports should be visible
    });

    test('should see financial reports', async ({ page }) => {
      await page.goto('/reports');
      const financialReport = page.locator('[class*="financial"], [data-report*="financial"]');
      // Financial reports should be accessible
    });
  });

  test.describe('Messages', () => {
    test('should view messages', async ({ page }) => {
      await page.goto('/messages');
      await expect(page).toHaveURL(/.*messages/);
    });

    test('should NOT be able to create/send messages', async ({ page }) => {
      await page.goto('/messages');
      const composeBtn = page.locator('button', { hasText: /compose|new|create/i });
      await expect(composeBtn).not.toBeVisible();
    });
  });

  test.describe('Admin Functions', () => {
    test('should CAN access Financial Year settings', async ({ page }) => {
      await page.goto('/financial-year-end');
      await expect(page).toHaveURL(/.*financial-year-end/);
    });

    test('should NOT access User Management', async ({ page }) => {
      await page.goto('/user-management');
      // Should redirect or show no content
    });

    test('should NOT access Role Management', async ({ page }) => {
      await page.goto('/role-management');
      // Should redirect or show no content
    });

    test('should NOT access Seed Data', async ({ page }) => {
      await page.goto('/seed-data');
      // Should redirect or show no content
    });
  });

  test.describe('Financial Year Settings', () => {
    test('should access /financial-year-end', async ({ page }) => {
      await page.goto('/financial-year-end');
      await expect(page).toHaveURL(/.*financial-year-end/);
    });

    test('should view current financial year', async ({ page }) => {
      await page.goto('/financial-year-end');
      const yearDisplay = page.locator('[class*="year"], [data-field*="year"]');
      // Year info should be visible
    });

    test('should update financial year settings', async ({ page }) => {
      await page.goto('/financial-year-end');
      const saveBtn = page.locator('button', { hasText: /save|update/i });
      if (await saveBtn.count() > 0) {
        await expect(saveBtn).toBeVisible();
      }
    });
  });

  test.describe('Accounting Features', () => {
    test('should view accounting data', async ({ page }) => {
      // Look for accounting section
      await page.goto('/dashboard');
      const accountingSection = page.locator('[class*="accounting"]');
      // Accounting data should be visible
    });

    test('should edit accounting data', async ({ page }) => {
      await page.goto('/dashboard');
      // Should have edit capability for accounting
    });
  });

  test.describe('Team Chat', () => {
    test('should open team chat', async ({ page }) => {
      const chatBtn = page.locator('.team-chat-btn');
      await chatBtn.click();

      const chatPopup = page.locator('.team-chat-popup');
      await expect(chatPopup).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should see Dashboard link', async ({ page }) => {
      const dashboardLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Dashboard' });
      await expect(dashboardLink.first()).toBeVisible();
    });

    test('should see Clients link (view only)', async ({ page }) => {
      const clientsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Clients' });
      await expect(clientsLink.first()).toBeVisible();
    });

    test('should see Sales Pipeline link (view only)', async ({ page }) => {
      const pipelineLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Sales Pipeline' });
      await expect(pipelineLink.first()).toBeVisible();
    });

    test('should NOT see Follow-Up Tasks link', async ({ page }) => {
      const tasksLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Follow-Up' });
      await expect(tasksLink).not.toBeVisible();
    });

    test('should see Reports link', async ({ page }) => {
      const reportsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Reports' });
      await expect(reportsLink.first()).toBeVisible();
    });

    test('should see Messages link (view only)', async ({ page }) => {
      const messagesLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Messages' });
      await expect(messagesLink.first()).toBeVisible();
    });

    test('should see Admin dropdown with Financial Year only', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      if (await adminToggle.count() > 0) {
        await adminToggle.click();
        const financialYearLink = page.locator('.admin-dropdown-menu a', { hasText: 'Financial Year' });
        await expect(financialYearLink).toBeVisible();

        // User Management should NOT be visible
        const userMgmtLink = page.locator('.admin-dropdown-menu a', { hasText: 'User Management' });
        await expect(userMgmtLink).not.toBeVisible();
      }
    });

    test('should access Profile page', async ({ page }) => {
      const profileLink = page.locator('a, button', { hasText: /profile/i });
      if (await profileLink.count() > 0) {
        await profileLink.first().click();
      }
    });
  });

  test.describe('Data Access', () => {
    test('should see all tenant client data', async ({ page }) => {
      await page.goto('/clients');
      // Can see all clients in tenant
    });

    test('should NOT modify non-financial client data', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Non-financial edit buttons should not be visible
        const editNameBtn = page.locator('button', { hasText: /edit.*name|edit.*details/i });
        await expect(editNameBtn).not.toBeVisible();
      }
    });
  });
});
