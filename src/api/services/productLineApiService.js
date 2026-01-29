/**
 * Product Line API Service
 *
 * Provides API operations for product lines and product catalog:
 * - Product lines (categories)
 * - Catalog products
 * - Product initialization
 */

import { apiClient } from '../config/apiClient'
import { PRODUCT_LINE_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const PRODUCT_DATE_FIELDS = ['createdAt', 'updatedAt']

// =============================================================================
// PRODUCT LINES
// =============================================================================

/**
 * Get all product lines
 * @returns {Promise<Array>} Array of product lines
 */
export const getProductLines = async () => {
  try {
    const response = await apiClient.get(PRODUCT_LINE_ENDPOINTS.LIST)
    const productLines = unwrapResponse(response)
    return normalizeEntities(productLines).map(pl => normalizeDates(pl, PRODUCT_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting product lines:', error)
    return []
  }
}

/**
 * Get a single product line
 * @param {string} productLineId - Product line ID
 * @returns {Promise<Object|null>} Product line or null
 */
export const getProductLine = async (productLineId) => {
  try {
    const response = await apiClient.get(PRODUCT_LINE_ENDPOINTS.GET(productLineId))
    const productLine = unwrapResponse(response)
    return normalizeDates(normalizeEntity(productLine), PRODUCT_DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting product line:', error)
    throw error
  }
}

/**
 * Save a product line (create or update)
 * @param {Object} productLineData - Product line data
 * @param {string} productLineId - Optional ID for update
 * @returns {Promise<string>} Product line ID
 */
export const saveProductLine = async (productLineData, productLineId = null) => {
  try {
    const payload = serializeDates({ ...productLineData }, PRODUCT_DATE_FIELDS)

    if (productLineId) {
      // Update existing
      const response = await apiClient.put(PRODUCT_LINE_ENDPOINTS.UPDATE(productLineId), payload)
      unwrapResponse(response)
      return productLineId
    } else {
      // Create new
      const response = await apiClient.post(PRODUCT_LINE_ENDPOINTS.CREATE, payload)
      const result = unwrapResponse(response)
      return result.key || result.id
    }
  } catch (error) {
    console.error('Error saving product line:', error)
    throw error
  }
}

/**
 * Update a product line
 * @param {string} productLineId - Product line ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<void>}
 */
export const updateProductLine = async (productLineId, updateData) => {
  try {
    const payload = serializeDates({ ...updateData }, PRODUCT_DATE_FIELDS)
    const response = await apiClient.put(PRODUCT_LINE_ENDPOINTS.UPDATE(productLineId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating product line:', error)
    throw error
  }
}

/**
 * Delete a product line
 * @param {string} productLineId - Product line ID
 * @returns {Promise<void>}
 */
export const deleteProductLine = async (productLineId) => {
  try {
    const response = await apiClient.delete(PRODUCT_LINE_ENDPOINTS.DELETE(productLineId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting product line:', error)
    throw error
  }
}

// =============================================================================
// CATALOG PRODUCTS
// =============================================================================

/**
 * Get products, optionally filtered by product line
 * @param {string} productLineId - Optional product line ID filter
 * @returns {Promise<Array>} Array of products
 */
export const getProducts = async (productLineId = null) => {
  try {
    let url
    if (productLineId) {
      url = PRODUCT_LINE_ENDPOINTS.PRODUCTS(productLineId)
    } else {
      url = '/api/ProductLine/AllProducts'
    }
    const response = await apiClient.get(url)
    const products = unwrapResponse(response)
    return normalizeEntities(products).map(p => normalizeDates(p, PRODUCT_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting products:', error)
    return []
  }
}

/**
 * Get a single product
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} Product or null
 */
export const getProduct = async (productId) => {
  try {
    const response = await apiClient.get(`/api/ProductLine/Products/${productId}`)
    const product = unwrapResponse(response)
    return normalizeDates(normalizeEntity(product), PRODUCT_DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting product:', error)
    throw error
  }
}

/**
 * Create a catalog product
 * @param {Object} productData - Product data
 * @returns {Promise<string>} New product ID
 */
export const createCatalogProduct = async (productData) => {
  try {
    const payload = serializeDates({ ...productData }, PRODUCT_DATE_FIELDS)
    const productLineId = productData.productLineId || 'default'
    const response = await apiClient.post(PRODUCT_LINE_ENDPOINTS.PRODUCTS(productLineId), payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating catalog product:', error)
    throw error
  }
}

// Alias for backwards compatibility
export const createProduct = createCatalogProduct

/**
 * Update a product
 * @param {string} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<void>}
 */
export const updateProduct = async (productId, productData) => {
  try {
    const payload = serializeDates({ ...productData }, PRODUCT_DATE_FIELDS)
    const response = await apiClient.put(`/api/ProductLine/Products/${productId}`, payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

/**
 * Archive a product (soft delete)
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const archiveProduct = async (productId) => {
  try {
    const response = await apiClient.put(PRODUCT_LINE_ENDPOINTS.ARCHIVE_PRODUCT(productId), {
      archived: true
    })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error archiving product:', error)
    throw error
  }
}

/**
 * Delete a product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  try {
    const response = await apiClient.delete(`/api/ProductLine/Products/${productId}`)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

// =============================================================================
// CATALOG INITIALIZATION
// =============================================================================

/**
 * Initialize the product catalog with default products
 * @returns {Promise<Object>} Initialization result
 */
export const initializeProductCatalog = async () => {
  try {
    const response = await apiClient.post(PRODUCT_LINE_ENDPOINTS.INITIALIZE_CATALOG, {})
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error initializing product catalog:', error)
    throw error
  }
}

// =============================================================================
// CALCULATION METHODS
// =============================================================================

/**
 * Default calculation methods for product pricing
 */
export const DEFAULT_CALCULATION_METHODS = {
  fixed: {
    id: 'fixed',
    name: 'Fixed Price',
    description: 'Simple fixed price',
    fields: ['price'],
    calculate: (values) => values.price || 0
  },
  perLearner: {
    id: 'perLearner',
    name: 'Per Learner',
    description: 'Price multiplied by number of learners',
    fields: ['pricePerLearner', 'learnerCount'],
    calculate: (values) => (values.pricePerLearner || 0) * (values.learnerCount || 0)
  },
  percentage: {
    id: 'percentage',
    name: 'Percentage Based',
    description: 'Percentage of base amount',
    fields: ['baseAmount', 'percentage'],
    calculate: (values) => (values.baseAmount || 0) * ((values.percentage || 0) / 100)
  },
  tiered: {
    id: 'tiered',
    name: 'Tiered Pricing',
    description: 'Different price tiers based on quantity',
    fields: ['quantity', 'tier1Price', 'tier2Price', 'tier3Price', 'tier1Max', 'tier2Max'],
    calculate: (values) => {
      const qty = values.quantity || 0
      if (qty <= (values.tier1Max || 10)) return qty * (values.tier1Price || 0)
      if (qty <= (values.tier2Max || 50)) return qty * (values.tier2Price || 0)
      return qty * (values.tier3Price || 0)
    }
  }
}

/**
 * Calculate product total using a calculation method
 * @param {string} calculationMethodId - Calculation method ID
 * @param {Object} fieldValues - Field values for calculation
 * @returns {number} Calculated total
 */
export const calculateProductTotal = (calculationMethodId, fieldValues) => {
  const method = DEFAULT_CALCULATION_METHODS[calculationMethodId]
  if (!method) {
    console.warn(`Unknown calculation method: ${calculationMethodId}`)
    return 0
  }
  return method.calculate(fieldValues)
}
