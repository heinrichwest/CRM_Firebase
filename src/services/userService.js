import { doc, setDoc, getDoc, getDocs, collection, updateDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Create or update a user document in Firestore
 * @param {Object} user - Firebase Auth user object or user data object
 * @returns {Promise<void>}
 */
export const createOrUpdateUser = async (user) => {
  if (!user) return

  try {
    const userId = user.uid || user.id
    if (!userId) return

    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    // Get existing data to preserve role and other fields
    const existingData = userSnap.exists() ? userSnap.data() : {}

    // Only update fields that come from Firebase Auth, preserve all other fields
    const updateData = {
      email: user.email || existingData.email || '',
      displayName: user.displayName || existingData.displayName || '',
      photoURL: user.photoURL || existingData.photoURL || '',
      provider: user.providerData?.[0]?.providerId || user.provider || existingData.provider || 'email',
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Auto-assign admin role for admin@speccon.co.za and make them system admin
    const userEmail = user.email || existingData.email || ''
    const shouldBeAdmin = userEmail.toLowerCase() === 'admin@speccon.co.za'
    const shouldBeSystemAdmin = userEmail.toLowerCase() === 'admin@speccon.co.za'
    const defaultRole = shouldBeAdmin ? 'admin' : (user.role || 'salesperson')

    // If user doesn't exist, create new document with default role
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...updateData,
        phone: user.phone || '',
        title: user.title || '',
        department: user.department || '',
        bio: user.bio || '',
        role: defaultRole,
        customPermissions: [],
        isSystemAdmin: shouldBeSystemAdmin, // Auto-set system admin for admin@speccon.co.za
        tenantId: null, // New users don't have a tenant until assigned
        createdAt: serverTimestamp(),
      }, { merge: true })
    } else {
      // If user exists, ONLY update auth-related fields and lastLogin
      // Preserve role, customPermissions, phone, title, department, bio, tenantId, etc.
      // But auto-set admin role for admin@speccon.co.za (override if needed)
      const finalRole = shouldBeAdmin ? 'admin' : (existingData.role || defaultRole)
      const finalIsSystemAdmin = shouldBeSystemAdmin || existingData.isSystemAdmin || false

      await setDoc(userRef, {
        ...existingData, // Keep all existing data first
        ...updateData,    // Then update only auth fields and timestamps
        // Explicitly preserve these fields if they exist
        role: finalRole,
        customPermissions: existingData.customPermissions || [],
        phone: existingData.phone || user.phone || '',
        title: existingData.title || user.title || '',
        department: existingData.department || user.department || '',
        bio: existingData.bio || user.bio || '',
        isSystemAdmin: finalIsSystemAdmin,
        tenantId: existingData.tenantId || null, // Preserve tenant assignment
      }, { merge: true })
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error)
    throw error
  }
}

