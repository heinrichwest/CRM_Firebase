/**
 * User Service
 *
 * Provides user management operations via REST API.
 */

import { apiClient } from '../api/config/apiClient'
import { USER_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

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
 * Create or update a user document
 * @param {Object} user - User data object
 * @returns {Promise<Object>}
 */
export const createOrUpdateUser = async (user) => {
  if (!user) return null

  try {
    const userId = user.uid || user.id
    if (!userId) return null

    // Check if user exists
    const existingUser = await getUserData(userId)

    if (existingUser) {
      // Update existing user
      const updateData = {
        email: user.email || existingUser.email || '',
        displayName: user.displayName || existingUser.displayName || '',
        photoURL: user.photoURL || existingUser.photoURL || '',
        provider: user.provider || existingUser.provider || 'email',
      }

      const response = await apiClient.put(USER_ENDPOINTS.UPDATE(userId), updateData)
      return normalizeUser(unwrapResponse(response))
    } else {
      // Create new user
      const userEmail = user.email || ''
      const shouldBeAdmin = userEmail.toLowerCase() === 'admin@speccon.co.za'
      const defaultRole = shouldBeAdmin ? 'admin' : (user.role || 'salesperson')

      const createData = {
        email: userEmail,
        displayName: user.displayName || userEmail.split('@')[0] || '',
        photoURL: user.photoURL || '',
        provider: user.provider || 'email',
        phone: user.phone || '',
        title: user.title || '',
        department: user.department || '',
        bio: user.bio || '',
        role: defaultRole,
        customPermissions: [],
        isSystemAdmin: shouldBeAdmin,
        tenantId: null,
      }

      const response = await apiClient.post(USER_ENDPOINTS.CREATE, createData)
      return normalizeUser(unwrapResponse(response))
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error)
    throw error
  }
}

/**
 * Get user document by ID
 * @param {string} userId - User ID (uid)
 * @returns {Promise<Object|null>}
 */
export const getUserData = async (userId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_BY_ID(userId))
    const user = unwrapResponse(response)
    return normalizeUser(user)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting user data:', error)
    throw error
  }
}

/**
 * Get all users
 * @returns {Promise<Array>}
 */
export const getUsers = async () => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.LIST)
    const users = unwrapResponse(response)
    return normalizeEntities(users).map(normalizeUser)
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
}

/**
 * Update user role
 * @param {string} userId - User ID (uid)
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
export const updateUserRole = async (userId, roleId) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE_ROLE, { userId, roleId })
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

/**
 * Get users filtered by tenant
 * @param {string} tenantId - Tenant ID to filter by (null returns all users)
 * @returns {Promise<Array>}
 */
export const getUsersByTenant = async (tenantId) => {
  try {
    const params = tenantId ? { tenantId } : {}
    const url = buildUrl(USER_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const users = unwrapResponse(response)
    return normalizeEntities(users).map(normalizeUser)
  } catch (error) {
    console.error('Error getting users by tenant:', error)
    return []
  }
}

/**
 * Assign user to a tenant
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<void>}
 */
export const assignUserTenant = async (userId, tenantId) => {
  try {
    await apiClient.put('/api/User/AssignToTenant', { userId, tenantId })
  } catch (error) {
    console.error('Error assigning user to tenant:', error)
    throw error
  }
}

/**
 * Set user as system admin
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Whether to set as system admin
 * @returns {Promise<void>}
 */
export const setUserAsSystemAdmin = async (userId, isAdmin = true) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE(userId), { isSystemAdmin: isAdmin })
  } catch (error) {
    console.error('Error setting system admin:', error)
    throw error
  }
}

// ============================================================================
// SALES HIERARCHY MANAGEMENT
// ============================================================================

/**
 * Update user's sales hierarchy settings
 * @param {string} userId - User ID
 * @param {Object} hierarchyData - Hierarchy settings
 * @param {string|null} hierarchyData.managerId - Manager's user ID (null for no manager)
 * @param {string|null} hierarchyData.salesLevel - Sales level ('salesperson', 'sales_manager', 'sales_head', null)
 * @param {string[]} hierarchyData.assignedProductLineIds - Product lines assigned (for managers)
 * @returns {Promise<void>}
 */
export const updateUserHierarchy = async (userId, hierarchyData) => {
  try {
    // Prevent self-assignment
    if (hierarchyData.managerId === userId) {
      throw new Error('User cannot be their own manager')
    }

    // Validate sales level
    if (hierarchyData.salesLevel !== undefined) {
      const validLevels = ['salesperson', 'sales_manager', 'sales_head', null]
      if (!validLevels.includes(hierarchyData.salesLevel)) {
        throw new Error('Invalid sales level')
      }
    }

    const updateData = {}
    if (hierarchyData.managerId !== undefined) {
      updateData.managerId = hierarchyData.managerId
    }
    if (hierarchyData.salesLevel !== undefined) {
      updateData.salesLevel = hierarchyData.salesLevel
    }
    if (hierarchyData.assignedProductLineIds !== undefined) {
      updateData.assignedProductLineIds = hierarchyData.assignedProductLineIds || []
    }

    await apiClient.put(USER_ENDPOINTS.UPDATE(userId), updateData)
  } catch (error) {
    console.error('Error updating user hierarchy:', error)
    throw error
  }
}

/**
 * Assign a salesperson to a manager
 * @param {string} userId - Salesperson's user ID
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<void>}
 */
