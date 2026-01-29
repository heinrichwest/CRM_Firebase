/**
 * Tenant Service
 *
 * Provides tenant management operations via REST API.
 */

import { apiClient } from '../api/config/apiClient'
import { TENANT_ENDPOINTS, USER_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates } from '../api/adapters/idAdapter'

const TENANT_DATE_FIELDS = ['createdAt', 'updatedAt', 'deletedAt']

/**
 * Normalize a tenant entity from API response
 */
const normalizeTenant = (tenant) => {
  if (!tenant) return null
  const normalized = normalizeEntity(tenant)
  return normalizeDates(normalized, TENANT_DATE_FIELDS)
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

/**
 * Get all tenants (system admin only)
 */
export const getTenants = async () => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.LIST)
    const tenants = unwrapResponse(response)
    return normalizeEntities(tenants)
      .map(normalizeTenant)
      .filter(t => !t.deleted)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting tenants:', error)
    return []
  }
}

/**
 * Get a single tenant by ID
 */
export const getTenant = async (tenantId) => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.GET_BY_ID(tenantId))
    const tenant = unwrapResponse(response)
    return normalizeTenant(tenant)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting tenant:', error)
    return null
  }
}

/**
 * Create a new tenant with its first admin user
 * @param {Object} tenantData - Tenant information
 * @param {string} tenantData.name - Tenant name
 * @param {string} tenantData.description - Tenant description
 * @param {Object} adminUserData - First admin user data (optional)
 * @returns {Promise<{tenantId: string}>}
 */
export const createTenant = async (tenantData, adminUserData = null) => {
  try {
    const tenantId = tenantData.id ||
      tenantData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if tenant already exists
    const existingTenant = await getTenant(tenantId)
    if (existingTenant) {
      throw new Error('A tenant with this ID already exists')
    }

    const payload = {
      id: tenantId,
      name: tenantData.name,
      description: tenantData.description || '',
      status: 'active',
      settings: {
        currencySymbol: tenantData.currencySymbol || 'R',
        financialYearStart: tenantData.financialYearStart || 'March',
        financialYearEnd: tenantData.financialYearEnd || 'February',
        ...tenantData.settings
      }
    }

    await apiClient.post(TENANT_ENDPOINTS.CREATE, payload)

    return { tenantId }
  } catch (error) {
    console.error('Error creating tenant:', error)
    throw error
  }
}

/**
 * Update tenant details
 */
export const updateTenant = async (tenantId, updateData) => {
  try {
    await apiClient.put(TENANT_ENDPOINTS.UPDATE(tenantId), updateData)
  } catch (error) {
    console.error('Error updating tenant:', error)
    throw error
  }
}

/**
 * Soft delete a tenant (marks as deleted, doesn't remove data)
 */
export const deleteTenant = async (tenantId) => {
  try {
    await apiClient.delete(TENANT_ENDPOINTS.SOFT_DELETE(tenantId))
  } catch (error) {
    console.error('Error deleting tenant:', error)
    throw error
  }
}

/**
 * Get tenant statistics (user count, client count, etc.)
 */
export const getTenantStats = async (tenantId) => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.GET_STATISTICS(tenantId))
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting tenant stats:', error)
    return { userCount: 0, clientCount: 0 }
  }
}

// ============================================================================
// USER TENANT ASSIGNMENT
// ============================================================================

/**
 * Assign a user to a tenant
 */
export const assignUserToTenant = async (userId, tenantId, role = 'salesperson') => {
  try {
    await apiClient.put('/api/User/AssignToTenant', { userId, tenantId, role })
  } catch (error) {
    console.error('Error assigning user to tenant:', error)
    throw error
  }
}

/**
 * Remove user from tenant (for system admins managing users)
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
 * Get users for a specific tenant
 */
export const getTenantUsers = async (tenantId) => {
  try {
    const url = buildUrl(USER_ENDPOINTS.LIST, { tenantId })
    const response = await apiClient.get(url)
    const users = unwrapResponse(response)
    return normalizeEntities(users).map(user => normalizeDates(user, ['createdAt', 'updatedAt', 'lastLogin']))
  } catch (error) {
    console.error('Error getting tenant users:', error)
    return []
  }
}

// ============================================================================
// SYSTEM ADMIN MANAGEMENT
// ============================================================================

/**
 * Check if a user is a system admin
 */
export const isSystemAdmin = async (userId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_BY_ID(userId))
    const userData = unwrapResponse(response)
    return userData?.isSystemAdmin === true
  } catch (error) {
    console.error('Error checking system admin status:', error)
    return false
  }
}

/**
 * Set user as system admin
 */
export const setSystemAdmin = async (userId, isAdmin = true) => {
  try {
    await apiClient.put(USER_ENDPOINTS.UPDATE(userId), { isSystemAdmin: isAdmin })
  } catch (error) {
    console.error('Error setting system admin:', error)
    throw error
  }
}

/**
 * Get all system admins
 */
export const getSystemAdmins = async () => {
  try {
    const url = buildUrl(USER_ENDPOINTS.LIST, { isSystemAdmin: true })
    const response = await apiClient.get(url)
    const users = unwrapResponse(response)
    return normalizeEntities(users)
  } catch (error) {
    console.error('Error getting system admins:', error)
    return []
  }
}

// ============================================================================
// DATA MIGRATION UTILITIES
// ============================================================================

/**
 * Migrate existing data to a tenant
 * This should be handled by the backend API
 */
export const migrateDataToTenant = async (tenantId) => {
  try {
    const response = await apiClient.post('/api/Tenant/MigrateData', { tenantId })
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error migrating data to tenant:', error)
    throw error
  }
}

/**
 * Initialize the Speccon tenant (first-time setup)
 */
export const initializeSpecconTenant = async () => {
  try {
    // Check if Speccon tenant already exists
    const existingTenant = await getTenant('speccon')

    if (!existingTenant) {
      // Create Speccon tenant
      await createTenant({
        id: 'speccon',
        name: 'Speccon',
        description: 'Speccon Holdings - Primary tenant',
        currencySymbol: 'R',
        financialYearStart: 'March',
        financialYearEnd: 'February'
      })

      console.log('Speccon tenant created')
    }

    return { tenantId: 'speccon' }
  } catch (error) {
    console.error('Error initializing Speccon tenant:', error)
    throw error
  }
}
