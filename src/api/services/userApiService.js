/**
 * User API Service
 *
 * Provides user management API operations.
 * Note: Authentication is handled by authService.js
 * This service handles user data operations (CRUD, hierarchy, etc.)
 */

import { apiClient } from '../config/apiClient'
import { USER_ENDPOINTS, TENANT_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse, unwrapPagedResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const USER_DATE_FIELDS = ['createdAt', 'updatedAt', 'lastLogin', 'passwordChangedAt']

/**
 * Normalize a user entity from API response
 */
const normalizeUser = (user) => {
  if (!user) return null
  const normalized = normalizeEntity(user)
  return normalizeDates(normalized, USER_DATE_FIELDS)
}

/**
 * Get all users
 * @param {Object} filters - Filter options (tenantId, role, etc.)
 * @returns {Promise<Array>} Array of users
 */
export const getUsers = async (filters = {}) => {
  try {
    const url = buildUrl('/api/User/List', filters)
    const response = await apiClient.get(url)
    const users = unwrapResponse(response)
    return normalizeEntities(users).map(normalizeUser)
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
}

/**
 * Get users for a specific tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of users
 */
export const getUsersByTenant = async (tenantId) => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.USERS(tenantId))
    const users = unwrapResponse(response)
    return normalizeEntities(users).map(normalizeUser)
  } catch (error) {
    console.error('Error getting users by tenant:', error)
    return []
  }
}

/**
 * Get a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
export const getUser = async (userId) => {
  try {
    const response = await apiClient.get(`/api/User/${userId}`)
    const user = unwrapResponse(response)
    return normalizeUser(user)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting user:', error)
    throw error
  }
}

/**
 * Get current user details (from JWT session)
 * @returns {Promise<Object>} Current user details
 */
export const getCurrentUserDetail = async () => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.USER_DETAIL)
    const user = unwrapResponse(response)
    return normalizeUser(user)
  } catch (error) {
    console.error('Error getting current user detail:', error)
    throw error
  }
}

/**
 * Update user profile
 * @param {Object} profileData - Profile fields to update
 * @returns {Promise<Object>} Updated user
 */
