import { test, expect } from '@playwright/test';

/**
 * Debug test for Dashboard budget display
 */
test.describe('Dashboard Budget Debug', () => {
  test('debug dashboard financial performance budget values', async ({ page }) => {
    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      // Print relevant logs
      if (text.includes('Dashboard') ||
          text.includes('Financial') ||
          text.includes('budget') ||
          text.includes('Budget') ||
          text.includes('getFinancialData') ||
          text.includes('ytdActual')) {
        console.log('Browser:', msg.type(), text);
      }
    });

    // Login as salesperson1@test.com
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'salesperson1@test.com');
    await page.fill('#password', 'Speccon1379!');
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Wait for dashboard to load
    await page.waitForTimeout(5000);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'tests/screenshots/dashboard-budget.png', fullPage: true });

    // Check the "My Financial Performance" table
    const financialTable = page.locator('.financial-dashboard table, .financial-table table').first();
    if (await financialTable.count() > 0) {
      // Get header row
      const headerText = await page.locator('.financial-dashboard thead tr, .financial-table thead tr').first().textContent();
      console.log('Financial Table Headers:', headerText);

      // Get all rows
      const rows = page.locator('.financial-dashboard tbody tr, .financial-table tbody tr');
      const rowCount = await rows.count();
      console.log('Financial Table Row Count:', rowCount);

      // Log each row
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const cells = await row.locator('td').all();
        const cellTexts = await Promise.all(cells.map(c => c.textContent()));
        console.log(`Row ${i}:`, cellTexts.join(' | '));
      }
    }

    // Print all console logs that mention budget
    console.log('\n=== Budget-related console logs ===');
    consoleLogs.filter(log =>
      log.toLowerCase().includes('budget') ||
      log.includes('aggregatedFinancials') ||
      log.includes('myBudgets')
    ).forEach(log => console.log(log));

    // Now navigate to Financial Dashboard and compare
    await page.goto('/dashboard/financial');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Take screenshot of financial dashboard
    await page.screenshot({ path: 'tests/screenshots/financial-dashboard-budget.png', fullPage: true });

    console.log('\n=== All relevant console logs ===');
    consoleLogs.filter(log =>
      log.includes('Financial') ||
      log.includes('Dashboard') ||
      log.includes('budget') ||
      log.includes('Budget')
    ).forEach(log => console.log(log));
  });
});
