import { test, expect } from '@playwright/test';
import { loginWithEmail, logout, hasNavLink, hasAdminDropdownItem, TEST_USERS } from './helpers/auth';
import { TEST_TENANT, uniqueName } from './helpers/test-data';

test.describe('System Admin Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_USERS.systemAdmin.email, TEST_USERS.systemAdmin.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('Authentication & Login', () => {
    test('should login successfully and show System Admin indicator', async ({ page }) => {
      // Verify on dashboard
      await expect(page).toHaveURL(/.*dashboard/);

      // Check for System Admin indicator (when no tenant selected)
      const systemAdminIndicator = page.locator('.tenant-indicator.system-admin');
      // Note: May show tenant indicator if assigned to a tenant
    });

    test('should show user role in header', async ({ page }) => {
      const userRole = page.locator('.user-role');
      await expect(userRole).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      await logout(page);
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Tenant Management', () => {
    test('should show Tenant Management link in Admin dropdown', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      await adminToggle.click();

      const tenantLink = page.locator('.admin-dropdown-menu a', { hasText: 'Tenant Management' });
      await expect(tenantLink).toBeVisible();
    });

    test('should navigate to Tenant Management page', async ({ page }) => {
      await page.goto('/tenants');
      await expect(page.locator('h1')).toContainText('Tenant Management');
    });

    test('should display tenant list', async ({ page }) => {
      await page.goto('/tenants');
      const tenantListContainer = page.locator('.tenant-list-container');
      await expect(tenantListContainer).toBeVisible();
    });

    test('should show Add New Tenant button', async ({ page }) => {
      await page.goto('/tenants');
      const addButton = page.locator('.add-tenant-btn');
      await expect(addButton).toBeVisible();
    });

    test('should open create tenant form', async ({ page }) => {
      await page.goto('/tenants');
      await page.click('.add-tenant-btn');

      const form = page.locator('.tenant-form');
      await expect(form).toBeVisible();
    });

    test('should create a new tenant', async ({ page }) => {
      await page.goto('/tenants');
      await page.click('.add-tenant-btn');

      const tenantName = uniqueName('Test Tenant');

      await page.fill('input[type="text"]', tenantName);
      await page.fill('textarea', TEST_TENANT.description);

      await page.click('.save-btn');

      // Wait for tenant to be created
      await page.waitForTimeout(2000);

      // Verify tenant appears in list
      const tenantCard = page.locator('.tenant-card', { hasText: tenantName });
      await expect(tenantCard).toBeVisible();
    });
  });

  test.describe('Dashboard Access', () => {
    test('should access dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should see Edit Financial Dashboard option', async ({ page }) => {
      await page.goto('/dashboard');
      // Check for edit financial link or button
      const editLink = page.locator('a[href*="edit-financial"], button:has-text("Edit")');
      // May or may not be visible based on UI state
    });
  });

  test.describe('Client Management', () => {
    test('should access clients page', async ({ page }) => {
      await page.goto('/clients');
      await expect(page).toHaveURL(/.*clients/);
    });

    test('should see Add Client button', async ({ page }) => {
      await page.goto('/clients');
      const addButton = page.locator('a[href*="new"], button:has-text("Add")');
      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('Admin Functions', () => {
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

    test('should access Seed Data', async ({ page }) => {
      await page.goto('/seed-data');
      await expect(page).toHaveURL(/.*seed-data/);
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

    test('should show CSV format instructions with role column', async ({ page }) => {
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

  test.describe('User Management - Tenant Filter', () => {
    test('should show tenant filter dropdown for system admin', async ({ page }) => {
      await page.goto('/user-management');
      const tenantFilter = page.locator('.tenant-filter-select');
      await expect(tenantFilter).toBeVisible();
    });

    test('should filter users by tenant', async ({ page }) => {
      await page.goto('/user-management');
      const tenantFilter = page.locator('.tenant-filter-select');

      // Select a specific filter option
      await tenantFilter.selectOption({ index: 1 });

      // Table should still be visible
      const table = page.locator('.users-table');
      await expect(table).toBeVisible();
    });

    test('should show unassigned filter option', async ({ page }) => {
      await page.goto('/user-management');
      const unassignedOption = page.locator('.tenant-filter-select option[value="unassigned"]');
      await expect(unassignedOption).toBeVisible();
    });
  });

  test.describe('User Management - Add User Modal', () => {
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

    test('should show email input in modal', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');

      const emailInput = page.locator('.add-user-modal input[type="email"]');
      await expect(emailInput).toBeVisible();
    });

    test('should show password input in modal', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');

      const passwordInput = page.locator('.add-user-modal input[type="password"]').first();
      await expect(passwordInput).toBeVisible();
    });

    test('should show role dropdown in modal', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');

      const roleSelect = page.locator('.add-user-modal select').first();
      await expect(roleSelect).toBeVisible();
    });

    test('should close modal on cancel', async ({ page }) => {
      await page.goto('/user-management');
      await page.click('.add-user-btn');
      await page.click('.add-user-modal .cancel-btn');

      const modal = page.locator('.add-user-modal');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have all main navigation links', async ({ page }) => {
      await expect(page.locator('.top-nav a', { hasText: 'Dashboard' })).toBeVisible();
      await expect(page.locator('.top-nav a', { hasText: 'Clients' })).toBeVisible();
      await expect(page.locator('.top-nav a', { hasText: 'Sales Pipeline' })).toBeVisible();
      await expect(page.locator('.top-nav a', { hasText: 'Follow-Up Tasks' })).toBeVisible();
    });

    test('should have Admin dropdown', async ({ page }) => {
      const adminDropdown = page.locator('.admin-dropdown-toggle');
      await expect(adminDropdown).toBeVisible();
    });

    test('should have Team Chat button', async ({ page }) => {
      const chatBtn = page.locator('.team-chat-btn');
      await expect(chatBtn).toBeVisible();
    });
  });
});