/**
 * Get user document from Firestore
 * @param {string} userId - User ID (uid)
 * @returns {Promise<Object|null>}
 */
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() }
    }
    return null
  } catch (error) {
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
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      role: roleId,
      updatedAt: serverTimestamp()
    })
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
    const usersRef = collection(db, 'users')
    let q

    if (tenantId) {
      q = query(usersRef, where('tenantId', '==', tenantId))
    } else {
      q = usersRef
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting users by tenant:', error)
    throw error
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
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      tenantId,
      updatedAt: serverTimestamp()
    })
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
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      isSystemAdmin: isAdmin,
      updatedAt: serverTimestamp()
    })
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
    const userRef = doc(db, 'users', userId)

    // Get current user data to validate
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      throw new Error('User not found')
    }

    const updateData = {
      updatedAt: serverTimestamp()
    }

    // Update managerId if provided
    if (hierarchyData.managerId !== undefined) {
      // Prevent self-assignment
      if (hierarchyData.managerId === userId) {
        throw new Error('User cannot be their own manager')
      }
      updateData.managerId = hierarchyData.managerId
    }

    // Update salesLevel if provided
    if (hierarchyData.salesLevel !== undefined) {
      const validLevels = ['salesperson', 'sales_manager', 'sales_head', null]
      if (!validLevels.includes(hierarchyData.salesLevel)) {
        throw new Error('Invalid sales level')
      }
      updateData.salesLevel = hierarchyData.salesLevel
    }

    // Update assigned product lines if provided
    if (hierarchyData.assignedProductLineIds !== undefined) {
      updateData.assignedProductLineIds = hierarchyData.assignedProductLineIds || []
    }

    await updateDoc(userRef, updateData)

    // If managerId changed, update the manager's teamLeadOf array
    if (hierarchyData.managerId !== undefined) {
      const currentData = userSnap.data()
      const oldManagerId = currentData.managerId

      // Remove from old manager's team
      if (oldManagerId && oldManagerId !== hierarchyData.managerId) {
        await removeFromManagerTeam(oldManagerId, userId)
      }

      // Add to new manager's team
      if (hierarchyData.managerId) {
        await addToManagerTeam(hierarchyData.managerId, userId)
      }
    }
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
    // Validate manager exists and has appropriate role
    if (managerId) {
      const managerRef = doc(db, 'users', managerId)
      const managerSnap = await getDoc(managerRef)

      if (!managerSnap.exists()) {
        throw new Error('Manager not found')
      }

      const managerData = managerSnap.data()

      // Get the user being assigned to determine valid manager roles
      const userRef = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.exists() ? userSnap.data() : {}

      // Determine valid manager roles based on user's role
      let validManagerRoles = []
      if (userData.role === 'salesperson') {
        validManagerRoles = ['manager']
      } else if (userData.role === 'manager') {
        validManagerRoles = ['group-sales-manager']
      }

      if (!validManagerRoles.includes(managerData.role)) {
        throw new Error('Selected user is not a valid manager for this role')
      }
    }

    await updateUserHierarchy(userId, { managerId })
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
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error('User not found')
    }

    const userData = userSnap.data()
    const oldManagerId = userData.managerId

    // Update user to remove manager
    await updateDoc(userRef, {
      managerId: null,
      updatedAt: serverTimestamp()
    })

    // Remove from old manager's team
    if (oldManagerId) {
      await removeFromManagerTeam(oldManagerId, userId)
    }
  } catch (error) {
    console.error('Error removing salesperson from manager:', error)
    throw error
  }
}

/**
 * Add a user to a manager's teamLeadOf array (internal helper)
 * @param {string} managerId - Manager's user ID
 * @param {string} userId - User to add to team
 */
const addToManagerTeam = async (managerId, userId) => {
  try {
    const managerRef = doc(db, 'users', managerId)
    const managerSnap = await getDoc(managerRef)

    if (managerSnap.exists()) {
      const managerData = managerSnap.data()
      const currentTeam = managerData.teamLeadOf || []

      if (!currentTeam.includes(userId)) {
        await updateDoc(managerRef, {
          teamLeadOf: [...currentTeam, userId],
          updatedAt: serverTimestamp()
        })
      }
    }
  } catch (error) {
    console.error('Error adding to manager team:', error)
    // Don't throw - this is a denormalization update
  }
}

/**
 * Remove a user from a manager's teamLeadOf array (internal helper)
 * @param {string} managerId - Manager's user ID
 * @param {string} userId - User to remove from team
 */
const removeFromManagerTeam = async (managerId, userId) => {
  try {
    const managerRef = doc(db, 'users', managerId)
    const managerSnap = await getDoc(managerRef)

    if (managerSnap.exists()) {
      const managerData = managerSnap.data()
      const currentTeam = managerData.teamLeadOf || []

      if (currentTeam.includes(userId)) {
        await updateDoc(managerRef, {
          teamLeadOf: currentTeam.filter(id => id !== userId),
          updatedAt: serverTimestamp()
        })
      }
    }
  } catch (error) {
    console.error('Error removing from manager team:', error)
    // Don't throw - this is a denormalization update
  }
}

/**
 * Get direct reports for a manager
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<Array>} - Array of user objects
 */
export const getDirectReports = async (managerId) => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('managerId', '==', managerId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting direct reports:', error)
    throw error
  }
}

