/**
 * Product Migration Service
 *
 * Migrates existing products to the new template-based system.
 * Adds calculationTemplateId and related fields to products.
 */

import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import { DEFAULT_CALCULATION_TEMPLATES } from './calculationTemplateService'

/**
 * Map product line IDs to calculation template IDs
 */
const PRODUCT_LINE_TO_TEMPLATE_MAP = {
  'learnerships': 'learnership',
  'tapBusiness': 'subscription',
  'compliance': 'once-off-training',
  'otherCourses': 'once-off-training',
  'consulting': 'consulting'
}

/**
 * Default values for each template type
 */
const DEFAULT_VALUES_BY_TEMPLATE = {
  'learnership': {
    duration: 12,
    costPerLearner: 35000
  },
  'subscription': {
    contractMonths: 12,
    monthlyFee: 5000
  },
  'once-off-training': {
    attendees: 1,
    costPerAttendee: 3500
  },
  'consulting': {
    hours: 8,
    ratePerHour: 1500
  }
}

/**
 * Get migration status for all products
 * @returns {Object} - Status with counts and details
 */
export const getMigrationStatus = async () => {
  try {
    const productsRef = collection(db, 'products')
    const snapshot = await getDocs(productsRef)

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const migrated = products.filter(p => p.calculationTemplateId)
    const notMigrated = products.filter(p => !p.calculationTemplateId)

    return {
      total: products.length,
      migratedCount: migrated.length,
      notMigratedCount: notMigrated.length,
      migrated: migrated.map(p => ({
        id: p.id,
        name: p.name,
        templateId: p.calculationTemplateId
      })),
      notMigrated: notMigrated.map(p => ({
        id: p.id,
        name: p.name,
        productLineId: p.productLineId,
        suggestedTemplate: PRODUCT_LINE_TO_TEMPLATE_MAP[p.productLineId] || 'once-off-training'
      }))
    }
  } catch (error) {
    console.error('Error getting migration status:', error)
    throw error
  }
}

/**
 * Migrate a single product to the new template system
 * @param {string} productId - Product ID to migrate
 * @param {string} templateId - Template ID to assign (optional, will auto-detect)
 * @returns {Object} - Migration result
 */
export const migrateProduct = async (productId, templateId = null) => {
  try {
    const productRef = doc(db, 'products', productId)

    // Get product data to determine template
    const productsRef = collection(db, 'products')
    const snapshot = await getDocs(productsRef)
    const productDoc = snapshot.docs.find(d => d.id === productId)

    if (!productDoc) {
      throw new Error('Product not found')
    }

    const productData = productDoc.data()

    // Already migrated?
    if (productData.calculationTemplateId) {
      return {
        success: true,
        message: 'Product already migrated',
        templateId: productData.calculationTemplateId
      }
    }

    // Determine template ID
    const assignedTemplateId = templateId ||
      PRODUCT_LINE_TO_TEMPLATE_MAP[productData.productLineId] ||
      'once-off-training'

    // Verify template exists
    if (!DEFAULT_CALCULATION_TEMPLATES[assignedTemplateId]) {
      throw new Error(`Unknown template: ${assignedTemplateId}`)
    }

    // Get default values for this template
    const defaultValues = DEFAULT_VALUES_BY_TEMPLATE[assignedTemplateId] || {}

    // Build custom lists from product data (if any legacy lists exist)
    const customLists = {}

    // Update the product
    await updateDoc(productRef, {
      calculationTemplateId: assignedTemplateId,
      defaultValues: defaultValues,
      customLists: customLists,
      migratedAt: serverTimestamp(),
      migratedFrom: 'legacy-system'
    })

    return {
      success: true,
      productId,
      productName: productData.name,
      templateId: assignedTemplateId,
      defaultValues
    }
  } catch (error) {
    console.error('Error migrating product:', error)
    throw error
  }
}

/**
 * Migrate all products that don't have a calculationTemplateId
 * @param {boolean} dryRun - If true, don't actually update, just return what would be done
 * @returns {Object} - Migration results
 */
