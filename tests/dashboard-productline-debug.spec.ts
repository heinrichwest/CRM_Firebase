import { test, expect } from '@playwright/test';

/**
 * Debug test for Dashboard product line matching
 */
test.describe('Dashboard Product Line Debug', () => {
  test('debug product line values from uploaded data', async ({ page }) => {
    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log('Browser:', msg.type(), text);
    });

    // Login as salesperson1@test.com
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'salesperson1@test.com');
    await page.fill('#password', 'Speccon1379!');
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Navigate to financial dashboard to see product lines
    await page.goto('/financial-dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/financial-dashboard-products.png', fullPage: true });

    // Click on "By Product" view if available
    const byProductBtn = page.locator('button, [role="tab"]', { hasText: /by.*product/i });
    if (await byProductBtn.count() > 0) {
      await byProductBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/financial-dashboard-by-product.png', fullPage: true });
    }

    // Check the product lines in the table
    const productTable = page.locator('.data-table').first();
    if (await productTable.count() > 0) {
      const rows = productTable.locator('tbody tr');
      const rowCount = await rows.count();
      console.log('\n=== Product Lines in Financial Dashboard ===');
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const cells = await row.locator('td, th').all();
        const cellTexts = await Promise.all(cells.map(c => c.textContent()));
        console.log(`Row ${i}: ${cellTexts.join(' | ')}`);
      }
    }
  });
});
