import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db, app } from '../config/firebase'
import { getTenant, isSystemAdmin as checkSystemAdmin } from '../services/tenantService'
import { getRole } from '../services/roleService'
import {
  getAccessibleUserIds,
  getDirectReports,
  getEffectiveProductLineIds
} from '../services/userService'

const TenantContext = createContext(null)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export const TenantProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [currentTenant, setCurrentTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuth(app)

  // Team hierarchy state
  const [accessibleUserIds, setAccessibleUserIds] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [effectiveProductLineIds, setEffectiveProductLineIds] = useState([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        await loadUserData(user.uid)
      } else {
        setCurrentUser(null)
        setUserData(null)
        setUserRole(null)
        setIsSystemAdmin(false)
        setCurrentTenant(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  const loadUserData = async (userId) => {
    try {
      // Get user document
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = { id: userSnap.id, ...userSnap.data() }
        setUserData(data)

        // Check if system admin
        const isSysAdmin = data.isSystemAdmin === true
        setIsSystemAdmin(isSysAdmin)

        // Load role
        if (data.role) {
          const role = await getRole(data.role)
          setUserRole(role)
        }

        // Load tenant (if user has one)
        if (data.tenantId) {
          const tenant = await getTenant(data.tenantId)
          setCurrentTenant(tenant)
        } else {
          setCurrentTenant(null)
        }

        // Load team hierarchy data
        await loadHierarchyData(userId, data)
      } else {
        setUserData(null)
        setUserRole(null)
        setIsSystemAdmin(false)
        setCurrentTenant(null)
        setAccessibleUserIds([])
        setTeamMembers([])
        setEffectiveProductLineIds([])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Load team hierarchy data
  const loadHierarchyData = async (userId, userData) => {
    try {
      setHierarchyLoading(true)

      // Get accessible user IDs (for data filtering)
      const userIds = await getAccessibleUserIds(userId, userData)
      setAccessibleUserIds(userIds)

      // Get direct reports (if user is a manager)
      const salesLevel = userData.salesLevel
      // Normalize role to lowercase without spaces/dashes/underscores for comparison
      const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
      const isManager = salesLevel === 'sales_manager' ||
                       salesLevel === 'sales_head' ||
                       roleLower === 'salesmanager' ||
                       roleLower === 'salesmanagers' ||  // plural variant
                       roleLower === 'saleshead' ||
                       roleLower === 'groupsalesmanager' ||
                       roleLower === 'groupsalesmanagers' ||  // plural variant
                       roleLower === 'manager' ||
                       roleLower === 'managers' ||  // plural variant
                       roleLower === 'admin'

      if (isManager) {
        const reports = await getDirectReports(userId)
        setTeamMembers(reports)
      } else {
        setTeamMembers([])
      }

      // Get effective product line IDs
      const productLineIds = await getEffectiveProductLineIds(userId)
      setEffectiveProductLineIds(productLineIds)
    } catch (error) {
      console.error('Error loading hierarchy data:', error)
      // Set defaults on error
      setAccessibleUserIds([userId])
      setTeamMembers([])
      setEffectiveProductLineIds([])
    } finally {
      setHierarchyLoading(false)
    }
  }

  // Switch to a different tenant (system admin only)
  const switchTenant = async (tenantId) => {
    if (!isSystemAdmin) {
      throw new Error('Only system admins can switch tenants')
    }

    if (tenantId) {
      const tenant = await getTenant(tenantId)
      setCurrentTenant(tenant)
    } else {
      setCurrentTenant(null)
    }
  }

  // Refresh user data (e.g., after profile update)
  const refreshUserData = async () => {
    if (currentUser) {
      await loadUserData(currentUser.uid)
    }
  }

  // Get the current tenant ID for queries
  const getTenantId = () => {
    const tenantId = currentTenant?.id || userData?.tenantId || null
    // Handle invalid tenant IDs (null, undefined, empty string)
    // Note: 'infinity' IS a valid tenant ID - do not treat it as invalid!
    if (tenantId === 'null' || tenantId === 'undefined' || tenantId === '' || tenantId === null || tenantId === undefined) {
      console.warn('Invalid tenantId detected:', tenantId, '- user may not have a tenant assigned')
      return null  // Return null so caller can handle appropriately
    }
    return tenantId
  }

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (isSystemAdmin) return true
    return userRole?.permissions?.includes(permission) || false
  }

  // Check if user has access to tenant features
  const hasTenantAccess = () => {
    return isSystemAdmin || !!currentTenant
  }

  // Check if current user is a team manager
  const isTeamManager = useCallback(() => {
    if (!userData) return false
    const salesLevel = userData.salesLevel
    // Normalize role to lowercase without spaces/dashes/underscores for comparison
    const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
    return salesLevel === 'sales_manager' ||
           salesLevel === 'sales_head' ||
           roleLower === 'salesmanager' ||
           roleLower === 'salesmanagers' ||  // plural variant
           roleLower === 'saleshead' ||
           roleLower === 'groupsalesmanager' ||
           roleLower === 'groupsalesmanagers' ||  // plural variant
           roleLower === 'manager' ||
           roleLower === 'managers' ||  // plural variant
           roleLower === 'admin'
  }, [userData])

  // Check if current user is a Sales Head (sees all teams)
  const isSalesHead = useCallback(() => {
    if (!userData) return false
    if (isSystemAdmin) return true
    // Normalize role to lowercase without spaces/dashes/underscores for comparison
    const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
    return userData.salesLevel === 'sales_head' ||
           roleLower === 'saleshead' ||
           roleLower === 'groupsalesmanager' ||
           roleLower === 'groupsalesmanagers' ||  // plural variant
           roleLower === 'admin'
  }, [userData, isSystemAdmin])

  // Check if current user can access another user's data
  const canAccessUserData = useCallback((targetUserId) => {
    if (isSystemAdmin) return true
    if (!targetUserId) return false
    return accessibleUserIds.includes(targetUserId)
  }, [isSystemAdmin, accessibleUserIds])

  // Refresh hierarchy data (call after team structure changes)
  const refreshHierarchyData = useCallback(async () => {
    if (currentUser && userData) {
      await loadHierarchyData(currentUser.uid, userData)
    }
  }, [currentUser, userData])

  const value = {
    currentUser,
    userData,
    userRole,
    isSystemAdmin,
    currentTenant,
    loading,
    switchTenant,
    refreshUserData,
    getTenantId,
    hasPermission,
    hasTenantAccess,

    // Team hierarchy
    accessibleUserIds,
    teamMembers,
    effectiveProductLineIds,
    hierarchyLoading,
    isTeamManager,
    isSalesHead,
    canAccessUserData,
    refreshHierarchyData
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export default TenantContext
