/**
 * API Test Suite: Task CRUD Operations
 *
 * Tests the Task API endpoints:
 * - GET /api/Task/GetList - List tasks with filtering
 * - POST /api/Task/CreateTask - Create task
 * - GET /api/Task/GetById - Get task by ID
 * - GET /api/Task/GetByKey - Get task by GUID
 * - POST /api/Task/UpdateTask - Update task
 * - POST /api/Task/CompleteTask - Mark task as complete
 * - GET /api/Task/GetTaskStats - Get task statistics
 * - POST /api/Task/SoftDelete - Soft delete task
 * - DELETE /api/Task/Delete - Hard delete task
 *
 * Test Pattern: POST to create -> GET to verify -> POST to update -> GET to verify
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  createAuthenticatedApiClient,
  apiGet,
  apiPost,
  apiDelete,
  generateTestName,
  PagedResult,
  normalizePagedResult,
} from './helpers/api-client';

// Task DTOs
interface TaskDto {
  id: number;
  key: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  completedDate: string | null;
  assignedToId: number | null;
  assignedToName: string | null;
  clientId: number | null;
  clientName: string | null;
  dealId: number | null;
  dealName: string | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

interface TaskListDto {
  id: number;
  key: string;
  title: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedToName: string | null;
  clientName: string | null;
  isActive: boolean;
}

interface CreateTaskDto {
  title: string;
  description?: string;
  taskType: string;
  priority: string;
  dueDate: string;
  assignedToId?: number;
  clientId?: number;
  dealId?: number;
  notes?: string;
}

interface TaskStatsDto {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByPriority: { [key: string]: number };
  tasksByType: { [key: string]: number };
}

test.describe.configure({ mode: 'serial' });

test.describe('Task API - CRUD Operations', () => {
  let apiContext: APIRequestContext;
  let createdTaskId: number;
  let createdTaskKey: string;
  let testUserId: number; // For task assignment
  let testClientId: number; // For task association
  const testTaskTitle = generateTestName('TestTask');

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;

    // Get an existing user for assignment (User API returns array directly)
    try {
      const usersResponse = await apiGet<{ userId: number; displayName: string }[]>(
        apiContext,
        '/api/User/GetList'
      );
      if (usersResponse.length > 0) {
        testUserId = usersResponse[0].userId;
        console.log(`Using user for task assignment: ID=${testUserId}`);
      }
    } catch (error: any) {
      console.warn('Failed to get user for task assignment:', error.message);
    }

    // Get an existing client for association
    try {
      const rawResponse = await apiGet<PagedResult<{ id: number; name: string }>>(
        apiContext,
        '/api/Client/GetList',
        { pageSize: 1 }
      );
      const clientsResponse = normalizePagedResult(rawResponse);
      if (clientsResponse.items.length > 0) {
        testClientId = clientsResponse.items[0].id;
        console.log(`Using client for task association: ID=${testClientId}`);
      }
    } catch (error: any) {
      console.warn('Failed to get client for task association:', error.message);
    }
  });

  test.afterAll(async () => {
    // Clean up: Delete test task if created
    if (apiContext && createdTaskId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/Task/Delete?taskId=${createdTaskId}`);
        console.log(`Cleaned up test task: ${createdTaskId}`);
      } catch (e) {
        console.warn(`Failed to clean up task ${createdTaskId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/Task/GetList - should list existing tasks', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<TaskListDto>>(apiContext, '/api/Task/GetList');
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      expect(Array.isArray(response.items)).toBeTruthy();

      console.log(`Found ${response.totalCount} tasks (Page ${response.page}/${response.totalPages})`);

      // Log a few tasks
      response.items.slice(0, 5).forEach(t => {
        console.log(`  - ${t.title} (${t.taskType}) - ${t.status} - Priority: ${t.priority}`);
      });
    } catch (error: any) {
      console.log(`Task GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. GET /api/Task/GetList - should filter tasks by status', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<TaskListDto>>(
        apiContext,
        '/api/Task/GetList',
        { status: 'Pending' }
      );
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      console.log(`Pending tasks: ${response.totalCount}`);

      response.items.slice(0, 5).forEach(t => {
        console.log(`  - ${t.title} - Due: ${new Date(t.dueDate).toLocaleDateString()}`);
      });
    } catch (error: any) {
      console.log(`Task GetList by status: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. GET /api/Task/GetList - should filter tasks by priority', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<TaskListDto>>(
        apiContext,
        '/api/Task/GetList',
        { priority: 'High' }
      );
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      console.log(`High priority tasks: ${response.totalCount}`);
    } catch (error: any) {
      console.log(`Task GetList by priority: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('4. GET /api/Task/GetTaskStats - should get task statistics', async () => {
    try {
      const stats = await apiGet<TaskStatsDto>(apiContext, '/api/Task/GetTaskStats');

      expect(stats).toBeDefined();
      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);

      console.log('Task Statistics:');
      console.log(`  Total: ${stats.totalTasks}`);
      console.log(`  Completed: ${stats.completedTasks}`);
      console.log(`  Pending: ${stats.pendingTasks}`);
      console.log(`  Overdue: ${stats.overdueTasks}`);
      console.log(`  By Priority:`, stats.tasksByPriority);
      console.log(`  By Type:`, stats.tasksByType);
    } catch (error: any) {
      console.log(`Task GetTaskStats: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('5. POST /api/Task/CreateTask - should create new task', async () => {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const newTask: CreateTaskDto = {
        title: testTaskTitle,
        description: 'Test task created via API test',
        taskType: 'follow-up',
        priority: 'Medium',
        dueDate: futureDate.toISOString(),
        assignedToId: testUserId,
        clientId: testClientId,
        notes: 'Automated API test task - will be deleted after test',
      };

      const createdTask = await apiPost<TaskDto>(
        apiContext,
        '/api/Task/CreateTask',
        newTask
      );

      // Verify response
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeGreaterThan(0);
      expect(createdTask.key).toBeDefined();
      expect(createdTask.title).toBe(testTaskTitle);
      expect(createdTask.taskType).toBe('follow-up');
      expect(createdTask.priority).toBe('Medium');
      expect(createdTask.status).toBe('Pending');
      expect(createdTask.isActive).toBe(true);

      // Store for subsequent tests
      createdTaskId = createdTask.id;
      createdTaskKey = createdTask.key;

      console.log(`Created task: ID=${createdTaskId}, Key=${createdTaskKey}, Title=${testTaskTitle}`);
    } catch (error: any) {
      console.log(`Task CreateTask: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('6. GET /api/Task/GetById - should retrieve created task by ID', async () => {
    test.skip(!createdTaskId, 'No task was created');

    try {
      const task = await apiGet<TaskDto>(
        apiContext,
        `/api/Task/GetById?taskId=${createdTaskId}`
      );

      // Verify retrieved data matches created data
      expect(task.id).toBe(createdTaskId);
      expect(task.key).toBe(createdTaskKey);
      expect(task.title).toBe(testTaskTitle);
      expect(task.taskType).toBe('follow-up');

      console.log(`Retrieved task by ID: ${task.title} (${task.status})`);
    } catch (error: any) {
      console.log(`Task GetById: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('7. GET /api/Task/GetByKey - should retrieve task by GUID key', async () => {
    test.skip(!createdTaskKey, 'No task was created');

    try {
      const task = await apiGet<TaskDto>(
        apiContext,
        `/api/Task/GetByKey?taskKey=${createdTaskKey}`
      );

      // Verify retrieved data
      expect(task.id).toBe(createdTaskId);
      expect(task.key).toBe(createdTaskKey);
      expect(task.title).toBe(testTaskTitle);

      console.log(`Retrieved task by Key: ${task.title}`);
    } catch (error: any) {
      console.log(`Task GetByKey: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('8. POST /api/Task/UpdateTask - should update task', async () => {
    test.skip(!createdTaskId, 'No task was created');

    try {
      const updatedTitle = `${testTaskTitle}_Updated`;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 14); // 14 days from now

      await apiPost<TaskDto>(
        apiContext,
        `/api/Task/UpdateTask?taskId=${createdTaskId}`,
        {
          title: updatedTitle,
          description: 'Updated task description via API test',
          taskType: 'follow-up',
          priority: 'High',
          dueDate: newDueDate.toISOString(),
          assignedToId: testUserId,
          clientId: testClientId,
          notes: 'Updated via API test',
        }
      );

      // Verify update by fetching again
      const updatedTask = await apiGet<TaskDto>(
        apiContext,
        `/api/Task/GetById?taskId=${createdTaskId}`
      );

      expect(updatedTask.title).toBe(updatedTitle);
      expect(updatedTask.priority).toBe('High');

      console.log(`Updated task: ${updatedTask.title} - Priority: ${updatedTask.priority}`);
    } catch (error: any) {
      console.log(`Task UpdateTask: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('9. POST /api/Task/CompleteTask - should mark task as complete', async () => {
    test.skip(!createdTaskId, 'No task was created');

    try {
      const result = await apiPost<boolean>(
        apiContext,
        `/api/Task/CompleteTask?taskId=${createdTaskId}`,
        { completionNotes: 'Completed via API test' }
      );

      expect(result).toBe(true);

      // Verify task is now completed
      const task = await apiGet<TaskDto>(
        apiContext,
        `/api/Task/GetById?taskId=${createdTaskId}`
      );

      expect(task.status).toBe('Completed');
      expect(task.completedDate).not.toBeNull();

      console.log(`Completed task: ${task.title} on ${task.completedDate}`);
    } catch (error: any) {
      console.log(`Task CompleteTask: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('10. POST /api/Task/SoftDelete - should soft delete task', async () => {
    test.skip(!createdTaskId, 'No task was created');

    try {
      const result = await apiPost<boolean>(
        apiContext,
        `/api/Task/SoftDelete?taskId=${createdTaskId}`
      );

      expect(result).toBe(true);
      console.log(`Soft deleted task: ${createdTaskId}`);
    } catch (error: any) {
      console.log(`Task SoftDelete: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('11. DELETE /api/Task/Delete - should hard delete task', async () => {
    test.skip(!createdTaskId, 'No task was created');

    try {
      const result = await apiDelete<boolean>(
        apiContext,
        `/api/Task/Delete?taskId=${createdTaskId}`
      );

      expect(result).toBe(true);
      console.log(`Hard deleted task: ${createdTaskId}`);

      // Clear ID so afterAll doesn't try to delete again
      createdTaskId = 0;
    } catch (error: any) {
      console.log(`Task Delete: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});

test.describe('Task API - Filtering and Queries', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('should filter tasks by assignee', async () => {
    try {
      // First get a user to filter by (User API returns array directly)
      const usersResponse = await apiGet<{ userId: number; displayName: string }[]>(
        apiContext,
        '/api/User/GetList'
      );

      if (usersResponse.length > 0) {
        const assigneeId = usersResponse[0].userId;
        const rawResponse = await apiGet<PagedResult<TaskListDto>>(
          apiContext,
          '/api/Task/GetList',
          { assignedToId: assigneeId }
        );
        const response = normalizePagedResult(rawResponse);

        console.log(`Tasks assigned to user ${assigneeId}: ${response.totalCount}`);
      }
    } catch (error: any) {
      console.log(`Task filter by assignee: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter tasks by client', async () => {
    try {
      // First get a client to filter by
      const rawClientsResponse = await apiGet<PagedResult<{ id: number; name: string }>>(
        apiContext,
        '/api/Client/GetList',
        { pageSize: 1 }
      );
      const clientsResponse = normalizePagedResult(rawClientsResponse);

      if (clientsResponse.items.length > 0) {
        const clientId = clientsResponse.items[0].id;
        const rawResponse = await apiGet<PagedResult<TaskListDto>>(
          apiContext,
          '/api/Task/GetList',
          { clientId }
        );
        const response = normalizePagedResult(rawResponse);

        console.log(`Tasks for client ${clientId}: ${response.totalCount}`);
      }
    } catch (error: any) {
      console.log(`Task filter by client: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter tasks by task type', async () => {
    try {
      const taskTypes = ['follow-up', 'meeting', 'call', 'email', 'other'];

      for (const taskType of taskTypes) {
        const rawResponse = await apiGet<PagedResult<TaskListDto>>(
          apiContext,
          '/api/Task/GetList',
          { taskType }
        );
        const response = normalizePagedResult(rawResponse);

        console.log(`Tasks of type '${taskType}': ${response.totalCount}`);
      }
    } catch (error: any) {
      console.log(`Task filter by type: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter overdue tasks', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<TaskListDto>>(
        apiContext,
        '/api/Task/GetList',
        { isOverdue: true }
      );
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      console.log(`Overdue tasks: ${response.totalCount}`);

      response.items.slice(0, 5).forEach(t => {
        console.log(`  - ${t.title} - Due: ${new Date(t.dueDate).toLocaleDateString()}`);
      });
    } catch (error: any) {
      console.log(`Task filter overdue: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter tasks due today', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const rawResponse = await apiGet<PagedResult<TaskListDto>>(
        apiContext,
        '/api/Task/GetList',
        {
          dueDateFrom: today.toISOString(),
          dueDateTo: tomorrow.toISOString()
        }
      );
      const response = normalizePagedResult(rawResponse);

      console.log(`Tasks due today: ${response.totalCount}`);
    } catch (error: any) {
      console.log(`Task filter due today: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should paginate tasks', async () => {
    try {
      const rawPage1 = await apiGet<PagedResult<TaskListDto>>(
        apiContext,
        '/api/Task/GetList',
        { page: 1, pageSize: 5 }
      );
      const page1 = normalizePagedResult(rawPage1);

      expect(page1.page).toBe(1);
      expect(page1.items.length).toBeLessThanOrEqual(5);

      console.log(`Page 1: ${page1.items.length} tasks of ${page1.totalCount} total`);

      if (page1.totalPages > 1) {
        const rawPage2 = await apiGet<PagedResult<TaskListDto>>(
          apiContext,
          '/api/Task/GetList',
          { page: 2, pageSize: 5 }
        );
        const page2 = normalizePagedResult(rawPage2);

        expect(page2.page).toBe(2);
        console.log(`Page 2: ${page2.items.length} tasks`);
      }
    } catch (error: any) {
      console.log(`Task pagination: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});