export const assignSalespersonToManager = async (userId, managerId) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE_MANAGER, { userId, managerId })
  } catch (error) {
    console.error('Error assigning salesperson to manager:', error)
    throw error
  }
}

/**
 * Remove a salesperson from their manager
 * @param {string} userId - Salesperson's user ID
 * @returns {Promise<void>}
 */
export const removeSalespersonFromManager = async (userId) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE_MANAGER, { userId, managerId: null })
  } catch (error) {
    console.error('Error removing salesperson from manager:', error)
    throw error
  }
}

/**
 * Get direct reports for a manager
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<Array>} - Array of user objects
 */
export const getDirectReports = async (managerId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_DIRECT_REPORTS(managerId))
    const reports = unwrapResponse(response)
    return normalizeEntities(reports).map(normalizeUser)
  } catch (error) {
    console.error('Error getting direct reports:', error)
    return []
  }
}

/**
 * Get all users in a manager's team (recursive - all levels below)
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<Array>} - Array of user objects
 */
export const getTeamMembers = async (managerId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_TEAM_MEMBERS(managerId))
    const members = unwrapResponse(response)
    return normalizeEntities(members).map(normalizeUser)
  } catch (error) {
    console.error('Error getting team members:', error)
    return []
  }
}

/**
 * Get accessible user IDs for a user (themselves + their team)
 * @param {string} userId - User ID
 * @param {Object} userData - User data (to avoid extra fetch)
 * @returns {Promise<string[]>} - Array of user IDs this user can access
 */
export const getAccessibleUserIds = async (userId, userData = null) => {
  try {
    // Always include self
    const accessibleIds = [userId]

    // Get user data if not provided
    if (!userData) {
      userData = await getUserData(userId)
    }

    if (!userData) return accessibleIds

    const salesLevel = userData.salesLevel || null
    const role = userData.role || 'salesperson'
    const roleLower = role.toLowerCase().replace(/[\s_-]/g, '')

    // Sales Head (Group Sales Manager) or Admin sees everyone in tenant
    const isSalesHead = salesLevel === 'sales_head' ||
                        roleLower === 'saleshead' ||
                        roleLower === 'groupsalesmanager' ||
                        roleLower === 'groupsalesmanagers' ||
                        roleLower === 'admin'
    if (isSalesHead) {
      const tenantUsers = await getUsersByTenant(userData.tenantId)
      return tenantUsers.map(u => u.id)
    }

    // Sales Manager sees only their direct reports
    const isManager = salesLevel === 'sales_manager' ||
                      roleLower === 'salesmanager' ||
                      roleLower === 'salesmanagers' ||
                      roleLower === 'manager' ||
                      roleLower === 'managers'
    if (isManager) {
      const teamMembers = await getTeamMembers(userId)
      return [...accessibleIds, ...teamMembers.map(m => m.id)]
    }

    // Regular salesperson sees only themselves
    return accessibleIds
  } catch (error) {
    console.error('Error getting accessible user IDs:', error)
    return [userId]
  }
}

/**
 * Get potential managers for a user based on their role
 * @param {string} tenantId - Tenant ID (required - must filter by tenant)
 * @param {string} userRole - The role of the user we're finding managers for
 * @returns {Promise<Array>} - Array of valid manager user objects
 */
export const getManagersInTenant = async (tenantId, userRole = 'salesperson') => {
  try {
    if (!tenantId) {
      console.warn('getManagersInTenant called without tenantId - returning empty array')
      return []
    }

    const users = await getUsersByTenant(tenantId)

    // Determine valid manager roles based on user's role
    let validManagerRoles = []
    if (userRole === 'salesperson') {
      validManagerRoles = ['manager']
    } else if (userRole === 'manager') {
      validManagerRoles = ['group-sales-manager']
    }

    return users.filter(u => validManagerRoles.includes(u.role))
  } catch (error) {
    console.error('Error getting managers:', error)
    return []
  }
}

/**
 * Get user's manager chain (list of managers up to top)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of manager user objects (immediate manager first)
 */
export const getManagerChain = async (userId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_HIERARCHY(userId))
    const hierarchy = unwrapResponse(response)
    return normalizeEntities(hierarchy.managerChain || []).map(normalizeUser)
  } catch (error) {
    console.error('Error getting manager chain:', error)
    return []
  }
}

/**
 * Assign product lines to a manager
 * @param {string} managerId - Manager's user ID
 * @param {string[]} productLineIds - Array of product line IDs
 * @returns {Promise<void>}
 */
export const assignProductLinesToManager = async (managerId, productLineIds) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE(managerId), {
      assignedProductLineIds: productLineIds || []
    })
  } catch (error) {
    console.error('Error assigning product lines to manager:', error)
    throw error
  }
}

/**
 * Get effective product lines for a user
 * (Their assigned lines, or inherited from manager if salesperson)
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} - Array of product line IDs
 */
export const getEffectiveProductLineIds = async (userId) => {
  try {
    const response = await apiClient.get(`/api/User/${userId}/ProductLines`)
    const result = unwrapResponse(response)
    return result.productLineIds || []
  } catch (error) {
    console.error('Error getting effective product lines:', error)
    return []
  }
}

/**
 * Update user custom permissions
 * @param {string} userId - User ID
 * @param {string[]} customPermissions - Array of permission IDs
 * @returns {Promise<void>}
 */
export const updateUserPermissions = async (userId, customPermissions) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE(userId), {
      customPermissions: customPermissions || []
    })
  } catch (error) {
    console.error('Error updating user permissions:', error)
    throw error
  }
}
