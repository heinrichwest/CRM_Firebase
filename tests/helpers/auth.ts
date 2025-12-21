import { Page, expect } from '@playwright/test';

// Test user credentials - all using "Speccon1379!" password for testing
export const TEST_USERS = {
  systemAdmin: {
    email: 'admin@speccon.co.za',
    password: 'Speccon1379!',
    role: 'admin',
    isSystemAdmin: true,
  },
  tenantAdmin: {
    email: 'tenant-admin@test.com',
    password: 'Speccon1379!',
    role: 'admin',
    isSystemAdmin: false,
  },
  manager: {
    email: 'manager@test.com',
    password: 'Speccon1379!',
    role: 'manager',
    isSystemAdmin: false,
  },
  salesperson: {
    email: 'salesperson@test.com',
    password: 'Speccon1379!',
    role: 'salesperson',
    isSystemAdmin: false,
  },
  accountant: {
    email: 'accountant@test.com',
    password: 'Speccon1379!',
    role: 'accountant',
    isSystemAdmin: false,
  },
};

/**
 * Login with email and password
 * This is the shared login helper used across all E2E tests
 */
export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto('/login');

  // Wait for login form to be visible (avoid networkidle which hangs on WebSocket)
  await page.waitForSelector('#email', { timeout: 10000 });

  // Fill in email
  await page.fill('#email', email);

  // Fill in password
  await page.fill('#password', password);

  // Click login button (use text selector for reliability)
  await page.click('button:has-text("Login with Email")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

/**
 * Alias for loginWithEmail for backward compatibility
 */
export async function loginAs(page: Page, email: string, password: string) {
  return loginWithEmail(page, email, password);
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  await page.click('.logout-btn');
  await page.waitForURL('**/login');
  await expect(page).toHaveURL(/.*login/);
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if navigation link exists
 */
export async function hasNavLink(page: Page, linkText: string): Promise<boolean> {
  const link = page.locator('.top-nav a', { hasText: linkText });
  return await link.count() > 0;
}

/**
 * Check if admin dropdown item exists
 */
export async function hasAdminDropdownItem(page: Page, itemText: string): Promise<boolean> {
  // Open admin dropdown
  const adminToggle = page.locator('.admin-dropdown-toggle');
  if (await adminToggle.count() > 0) {
    await adminToggle.click();
    const item = page.locator('.admin-dropdown-menu a', { hasText: itemText });
    const exists = await item.count() > 0;
    // Close dropdown by clicking elsewhere
    await page.click('.brand-title');
    return exists;
  }
  return false;
}

/**
 * Navigate to a page and verify
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  // Avoid networkidle as it hangs on WebSocket connections
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Wait for page to be fully loaded
 * Note: Avoid using networkidle as it hangs on WebSocket connections (Team Chat)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Additional wait for React to render
  await page.waitForTimeout(500);
}
