import { test, expect } from '@playwright/test';

/**
 * Debug test for ClientFinancialEditor prior year and YTD display
 */
test.describe('ClientFinancialEditor Debug', () => {
  test('should display prior year and YTD data in editor', async ({ page }) => {
    // Login as salesperson1@test.com
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'salesperson1@test.com');
    await page.fill('#password', 'Speccon1379!');
    await page.click('button:has-text("Login with Email")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Navigate to clients
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find first client and click on it
    const clientLink = page.locator('tbody tr td a').first();
    if (await clientLink.count() > 0) {
      await clientLink.click();
      await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
      await page.waitForTimeout(2000);

      // Take screenshot of client detail page
      await page.screenshot({ path: 'tests/screenshots/client-detail.png', fullPage: true });

      // Click on Forecast tab
      const forecastTab = page.locator('button, [role="tab"]', { hasText: 'Forecast' });
      if (await forecastTab.count() > 0) {
        await forecastTab.click();
        await page.waitForTimeout(2000);

        // Take screenshot of forecast tab
        await page.screenshot({ path: 'tests/screenshots/client-forecast-tab.png', fullPage: true });
      }

      // Click Edit Forecast button
      const editForecastBtn = page.locator('button', { hasText: 'Edit Forecast' });
      if (await editForecastBtn.count() > 0) {
        await editForecastBtn.click();
        await page.waitForURL(/.*forecast/);
        await page.waitForTimeout(3000);

        // Take screenshot of ClientFinancialEditor
        await page.screenshot({ path: 'tests/screenshots/client-financial-editor.png', fullPage: true });

        // Check console for debug logs
        page.on('console', msg => {
          console.log('Browser console:', msg.type(), msg.text());
        });

        // Wait a bit more for data to load
        await page.waitForTimeout(2000);

        // Take another screenshot after waiting
        await page.screenshot({ path: 'tests/screenshots/client-financial-editor-loaded.png', fullPage: true });

        // Check for history columns (FY years)
        const historyHeaders = page.locator('th', { hasText: /FY\s*\d{4}/ });
        const headerCount = await historyHeaders.count();
        console.log('History column headers found:', headerCount);

        // Check for YTD Actual column
        const ytdHeader = page.locator('th', { hasText: 'YTD Actual' });
        const ytdHeaderCount = await ytdHeader.count();
        console.log('YTD Actual headers found:', ytdHeaderCount);

        // Check if any data is visible in the table
        const tableRows = page.locator('tbody tr');
        const rowCount = await tableRows.count();
        console.log('Table rows found:', rowCount);

        // Check for R0 values (indicates no data)
        const zeroValues = page.locator('td', { hasText: 'R 0' });
        const zeroCount = await zeroValues.count();
        console.log('R 0 values found:', zeroCount);

        // Verify something is visible
        await expect(page.locator('.client-financial-editor, .financial-editor')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should load uploaded financial data from accountant uploads', async ({ page }) => {
    // Enable console log capture
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ClientFinancialEditor') || text.includes('getFinancialData') || text.includes('uploadedClientTotals')) {
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

    // Go directly to forecast editor for first client
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find first client's view link
    const viewLink = page.locator('a', { hasText: 'View' }).first();
    if (await viewLink.count() > 0) {
      await viewLink.click();
      await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);
      await page.waitForTimeout(1000);

      // Get client ID from URL
      const url = page.url();
      const clientId = url.split('/clients/')[1];
      console.log('Client ID:', clientId);

      // Navigate to forecast page
      await page.goto(`/forecast?client=${clientId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(5000);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/forecast-page-direct.png', fullPage: true });

      // Check the history data cells
      const historyCells = page.locator('tbody tr:first-child td');
      const cellCount = await historyCells.count();
      console.log('Cells in first row:', cellCount);

      // Get text from first few cells
      for (let i = 0; i < Math.min(cellCount, 6); i++) {
        const cellText = await historyCells.nth(i).textContent();
        console.log(`Cell ${i}:`, cellText);
      }
    }
  });
});
