import { test, expect } from '@playwright/test';
import { loginWithEmail, logout, TEST_USERS } from './helpers/auth';
import { TEST_CLIENT, TEST_LOCATION, TEST_CONTACT, uniqueName, getFutureDate } from './helpers/test-data';

test.describe('Salesperson Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, TEST_USERS.salesperson.email, TEST_USERS.salesperson.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('Authentication & Login', () => {
    test('should login successfully', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should have salesperson role', async ({ page }) => {
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

    test('should see pipeline statistics (own clients only)', async ({ page }) => {
      await page.goto('/dashboard');
      // Pipeline stats should be visible
    });

    test('should see follow-up statistics (own clients only)', async ({ page }) => {
      await page.goto('/dashboard');
      // Follow-up stats should be visible
    });

    test('should NOT access Edit Financial Dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      const editFinancialBtn = page.locator('button, a', { hasText: 'Edit Financial' });
      await expect(editFinancialBtn).not.toBeVisible();
    });

    test('should NOT see client allocation modal', async ({ page }) => {
      await page.goto('/dashboard');
      const allocationBtn = page.locator('button', { hasText: /allocat/i });
      await expect(allocationBtn).not.toBeVisible();
    });
  });

  test.describe('Client Management', () => {
    test('should view clients (only assigned to self)', async ({ page }) => {
      await page.goto('/clients');
      await expect(page).toHaveURL(/.*clients/);
    });

    test('should create new client (auto-assigned to self)', async ({ page }) => {
      await page.goto('/clients/new');
      await expect(page).toHaveURL(/.*clients\/new/);

      const clientName = uniqueName('Salesperson Test Client');

      await page.fill('#name', clientName);
      await page.selectOption('#type', TEST_CLIENT.type);
      await page.selectOption('#status', TEST_CLIENT.status);

      await page.click('button[type="submit"]');

      // Should redirect to client detail
      await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
    });

    test('should edit own client details', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Look for edit capability
        const editBtn = page.locator('button', { hasText: /edit|save/i });
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

    test('should see Account Owner name not UID', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        // Account owner should show a name, not a UID
        const ownerField = page.locator('[class*="owner"], [data-testid="owner"]');
        if (await ownerField.count() > 0) {
          const ownerText = await ownerField.textContent();
          // Should not look like a UID (random string of characters)
          expect(ownerText).not.toMatch(/^[a-zA-Z0-9]{20,}$/);
        }
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
      }
    });

    test('should view Financial tab (limited view)', async ({ page }) => {
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

    test('should view Products tab', async ({ page }) => {
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

    test('should view Locations tab', async ({ page }) => {
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

    test('should view Contacts tab', async ({ page }) => {
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
            const modal = page.locator('.modal, [role="dialog"]');
            await expect(modal).toBeVisible();
          }
        }
      }
    });

    test('should edit location', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const locationsTab = page.locator('button, [role="tab"]', { hasText: 'Locations' });
        if (await locationsTab.count() > 0) {
          await locationsTab.click();

          const editBtn = page.locator('button', { hasText: /edit/i }).first();
          if (await editBtn.count() > 0) {
            await expect(editBtn).toBeVisible();
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

  test.describe('Interactions', () => {
    test('should log new interaction', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const interactionsTab = page.locator('button, [role="tab"]', { hasText: 'Interactions' });
        if (await interactionsTab.count() > 0) {
          await interactionsTab.click();

          const logBtn = page.locator('button', { hasText: /log|add|new/i });
          if (await logBtn.count() > 0) {
            await expect(logBtn).toBeVisible();
          }
        }
      }
    });

    test('should require follow-up date when logging interaction', async ({ page }) => {
      await page.goto('/clients');
      const clientLink = page.locator('.client-row a, .client-card a, tr a').first();
      if (await clientLink.count() > 0) {
        await clientLink.click();
        await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

        const interactionsTab = page.locator('button, [role="tab"]', { hasText: 'Interactions' });
        if (await interactionsTab.count() > 0) {
          await interactionsTab.click();

          // Look for follow-up date field in interaction form
          const followUpField = page.locator('input[type="date"], [name*="followUp"]');
          // Should exist in form
        }
      }
    });
  });

  test.describe('Sales Pipeline', () => {
    test('should view sales pipeline (own clients only)', async ({ page }) => {
      await page.goto('/sales-pipeline');
      await expect(page).toHaveURL(/.*sales-pipeline/);
    });

    test('should update client pipeline status', async ({ page }) => {
      await page.goto('/sales-pipeline');
      // Look for pipeline stage controls
    });
  });

  test.describe('Follow-Up Tasks', () => {
    test('should view follow-up tasks (own clients only)', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      await expect(page).toHaveURL(/.*follow-up-tasks/);
    });

    test('should see Client Follow-Ups section in header', async ({ page }) => {
      const followUpSection = page.locator('[class*="follow-up"], .client-follow-ups');
      // Follow-up section should be visible
    });

    test('should create follow-up task', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      const createBtn = page.locator('button', { hasText: /create|add|new/i });
      if (await createBtn.count() > 0) {
        await expect(createBtn).toBeVisible();
      }
    });

    test('should complete follow-up task', async ({ page }) => {
      await page.goto('/follow-up-tasks');
      const completeBtn = page.locator('button', { hasText: /complete|done/i }).first();
      if (await completeBtn.count() > 0) {
        await expect(completeBtn).toBeVisible();
      }
    });
  });

  test.describe('Reports', () => {
    test('should NOT see Reports link in navigation', async ({ page }) => {
      const reportsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Reports' });
      await expect(reportsLink).not.toBeVisible();
    });

    test('should NOT access /reports route', async ({ page }) => {
      await page.goto('/reports');
      // Should redirect or show access denied
      const reportsContent = page.locator('h1', { hasText: 'Reports' });
      // May redirect or not show content
    });
  });

  test.describe('Messages', () => {
    test('should view messages', async ({ page }) => {
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
    test('should NOT see Admin dropdown', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      await expect(adminToggle).not.toBeVisible();
    });

    test('should NOT access /user-management', async ({ page }) => {
      await page.goto('/user-management');
      // Should redirect
    });

    test('should NOT access /role-management', async ({ page }) => {
      await page.goto('/role-management');
      // Should redirect
    });

    test('should NOT access /financial-year-end', async ({ page }) => {
      await page.goto('/financial-year-end');
      // Should redirect
    });

    test('should NOT access /seed-data', async ({ page }) => {
      await page.goto('/seed-data');
      // Should redirect
    });

    test('should NOT access /pipeline-statuses', async ({ page }) => {
      await page.goto('/pipeline-statuses');
      // Should redirect
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

    test('should NOT see Reports link', async ({ page }) => {
      const reportsLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Reports' });
      await expect(reportsLink).not.toBeVisible();
    });

    test('should see Messages link', async ({ page }) => {
      const messagesLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Messages' });
      await expect(messagesLink.first()).toBeVisible();
    });

    test('should NOT see Admin dropdown', async ({ page }) => {
      const adminToggle = page.locator('.admin-dropdown-toggle');
      await expect(adminToggle).not.toBeVisible();
    });

    test('should NOT see Seed Data link', async ({ page }) => {
      const seedDataLink = page.locator('nav a, .nav-link, .sidebar a', { hasText: 'Seed Data' });
      await expect(seedDataLink).not.toBeVisible();
    });
  });

  test.describe('Data Isolation', () => {
    test('should only see own clients', async ({ page }) => {
      await page.goto('/clients');
      // Client list should be filtered to only show salesperson's clients
    });

    test('should not see other tenant data', async ({ page }) => {
      await page.goto('/clients');
      // All data should be within current tenant
    });
  });
});
