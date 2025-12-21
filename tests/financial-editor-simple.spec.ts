import { test, expect } from '@playwright/test';

/**
 * Simple test for ClientFinancialEditor debug
 */
test.describe('ClientFinancialEditor Simple Debug', () => {
  test('debug uploaded data and client ID matching', async ({ page }) => {
    // Capture ALL console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      // Also print to test output
      if (text.includes('ClientFinancialEditor') ||
          text.includes('getFinancialData') ||
          text.includes('mismatch') ||
          text.includes('uploadedClientTotals')) {
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

    // Go to the correct route for financial editor
    await page.goto('/dashboard/edit-financial');
    await page.waitForLoadState('domcontentloaded');

    // Wait for data to load
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/financial-editor.png', fullPage: true });

    // Print all collected console logs
    console.log('\n=== All relevant console logs ===');
    consoleLogs.filter(log =>
      log.includes('ClientFinancialEditor') ||
      log.includes('getFinancialData') ||
      log.includes('mismatch') ||
      log.includes('uploadedClientTotals')
    ).forEach(log => console.log(log));

    // Check for the history columns
    const table = page.locator('table').first();
    if (await table.count() > 0) {
      // Get header row text
      const headerText = await page.locator('thead tr').first().textContent();
      console.log('Table headers:', headerText);

      // Get first data row cells
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.count() > 0) {
        const cells = await firstRow.locator('td').all();
        console.log('First row cell count:', cells.length);
        for (let i = 0; i < Math.min(cells.length, 8); i++) {
          const cellText = await cells[i].textContent();
          console.log(`Cell ${i}: "${cellText}"`);
        }
      }
    }
  });
});