/**
 * Get all users in a manager's team (recursive - all levels below)
 * @param {string} managerId - Manager's user ID
 * @returns {Promise<Array>} - Array of user objects
 */
export const getTeamMembers = async (managerId) => {
  try {
    const allMembers = []
    const directReports = await getDirectReports(managerId)

    for (const report of directReports) {
      allMembers.push(report)
      // Recursively get sub-team members
      const subMembers = await getTeamMembers(report.id)
      allMembers.push(...subMembers)
    }

    return allMembers
  } catch (error) {
    console.error('Error getting team members:', error)
    throw error
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
    // Normalize role to lowercase without spaces/dashes/underscores for comparison
    const roleLower = role.toLowerCase().replace(/[\s_-]/g, '')

    // Sales Head (Group Sales Manager) or Admin sees everyone in tenant
    const isSalesHead = salesLevel === 'sales_head' ||
                        roleLower === 'saleshead' ||
                        roleLower === 'groupsalesmanager' ||
                        roleLower === 'groupsalesmanagers' ||  // plural variant
                        roleLower === 'admin'
    if (isSalesHead) {
      const tenantUsers = await getUsersByTenant(userData.tenantId)
      return tenantUsers.map(u => u.id)
    }

    // Sales Manager (regular manager) sees only their direct reports
    const isManager = salesLevel === 'sales_manager' ||
                      roleLower === 'salesmanager' ||
                      roleLower === 'salesmanagers' ||  // plural variant
                      roleLower === 'manager' ||
                      roleLower === 'managers'  // plural variant
    if (isManager) {
      const teamMembers = await getTeamMembers(userId)
      return [...accessibleIds, ...teamMembers.map(m => m.id)]
    }

    // Regular salesperson sees only themselves
    return accessibleIds
  } catch (error) {
    console.error('Error getting accessible user IDs:', error)
    return [userId] // Fallback to just self
  }
}

/**
 * Get potential managers for a user based on their role
 * Hierarchy:
 * - Salesperson → can have Manager as their manager
 * - Manager → can have Group Sales Manager as their manager
 * - Group Sales Manager → no manager (top of hierarchy)
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
    // Filter by tenant - managers must be in the same tenant
    const users = await getUsersByTenant(tenantId)

    // Determine valid manager roles based on user's role
    let validManagerRoles = []
    if (userRole === 'salesperson') {
      // Salespeople can have Managers as their manager
      validManagerRoles = ['manager']
    } else if (userRole === 'manager') {
      // Managers can have Group Sales Managers as their manager
      validManagerRoles = ['group-sales-manager']
    }
    // Group Sales Managers have no manager (top of hierarchy)

    return users.filter(u => validManagerRoles.includes(u.role))
  } catch (error) {
    console.error('Error getting managers:', error)
    throw error
  }
}

/**
 * Get user's manager chain (list of managers up to top)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of manager user objects (immediate manager first)
 */
export const getManagerChain = async (userId) => {
  try {
    const chain = []
    let currentUser = await getUserData(userId)

    while (currentUser?.managerId) {
      const manager = await getUserData(currentUser.managerId)
      if (!manager) break

      chain.push(manager)
      currentUser = manager

      // Safety: prevent infinite loops
      if (chain.length > 10) break
    }

    return chain
  } catch (error) {
    console.error('Error getting manager chain:', error)
    throw error
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
    const userRef = doc(db, 'users', managerId)
    await updateDoc(userRef, {
      assignedProductLineIds: productLineIds || [],
      updatedAt: serverTimestamp()
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
    const userData = await getUserData(userId)
    if (!userData) return []

    // If user has their own assigned product lines, use those
    if (userData.assignedProductLineIds?.length > 0) {
      return userData.assignedProductLineIds
    }

    // Otherwise, inherit from manager
    if (userData.managerId) {
      const managerData = await getUserData(userData.managerId)
      if (managerData?.assignedProductLineIds?.length > 0) {
        return managerData.assignedProductLineIds
      }
    }

    // No restrictions - return empty (means all products available)
    return []
  } catch (error) {
    console.error('Error getting effective product lines:', error)
    return []
  }
}

