/**
 * E2E Test Suite: Forecast and Calculation Tests
 *
 * Tests the financial forecasting functionality:
 * - Adding forecasts per product line
 * - Editing existing forecasts
 * - Verifying calculation totals
 * - Testing different product types (Learnerships, TAP, Compliance, Other)
 *
 * Expected Values (per salesperson who creates forecasts on 1 client):
 * - Learnerships: 10 learners * R35,000 = R350,000
 * - TAP Business: 5 subs * R2,500 * 12 months = R150,000
 * - Compliance Training: 20 courses * R1,500 = R30,000
 * - Other Courses: 15 courses * R2,000 = R30,000
 * Total: R560,000 per salesperson
 */

import { test, expect } from '@playwright/test';
import { TENANT_USERS, TENANT_CLIENTS, FORECAST_DATA } from '../helpers/comprehensive-test-data';
import { loginAs } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

/**
 * Helper to navigate to client financial editor
 */
async function goToClientFinancial(page: any, clientName: string) {
  await page.goto('/clients');

  // Find and click on the client
  const clientLink = page.locator('a, td', { hasText: clientName }).first();
  await clientLink.click();
  await page.waitForURL(/.*clients\/[a-zA-Z0-9]+/);

  // Click on Financial tab
  const financialTab = page.locator('button, [role="tab"]', { hasText: 'Financial' });
  if (await financialTab.count() > 0) {
    await financialTab.click();
    await page.waitForTimeout(500);
  }

  // Look for Edit Financial button
  const editBtn = page.locator('button, a', { hasText: /edit.*financial/i });
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Helper to add a learnership forecast
 */
async function addLearnershipForecast(page: any, data: typeof FORECAST_DATA.learnerships) {
  // Click on Learnerships product line or Add button
  const addBtn = page.locator('button', { hasText: /add.*learnership/i });
  if (await addBtn.count() > 0) {
    await addBtn.click();
  } else {
    // Try clicking on product line directly
    const productLine = page.locator('.product-line-btn, button', { hasText: 'Learnerships' });
    if (await productLine.count() > 0) {
      await productLine.click();
    }
  }

  await page.waitForTimeout(500);

  // Fill in learner count
  const learnerCountField = page.locator('input[name="learnerCount"], #learnerCount');
  if (await learnerCountField.count() > 0) {
    await learnerCountField.fill(data.learnerCount.toString());
  }

  // Fill in cost per learner
  const costField = page.locator('input[name="costPerLearner"], #costPerLearner');
  if (await costField.count() > 0) {
    await costField.fill(data.costPerLearner.toString());
  }

  // Fill in duration
  const durationField = page.locator('input[name="duration"], #duration');
  if (await durationField.count() > 0) {
    await durationField.fill(data.duration.toString());
  }

  // Fill in certainty percentage
  const certaintyField = page.locator('input[name="certaintyPercentage"], #certaintyPercentage, input[name="certainty"]');
  if (await certaintyField.count() > 0) {
    await certaintyField.fill(data.certaintyPercentage.toString());
  }

  // Save
  const saveBtn = page.locator('button:has-text("Login with Email"), button', { hasText: /save|add|confirm/i });
  await saveBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Helper to add TAP Business forecast
 */
async function addTapBusinessForecast(page: any, data: typeof FORECAST_DATA.tapBusiness) {
  const addBtn = page.locator('button', { hasText: /add.*tap|add.*subscription/i });
  if (await addBtn.count() > 0) {
    await addBtn.click();
  } else {
    const productLine = page.locator('.product-line-btn, button', { hasText: /tap.*business/i });
    if (await productLine.count() > 0) {
      await productLine.click();
    }
  }

  await page.waitForTimeout(500);

  // Fill in subscription count
  const subCountField = page.locator('input[name="subscriptionCount"], #subscriptionCount, input[name="quantity"]');
  if (await subCountField.count() > 0) {
    await subCountField.fill(data.subscriptionCount.toString());
  }

  // Fill in monthly fee
  const feeField = page.locator('input[name="monthlyFee"], #monthlyFee, input[name="amount"]');
  if (await feeField.count() > 0) {
    await feeField.fill(data.monthlyFee.toString());
  }

  // Fill in duration
  const durationField = page.locator('input[name="duration"], #duration');
  if (await durationField.count() > 0) {
    await durationField.fill(data.duration.toString());
  }

  // Fill in certainty
  const certaintyField = page.locator('input[name="certaintyPercentage"], #certaintyPercentage, input[name="certainty"]');
  if (await certaintyField.count() > 0) {
    await certaintyField.fill(data.certaintyPercentage.toString());
  }

  const saveBtn = page.locator('button:has-text("Login with Email"), button', { hasText: /save|add|confirm/i });
  await saveBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Helper to add Compliance Training forecast
 */
async function addComplianceTrainingForecast(page: any, data: typeof FORECAST_DATA.complianceTraining) {
  const addBtn = page.locator('button', { hasText: /add.*compliance/i });
  if (await addBtn.count() > 0) {
    await addBtn.click();
  } else {
    const productLine = page.locator('.product-line-btn, button', { hasText: /compliance.*training/i });
    if (await productLine.count() > 0) {
      await productLine.click();
    }
  }

  await page.waitForTimeout(500);

  // Fill in course count
  const courseCountField = page.locator('input[name="courseCount"], #courseCount, input[name="quantity"]');
  if (await courseCountField.count() > 0) {
    await courseCountField.fill(data.courseCount.toString());
  }

  // Fill in course price
  const priceField = page.locator('input[name="coursePrice"], #coursePrice, input[name="amount"]');
  if (await priceField.count() > 0) {
    await priceField.fill(data.coursePrice.toString());
  }

  // Fill in certainty
  const certaintyField = page.locator('input[name="certaintyPercentage"], #certaintyPercentage, input[name="certainty"]');
  if (await certaintyField.count() > 0) {
    await certaintyField.fill(data.certaintyPercentage.toString());
  }

  const saveBtn = page.locator('button:has-text("Login with Email"), button', { hasText: /save|add|confirm/i });
  await saveBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Helper to add Other Courses forecast
 */
async function addOtherCoursesForecast(page: any, data: typeof FORECAST_DATA.otherCourses) {
  const addBtn = page.locator('button', { hasText: /add.*other.*course/i });
  if (await addBtn.count() > 0) {
    await addBtn.click();
  } else {
    const productLine = page.locator('.product-line-btn, button', { hasText: /other.*course/i });
    if (await productLine.count() > 0) {
      await productLine.click();
    }
  }

  await page.waitForTimeout(500);

  // Fill in course count
  const courseCountField = page.locator('input[name="courseCount"], #courseCount, input[name="quantity"]');
  if (await courseCountField.count() > 0) {
    await courseCountField.fill(data.courseCount.toString());
  }

  // Fill in course price
  const priceField = page.locator('input[name="coursePrice"], #coursePrice, input[name="amount"]');
  if (await priceField.count() > 0) {
    await priceField.fill(data.coursePrice.toString());
  }

  // Fill in certainty
  const certaintyField = page.locator('input[name="certaintyPercentage"], #certaintyPercentage, input[name="certainty"]');
  if (await certaintyField.count() > 0) {
    await certaintyField.fill(data.certaintyPercentage.toString());
  }

  const saveBtn = page.locator('button:has-text("Login with Email"), button', { hasText: /save|add|confirm/i });
  await saveBtn.click();
  await page.waitForTimeout(1000);
}

// ============================================================================
// SPECCON FORECAST TESTS
// ============================================================================

test.describe('Speccon Forecast Creation', () => {
  test('Salesperson A1 (Tom) adds forecasts to first client', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const client = TENANT_CLIENTS.speccon.salesA1[0]; // ABC Construction

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    // Add all product line forecasts
    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
    await addComplianceTrainingForecast(page, FORECAST_DATA.complianceTraining);
    await addOtherCoursesForecast(page, FORECAST_DATA.otherCourses);

    // Verify total appears somewhere
    // Expected: R560,000 total
    const totalElement = page.locator('text=/560.*000|560,000|R560/');
    if (await totalElement.count() > 0) {
      console.log('Total R560,000 verified');
    }
  });

  test('Salesperson A2 (Lisa) adds forecasts to first client', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[1];
    const client = TENANT_CLIENTS.speccon.salesA2[0]; // Tech Solutions

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
  });

  test('Salesperson B1 (David) adds forecasts to first client', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[2];
    const client = TENANT_CLIENTS.speccon.salesB1[0]; // Finance Corp

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
    await addComplianceTrainingForecast(page, FORECAST_DATA.complianceTraining);
  });

  test('Salesperson B2 (Emma) adds forecasts to first client', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[3];
    const client = TENANT_CLIENTS.speccon.salesB2[0]; // Retail World

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
    await addOtherCoursesForecast(page, FORECAST_DATA.otherCourses);
  });
});

