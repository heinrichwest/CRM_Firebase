/**
 * Tenant Fix Service
 *
 * This service fixes tenant ID issues across all collections in the database.
 * Run this once to ensure all tenant-specific data has the correct tenantId.
 *
 * COLLECTIONS REQUIRING tenantId (tenant-specific business data):
 * - users (user accounts)
 * - clients (client records)
 * - deals (sales deals)
 * - messages (internal messages)
 * - followUpTasks (follow-up tasks)
 * - quotes (client quotes)
 * - invoices (invoices)
 * - forecasts (revenue forecasts)
 * - feedback (client feedback)
 * - clientFinancials (financial data)
 * - budgets (budget tracking)
 * - skillsPartners (skills partners/vendors)
 * - tenantProductConfigs (tenant-specific product configs)
 * - financialData (uploaded financial data)
 * - financialUploads (upload history)
 * - salesTeams (sales team structure)
 * - pipelineStatuses (tenant-specific workflow stages)
 *
 * COLLECTIONS NOT REQUIRING tenantId (system-wide defaults):
 * - tenants (tenant definitions themselves)
 * - roles (role definitions - shared across system)
 * - calculationOptions (calculation options - shared)
 * - products (system product catalog - tenants enable via tenantProductConfigs)
 * - productLines (system product categories)
 * - calculationTemplates (system calculation templates)
 * - systemSettings (uses document ID pattern: settingName_{tenantId})
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Default tenant ID for fixing records
const DEFAULT_TENANT_ID = 'speccon'

// Collections that require tenantId (tenant-specific business data)
export const TENANT_COLLECTIONS = [
  'users',
  'clients',
  'deals',
  'messages',
  'followUpTasks',
  'quotes',
  'invoices',
  'forecasts',
  'feedback',
  'clientFinancials',
  'budgets',
  'skillsPartners',
  'tenantProductConfigs',
  'financialData',
  'financialUploads',
  'salesTeams',
  'pipelineStatuses'
]

// Collections that do NOT require tenantId (system-wide defaults)
// These are shared templates/catalogs that all tenants can use
// Tenants customize via tenantProductConfigs (enable/disable, list overrides)
export const SYSTEM_COLLECTIONS = [
  'tenants',              // Tenant definitions themselves
  'roles',                // Role definitions (shared across system)
  'calculationOptions',   // Calculation dropdown options (shared)
  'products',             // System product catalog (tenants enable via tenantProductConfigs)
  'productLines',         // System product categories
  'calculationTemplates'  // System calculation templates
  // Note: systemSettings uses document ID pattern (e.g., pipelineStatuses_speccon)
]

// Invalid tenant IDs that should be fixed
// Note: 'infinity' is a valid tenant ID for Infinity users
const INVALID_TENANT_IDS = ['null', 'undefined', '', null, undefined]

/**
 * Check if a tenantId is valid
 */
const isValidTenantId = (tenantId) => {
  if (!tenantId) return false
  if (typeof tenantId !== 'string') return false
  if (INVALID_TENANT_IDS.includes(tenantId)) return false
  if (tenantId.trim() === '') return false
  return true
}

/**
 * Fix tenant IDs in a specific collection
 * @param {string} collectionName - Name of the collection to fix
 * @param {string} targetTenantId - The tenant ID to set for invalid records
 * @returns {Object} Results with counts of fixed records
 */
export const fixCollectionTenantIds = async (collectionName, targetTenantId = DEFAULT_TENANT_ID) => {
  const results = {
    collection: collectionName,
    totalRecords: 0,
    validRecords: 0,
    fixedRecords: 0,
    errors: []
  }

  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)

    results.totalRecords = snapshot.docs.length

    const batch = writeBatch(db)
    let batchCount = 0
    const MAX_BATCH_SIZE = 500

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const currentTenantId = data.tenantId

      if (isValidTenantId(currentTenantId)) {
        results.validRecords++
      } else {
        // Fix invalid tenant ID
        try {
          const docRef = doc(db, collectionName, docSnap.id)
          batch.update(docRef, { tenantId: targetTenantId })
          batchCount++
          results.fixedRecords++

          // Commit batch if we hit the limit
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit()
            batchCount = 0
          }
        } catch (error) {
          results.errors.push({
            docId: docSnap.id,
            error: error.message
          })
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit()
    }

    return results
  } catch (error) {
    console.error(`Error fixing collection ${collectionName}:`, error)
    results.errors.push({ error: error.message })
    return results
  }
}

/**
 * Fix all collections with tenant ID issues
 * @param {string} targetTenantId - The tenant ID to set for invalid records
 * @returns {Object} Summary of all fixes
 */
export const fixAllTenantIds = async (targetTenantId = DEFAULT_TENANT_ID) => {
  console.log('Starting tenant ID fix for all collections...')
  console.log(`Target tenant ID: ${targetTenantId}`)

  const summary = {
    targetTenantId,
    startTime: new Date().toISOString(),
    collections: {},
    totalFixed: 0,
    totalErrors: 0
  }

  for (const collectionName of TENANT_COLLECTIONS) {
    console.log(`Processing collection: ${collectionName}`)

    const result = await fixCollectionTenantIds(collectionName, targetTenantId)
    summary.collections[collectionName] = result
    summary.totalFixed += result.fixedRecords
    summary.totalErrors += result.errors.length

    console.log(`  - Total: ${result.totalRecords}, Valid: ${result.validRecords}, Fixed: ${result.fixedRecords}, Errors: ${result.errors.length}`)
  }

  summary.endTime = new Date().toISOString()

  console.log('\n=== TENANT FIX COMPLETE ===')
  console.log(`Total records fixed: ${summary.totalFixed}`)
  console.log(`Total errors: ${summary.totalErrors}`)

  return summary
}

