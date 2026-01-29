/**
 * User Invitation Service
 *
 * Handles creating user accounts and sending invitations via REST API.
 * System admins can create users for any tenant.
 * Tenant admins can only create users for their own tenant.
 */

import { apiClient } from '../api/config/apiClient'
import { USER_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

const USER_DATE_FIELDS = ['createdAt', 'updatedAt', 'lastLogin', 'expiresAt', 'acceptedAt']

/**
 * Normalize a user entity from API response
 */
const normalizeUser = (user) => {
  if (!user) return null
  const normalized = normalizeEntity(user)
  return normalizeDates(normalized, USER_DATE_FIELDS)
}

/**
 * Create a new user account
 *
 * @param {Object} userData - User data
 * @param {string} userData.email - User email (required)
 * @param {string} userData.password - User password (required)
 * @param {string} userData.displayName - User display name
 * @param {string} userData.role - User role ID (default: 'salesperson')
 * @param {string} userData.tenantId - Tenant ID to assign user to
 * @param {boolean} userData.isSystemAdmin - Whether user is a system admin
 * @param {string} createdByUserId - ID of the user creating this account
 * @returns {Promise<Object>} - Created user data
 */
export const createUserAccount = async (userData, createdByUserId) => {
  const { email, password, displayName, role, tenantId, isSystemAdmin, requirePasswordChange } = userData

  if (!email) {
    throw new Error('Email is required')
  }

  if (!password) {
    throw new Error('Password is required')
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  try {
    const payload = {
      email: email.toLowerCase(),
      password,
      displayName: displayName || email.split('@')[0],
      role: role || 'salesperson',
      tenantId: tenantId || null,
      isSystemAdmin: isSystemAdmin || false,
      requirePasswordChange: requirePasswordChange || false,
      createdBy: createdByUserId || 'system'
    }

    const response = await apiClient.post(USER_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)

    return normalizeUser(result)
  } catch (error) {
    console.error('Error creating user account:', error)

    // Handle specific API errors
    if (error.message?.includes('already exists') || error.message?.includes('email-already-in-use')) {
      throw new Error('This email is already registered. The user may need to be added to a tenant instead.')
    }
    if (error.message?.includes('invalid-email') || error.message?.includes('Invalid email')) {
      throw new Error('Invalid email address format')
    }
    if (error.message?.includes('weak-password') || error.message?.includes('password')) {
      throw new Error('Password must be at least 6 characters')
    }

    throw error
  }
}

/**
 * Create a pending user invitation (without creating auth account)
 * The user will create their own account when they accept the invitation
 *
 * @param {Object} inviteData - Invitation data
 * @param {string} createdByUserId - ID of the user creating this invitation
 * @returns {Promise<Object>} - Created invitation data
 */
export const createUserInvitation = async (inviteData, createdByUserId) => {
  const { email, displayName, role, tenantId, salesLevel, managerId, isSystemAdmin } = inviteData

  if (!email) {
    throw new Error('Email is required')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  try {
    const payload = {
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0],
      role: role || 'salesperson',
      tenantId: tenantId || null,
      salesLevel: salesLevel || null,
      managerId: managerId || null,
      isSystemAdmin: isSystemAdmin || false,
      status: 'pending',
      createdBy: createdByUserId || 'system',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }

    // Use invite creation endpoint
    const response = await apiClient.post('/api/User/CreateInvitation', payload)
    const result = unwrapResponse(response)

    return {
      id: result.key || result.id,
      ...result
    }
  } catch (error) {
    console.error('Error creating user invitation:', error)
    throw error
  }
}

/**
 * Get pending invitations for a tenant
 * @param {string} tenantId - Tenant ID (null for all invitations - system admin only)
 * @returns {Promise<Array>} - Array of invitation objects
 */
export const getPendingInvitations = async (tenantId = null) => {
  try {
    const params = { status: 'pending' }
    if (tenantId) {
      params.tenantId = tenantId
    }
    const url = buildUrl('/api/User/GetInvitations', params)
    const response = await apiClient.get(url)
    const invitations = unwrapResponse(response)
    return normalizeEntities(invitations).map(inv => normalizeDates(inv, USER_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting pending invitations:', error)
    return []
  }
}

/**
 * Cancel/delete a pending invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const cancelInvitation = async (invitationId) => {
  try {
    await apiClient.delete(`/api/User/DeleteInvitation?invitationId=${invitationId}`)
  } catch (error) {
    console.error('Error canceling invitation:', error)
    throw error
  }
}

/**
 * Resend invitation email
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const resendInvitation = async (invitationId) => {
  try {
    await apiClient.post(`/api/User/ResendInvitation?invitationId=${invitationId}`)
  } catch (error) {
    console.error('Error resending invitation:', error)
    throw error
  }
}

/**
 * Accept an invitation (called when user signs up)
 * @param {string} email - User email
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Invitation data if found, null otherwise
 */
export const acceptInvitation = async (email, userId) => {
  try {
    const response = await apiClient.post('/api/User/AcceptInvitation', {
      email: email.toLowerCase(),
      userId
    })
    const result = unwrapResponse(response)
    return result
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return null
  }
}

/**
 * Add an existing user to a tenant
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export const addUserToTenant = async (userId, tenantId, options = {}) => {
  try {
    const { role, salesLevel, managerId } = options

    const payload = {
      userId,
      tenantId,
      role,
      salesLevel,
      managerId
    }

    await apiClient.put('/api/User/AssignToTenant', payload)
  } catch (error) {
    console.error('Error adding user to tenant:', error)
    throw error
  }
}

/**
 * Remove a user from a tenant (set tenantId to null)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const removeUserFromTenant = async (userId) => {
  try {
    await apiClient.put('/api/User/RemoveFromTenant', { userId })
  } catch (error) {
    console.error('Error removing user from tenant:', error)
    throw error
  }
}

/**
 * Get users without a tenant assignment
 * @returns {Promise<Array>} - Array of unassigned users
 */
export const getUnassignedUsers = async () => {
  try {
    const url = buildUrl('/api/User/GetList', { tenantId: 'null', isSystemAdmin: false })
    const response = await apiClient.get(url)
    const users = unwrapResponse(response)
    return normalizeEntities(users)
      .map(normalizeUser)
      .filter(u => !u.isSystemAdmin)
  } catch (error) {
    console.error('Error getting unassigned users:', error)
    return []
  }
}

/**
 * Send password reset email to user
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (email) => {
  try {
    await apiClient.post(USER_ENDPOINTS.FORGET_PASSWORD, { email })
  } catch (error) {
    console.error('Error sending password reset:', error)
    throw error
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