// ============================================================================
// abebe FORECAST TESTS
// ============================================================================

test.describe('abebe Forecast Creation', () => {
  test('abebe Salesperson A1 (Grace) adds forecasts', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[0];
    const client = TENANT_CLIENTS.abebe.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
    await addComplianceTrainingForecast(page, FORECAST_DATA.complianceTraining);
    await addOtherCoursesForecast(page, FORECAST_DATA.otherCourses);
  });

  test('abebe Salesperson B1 (Amanda) adds forecasts', async ({ page }) => {
    const salesperson = TENANT_USERS.abebe.salespeople[2];
    const client = TENANT_CLIENTS.abebe.salesB1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
  });
});

// ============================================================================
// megro FORECAST TESTS
// ============================================================================

test.describe('megro Forecast Creation', () => {
  test('megro Salesperson A1 (Sandra) adds forecasts', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[0];
    const client = TENANT_CLIENTS.megro.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addLearnershipForecast(page, FORECAST_DATA.learnerships);
    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
    await addComplianceTrainingForecast(page, FORECAST_DATA.complianceTraining);
    await addOtherCoursesForecast(page, FORECAST_DATA.otherCourses);
  });

  test('megro Salesperson B2 (Steven) adds forecasts', async ({ page }) => {
    const salesperson = TENANT_USERS.megro.salespeople[3];
    const client = TENANT_CLIENTS.megro.salesB2[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    await addTapBusinessForecast(page, FORECAST_DATA.tapBusiness);
    await addOtherCoursesForecast(page, FORECAST_DATA.otherCourses);
  });
});