/**
 * Get a report of tenant ID issues without fixing them
 * @returns {Object} Report of all issues found
 */
export const auditTenantIds = async () => {
  console.log('Auditing tenant IDs across all collections...')

  const report = {
    timestamp: new Date().toISOString(),
    collections: {},
    totalIssues: 0,
    invalidTenantIds: {}
  }

  for (const collectionName of TENANT_COLLECTIONS) {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)

    const issues = []
    const tenantIdCounts = {}

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const tenantId = data.tenantId

      // Count tenant IDs
      const key = tenantId === null || tenantId === undefined ? 'null/undefined' : String(tenantId)
      tenantIdCounts[key] = (tenantIdCounts[key] || 0) + 1

      if (!isValidTenantId(tenantId)) {
        issues.push({
          docId: docSnap.id,
          currentTenantId: tenantId,
          email: data.email || data.name || data.clientName || 'N/A'
        })
      }
    }

    report.collections[collectionName] = {
      totalRecords: snapshot.docs.length,
      issueCount: issues.length,
      tenantIdDistribution: tenantIdCounts,
      sampleIssues: issues.slice(0, 5) // First 5 issues as samples
    }

    report.totalIssues += issues.length

    // Track invalid tenant IDs globally
    for (const [tid, count] of Object.entries(tenantIdCounts)) {
      if (!isValidTenantId(tid === 'null/undefined' ? null : tid)) {
        report.invalidTenantIds[tid] = (report.invalidTenantIds[tid] || 0) + count
      }
    }
  }

  console.log('\n=== AUDIT COMPLETE ===')
  console.log(`Total issues found: ${report.totalIssues}`)
  console.log('Invalid tenant IDs found:', report.invalidTenantIds)

  return report
}

/**
 * Fix specific user's tenant ID
 * @param {string} userId - User ID to fix
 * @param {string} tenantId - Correct tenant ID
 */
export const fixUserTenantId = async (userId, tenantId) => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, { tenantId })
    console.log(`Fixed user ${userId} tenant ID to ${tenantId}`)
    return { success: true, userId, tenantId }
  } catch (error) {
    console.error(`Error fixing user ${userId}:`, error)
    return { success: false, userId, error: error.message }
  }
}

/**
 * Fix Infinity users - users with 'Infinity' in their email should have tenantId 'infinity'
 * @returns {Object} Results with counts of fixed users
 */
export const fixInfinityUsers = async () => {
  console.log('Fixing Infinity users...')

  const results = {
    totalUsers: 0,
    alreadyCorrect: 0,
    fixed: 0,
    errors: [],
    fixedUsers: []
  }

  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    results.totalUsers = snapshot.docs.length

    const batch = writeBatch(db)
    let batchCount = 0
    const MAX_BATCH_SIZE = 500

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const email = data.email || ''

      // Check if email contains 'Infinity' (case-insensitive)
      if (email.toLowerCase().includes('infinity')) {
        // Check if tenantId is already 'infinity'
        if (data.tenantId === 'infinity') {
          results.alreadyCorrect++
        } else {
          // Fix the tenantId
          try {
            const docRef = doc(db, 'users', docSnap.id)
            batch.update(docRef, { tenantId: 'infinity' })
            batchCount++
            results.fixed++
            results.fixedUsers.push({
              id: docSnap.id,
              email: email,
              previousTenantId: data.tenantId
            })

            // Commit batch if we hit the limit
            if (batchCount >= MAX_BATCH_SIZE) {
              await batch.commit()
              batchCount = 0
            }
          } catch (error) {
            results.errors.push({
              userId: docSnap.id,
              email: email,
              error: error.message
            })
          }
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit()
    }

    console.log('\n=== INFINITY USERS FIX COMPLETE ===')
    console.log(`Total users scanned: ${results.totalUsers}`)
    console.log(`Already correct: ${results.alreadyCorrect}`)
    console.log(`Fixed: ${results.fixed}`)
    console.log(`Errors: ${results.errors.length}`)

    return results
  } catch (error) {
    console.error('Error fixing Infinity users:', error)
    results.errors.push({ error: error.message })
    return results
  }
}

/**
 * Get list of collections that don't require tenant IDs
 */
export const getSystemCollections = () => {
  return {
    collections: SYSTEM_COLLECTIONS,
    description: 'These collections are system-wide defaults. Tenants customize via tenantProductConfigs.',
    details: {
      tenants: 'Tenant definitions - the root of all tenant data',
      roles: 'Role definitions shared across the entire system',
      calculationOptions: 'Dropdown options for calculations (shared)',
      products: 'System product catalog - tenants enable/customize via tenantProductConfigs',
      productLines: 'Product categories - shared across all tenants',
      calculationTemplates: 'Calculation logic templates - shared, customized per product'
    }
  }
}

export default {
  fixCollectionTenantIds,
  fixAllTenantIds,
  auditTenantIds,
  fixUserTenantId,
  fixInfinityUsers,
  getSystemCollections,
  TENANT_COLLECTIONS,
  SYSTEM_COLLECTIONS
}
