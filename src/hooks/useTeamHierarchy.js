/**
 * useTeamHierarchy Hook
 *
 * Provides team hierarchy data and helper functions for components.
 * Wraps the TenantContext team data with additional utilities.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  buildTeamHierarchy,
  getTeamStats,
  getUnassignedSalespeople,
  validateTeamAssignment,
  getSalesManagers,
  getSalesHeads
} from '../services/salesTeamService'
import {
  assignSalespersonToManager,
  removeSalespersonFromManager,
  getManagersInTenant,
  updateUserHierarchy,
  assignProductLinesToManager
} from '../services/userService'

/**
 * Hook for team hierarchy management
 * @returns {Object} Team hierarchy data and functions
 */
export const useTeamHierarchy = () => {
  const {
    currentUser,
    userData,
    userRole,
    isSystemAdmin,
    currentTenant,
    accessibleUserIds,
    teamMembers,
    effectiveProductLineIds,
    hierarchyLoading,
    isTeamManager,
    isSalesHead,
    canAccessUserData,
    refreshHierarchyData,
    getTenantId
  } = useTenant()

  const [hierarchy, setHierarchy] = useState(null)
  const [managers, setManagers] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const tenantId = getTenantId()

  /**
   * Load full team hierarchy for visualization
   */
  const loadHierarchy = useCallback(async () => {
    if (!tenantId) return

    try {
      setLoading(true)
      setError(null)
      const hierarchyData = await buildTeamHierarchy(tenantId)
      setHierarchy(hierarchyData)
    } catch (err) {
      console.error('Error loading hierarchy:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  /**
   * Load managers in the tenant
   */
  const loadManagers = useCallback(async () => {
    if (!tenantId) return

    try {
      const managersData = await getManagersInTenant(tenantId)
      setManagers(managersData)
    } catch (err) {
      console.error('Error loading managers:', err)
    }
  }, [tenantId])

  /**
   * Load unassigned salespeople
   */
  const loadUnassigned = useCallback(async () => {
    if (!tenantId) return

    try {
      const unassignedData = await getUnassignedSalespeople(tenantId)
      setUnassigned(unassignedData)
    } catch (err) {
      console.error('Error loading unassigned:', err)
    }
  }, [tenantId])

  /**
   * Load team stats for current user (if manager)
   */
  const loadStats = useCallback(async () => {
    if (!currentUser || !isTeamManager()) return

    try {
      const statsData = await getTeamStats(currentUser.uid)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }, [currentUser, isTeamManager])

  /**
   * Assign a salesperson to a manager
   */
  const assignToManager = useCallback(async (userId, managerId) => {
    try {
      setError(null)

      // Validate first
      const validation = await validateTeamAssignment(userId, managerId)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      await assignSalespersonToManager(userId, managerId)

      // Refresh data
      await Promise.all([
        loadHierarchy(),
        loadUnassigned(),
        refreshHierarchyData()
      ])

      return { success: true }
    } catch (err) {
      console.error('Error assigning to manager:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [loadHierarchy, loadUnassigned, refreshHierarchyData])

  /**
   * Remove a salesperson from their manager
   */
  const removeFromManager = useCallback(async (userId) => {
    try {
      setError(null)
      await removeSalespersonFromManager(userId)

      // Refresh data
      await Promise.all([
        loadHierarchy(),
        loadUnassigned(),
        refreshHierarchyData()
      ])

      return { success: true }
    } catch (err) {
      console.error('Error removing from manager:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [loadHierarchy, loadUnassigned, refreshHierarchyData])

  /**
   * Update user's sales level
   */
  const updateSalesLevel = useCallback(async (userId, salesLevel) => {
    try {
      setError(null)
      await updateUserHierarchy(userId, { salesLevel })

      // Refresh data
      await loadHierarchy()
      await loadManagers()

      return { success: true }
    } catch (err) {
      console.error('Error updating sales level:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [loadHierarchy, loadManagers])

  /**
   * Assign product lines to a manager
   */
  const assignProductLines = useCallback(async (managerId, productLineIds) => {
    try {
      setError(null)
      await assignProductLinesToManager(managerId, productLineIds)

      // Refresh hierarchy data
      await refreshHierarchyData()

      return { success: true }
    } catch (err) {
      console.error('Error assigning product lines:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [refreshHierarchyData])

  /**
   * Check if current user can manage a target user
   */
  const canManage = useCallback((targetUserId) => {
    if (isSystemAdmin) return true
    if (isSalesHead()) return true
    if (!isTeamManager()) return false

    // Check if target is in accessible users
    return canAccessUserData(targetUserId)
  }, [isSystemAdmin, isSalesHead, isTeamManager, canAccessUserData])

  /**
   * Get the user's manager info
   */
  const getMyManager = useCallback(async () => {
    if (!userData?.managerId) return null

    try {
      const manager = managers.find(m => m.id === userData.managerId)
      return manager || null
    } catch (err) {
      console.error('Error getting manager:', err)
      return null
    }
  }, [userData, managers])

  // Load initial data when tenant changes
  useEffect(() => {
    if (tenantId) {
      loadManagers()
    }
  }, [tenantId, loadManagers])

  return {
    // Data from context
    accessibleUserIds,
    teamMembers,
    effectiveProductLineIds,
    hierarchyLoading,

    // Local state
    hierarchy,
    managers,
    unassigned,
    stats,
    loading,
    error,

    // Helper functions from context
    isTeamManager,
    isSalesHead,
    canAccessUserData,

    // Data loading functions
    loadHierarchy,
    loadManagers,
    loadUnassigned,
    loadStats,

    // Action functions
    assignToManager,
    removeFromManager,
    updateSalesLevel,
    assignProductLines,
    canManage,
    getMyManager,
    refreshHierarchyData
  }
}

export default useTeamHierarchy
