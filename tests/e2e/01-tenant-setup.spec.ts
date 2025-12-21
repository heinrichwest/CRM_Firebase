/**
 * E2E Test Suite: Tenant Setup
 *
 * This test suite verifies the test tenants that will be used for all subsequent tests.
 * Must run first before other E2E tests.
 *
 * Existing Tenants (already in database):
 * - Speccon
 * - Abebe
 * - Megro
 */

import { test, expect } from '@playwright/test';
import { TEST_TENANTS, SYSTEM_ADMIN } from '../helpers/comprehensive-test-data';

// Use serial mode - tests must run in order
test.describe.configure({ mode: 'serial' });

/**
 * Helper function to login as system admin
 */
async function loginAsSystemAdmin(page: any) {
  await page.goto('/login');

  // Wait for login form to be visible (avoid networkidle which hangs on WebSocket)
  await page.waitForSelector('#email', { timeout: 10000 });

  // Fill in credentials
  await page.fill('#email', SYSTEM_ADMIN.email);
  await page.fill('#password', SYSTEM_ADMIN.password);

  // Click login button
  await page.click('button:has-text("Login with Email")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Tenant Setup', () => {
  test('should login as system admin', async ({ page }) => {
    await loginAsSystemAdmin(page);
    await expect(page).toHaveURL(/.*dashboard/);
    console.log('Login successful - on dashboard');
  });

  test('should access tenant management page', async ({ page }) => {
    await loginAsSystemAdmin(page);

    await page.goto('/tenants');
    await expect(page).toHaveURL(/.*tenants/);

    // Wait for tenant management heading to be visible
    await page.waitForSelector('h1:has-text("Tenant Management")', { timeout: 15000 });

    // Verify tenant management heading
    const heading = page.locator('h1:has-text("Tenant Management")');
    await expect(heading).toBeVisible();
    console.log('Tenant management page accessible');
  });

  test('should verify Speccon tenant exists', async ({ page }) => {
    await loginAsSystemAdmin(page);
    await page.goto('/tenants');

    // Wait for tenants to load
    await page.waitForSelector('h3:has-text("Speccon")', { timeout: 15000 });

    // Check if Speccon tenant exists
    const specconTenant = page.locator('h3:has-text("Speccon")');
    await expect(specconTenant).toBeVisible();
    console.log('Speccon tenant exists');
  });

  test('should verify Abebe tenant exists', async ({ page }) => {
    await loginAsSystemAdmin(page);
    await page.goto('/tenants');

    // Wait for tenants to load
    await page.waitForSelector('h3:has-text("Abebe")', { timeout: 15000 });

    // Check if Abebe tenant exists
    const abebeTenant = page.locator('h3:has-text("Abebe")');
    await expect(abebeTenant).toBeVisible();
    console.log('Abebe tenant exists');
  });

  test('should verify Megro tenant exists', async ({ page }) => {
    await loginAsSystemAdmin(page);
    await page.goto('/tenants');

    // Wait for tenants to load
    await page.waitForSelector('h3:has-text("Megro")', { timeout: 15000 });

    // Check if Megro tenant exists
    const megroTenant = page.locator('h3:has-text("Megro")');
    await expect(megroTenant).toBeVisible();
    console.log('Megro tenant exists');
  });

  test('should verify all three tenants exist', async ({ page }) => {
    await loginAsSystemAdmin(page);
    await page.goto('/tenants');

    // Wait for heading with count
    await page.waitForSelector('h2:has-text("Tenants")', { timeout: 15000 });

    // Verify all tenants are visible
    const specconTenant = page.locator('h3:has-text("Speccon")');
    const abebeTenant = page.locator('h3:has-text("Abebe")');
    const megroTenant = page.locator('h3:has-text("Megro")');

    await expect(specconTenant).toBeVisible();
    await expect(abebeTenant).toBeVisible();
    await expect(megroTenant).toBeVisible();

    console.log('All three tenants verified: Speccon, Abebe, Megro');
  });
});
