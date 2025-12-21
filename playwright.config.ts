import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Run sequentially for auth tests
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1, // Single worker for sequential execution
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'], // Also show results in console
  ],
  /* Test timeout */
  timeout: 60000,
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',

    /* Browser launch options */
    launchOptions: {
      slowMo: 100, // Slow down actions by 100ms for visibility
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // E2E Test Suite - Run in order
    {
      name: 'e2e-setup',
      testMatch: /e2e\/01-tenant-setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e-users',
      testMatch: /e2e\/02-user-hierarchy-setup\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-setup'],
    },
    {
      name: 'e2e-clients',
      testMatch: /e2e\/03-client-creation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-users'],
    },
    {
      name: 'e2e-forecasts',
      testMatch: /e2e\/04-forecast-calculations\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-clients'],
    },
    {
      name: 'e2e-visibility',
      testMatch: /e2e\/05-portfolio-visibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-forecasts'],
    },
    {
      name: 'e2e-tenant-isolation',
      testMatch: /e2e\/06-tenant-isolation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-clients'],
    },
    {
      name: 'e2e-manager-isolation',
      testMatch: /e2e\/07-manager-isolation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['e2e-clients'],
    },

    // Regular feature tests - can run independently
    {
      name: 'chromium',
      testIgnore: /e2e\//,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /e2e\//,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /e2e\//,
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
