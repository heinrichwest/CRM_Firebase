/**
 * Role Service
 *
 * Provides role management operations via REST API.
 */

import { apiClient } from '../api/config/apiClient'
import { ROLE_ENDPOINTS, PERMISSION_ENDPOINTS, USER_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates } from '../api/adapters/idAdapter'

const ROLE_DATE_FIELDS = ['createdAt', 'updatedAt']

// Default system features grouped by category
export const SYSTEM_FEATURES = [
  // Dashboard
  { id: 'view_dashboard', name: 'View Dashboard', category: 'Dashboard' },
  { id: 'edit_financial_dashboard', name: 'Edit Financial Dashboard', category: 'Dashboard' },

  // Clients
  { id: 'view_clients', name: 'View Clients', category: 'Clients' },
  { id: 'create_clients', name: 'Create Clients', category: 'Clients' },
  { id: 'edit_clients', name: 'Edit Clients', category: 'Clients' },
  { id: 'delete_clients', name: 'Delete Clients', category: 'Clients' },

  // Sales Pipeline
  { id: 'view_sales_pipeline', name: 'View Sales Pipeline', category: 'Sales Pipeline' },
  { id: 'create_deals', name: 'Create Deals', category: 'Sales Pipeline' },
  { id: 'edit_deals', name: 'Edit Deals', category: 'Sales Pipeline' },

  // Follow-Up Tasks
  { id: 'view_follow_up_tasks', name: 'View Follow-Up Tasks', category: 'Follow-Up Tasks' },
  { id: 'create_follow_up_tasks', name: 'Create Follow-Up Tasks', category: 'Follow-Up Tasks' },

  // Reports
  { id: 'view_reports', name: 'View Reports', category: 'Reports' },

  // Messages
  { id: 'view_messages', name: 'View Messages', category: 'Messages' },
  { id: 'create_messages', name: 'Create Messages', category: 'Messages' },

  // Accounting
  { id: 'view_accounting', name: 'View Accounting Data', category: 'Accounting' },
  { id: 'edit_accounting', name: 'Edit Accounting Data', category: 'Accounting' },

  // Team Management
  { id: 'manage_team', name: 'Manage Own Team', category: 'Team Management' },
  { id: 'view_team_reports', name: 'View Team Reports', category: 'Team Management' },
  { id: 'view_all_teams', name: 'View All Teams', category: 'Team Management' },
  { id: 'manage_all_teams', name: 'Manage All Teams', category: 'Team Management' },

  // Administration
  { id: 'manage_users', name: 'Manage Users', category: 'Administration' },
  { id: 'manage_roles', name: 'Manage Roles', category: 'Administration' },
  { id: 'manage_financial_year', name: 'Manage Financial Year End', category: 'Administration' },
  { id: 'manage_clients', name: 'Manage Client Budgets & Allocations', category: 'Administration' },

  // System Administration (System Admin only - above tenant level)
  { id: 'manage_tenants', name: 'Manage Tenants', category: 'System Administration' },
  { id: 'view_all_tenants', name: 'View All Tenants', category: 'System Administration' },
  { id: 'manage_system_admins', name: 'Manage System Admins', category: 'System Administration' }
]

// System-level permissions (only for system admins)
export const SYSTEM_ADMIN_PERMISSIONS = [
  'manage_tenants',
  'view_all_tenants',
  'manage_system_admins'
]

// Get unique categories
export const getFeatureCategories = () => {
  const categories = [...new Set(SYSTEM_FEATURES.map(f => f.category))]
  return categories
}

