/**
 * Sales Team Service
 *
 * Provides team management, hierarchy visualization, and bulk operations
 * for the sales team structure.
 */

import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import {
  getUserData,
  getUsersByTenant,
  getDirectReports,
  getTeamMembers,
  getAccessibleUserIds,
  assignSalespersonToManager,
  removeSalespersonFromManager
} from './userService'

/**
 * Build team hierarchy tree for visualization
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Hierarchical tree structure
 */
export const buildTeamHierarchy = async (tenantId) => {
  try {
    const users = await getUsersByTenant(tenantId)

    // Find root users (no manager or manager not in tenant)
    const userMap = new Map(users.map(u => [u.id, u]))
    const rootUsers = users.filter(u => !u.managerId || !userMap.has(u.managerId))

    // Build tree recursively
    const buildNode = (user) => {
      const children = users.filter(u => u.managerId === user.id)
      return {
        id: user.id,
        name: user.displayName || user.email,
        email: user.email,
        role: user.role,
        salesLevel: user.salesLevel,
        assignedProductLineIds: user.assignedProductLineIds || [],
        children: children.map(child => buildNode(child))
      }
    }

    return {
      tenantId,
      roots: rootUsers.map(user => buildNode(user)),
      totalUsers: users.length,
      unassigned: users.filter(u => !u.managerId && u.role === 'salesperson').length
    }
  } catch (error) {
    console.error('Error building team hierarchy:', error)
    throw error
  }
}

/**
 * Get team statistics for a manager
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<Object>} - Team statistics
 */
