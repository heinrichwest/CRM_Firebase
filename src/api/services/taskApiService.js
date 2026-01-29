/**
 * Task API Service
 *
 * Provides all follow-up task related API operations.
 * Mirrors the interface from firestoreService.js for easy migration.
 */

import { apiClient } from '../config/apiClient'
import { TASK_ENDPOINTS, buildUrl, buildPaginationParams } from '../config/endpoints'
import { unwrapResponse, unwrapPagedResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const TASK_DATE_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'completedAt']

/**
 * Normalize a task entity from API response
 */
const normalizeTask = (task) => {
  if (!task) return null
  const normalized = normalizeEntity(task)
  return normalizeDates(normalized, TASK_DATE_FIELDS)
}

/**
 * Get follow-up tasks with optional filters
 * @param {Object} filters - Filter options (userId, status, clientId)
 * @returns {Promise<Array>} Array of tasks
 */
export const getFollowUpTasks = async (filters = {}) => {
  try {
    const params = {}

    if (filters.userId) {
      params.assignedTo = filters.userId
    }
    if (filters.status) {
      params.status = filters.status
    }
    if (filters.clientId) {
      params.clientId = filters.clientId
    }

    const url = buildUrl(TASK_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const tasks = unwrapResponse(response)

    // Sort by dueDate ascending (matching Firebase behavior)
    const normalized = normalizeEntities(tasks).map(normalizeTask)
    return normalized.sort((a, b) => {
      const dateA = a.dueDate || new Date('9999-12-31')
      const dateB = b.dueDate || new Date('9999-12-31')
      return dateA - dateB
    })
  } catch (error) {
    console.error('Error getting follow-up tasks:', error)
    throw error
  }
}

/**
 * Get tasks with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { data: Task[], pagination: {...} }
 */
export const getTasksPaginated = async (options = {}) => {
  try {
    const { page = 1, pageSize = 25, filters = {}, sortBy = 'dueDate', sortOrder = 'asc' } = options

    const params = {
      ...buildPaginationParams(page, pageSize, sortBy, sortOrder),
      ...filters
    }

    const url = buildUrl(TASK_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const result = unwrapPagedResponse(response)

    return {
      data: result.data.map(normalizeTask),
      pagination: result.pagination
    }
  } catch (error) {
    console.error('Error getting tasks paginated:', error)
    throw error
  }
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null
 */
export const getFollowUpTask = async (taskId) => {
  try {
    const response = await apiClient.get(TASK_ENDPOINTS.GET(taskId))
    const task = unwrapResponse(response)
    return normalizeTask(task)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting task:', error)
    throw error
  }
}

/**
 * Get tasks for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export const getTasksByUser = async (userId) => {
  try {
    const response = await apiClient.get(TASK_ENDPOINTS.BY_USER(userId))
    const tasks = unwrapResponse(response)
    return normalizeEntities(tasks).map(normalizeTask)
  } catch (error) {
    console.error('Error getting tasks by user:', error)
    return []
  }
}

/**
 * Get tasks for a specific client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Array of tasks
 */
export const getTasksByClient = async (clientId) => {
  try {
    const response = await apiClient.get(TASK_ENDPOINTS.BY_CLIENT(clientId))
    const tasks = unwrapResponse(response)
    return normalizeEntities(tasks).map(normalizeTask)
  } catch (error) {
    console.error('Error getting tasks by client:', error)
    return []
  }
}

/**
 * Get overdue tasks
 * @returns {Promise<Array>} Array of overdue tasks
 */
export const getOverdueTasks = async () => {
  try {
    const response = await apiClient.get(TASK_ENDPOINTS.OVERDUE)
    const tasks = unwrapResponse(response)
    return normalizeEntities(tasks).map(normalizeTask)
  } catch (error) {
    console.error('Error getting overdue tasks:', error)
    return []
  }
}

/**
 * Get upcoming tasks (due within next 7 days)
 * @returns {Promise<Array>} Array of upcoming tasks
 */
export const getUpcomingTasks = async () => {
  try {
    const response = await apiClient.get(TASK_ENDPOINTS.UPCOMING)
    const tasks = unwrapResponse(response)
    return normalizeEntities(tasks).map(normalizeTask)
  } catch (error) {
    console.error('Error getting upcoming tasks:', error)
    return []
  }
}

/**
 * Create a new follow-up task
 * @param {Object} taskData - Task data
 * @returns {Promise<string>} New task ID
 */
export const createFollowUpTask = async (taskData) => {
  try {
    const payload = serializeDates({
      ...taskData,
      status: taskData.status || 'pending'
    }, TASK_DATE_FIELDS)

    const response = await apiClient.post(TASK_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating follow-up task:', error)
    throw error
  }
}

/**
 * Update a follow-up task
 * @param {string} taskId - Task ID
 * @param {Object} taskData - Fields to update
 * @returns {Promise<void>}
 */
export const updateFollowUpTask = async (taskId, taskData) => {
  try {
    const payload = serializeDates({ ...taskData }, TASK_DATE_FIELDS)
    const response = await apiClient.put(TASK_ENDPOINTS.UPDATE(taskId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating follow-up task:', error)
    throw error
  }
}

/**
 * Delete a follow-up task
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
export const deleteFollowUpTask = async (taskId) => {
  try {
    const response = await apiClient.delete(TASK_ENDPOINTS.DELETE(taskId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting follow-up task:', error)
    throw error
  }
}

/**
 * Complete a follow-up task
 * @param {string} taskId - Task ID
 * @param {string} notes - Completion notes
 * @returns {Promise<void>}
 */
export const completeFollowUpTask = async (taskId, notes = '') => {
  try {
    const response = await apiClient.put(TASK_ENDPOINTS.COMPLETE(taskId), {
      notes,
      completedAt: new Date().toISOString()
    })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error completing follow-up task:', error)
    throw error
  }
}

/**
 * Reschedule a task to a new date
 * @param {string} taskId - Task ID
 * @param {Date|string} newDueDate - New due date
 * @param {string} reason - Reason for rescheduling
 * @returns {Promise<void>}
 */
export const rescheduleTask = async (taskId, newDueDate, reason = '') => {
  try {
    const dueDate = newDueDate instanceof Date ? newDueDate.toISOString() : newDueDate

    await updateFollowUpTask(taskId, {
      dueDate,
      rescheduleReason: reason,
      rescheduledAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error rescheduling task:', error)
    throw error
  }
}

/**
 * Get task summary/statistics
 * @param {string} userId - Optional user ID to filter
 * @returns {Promise<Object>} Task statistics
 */
export const getTaskStats = async (userId = null) => {
  try {
    const params = userId ? { userId } : {}
    const url = buildUrl('/api/Task/Stats', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting task stats:', error)
    return {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0
    }
  }
}