export const migrateAllProducts = async (dryRun = false) => {
  try {
    const productsRef = collection(db, 'products')
    const snapshot = await getDocs(productsRef)

    const results = {
      total: snapshot.docs.length,
      migrated: [],
      skipped: [],
      errors: []
    }

    const batch = writeBatch(db)
    let batchCount = 0
    const MAX_BATCH_SIZE = 500 // Firestore limit

    for (const productDoc of snapshot.docs) {
      const productData = productDoc.data()

      // Skip already migrated products
      if (productData.calculationTemplateId) {
        results.skipped.push({
          id: productDoc.id,
          name: productData.name,
          reason: 'Already migrated'
        })
        continue
      }

      // Determine template
      const templateId = PRODUCT_LINE_TO_TEMPLATE_MAP[productData.productLineId] || 'once-off-training'

      // Verify template exists
      if (!DEFAULT_CALCULATION_TEMPLATES[templateId]) {
        results.errors.push({
          id: productDoc.id,
          name: productData.name,
          error: `Unknown template: ${templateId}`
        })
        continue
      }

      // Get default values
      const defaultValues = DEFAULT_VALUES_BY_TEMPLATE[templateId] || {}

      if (dryRun) {
        results.migrated.push({
          id: productDoc.id,
          name: productData.name,
          templateId,
          defaultValues,
          dryRun: true
        })
      } else {
        // Add to batch
        const productRef = doc(db, 'products', productDoc.id)
        batch.update(productRef, {
          calculationTemplateId: templateId,
          defaultValues: defaultValues,
          customLists: {},
          migratedAt: serverTimestamp(),
          migratedFrom: 'legacy-system'
        })

        results.migrated.push({
          id: productDoc.id,
          name: productData.name,
          templateId,
          defaultValues
        })

        batchCount++

        // Commit batch if it reaches the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit()
          batchCount = 0
        }
      }
    }

    // Commit remaining batch
    if (!dryRun && batchCount > 0) {
      await batch.commit()
    }

    return results
  } catch (error) {
    console.error('Error migrating all products:', error)
    throw error
  }
}

/**
 * Rollback migration for a single product
 * @param {string} productId - Product ID to rollback
 */
export const rollbackProductMigration = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId)

    await updateDoc(productRef, {
      calculationTemplateId: null,
      defaultValues: null,
      customLists: null,
      migratedAt: null,
      migratedFrom: null,
      updatedAt: serverTimestamp()
    })

    return { success: true, productId }
  } catch (error) {
    console.error('Error rolling back migration:', error)
    throw error
  }
}

/**
 * Rollback all migrations
 * @param {boolean} dryRun - If true, don't actually update
 */
export const rollbackAllMigrations = async (dryRun = false) => {
  try {
    const productsRef = collection(db, 'products')
    const snapshot = await getDocs(productsRef)

    const results = {
      total: 0,
      rolledBack: [],
      skipped: []
    }

    const batch = writeBatch(db)
    let batchCount = 0

    for (const productDoc of snapshot.docs) {
      const productData = productDoc.data()

      // Skip products that weren't migrated
      if (!productData.calculationTemplateId) {
        results.skipped.push({
          id: productDoc.id,
          name: productData.name
        })
        continue
      }

      results.total++

      if (dryRun) {
        results.rolledBack.push({
          id: productDoc.id,
          name: productData.name,
          dryRun: true
        })
      } else {
        const productRef = doc(db, 'products', productDoc.id)
        batch.update(productRef, {
          calculationTemplateId: null,
          defaultValues: null,
          customLists: null,
          migratedAt: null,
          migratedFrom: null,
          updatedAt: serverTimestamp()
        })

        results.rolledBack.push({
          id: productDoc.id,
          name: productData.name
        })

        batchCount++

        if (batchCount >= 500) {
          await batch.commit()
          batchCount = 0
        }
      }
    }

    if (!dryRun && batchCount > 0) {
      await batch.commit()
    }

    return results
  } catch (error) {
    console.error('Error rolling back all migrations:', error)
    throw error
  }
}

/**
 * Verify migration integrity - check all products have valid templates
 */
export const verifyMigration = async () => {
  try {
    const productsRef = collection(db, 'products')
    const snapshot = await getDocs(productsRef)

    const results = {
      valid: [],
      invalid: [],
      missing: []
    }

    for (const productDoc of snapshot.docs) {
      const productData = productDoc.data()

      if (!productData.calculationTemplateId) {
        results.missing.push({
          id: productDoc.id,
          name: productData.name,
          productLineId: productData.productLineId
        })
        continue
      }

      const template = DEFAULT_CALCULATION_TEMPLATES[productData.calculationTemplateId]
      if (!template) {
        results.invalid.push({
          id: productDoc.id,
          name: productData.name,
          templateId: productData.calculationTemplateId,
          error: 'Template not found'
        })
        continue
      }

      results.valid.push({
        id: productDoc.id,
        name: productData.name,
        templateId: productData.calculationTemplateId,
        templateName: template.name
      })
    }

    return {
      isComplete: results.missing.length === 0 && results.invalid.length === 0,
      summary: {
        valid: results.valid.length,
        invalid: results.invalid.length,
        missing: results.missing.length
      },
      details: results
    }
  } catch (error) {
    console.error('Error verifying migration:', error)
    throw error
  }
}

export default {
  getMigrationStatus,
  migrateProduct,
  migrateAllProducts,
  rollbackProductMigration,
  rollbackAllMigrations,
  verifyMigration
}