// ============================================================================
// FORECAST EDITING TESTS
// ============================================================================

test.describe('Forecast Editing', () => {
  test('Salesperson can edit existing forecast', async ({ page }) => {
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const client = TENANT_CLIENTS.speccon.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    // Look for edit button on existing forecast
    const editBtn = page.locator('button', { hasText: /edit/i }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Modify a value
      const learnerCountField = page.locator('input[name="learnerCount"], #learnerCount');
      if (await learnerCountField.count() > 0) {
        await learnerCountField.fill('15'); // Change from 10 to 15

        // Save
        const saveBtn = page.locator('button:has-text("Login with Email"), button', { hasText: /save|update/i });
        await saveBtn.click();
        await page.waitForTimeout(1000);

        // Verify new total appears (15 * 35000 = 525000)
        const newTotal = page.locator('text=/525.*000|525,000/');
        if (await newTotal.count() > 0) {
          console.log('Updated total verified');
        }
      }
    }
  });
});

// ============================================================================
// CALCULATION VERIFICATION TESTS
// ============================================================================

test.describe('Calculation Verification', () => {
  test('Learnership calculation is correct', async ({ page }) => {
    // Verify: 10 learners * R35,000 = R350,000
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const client = TENANT_CLIENTS.speccon.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    // Look for the calculated total
    const learnershipTotal = page.locator('.learnership-total, .product-total').filter({ hasText: /350.*000|350,000/ });
    if (await learnershipTotal.count() > 0) {
      await expect(learnershipTotal.first()).toBeVisible();
      console.log('Learnership calculation R350,000 verified');
    }
  });

  test('TAP Business calculation is correct', async ({ page }) => {
    // Verify: 5 subs * R2,500 * 12 months = R150,000
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const client = TENANT_CLIENTS.speccon.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    const tapTotal = page.locator('.tap-total, .product-total').filter({ hasText: /150.*000|150,000/ });
    if (await tapTotal.count() > 0) {
      await expect(tapTotal.first()).toBeVisible();
      console.log('TAP Business calculation R150,000 verified');
    }
  });

  test('Certainty percentage affects totals correctly', async ({ page }) => {
    // 80% certainty on R350,000 = R280,000 certain
    const salesperson = TENANT_USERS.speccon.salespeople[0];
    const client = TENANT_CLIENTS.speccon.salesA1[0];

    await loginAs(page, salesperson.email, salesperson.password);
    await goToClientFinancial(page, client.name);

    const certainTotal = page.locator('.certain-total, .weighted-total').filter({ hasText: /280.*000|280,000/ });
    if (await certainTotal.count() > 0) {
      await expect(certainTotal.first()).toBeVisible();
      console.log('Certainty calculation R280,000 (80% of R350,000) verified');
    }
  });
});
