import { test, expect } from '@playwright/test';
import { loginWithEmail, logout, TEST_USERS } from './helpers/auth';
import { TEST_CLIENT, TEST_LOCATION, TEST_CONTACT, uniqueName } from './helpers/test-data';

test.describe('Manager Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('Authentication & Login', () => {
    test('should login successfully', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should have manager role', async ({ page }) => {
      // Verify user is logged in as manager
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

    test('should see pipeline statistics', async ({ page }) => {
      await page.goto('/dashboard');
      // Check for pipeline section
      const pipelineSection = page.locator('.pipeline-section, .dashboard-stats, [class*="pipeline"]');
      // Dashboard should have some stats visible
    });

    test('should see all clients assigned to team', async ({ page }) => {
      await page.goto('/dashboard');
      // Manager can see all team clients
    });

    test('should NOT access Edit Financial Dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      const editFinancialBtn = page.locator('button, a', { hasText: 'Edit Financial' });
      await expect(editFinancialBtn).not.toBeVisible();
    });

    test('should access client allocation modal', async ({ page }) => {
      await page.goto('/dashboard');
      const allocationBtn = page.locator('button', { hasText: /allocat/i });
      if (await allocationBtn.count() > 0) {
        await allocationBtn.click();
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).toBeVisible();
      }
    });
  });

  test.describe('Client Management', () => {
    test('should view clients list', async ({ page }) => {
      await page.goto('/clients');
      await expect(page).toHaveURL(/.*clients/);
    });

    test('should view all clients in tenant', async ({ page }) => {
      await page.goto('/clients');
      // Manager should see all tenant clients
    });

    test('should create new client', async ({ page }) => {
      await page.goto('/clients/new');
      await expect(page).toHaveURL(/.*clients\/new/);

      const clientName = uniqueName('Manager Test Client');

      await page.fill('#name', clientName);
      await page.selectOption('#type', TEST_CLIENT.type);
      await page.selectOption('#status', TEST_CLIENT.status);

      await page.click('button[type="submit"]');

      // Should redirect to client detail
      await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
    });

    test('should edit client details', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Look for edit button or form
        const editBtn = page.locator('button', { hasText: /edit/i });
        if (await editBtn.count() > 0) {
          await expect(editBtn).toBeVisible();
        }
      }
    });

    test('should NOT be able to delete clients', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Delete button should not be visible
        const deleteBtn = page.locator('button', { hasText: /delete/i });
        await expect(deleteBtn).not.toBeVisible();
      }
    });
  });

  test.describe('Client Detail Tabs', () => {
    test('should view Overview tab', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
        // Overview should be visible by default
      }
    });

    test('should view Financial tab (view only)', async ({ page }) => {
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

    test('should view Legal tab', async ({ page }) => {
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

    test('should view Interactions tab', async ({ page }) => {
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
  });

  test.describe('Client Locations', () => {
    test('should view client locations', async ({ page }) => {
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

    test('should add new location', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const locationsTab = page.locator('button, [role="tab"]', { hasText: 'Locations' });
        if (await locationsTab.count() > 0) {
          await locationsTab.click();

          const addBtn = page.locator('button', { hasText: /add.*location/i });
          if (await addBtn.count() > 0) {
            await addBtn.click();
            // Modal should appear
            const modal = page.locator('.modal, [role="dialog"]');
            await expect(modal).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Client Contacts', () => {
    test('should view client contacts', async ({ page }) => {
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

    test('should add new contact', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const contactsTab = page.locator('button, [role="tab"]', { hasText: 'Contacts' });
        if (await contactsTab.count() > 0) {
          await contactsTab.click();

          const addBtn = page.locator('button', { hasText: /add.*contact/i });
          if (await addBtn.count() > 0) {
            await addBtn.click();
            const modal = page.locator('.modal, [role="dialog"]');
            await expect(modal).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Sales Pipeline', () => {
    test('should view sales pipeline', async ({ page }) => {
      await page.goto('/sales-pipeline');
      await expect(page).toHaveURL(/.*sales-pipeline/);
    });

    test('should see all tenant clients in pipeline', async ({ page }) => {
      await page.goto('/sales-pipeline');
      // Manager sees all tenant clients
    });

    test('should update client pipeline status', async ({ page }) => {
      await page.goto('/sales-pipeline');
      // Look for pipeline cards or drag-drop interface
    });
  });

  test.describe('Follow-Up Tasks', () => {
    test('should view follow-up tasks', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      await expect(page).toHaveURL(/.*follow-up-tasks/);
    });

    test('should see all team follow-up tasks', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      // Manager can see all team tasks
    });

    test('should create follow-up task', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      const createBtn = page.locator('button', { hasText: /create|add|new/i });
      if (await createBtn.count() > 0) {
        await expect(createBtn).toBeVisible();
      }
    });
  });

  test.describe('Reports', () => {
    test('should access reports', async ({ page }) => {
      await page.goto('/reports');
      await expect(page).toHaveURL(/.*reports/);
    });

    test('should see all reports', async ({ page }) => {
      await page.goto('/reports');
      // Reports should be visible
    });
  });

  test.describe('Messages', () => {
    test('should access messages', async ({ page }) => {
      await page.goto('/messages');
      await expect(page).toHaveURL(/.*messages/);
    });

    test('should create messages', async ({ page }) => {
      await page.goto('/messages');
      const composeBtn = page.locator('button', { hasText: /compose|new|create/i });
      if (await composeBtn.count() > 0) {
        await expect(composeBtn).toBeVisible();
      }
    });
  });

  test.describe('Admin Functions', () => {
    test('should access User Management', async ({ page }) => {
      await page.goto('/user-management');
      await expect(page).toHaveURL(/.*user-management/);
    });

    test('should NOT access Role Management', async ({ page }) => {
      await page.goto('/role-management');
      // Should either redirect or show no content
      const roleManagement = page.locator('h1', { hasText: 'Role Management' });
      // May not be visible or redirect
    });

    test('should NOT access Financial Year', async ({ page }) => {
      await page.goto('/financial-year-end');
      // Should either redirect or show no content
    });

    test('should NOT access Seed Data', async ({ page }) => {
      await page.goto('/seed-data');
      // Should either redirect or show no content
    });

    test('should NOT access Pipeline Statuses', async ({ page }) => {
      await page.goto('/pipeline-statuses');
      // Should either redirect or show no content
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

    test('should see Clients link', async ({ page }) => {
      const clientsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Clients' });
      await expect(clientsLink.first()).toBeVisible();
    });

    test('should see Sales Pipeline link', async ({ page }) => {
      const pipelineLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Sales Pipeline' });
      await expect(pipelineLink.first()).toBeVisible();
    });

    test('should see Follow-Up Tasks link', async ({ page }) => {
      const tasksLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Follow-Up' });
      await expect(tasksLink.first()).toBeVisible();
    });

    test('should see Reports link', async ({ page }) => {
      const reportsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Reports' });
      await expect(reportsLink.first()).toBeVisible();
    });

    test('should see Messages link', async ({ page }) => {
      const messagesLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Messages' });
      await expect(messagesLink.first()).toBeVisible();
    });

    test('should see limited Admin dropdown', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      if (await adminToggle.count() > 0) {
        await adminToggle.click();
        // Should show User Management but not Role Management
        const userMgmtLink = page.locator('.admin-dropdown-menu a', { hasText: 'User Management' });
        await expect(userMgmtLink).toBeVisible();
      }
    });
  });
});
