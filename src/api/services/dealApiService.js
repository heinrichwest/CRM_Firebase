/**
 * Deal API Service
 *
 * Provides all deal/sales pipeline related API operations.
 * Mirrors the interface from firestoreService.js for easy migration.
 */

import { apiClient } from '../config/apiClient'
import { DEAL_ENDPOINTS, buildUrl, buildPaginationParams } from '../config/endpoints'
import { unwrapResponse, unwrapPagedResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const DEAL_DATE_FIELDS = ['createdAt', 'updatedAt', 'lastContact', 'expectedCloseDate', 'closedDate']

/**
 * Normalize a deal entity from API response
 */
const normalizeDeal = (deal) => {
  if (!deal) return null
  const normalized = normalizeEntity(deal)
  return normalizeDates(normalized, DEAL_DATE_FIELDS)
}

/**
 * Get deals with optional filters
 * @param {string} stage - Filter by stage (optional)
 * @param {Object} filters - Additional filters (clientId, userId)
 * @returns {Promise<Array>} Array of deals
 */
export const getDeals = async (stage = null, filters = {}) => {
  try {
    const params = { ...filters }
    if (stage) {
      params.stage = stage
    }

    const url = buildUrl(DEAL_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const deals = unwrapResponse(response)

    // Sort by lastContact descending (matching Firebase behavior)
    const normalized = normalizeEntities(deals).map(normalizeDeal)
    return normalized.sort((a, b) => {
      const dateA = a.lastContact || new Date(0)
      const dateB = b.lastContact || new Date(0)
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error getting deals:', error)
    return [] // Return empty array instead of throwing
  }
}

/**
 * Get deals with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { data: Deal[], pagination: {...} }
 */
export const getDealsPaginated = async (options = {}) => {
  try {
    const { page = 1, pageSize = 25, filters = {}, sortBy = 'lastContact', sortOrder = 'desc' } = options

    const params = {
      ...buildPaginationParams(page, pageSize, sortBy, sortOrder),
      ...filters
    }

    const url = buildUrl(DEAL_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const result = unwrapPagedResponse(response)

    return {
      data: result.data.map(normalizeDeal),
      pagination: result.pagination
    }
  } catch (error) {
    console.error('Error getting deals paginated:', error)
    throw error
  }
}

/**
 * Get a single deal by ID
 * @param {string} dealId - Deal ID
 * @returns {Promise<Object|null>} Deal object or null
 */
export const getDeal = async (dealId) => {
  try {
    const response = await apiClient.get(DEAL_ENDPOINTS.GET(dealId))
    const deal = unwrapResponse(response)
    return normalizeDeal(deal)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting deal:', error)
    throw error
  }
}

/**
 * Get deals for a specific client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Array of deals
 */
export const getDealsByClient = async (clientId) => {
  try {
    const response = await apiClient.get(DEAL_ENDPOINTS.BY_CLIENT(clientId))
    const deals = unwrapResponse(response)
    return normalizeEntities(deals).map(normalizeDeal)
  } catch (error) {
    console.error('Error getting deals by client:', error)
    return []
  }
}

/**
 * Get deals by stage
 * @param {string} stage - Pipeline stage
 * @returns {Promise<Array>} Array of deals
 */
export const getDealsByStage = async (stage) => {
  try {
    const response = await apiClient.get(DEAL_ENDPOINTS.BY_STAGE(stage))
    const deals = unwrapResponse(response)
    return normalizeEntities(deals).map(normalizeDeal)
  } catch (error) {
    console.error('Error getting deals by stage:', error)
    return []
  }
}

/**
 * Create a new deal
 * @param {Object} dealData - Deal data
 * @returns {Promise<string>} New deal ID
 */
export const createDeal = async (dealData) => {
  try {
    const payload = serializeDates({
      ...dealData,
      stage: dealData.stage || 'new-lead'
    }, DEAL_DATE_FIELDS)

    const response = await apiClient.post(DEAL_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating deal:', error)
    throw error
  }
}

/**
 * Update a deal
 * @param {string} dealId - Deal ID
 * @param {Object} dealData - Fields to update
 * @returns {Promise<void>}
 */
export const updateDeal = async (dealId, dealData) => {
  try {
    const payload = serializeDates({ ...dealData }, DEAL_DATE_FIELDS)
    const response = await apiClient.put(DEAL_ENDPOINTS.UPDATE(dealId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating deal:', error)
    throw error
  }
}

/**
 * Delete a deal
 * @param {string} dealId - Deal ID
 * @returns {Promise<void>}
 */
export const deleteDeal = async (dealId) => {
  try {
    const response = await apiClient.delete(DEAL_ENDPOINTS.DELETE(dealId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting deal:', error)
    throw error
  }
}

/**
 * Move deal to a new stage
 * @param {string} dealId - Deal ID
 * @param {string} newStage - New stage name
 * @returns {Promise<void>}
 */
export const moveDealStage = async (dealId, newStage) => {
  try {
    const response = await apiClient.put(DEAL_ENDPOINTS.UPDATE_STAGE(dealId), {
      stage: newStage
    })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error moving deal stage:', error)
    throw error
  }
}

/**
 * Get deal products
 * @param {string} dealId - Deal ID
 * @returns {Promise<Array>} Array of products
 */
export const getDealProducts = async (dealId) => {
  try {
    const response = await apiClient.get(DEAL_ENDPOINTS.PRODUCTS(dealId))
    const products = unwrapResponse(response)
    return normalizeEntities(products)
  } catch (error) {
    console.error('Error getting deal products:', error)
    return []
  }
}

/**
 * Add product to a deal
 * @param {string} dealId - Deal ID
 * @param {Object} productData - Product data
 * @returns {Promise<string>} New product ID
 */
export const addDealProduct = async (dealId, productData) => {
  try {
    const response = await apiClient.post(DEAL_ENDPOINTS.ADD_PRODUCT(dealId), productData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error adding deal product:', error)
    throw error
  }
}

/**
 * Calculate deal value
 * @param {Object} deal - Deal object with product details
 * @returns {number} Total deal value
 */
export const calculateDealValue = (deal) => {
  if (!deal) return 0

  // If deal has explicit value, use it
  if (deal.value && typeof deal.value === 'number') {
    return deal.value
  }

  // Calculate from products if available
  if (deal.products && Array.isArray(deal.products)) {
    return deal.products.reduce((total, product) => {
      const quantity = product.quantity || 1
      const price = product.price || product.unitPrice || 0
      return total + (quantity * price)
    }, 0)
  }

  return 0
}
