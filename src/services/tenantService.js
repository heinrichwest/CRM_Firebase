import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../config/firebase'

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

/**
 * Get all tenants (system admin only)
 */
export const getTenants = async () => {
  try {
    const tenantsRef = collection(db, 'tenants')
    const snapshot = await getDocs(tenantsRef)
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(t => !t.deleted)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting tenants:', error)
    throw error
  }
}

/**
 * Get a single tenant by ID
 */
export const getTenant = async (tenantId) => {
  try {
    const tenantRef = doc(db, 'tenants', tenantId)
    const tenantSnap = await getDoc(tenantRef)

    if (tenantSnap.exists()) {
      return { id: tenantSnap.id, ...tenantSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting tenant:', error)
    throw error
  }
}

/**
 * Create a new tenant with its first admin user
 * @param {Object} tenantData - Tenant information
 * @param {string} tenantData.name - Tenant name
 * @param {string} tenantData.description - Tenant description
 * @param {Object} adminUserData - First admin user data
 * @param {string} adminUserData.email - Admin email
 * @param {string} adminUserData.displayName - Admin display name
 * @returns {Promise<{tenantId: string}>}
 */
export const createTenant = async (tenantData, adminUserData = null) => {
  try {
    // Generate a tenant ID from the name
    const tenantId = tenantData.id ||
      tenantData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check if tenant already exists
    const existingTenant = await getTenant(tenantId)
    if (existingTenant) {
      throw new Error('A tenant with this ID already exists')
    }

    const tenantRef = doc(db, 'tenants', tenantId)

    await setDoc(tenantRef, {
      name: tenantData.name,
      description: tenantData.description || '',
      status: 'active',
      settings: {
        currencySymbol: tenantData.currencySymbol || 'R',
        financialYearStart: tenantData.financialYearStart || 'March',
        financialYearEnd: tenantData.financialYearEnd || 'February',
        ...tenantData.settings
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

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
    const tenantRef = doc(db, 'tenants', tenantId)
    await updateDoc(tenantRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    })
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
    const tenantRef = doc(db, 'tenants', tenantId)
    await updateDoc(tenantRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
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
    // Count users for this tenant
    const usersRef = collection(db, 'users')
    const usersQuery = query(usersRef, where('tenantId', '==', tenantId))
    const usersSnap = await getDocs(usersQuery)

    // Count clients for this tenant
    const clientsRef = collection(db, 'clients')
    const clientsQuery = query(clientsRef, where('tenantId', '==', tenantId))
    const clientsSnap = await getDocs(clientsQuery)

    return {
      userCount: usersSnap.size,
      clientCount: clientsSnap.size
    }
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
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      tenantId,
      role,
      updatedAt: serverTimestamp()
    })
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
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      tenantId: null,
      updatedAt: serverTimestamp()
    })
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
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('tenantId', '==', tenantId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting tenant users:', error)
    throw error
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
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return userSnap.data().isSystemAdmin === true
    }
    return false
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

/**
 * Get all system admins
 */
export const getSystemAdmins = async () => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('isSystemAdmin', '==', true))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting system admins:', error)
    throw error
  }
}

// ============================================================================
// DATA MIGRATION UTILITIES
// ============================================================================

/**
 * Migrate existing data to a tenant
 * This updates all existing documents to include a tenantId
 * Should be run once to migrate existing Speccon data
 */
export const migrateDataToTenant = async (tenantId) => {
  try {
    const batch = writeBatch(db)
    let updateCount = 0
    const maxBatchSize = 400 // Firestore limit is 500, leave some buffer

    // Collections to migrate
    const collections = [
      'clients',
      'deals',
      'followUpTasks',
      'messages',
      'quotes',
      'invoices',
      'forecasts',
      'feedback',
      'clientFinancials',
      'budgets',
      'skillsPartners',
      'products',
      'productLines'
    ]

    for (const collectionName of collections) {
      const collRef = collection(db, collectionName)
      const snapshot = await getDocs(collRef)

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        // Only update if tenantId is not already set
        if (!data.tenantId) {
          batch.update(docSnap.ref, {
            tenantId,
            updatedAt: serverTimestamp()
          })
          updateCount++

          // Commit batch if approaching limit
          if (updateCount >= maxBatchSize) {
            await batch.commit()
            updateCount = 0
          }
        }
      }
    }

    // Migrate users - only those without tenantId and not system admins
    const usersRef = collection(db, 'users')
    const usersSnap = await getDocs(usersRef)

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data()
      // Only update non-system-admins without a tenantId
      if (!userData.tenantId && !userData.isSystemAdmin) {
        batch.update(userDoc.ref, {
          tenantId,
          updatedAt: serverTimestamp()
        })
        updateCount++

        if (updateCount >= maxBatchSize) {
          await batch.commit()
          updateCount = 0
        }
      }
    }

    // Migrate systemSettings
    const settingsRef = collection(db, 'systemSettings')
    const settingsSnap = await getDocs(settingsRef)

    for (const settingDoc of settingsSnap.docs) {
      const settingData = settingDoc.data()
      if (!settingData.tenantId) {
        batch.update(settingDoc.ref, {
          tenantId,
          updatedAt: serverTimestamp()
        })
        updateCount++
      }
    }

    // Commit any remaining updates
    if (updateCount > 0) {
      await batch.commit()
    }

    console.log('Data migration completed for tenant:', tenantId)
    return { success: true }
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
