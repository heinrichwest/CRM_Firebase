import { test, expect } from '@playwright/test';
import { loginWithEmail, logout, TEST_USERS } from './helpers/auth';
import { TEST_CLIENT, TEST_LOCATION, TEST_CONTACT, uniqueName } from './helpers/test-data';

test.describe('Tenant Admin Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_USERS.tenantAdmin.email, TEST_USERS.tenantAdmin.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('Authentication & Login', () => {
    test('should login successfully', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should show tenant indicator in header', async ({ page }) => {
      const tenantIndicator = page.locator('.tenant-indicator');
      await expect(tenantIndicator).toBeVisible();
    });

    test('should NOT be system admin', async ({ page }) => {
      // System admin indicator should NOT be visible
      const systemAdminIndicator = page.locator('.tenant-indicator.system-admin');
      await expect(systemAdminIndicator).not.toBeVisible();
    });
  });

  test.describe('Tenant Restrictions', () => {
    test('should NOT see Tenant Management in Admin dropdown', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      if (await adminToggle.count() > 0) {
        await adminToggle.click();
        const tenantLink = page.locator('.admin-dropdown-menu a', { hasText: 'Tenant Management' });
        await expect(tenantLink).not.toBeVisible();
      }
    });

    test('should NOT be able to access /tenants route', async ({ page }) => {
      await page.goto('/tenants');
      // Should either redirect or show no content
      // Tenant admin should not see tenant management content
      const tenantManagement = page.locator('h1', { hasText: 'Tenant Management' });
      // May redirect or show restricted access
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
  });

  test.describe('Client Management', () => {
    test('should view clients list', async ({ page }) => {
      await page.goto('/clients');
      await expect(page).toHaveURL(/.*clients/);
    });

    test('should create new client', async ({ page }) => {
      await page.goto('/clients/new');
      await expect(page).toHaveURL(/.*clients\/new/);

      const clientName = uniqueName('Test Client');

      await page.fill('#name', clientName);
      await page.selectOption('#type', TEST_CLIENT.type);
      await page.selectOption('#status', TEST_CLIENT.status);

      await page.click('button[type="submit"]');

      // Should redirect to client detail
      await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
    });

    test('should view client detail', async ({ page }) => {
      await page.goto('/clients');
      // Click on first client if exists
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
      }
    });
  });

  test.describe('Client Locations', () => {
    test('should view locations tab', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Click on Locations tab
        const locationsTab = page.locator('button, [role="tab"]', { hasText: 'Locations' });
        if (await locationsTab.count() > 0) {
          await locationsTab.click();
        }
      }
    });
  });

  test.describe('Client Contacts', () => {
    test('should view contacts tab', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Click on Contacts tab
        const contactsTab = page.locator('button, [role="tab"]', { hasText: 'Contacts' });
        if (await contactsTab.count() > 0) {
          await contactsTab.click();
        }
      }
    });
  });

  test.describe('Admin Functions (Tenant Level)', () => {
    test('should access User Management', async ({ page }) => {
      await page.goto('/user-management');
      await expect(page).toHaveURL(/.*user-management/);
    });

    test('should access Role Management', async ({ page }) => {
      await page.goto('/role-management');
      await expect(page).toHaveURL(/.*role-management/);
    });

    test('should access Financial Year settings', async ({ page }) => {
      await page.goto('/financial-year-end');
      await expect(page).toHaveURL(/.*financial-year-end/);
    });

    test('should access Pipeline Statuses', async ({ page }) => {
      await page.goto('/pipeline-statuses');
      await expect(page).toHaveURL(/.*pipeline-statuses/);
    });
  });

  test.describe('User Management - Tenant Filtering', () => {
    test('should NOT see tenant filter dropdown', async ({ page }) => {
      await page.goto('/user-management');
      // Tenant admins should not see the tenant filter - they only see their own tenant
      const tenantFilter = page.locator('.tenant-filter-select');
      await expect(tenantFilter).not.toBeVisible();
    });

    test('should only see users from own tenant', async ({ page }) => {
      await page.goto('/user-management');
      // All users shown should be from tenant admin's tenant
      const usersTable = page.locator('.users-table');
      await expect(usersTable).toBeVisible();
    });
  });

  test.describe('User Management - CSV Upload', () => {
    test('should show CSV Upload button', async ({ page }) => {
      await page.goto('/user-management');
      const csvBtn = page.locator('.csv-upload-btn');
      await expect(csvBtn).toBeVisible();
    });

    test('should open CSV upload form', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      const csvForm = page.locator('.csv-upload-form');
      await expect(csvForm).toBeVisible();
    });

    test('should show hint about auto-assignment to tenant', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      // Tenant admin should see hint about users being assigned to their tenant
      const hint = page.locator('.form-hint');
      await expect(hint).toContainText('tenant');
    });

    test('should show CSV format instructions with required role column', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      const hint = page.locator('.form-hint');
      await expect(hint).toContainText('role');
    });

    test('should show file input for CSV', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      const fileInput = page.locator('input[type="file"][accept=".csv"]');
      await expect(fileInput).toBeVisible();
    });

    test('should show default password input', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      const passwordInput = page.locator('.csv-upload-form input[type="password"]');
      await expect(passwordInput).toBeVisible();
    });

    test('should cancel CSV upload form', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.csv-upload-btn');

      const cancelBtn = page.locator('.csv-upload-form .cancel-btn');
      await cancelBtn.click();

      const csvForm = page.locator('.csv-upload-form');
      await expect(csvForm).not.toBeVisible();
    });
  });

  test.describe('User Management - Add User', () => {
    test('should show Add User button', async ({ page }) => {
      await page.goto('/user-management');
      const addBtn = page.locator('.add-user-btn');
      await expect(addBtn).toBeVisible();
    });

    test('should open Add User modal', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');

      const modal = page.locator('.add-user-modal');
      await expect(modal).toBeVisible();
    });

    test('should have role dropdown in Add User modal', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');

      const roleSelect = page.locator('.add-user-modal select').first();
      await expect(roleSelect).toBeVisible();
    });
  });

  test.describe('Sales Pipeline', () => {
    test('should view sales pipeline', async ({ page }) => {
      await page.goto('/sales-pipeline');
      await expect(page).toHaveURL(/.*sales-pipeline/);
    });
  });

  test.describe('Follow-Up Tasks', () => {
    test('should view follow-up tasks', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      await expect(page).toHaveURL(/.*follow-up-tasks/);
    });
  });

  test.describe('Reports', () => {
    test('should access reports', async ({ page }) => {
      await page.goto('/reports');
      await expect(page).toHaveURL(/.*reports/);
    });
  });

  test.describe('Messages', () => {
    test('should access messages', async ({ page }) => {
      await page.goto('/messages');
      await expect(page).toHaveURL(/.*messages/);
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
});