export const getTeamStats = async (managerId) => {
  try {
    const teamMembers = await getTeamMembers(managerId)
    const directReports = await getDirectReports(managerId)

    return {
      totalTeamSize: teamMembers.length,
      directReports: directReports.length,
      byRole: teamMembers.reduce((acc, member) => {
        const role = member.role || 'salesperson'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {}),
      bySalesLevel: teamMembers.reduce((acc, member) => {
        const level = member.salesLevel || 'unassigned'
        acc[level] = (acc[level] || 0) + 1
        return acc
      }, {})
    }
  } catch (error) {
    console.error('Error getting team stats:', error)
    throw error
  }
}

/**
 * Bulk assign salespeople to a manager
 * @param {string} managerId - Manager's user ID
 * @param {string[]} userIds - Array of user IDs to assign
 * @returns {Promise<Object>} - Result summary
 */
export const bulkAssignToManager = async (managerId, userIds) => {
  try {
    const results = {
      success: [],
      failed: []
    }

    for (const userId of userIds) {
      try {
        await assignSalespersonToManager(userId, managerId)
        results.success.push(userId)
      } catch (error) {
        results.failed.push({ userId, error: error.message })
      }
    }

    return results
  } catch (error) {
    console.error('Error bulk assigning to manager:', error)
    throw error
  }
}

/**
 * Bulk remove salespeople from their managers
 * @param {string[]} userIds - Array of user IDs to unassign
 * @returns {Promise<Object>} - Result summary
 */
export const bulkRemoveFromManagers = async (userIds) => {
  try {
    const results = {
      success: [],
      failed: []
    }

    for (const userId of userIds) {
      try {
        await removeSalespersonFromManager(userId)
        results.success.push(userId)
      } catch (error) {
        results.failed.push({ userId, error: error.message })
      }
    }

    return results
  } catch (error) {
    console.error('Error bulk removing from managers:', error)
    throw error
  }
}

/**
 * Transfer team members from one manager to another
 * @param {string} fromManagerId - Current manager's user ID
 * @param {string} toManagerId - New manager's user ID
 * @param {string[]} userIds - Optional specific users (if empty, transfer all direct reports)
 * @returns {Promise<Object>} - Result summary
 */
export const transferTeamMembers = async (fromManagerId, toManagerId, userIds = null) => {
  try {
    // If no specific users, get all direct reports
    if (!userIds || userIds.length === 0) {
      const directReports = await getDirectReports(fromManagerId)
      userIds = directReports.map(u => u.id)
    }

    return await bulkAssignToManager(toManagerId, userIds)
  } catch (error) {
    console.error('Error transferring team members:', error)
    throw error
  }
}

/**
 * Get unassigned salespeople in a tenant (those without a manager)
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} - Array of unassigned user objects
 */
export const getUnassignedSalespeople = async (tenantId) => {
  try {
    const users = await getUsersByTenant(tenantId)
    return users.filter(u =>
      !u.managerId &&
      (u.role === 'salesperson' || u.salesLevel === 'salesperson')
    )
  } catch (error) {
    console.error('Error getting unassigned salespeople:', error)
    throw error
  }
}

/**
 * Validate team assignment (check for circular references)
 * @param {string} userId - User to be assigned
 * @param {string} proposedManagerId - Proposed manager
 * @returns {Promise<Object>} - Validation result
 */
export const validateTeamAssignment = async (userId, proposedManagerId) => {
  try {
    // Can't assign to self
    if (userId === proposedManagerId) {
      return { valid: false, error: 'User cannot be their own manager' }
    }

    // Check if proposed manager would create a circular reference
    // (i.e., the proposed manager is currently in the user's subordinate chain)
    const teamMembers = await getTeamMembers(userId)
    const teamMemberIds = teamMembers.map(m => m.id)

    if (teamMemberIds.includes(proposedManagerId)) {
      return {
        valid: false,
        error: 'This assignment would create a circular reference (the proposed manager reports to this user)'
      }
    }

    // Validate proposed manager exists and has manager role
    const proposedManager = await getUserData(proposedManagerId)
    if (!proposedManager) {
      return { valid: false, error: 'Proposed manager not found' }
    }

    // Get the user being assigned to determine valid manager roles
    const user = await getUserData(userId)
    let validManagerRoles = []
    if (user?.role === 'salesperson') {
      validManagerRoles = ['manager']
    } else if (user?.role === 'manager') {
      validManagerRoles = ['group-sales-manager']
    }

    const isValidManager = validManagerRoles.includes(proposedManager.role)

    if (!isValidManager) {
      return { valid: false, error: 'Proposed manager does not have a valid manager role for this user' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error validating team assignment:', error)
    return { valid: false, error: 'Validation error: ' + error.message }
  }
}

/**
 * Get team performance summary (placeholder for future metrics)
 * @param {string} managerId - Manager's user ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Team performance metrics
 */
export const getTeamPerformanceSummary = async (managerId, tenantId) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(managerId)

    // This is a placeholder - actual implementation would aggregate
    // client financials, deals, etc. for the team
    return {
      managerId,
      teamSize: accessibleUserIds.length,
      metrics: {
        // Future: Add actual metrics like:
        // totalRevenue, totalPipeline, clientCount, dealsClosed, etc.
      }
    }
  } catch (error) {
    console.error('Error getting team performance summary:', error)
    throw error
  }
}

/**
 * Get all sales managers in a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} - Array of sales manager user objects
 */
export const getSalesManagers = async (tenantId) => {
  try {
    const users = await getUsersByTenant(tenantId)
    return users.filter(u =>
      u.role === 'sales_manager' ||
      u.salesLevel === 'sales_manager'
    )
  } catch (error) {
    console.error('Error getting sales managers:', error)
    throw error
  }
}

/**
 * Get all sales heads in a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} - Array of sales head user objects
 */
export const getSalesHeads = async (tenantId) => {
  try {
    const users = await getUsersByTenant(tenantId)
    return users.filter(u =>
      u.role === 'sales_head' ||
      u.salesLevel === 'sales_head'
    )
  } catch (error) {
    console.error('Error getting sales heads:', error)
    throw error
  }
}

/**
 * Check if user can manage another user
 * @param {string} userId - Current user ID
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<boolean>}
 */
export const canManageUser = async (userId, targetUserId) => {
  try {
    if (userId === targetUserId) return false

    const accessibleIds = await getAccessibleUserIds(userId)
    return accessibleIds.includes(targetUserId)
  } catch (error) {
    console.error('Error checking manage permission:', error)
    return false
  }
}

/**
 * Recalculate and fix teamLeadOf arrays for all managers in a tenant
 * (Utility function to fix denormalization inconsistencies)
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Fix results
 */
export const recalculateTeamLeadOf = async (tenantId) => {
  try {
    const users = await getUsersByTenant(tenantId)
    const batch = writeBatch(db)
    let updateCount = 0

    // Build manager -> team mapping from managerId references
    const managerTeams = new Map()

    for (const user of users) {
      if (user.managerId) {
        const currentTeam = managerTeams.get(user.managerId) || []
        currentTeam.push(user.id)
        managerTeams.set(user.managerId, currentTeam)
      }
    }

    // Update each manager's teamLeadOf array
    for (const [managerId, teamIds] of managerTeams) {
      const managerRef = doc(db, 'users', managerId)
      batch.update(managerRef, {
        teamLeadOf: teamIds,
        updatedAt: serverTimestamp()
      })
      updateCount++
    }

    // Clear teamLeadOf for users who are no longer managers
    for (const user of users) {
      if (!managerTeams.has(user.id) && user.teamLeadOf?.length > 0) {
        const userRef = doc(db, 'users', user.id)
        batch.update(userRef, {
          teamLeadOf: [],
          updatedAt: serverTimestamp()
        })
        updateCount++
      }
    }

    if (updateCount > 0) {
      await batch.commit()
    }

    return {
      success: true,
      updatedCount: updateCount
    }
  } catch (error) {
    console.error('Error recalculating teamLeadOf:', error)
    throw error
  }
}

export default {
  buildTeamHierarchy,
  getTeamStats,
  bulkAssignToManager,
  bulkRemoveFromManagers,
  transferTeamMembers,
  getUnassignedSalespeople,
  validateTeamAssignment,
  getTeamPerformanceSummary,
  getSalesManagers,
  getSalesHeads,
  canManageUser,
  recalculateTeamLeadOf
}