export const updateUserProfile = async (profileData) => {
  try {
    const payload = serializeDates({ ...profileData }, USER_DATE_FIELDS)
    const response = await apiClient.put(USER_ENDPOINTS.UPDATE_PROFILE, payload)
    const user = unwrapResponse(response)
    return normalizeUser(user)
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

/**
 * Update user phone number
 * @param {string} phoneNo - New phone number
 * @returns {Promise<void>}
 */
export const updatePhoneNo = async (phoneNo) => {
  try {
    const response = await apiClient.put(USER_ENDPOINTS.UPDATE_PHONE, { phoneNo })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating phone number:', error)
    throw error
  }
}

/**
 * Change user email
 * @param {string} newEmail - New email address
 * @returns {Promise<void>}
 */
export const changeEmail = async (newEmail) => {
  try {
    const response = await apiClient.put(USER_ENDPOINTS.CHANGE_EMAIL, { email: newEmail })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error changing email:', error)
    throw error
  }
}

/**
 * Send OTP for email change verification
 * @param {string} newEmail - New email address
 * @returns {Promise<void>}
 */
export const sendChangeEmailOTP = async (newEmail) => {
  try {
    const response = await apiClient.post(USER_ENDPOINTS.SEND_CHANGE_EMAIL_OTP, { email: newEmail })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error sending change email OTP:', error)
    throw error
  }
}

/**
 * Deactivate user profile
 * @returns {Promise<void>}
 */
export const deactivateProfile = async () => {
  try {
    const response = await apiClient.delete(USER_ENDPOINTS.DEACTIVATE_PROFILE)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deactivating profile:', error)
    throw error
  }
}

/**
 * Reactivate a deactivated user
 * @param {Object} credentials - Reactivation credentials
 * @returns {Promise<Object>} Reactivation result
 */
export const reactivateUser = async (credentials) => {
  try {
    const response = await apiClient.post(USER_ENDPOINTS.REACTIVATE, credentials)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error reactivating user:', error)
    throw error
  }
}

/**
 * Get user permissions
 * @returns {Promise<string[]>} List of permission strings
 */
export const getUserPermissions = async () => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_PERMISSIONS)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Update user email settings
 * @param {Object} settings - Email notification settings
 * @returns {Promise<void>}
 */
export const updateEmailSettings = async (settings) => {
  try {
    const response = await apiClient.put(USER_ENDPOINTS.UPDATE_EMAIL_SETTING, settings)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating email settings:', error)
    throw error
  }
}

/**
 * Update info sharing preferences
 * @param {boolean} enabled - Whether to enable info sharing
 * @returns {Promise<void>}
 */
export const updateInfoSharing = async (enabled) => {
  try {
    const response = await apiClient.put(USER_ENDPOINTS.UPDATE_INFO_SHARING, { enabled })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating info sharing:', error)
    throw error
  }
}

/**
 * Get user hierarchy/team structure
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Hierarchy data with reports and manager
 */
export const getUserHierarchy = async (userId) => {
  try {
    const response = await apiClient.get(`/api/User/${userId}/Hierarchy`)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting user hierarchy:', error)
    return { reports: [], manager: null }
  }
}

/**
 * Get direct reports for a manager
 * @param {string} managerId - Manager user ID
 * @returns {Promise<Array>} Array of direct reports
 */
export const getDirectReports = async (managerId) => {
  try {
    const response = await apiClient.get(`/api/User/${managerId}/DirectReports`)
    const reports = unwrapResponse(response)
    return normalizeEntities(reports).map(normalizeUser)
  } catch (error) {
    console.error('Error getting direct reports:', error)
    return []
  }
}

/**
 * Get accessible user IDs for data filtering (based on hierarchy)
 * @param {string} userId - Current user ID
 * @returns {Promise<string[]>} Array of accessible user IDs
 */
export const getAccessibleUserIds = async (userId) => {
  try {
    const response = await apiClient.get(`/api/User/${userId}/AccessibleUsers`)
    const result = unwrapResponse(response)
    return result.userIds || [userId]
  } catch (error) {
    console.error('Error getting accessible user IDs:', error)
    return [userId]
  }
}

/**
 * Get effective product line IDs for a user
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of product line IDs
 */
export const getEffectiveProductLineIds = async (userId) => {
  try {
    const response = await apiClient.get(`/api/User/${userId}/ProductLines`)
    const result = unwrapResponse(response)
    return result.productLineIds || []
  } catch (error) {
    console.error('Error getting effective product line IDs:', error)
    return []
  }
}

/**
 * Validate an invite token
 * @param {string} token - Invite token
 * @returns {Promise<Object>} Validation result
 */
export const validateInvite = async (token) => {
  try {
    const response = await apiClient.post(USER_ENDPOINTS.VALIDATE_INVITE, { token })
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error validating invite:', error)
    throw error
  }
}

/**
 * Create password for invited user
 * @param {Object} data - Password creation data (token, password)
 * @returns {Promise<Object>} Creation result
 */
export const createPassword = async (data) => {
  try {
    const response = await apiClient.post(USER_ENDPOINTS.CREATE_PASSWORD, data)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error creating password:', error)
    throw error
  }
}

/**
 * Check if user is a system admin
 * @param {Object} user - User object
 * @returns {boolean} True if user is system admin
 */
export const isSystemAdmin = (user) => {
  return user?.isSystemAdmin === true
}

/**
 * Check if user is a manager
 * @param {Object} user - User object
 * @returns {boolean} True if user is a manager
 */
export const isManager = (user) => {
  if (!user) return false

  const salesLevel = user.salesLevel
  const roleLower = (user.role || '').toLowerCase().replace(/[\s_-]/g, '')

  return salesLevel === 'sales_manager' ||
         salesLevel === 'sales_head' ||
         roleLower === 'salesmanager' ||
         roleLower === 'salesmanagers' ||
         roleLower === 'saleshead' ||
         roleLower === 'groupsalesmanager' ||
         roleLower === 'groupsalesmanagers' ||
         roleLower === 'manager' ||
         roleLower === 'managers' ||
         roleLower === 'admin'
}
