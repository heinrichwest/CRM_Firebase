/**
 * Test data constants for Playwright tests
 */

export const TEST_CLIENT = {
  name: 'Test Client Company',
  legalName: 'Test Client (Pty) Ltd',
  type: 'Corporate',
  status: 'Prospect',
  industry: 'Technology',
  country: 'South Africa',
  primaryContact: 'John Doe',
  contactEmail: 'john@testclient.com',
  phone: '+27 11 123 4567',
};

export const TEST_LOCATION = {
  name: 'Head Office',
  address: '123 Test Street, Sandton, 2196',
  type: 'Head Office',
};

export const TEST_CONTACT = {
  name: 'Jane Smith',
  email: 'jane@testclient.com',
  phone: '+27 82 123 4567',
  role: 'HR Manager',
};

export const TEST_INTERACTION = {
  type: 'call',
  notes: 'Test interaction - discussed requirements',
  followUpDate: getFutureDate(7),
  followUpReason: 'Send proposal',
};

export const TEST_TENANT = {
  name: 'Test Tenant',
  description: 'A test tenant for automated testing',
  currencySymbol: 'R',
  financialYearStart: 'March',
  financialYearEnd: 'February',
};

/**
 * CSV Upload test data
 * Format: email,displayName,password,role
 * - email: Required
 * - displayName: Optional (uses email prefix if not provided)
 * - password: Optional (uses default if not provided)
 * - role: Required (e.g., 'salesperson', 'admin', 'manager')
 */
export const TEST_CSV_DATA = {
  validCsv: `email,displayName,password,role
test1@example.com,Test User 1,Speccon,salesperson
test2@example.com,Test User 2,Speccon,manager
test3@example.com,Test User 3,,salesperson`,
  validCsvNoHeader: `test1@example.com,Test User 1,Speccon,salesperson
test2@example.com,Test User 2,Speccon,manager`,
  invalidEmail: `email,displayName,password,role
invalid-email,Test User,Speccon,salesperson`,
  missingRole: `email,displayName,password,role
test@example.com,Test User,Speccon,`,
  invalidRole: `email,displayName,password,role
test@example.com,Test User,Speccon,invalidrole`,
  shortPassword: `email,displayName,password,role
test@example.com,Test User,123,salesperson`,
};

export const TEST_USER = {
  email: 'newuser@test.com',
  displayName: 'New Test User',
  password: 'Speccon',
  role: 'salesperson',
};

/**
 * Get a date in the future
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate unique test name
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}
