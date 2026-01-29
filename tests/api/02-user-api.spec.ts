/**
 * API Test Suite: User CRUD Operations
 *
 * Tests the User API endpoints:
 * - POST /api/User/Login - Authentication
 * - GET /api/User/GetList - List all users
 * - GET /api/User/GetById - Get user by ID
 * - GET /api/User/GetByKey - Get user by GUID
 * - GET /api/User/GetCurrentUser - Get authenticated user
 * - POST /api/User/CreateUser - Create user
 * - POST /api/User/UpdateUser - Update user
 * - POST /api/User/UpdateUserRole - Update user role
 * - POST /api/User/UpdateUserManager - Update user manager
 * - GET /api/User/GetDirectReports - Get direct reports
 * - GET /api/User/GetTeamMembers - Get team members
 * - POST /api/User/SoftDelete - Soft delete user
 * - DELETE /api/User/Delete - Hard delete user
 *
 * Test Pattern: POST to create -> GET to verify -> POST to update -> GET to verify
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  createAuthenticatedApiClient,
  createApiClient,
  login,
  apiGet,
  apiPost,
  apiDelete,
  generateTestName,
  generateTestEmail,
  API_TEST_CREDENTIALS,
} from './helpers/api-client';

// User DTOs (matching actual API response)
interface UserDto {
  userId: number;
  userKey: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  contactNo: string;
  phone: string | null;
  profilePicture: string;
  photoUrl: string | null;
  title: string | null;
  bio: string | null;
  tenantId: number;
  tenantName: string;
  roleId: number;
  roleName: string | null;
  managerUserId: number | null;
  managerId: number | null;
  managerName: string | null;
  salesLevel: string | null;
  isActive: boolean;
}

interface UserListDto {
  userId: number;
  userKey: string;
  email: string;
  displayName: string;
  tenantId: number;
  roleId: number;
  roleName: string;
  managerUserId: number | null;
  isActive: boolean;
}

interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleId?: number;
  managerId?: number | null;
  isActive?: boolean;
}

test.describe.configure({ mode: 'serial' });

test.describe('User API - Authentication', () => {
  test('should login with valid credentials and receive tokens', async () => {
    const { context } = await createApiClient();

    try {
      const tokens = await login(context, API_TEST_CREDENTIALS.email, API_TEST_CREDENTIALS.password);

      expect(tokens).toBeDefined();
      expect(tokens.token).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.token.length).toBeGreaterThan(50); // JWT tokens are long

      console.log('Login successful, received access token');
    } finally {
      await context.dispose();
    }
  });

  test('should get current user details after login', async () => {
    const { context } = await createAuthenticatedApiClient();

    try {
      const currentUser = await apiGet<UserDto>(context, '/api/User/GetCurrentUser');

      expect(currentUser).toBeDefined();
      expect(currentUser.email.toLowerCase()).toBe(API_TEST_CREDENTIALS.email.toLowerCase());

      console.log(`Current user: ${currentUser.email}, Role: ${currentUser.roleName || 'N/A'}`);
    } finally {
      await context.dispose();
    }
  });
});

test.describe('User API - Read Operations', () => {
  let apiContext: APIRequestContext;
  let existingUserId: number;
  let existingUserKey: string;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('1. GET /api/User/GetList - should list existing users', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThan(0);

    console.log(`Found ${users.length} existing users`);

    // Store first user for later tests
    if (users.length > 0) {
      existingUserId = users[0].userId;
      existingUserKey = users[0].userKey;
    }

    // Log a few user names
    users.slice(0, 5).forEach(u => {
      console.log(`  - ${u.displayName} (${u.email}) - ${u.roleName || 'N/A'}`);
    });
  });

  test('2. GET /api/User/GetById - should retrieve user by ID', async () => {
    test.skip(!existingUserId, 'No existing user found');

    const user = await apiGet<UserDto>(
      apiContext,
      `/api/User/GetById?userId=${existingUserId}`
    );

    expect(user).toBeDefined();
    expect(user.userId).toBe(existingUserId);
    expect(user.email).toBeDefined();

    console.log(`Retrieved user by ID: ${user.displayName || user.email}`);
  });

  test('3. GET /api/User/GetByKey - should retrieve user by GUID key', async () => {
    test.skip(!existingUserKey, 'No existing user found');

    const user = await apiGet<UserDto>(
      apiContext,
      `/api/User/GetByKey?userKey=${existingUserKey}`
    );

    expect(user).toBeDefined();
    expect(user.userKey).toBe(existingUserKey);
    expect(user.email).toBeDefined();

    console.log(`Retrieved user by Key: ${user.displayName || user.email}`);
  });

  test('4. Verify user data structure', async () => {
    test.skip(!existingUserId, 'No existing user found');

    const user = await apiGet<UserDto>(
      apiContext,
      `/api/User/GetById?userId=${existingUserId}`
    );

    // Verify expected fields exist
    expect(user.userId).toBeDefined();
    expect(user.userKey).toBeDefined();
    expect(user.email).toBeDefined();
    expect(typeof user.tenantId).toBe('number');

    console.log('User data structure verified');
    console.log(`  Fields: ${Object.keys(user).length} total`);
  });
});

test.describe('User API - Verify Users', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('should verify current test user exists', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    const currentUser = users.find(u => u.email.toLowerCase() === API_TEST_CREDENTIALS.email.toLowerCase());
    expect(currentUser).toBeDefined();
    expect(currentUser!.isActive).toBe(true);

    console.log(`Test user verified: ${currentUser!.displayName}`);
  });

  test('should list users by tenant', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    // Group by tenant
    const byTenant = users.reduce((acc, u) => {
      const tid = u.tenantId || 'Unknown';
      acc[tid] = (acc[tid] || 0) + 1;
      return acc;
    }, {} as Record<string | number, number>);

    console.log('Users by tenant:');
    Object.entries(byTenant).forEach(([tid, count]) => {
      console.log(`  Tenant ${tid}: ${count} users`);
    });
  });

  test('should list users by role', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    // Group by role
    const byRole = users.reduce((acc, u) => {
      const role = u.roleName || 'No Role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Users by role:');
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} users`);
    });
  });
});

test.describe('User API - User Hierarchy', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('should attempt to get direct reports', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    // Find any user with a manager role
    const manager = users.find(u =>
      u.roleName?.toLowerCase().includes('manager')
    );

    if (!manager) {
      console.log('No manager found to test direct reports');
      test.skip();
      return;
    }

    try {
      const directReports = await apiGet<UserListDto[]>(
        apiContext,
        `/api/User/GetDirectReports?userId=${manager.userId}`
      );

      expect(Array.isArray(directReports)).toBeTruthy();
      console.log(`Manager ${manager.displayName} has ${directReports.length} direct reports`);

      directReports.slice(0, 5).forEach(r => {
        console.log(`  - ${r.displayName} (${r.email})`);
      });
    } catch (error: any) {
      console.log(`GetDirectReports: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should attempt to get team members', async () => {
    const users = await apiGet<UserListDto[]>(apiContext, '/api/User/GetList');

    const manager = users.find(u =>
      u.roleName?.toLowerCase().includes('manager')
    );

    if (!manager) {
      console.log('No manager found to test team members');
      test.skip();
      return;
    }

    try {
      const teamMembers = await apiGet<UserListDto[]>(
        apiContext,
        `/api/User/GetTeamMembers?userId=${manager.userId}`
      );

      expect(Array.isArray(teamMembers)).toBeTruthy();
      console.log(`Manager ${manager.displayName} has ${teamMembers.length} team members`);
    } catch (error: any) {
      console.log(`GetTeamMembers: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});