// Default roles with permissions
const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    description: 'Full system access',
    permissions: SYSTEM_FEATURES.map(f => f.id) // All permissions
  },
  accountant: {
    name: 'Accountant',
    description: 'Financial and accounting access',
    permissions: [
      'view_dashboard',
      'edit_financial_dashboard',
      'view_clients',
      'view_sales_pipeline',
      'view_reports',
      'view_messages',
      'manage_financial_year',
      'view_accounting',
      'edit_accounting'
    ]
  },
  salesperson: {
    name: 'Salesperson',
    description: 'Sales and client management',
    permissions: [
      'view_dashboard',
      'view_clients',
      'create_clients',
      'edit_clients',
      'view_sales_pipeline',
      'create_deals',
      'edit_deals',
      'view_follow_up_tasks',
      'create_follow_up_tasks',
      'view_messages',
      'create_messages'
    ]
  },
  manager: {
    name: 'Manager',
    description: 'Management and oversight',
    permissions: [
      'view_dashboard',
      'view_clients',
      'create_clients',
      'edit_clients',
      'view_sales_pipeline',
      'create_deals',
      'edit_deals',
      'view_follow_up_tasks',
      'create_follow_up_tasks',
      'view_reports',
      'view_messages',
      'create_messages',
      'manage_users',
      'manage_clients'
    ]
  },
  sales_manager: {
    name: 'Sales Manager',
    description: 'Manages a team of salespeople and specific product lines',
    salesLevel: 'sales_manager',
    permissions: [
      'view_dashboard',
      'view_clients',
      'create_clients',
      'edit_clients',
      'view_sales_pipeline',
      'create_deals',
      'edit_deals',
      'view_follow_up_tasks',
      'create_follow_up_tasks',
      'view_reports',
      'view_messages',
      'create_messages',
      'manage_team',
      'view_team_reports'
    ]
  },
  sales_head: {
    name: 'Sales Head',
    description: 'Global view of all sales teams and products within the tenant',
    salesLevel: 'sales_head',
    permissions: [
      'view_dashboard',
      'view_clients',
      'create_clients',
      'edit_clients',
      'delete_clients',
      'view_sales_pipeline',
      'create_deals',
      'edit_deals',
      'view_follow_up_tasks',
      'create_follow_up_tasks',
      'view_reports',
      'view_messages',
      'create_messages',
      'manage_team',
      'view_team_reports',
      'view_all_teams',
      'manage_all_teams',
      'manage_clients'
    ]
  }
}

/**
 * Normalize a role entity from API response
 */
const normalizeRole = (role) => {
  if (!role) return null
  const normalized = normalizeEntity(role)
  return normalizeDates(normalized, ROLE_DATE_FIELDS)
}

/**
 * Initialize default roles (via API)
 */
export const initializeDefaultRoles = async () => {
  try {
    // Check if roles exist
    const existingRoles = await getRoles()

    if (existingRoles.length === 0) {
      // Create default roles via API
      for (const [roleId, roleData] of Object.entries(DEFAULT_ROLES)) {
        await saveRole(roleId, roleData)
      }
      console.log('Default roles initialized')
    }
  } catch (error) {
    console.error('Error initializing default roles:', error)
    // Don't throw - fallback to in-memory defaults
  }
}

/**
 * Get all roles
 */
export const getRoles = async () => {
  try {
    const response = await apiClient.get(ROLE_ENDPOINTS.LIST)
    const roles = unwrapResponse(response)
    return normalizeEntities(roles).map(normalizeRole)
  } catch (error) {
    console.error('Error getting roles:', error)
    // Return default roles from memory on error
    return Object.entries(DEFAULT_ROLES).map(([id, data]) => ({
      id,
      ...data
    }))
  }
}

/**
 * Get a specific role
 */
export const getRole = async (roleId) => {
  try {
    const response = await apiClient.get(ROLE_ENDPOINTS.GET_BY_ID(roleId))
    const role = unwrapResponse(response)
    return normalizeRole(role)
  } catch (error) {
    // If role doesn't exist in API, return default role from memory
    if (DEFAULT_ROLES[roleId]) {
      return { id: roleId, ...DEFAULT_ROLES[roleId] }
    }
    // Fallback to salesperson
    return { id: 'salesperson', ...DEFAULT_ROLES.salesperson }
  }
}

/**
 * Create or update a role
 */
export const saveRole = async (roleId, roleData) => {
  try {
    const existingRole = await getRole(roleId).catch(() => null)

    const data = {
      ...roleData,
      id: roleId,
    }

    if (existingRole && existingRole.id !== 'salesperson') {
      // Update existing role
      await apiClient.put(ROLE_ENDPOINTS.UPDATE(roleId), data)
    } else {
      // Create new role
      await apiClient.post(ROLE_ENDPOINTS.CREATE, data)
    }

    return roleId
  } catch (error) {
    console.error('Error saving role:', error)
    throw error
  }
}

/**
 * Delete a role
 */
export const deleteRole = async (roleId) => {
  try {
    // Don't allow deleting default roles
    if (Object.keys(DEFAULT_ROLES).includes(roleId)) {
      throw new Error('Cannot delete default roles')
    }

    await apiClient.delete(ROLE_ENDPOINTS.DELETE(roleId))
  } catch (error) {
    console.error('Error deleting role:', error)
    throw error
  }
}

/**
 * Check if user has permission
 */
export const hasPermission = async (userId, permission) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_BY_ID(userId))
    const userData = unwrapResponse(response)

    if (!userData) return false

    const roleId = userData.role || 'salesperson'
    const role = await getRole(roleId)

    if (!role) return false

    return role.permissions?.includes(permission) || false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Get user's role data
 */
export const getUserRole = async (userId) => {
  try {
    const response = await apiClient.get(USER_ENDPOINTS.GET_BY_ID(userId))
    const userData = unwrapResponse(response)

    if (!userData) return null

    const roleId = userData.role || 'salesperson'
    return await getRole(roleId)
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}
