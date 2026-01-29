import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTenant, isSystemAdmin as checkSystemAdmin } from '../services/tenantService'
import { getRole } from '../services/roleService'
import {
  getAccessibleUserIds,
  getDirectReports,
  getEffectiveProductLineIds
} from '../services/userService'

// API Auth imports
import {
  isAuthenticated as apiIsAuthenticated,
  getCurrentUserId,
  getCurrentTenantId,
  getCurrentRole,
  getCurrentClaims,
  logout as apiLogout,
  getUserDetail
} from '../api'
import { hasTokens, clearTokens } from '../api/auth/tokenStorage'

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

  // Team hierarchy state
  const [accessibleUserIds, setAccessibleUserIds] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [effectiveProductLineIds, setEffectiveProductLineIds] = useState([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)

  // Initialize auth session on mount (with timeout so we never hang on blank/loading)
  useEffect(() => {
    let timeoutId = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev))
    }, 15000)
    const init = async () => {
      try {
        await initializeApiAuth()
      } finally {
        clearTimeout(timeoutId)
      }
    }
    init()
    return () => clearTimeout(timeoutId)
  }, [])

  // Listen for auth:logout events from apiClient
  useEffect(() => {
    const handleLogout = (event) => {
      console.log('Auth logout event received:', event.detail?.reason)
      clearUserState()
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  // Initialize API-based auth session
  const initializeApiAuth = async () => {
    try {
      if (!hasTokens() || !apiIsAuthenticated()) {
        clearUserState()
        setLoading(false)
        return
      }

      const userId = getCurrentUserId()
      const tenantId = getCurrentTenantId()
      let userDetails

      try {
        userDetails = await getUserDetail()
      } catch (apiError) {
        // UserDetail/GetCurrentUser may not exist (404) – build minimal user from JWT so login still works
        console.warn('User detail API failed, using JWT claims:', apiError?.message)
        const claims = getCurrentClaims() || {}
        userDetails = {
          id: userId,
          key: userId,
          email: claims.email || claims.Email || '',
          name: claims.name || claims.Name || claims.email || claims.Email || userId,
          displayName: claims.name || claims.Name || claims.email || claims.Email || userId,
          tenantId: tenantId || claims.tenantId,
          role: getCurrentRole() || claims.role
        }
      }

      const apiUser = {
        uid: userId,
        email: userDetails.email,
        displayName: userDetails.displayName || userDetails.name,
        tenantId: userDetails.tenantId || tenantId
      }

      setCurrentUser(apiUser)
      await loadUserDataFromApi(userDetails)
    } catch (error) {
      console.error('Error initializing API auth:', error)
      clearTokens()
      clearUserState()
    } finally {
      setLoading(false)
    }
  }

  // Clear all user state (logout)
  const clearUserState = () => {
    setCurrentUser(null)
    setUserData(null)
    setUserRole(null)
    setIsSystemAdmin(false)
    setCurrentTenant(null)
    setAccessibleUserIds([])
    setTeamMembers([])
    setEffectiveProductLineIds([])
  }

  // Load user data from API response
  const loadUserDataFromApi = async (userDetails) => {
    try {
      const userId = userDetails.id || userDetails.key || getCurrentUserId()

      const data = {
        id: userId,
        ...userDetails
      }
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
    } catch (error) {
      console.error('Error loading user data from API:', error)
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
      const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
      const isManager = salesLevel === 'sales_manager' ||
                       salesLevel === 'sales_head' ||
                       roleLower === 'salesmanager' ||
                       roleLower === 'salesmanagers' ||
                       roleLower === 'saleshead' ||
                       roleLower === 'groupsalesmanager' ||
                       roleLower === 'groupsalesmanagers' ||
                       roleLower === 'manager' ||
                       roleLower === 'managers' ||
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
    if (hasTokens() && apiIsAuthenticated()) {
      try {
        const userDetails = await getUserDetail()
        await loadUserDataFromApi(userDetails)
      } catch (error) {
        console.error('Error refreshing user data:', error)
      }
    }
  }

  // Get the current tenant ID for queries
  const getTenantId = () => {
    const jwtTenantId = getCurrentTenantId()
    if (jwtTenantId) {
      return jwtTenantId
    }

    const tenantId = currentTenant?.id || userData?.tenantId || null
    if (tenantId === 'null' || tenantId === 'undefined' || tenantId === '' || tenantId === null || tenantId === undefined) {
      console.warn('Invalid tenantId detected:', tenantId, '- user may not have a tenant assigned')
      return null
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
    const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
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
  }, [userData])

  // Check if current user is a Sales Head (sees all teams)
  const isSalesHead = useCallback(() => {
    if (!userData) return false
    if (isSystemAdmin) return true
    const roleLower = (userData.role || '').toLowerCase().replace(/[\s_-]/g, '')
    return userData.salesLevel === 'sales_head' ||
           roleLower === 'saleshead' ||
           roleLower === 'groupsalesmanager' ||
           roleLower === 'groupsalesmanagers' ||
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

  // Logout function
  const signOut = async () => {
    await apiLogout()
    clearUserState()
  }

  // Re-run auth check (e.g. after login so currentUser is set before navigating)
  const refreshAuth = useCallback(async () => {
    setLoading(true)
    try {
      await initializeApiAuth()
    } finally {
      setLoading(false)
    }
  }, [])

  const value = {
    currentUser,
    userData,
    userRole,
    isSystemAdmin,
    currentTenant,
    loading,
    switchTenant,
    refreshUserData,
    refreshAuth,
    getTenantId,
    hasPermission,
    hasTenantAccess,
    signOut,

    // Team hierarchy
    accessibleUserIds,
    teamMembers,
    effectiveProductLineIds,
    hierarchyLoading,
    isTeamManager,
    isSalesHead,
    canAccessUserData,
    refreshHierarchyData,

    // Auth mode indicator
    useFirebase: false
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export default TenantContext
