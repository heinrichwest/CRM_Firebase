/**
 * Reference Data API Service
 *
 * Provides API operations for reference/lookup data:
 * - Pipeline statuses
 * - Skills partners
 * - SETAs
 * - Job titles
 * - Products
 * - Roles
 */

import { apiClient } from '../config/apiClient'
import { REFERENCE_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities } from '../adapters/idAdapter'

// Default pipeline statuses (fallback if API fails)
const DEFAULT_PIPELINE_STATUSES = [
  { id: 'new-lead', name: 'New Lead', color: '#e3f2fd', order: 1 },
  { id: 'qualifying', name: 'Qualifying', color: '#fff3e0', order: 2 },
  { id: 'proposal-sent', name: 'Proposal Sent', color: '#e8f5e9', order: 3 },
  { id: 'awaiting-decision', name: 'Awaiting Decision', color: '#e1bee7', order: 4 },
  { id: 'negotiation', name: 'Negotiation', color: '#fff9c4', order: 5 },
  { id: 'won', name: 'Won', color: '#c8e6c9', order: 6, isWon: true },
  { id: 'lost', name: 'Lost', color: '#ffcdd2', order: 7, isLost: true }
]

// =============================================================================
// PIPELINE STATUSES
// =============================================================================

/**
 * Get pipeline statuses
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 * @returns {Promise<Array>} Array of pipeline statuses
 */
export const getPipelineStatuses = async (tenantId = null) => {
  try {
    const params = tenantId ? { tenantId } : {}
    const url = buildUrl(REFERENCE_ENDPOINTS.PIPELINE_STATUSES, params)
    const response = await apiClient.get(url)
    const statuses = unwrapResponse(response)

    if (Array.isArray(statuses) && statuses.length > 0) {
      return statuses.sort((a, b) => a.order - b.order)
    }

    return DEFAULT_PIPELINE_STATUSES
  } catch (error) {
    console.error('Error getting pipeline statuses:', error)
    return DEFAULT_PIPELINE_STATUSES
  }
}

/**
 * Save pipeline statuses
 * @param {Array} statuses - Pipeline statuses array
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 * @returns {Promise<boolean>} True if saved successfully
 */
export const savePipelineStatuses = async (statuses, tenantId = null) => {
  try {
    const payload = {
      statuses,
      tenantId
    }
    const response = await apiClient.post(REFERENCE_ENDPOINTS.SAVE_PIPELINE_STATUSES, payload)
    unwrapResponse(response)
    return true
  } catch (error) {
    console.error('Error saving pipeline statuses:', error)
    throw error
  }
}

// =============================================================================
// SKILLS PARTNERS
// =============================================================================

/**
 * Get all skills partners
 * @returns {Promise<Array>} Array of skills partners
 */
export const getSkillsPartners = async () => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.SKILLS_PARTNERS)
    const partners = unwrapResponse(response)
    return normalizeEntities(partners)
  } catch (error) {
    console.error('Error getting skills partners:', error)
    return []
  }
}

/**
 * Get a single skills partner
 * @param {string} partnerId - Partner ID
 * @returns {Promise<Object|null>} Skills partner or null
 */
export const getSkillsPartner = async (partnerId) => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.SKILLS_PARTNER(partnerId))
    const partner = unwrapResponse(response)
    return normalizeEntity(partner)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting skills partner:', error)
    throw error
  }
}

/**
 * Create a skills partner
 * @param {Object} partnerData - Partner data
 * @returns {Promise<string>} New partner ID
 */
export const createSkillsPartner = async (partnerData) => {
  try {
    const response = await apiClient.post(REFERENCE_ENDPOINTS.SKILLS_PARTNERS, partnerData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating skills partner:', error)
    throw error
  }
}

/**
 * Update a skills partner
 * @param {string} partnerId - Partner ID
 * @param {Object} partnerData - Partner data
 * @returns {Promise<void>}
 */
export const updateSkillsPartner = async (partnerId, partnerData) => {
  try {
    const response = await apiClient.put(REFERENCE_ENDPOINTS.SKILLS_PARTNER(partnerId), partnerData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating skills partner:', error)
    throw error
  }
}

/**
 * Delete a skills partner
 * @param {string} partnerId - Partner ID
 * @returns {Promise<void>}
 */
export const deleteSkillsPartner = async (partnerId) => {
  try {
    const response = await apiClient.delete(REFERENCE_ENDPOINTS.SKILLS_PARTNER(partnerId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting skills partner:', error)
    throw error
  }
}

// =============================================================================
// SETAS
// =============================================================================

/**
 * Get all SETAs
 * @returns {Promise<Array>} Array of SETAs
 */
export const getSetas = async () => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.SETAS)
    const setas = unwrapResponse(response)
    return normalizeEntities(setas)
  } catch (error) {
    console.error('Error getting SETAs:', error)
    return []
  }
}

/**
 * Get a single SETA
 * @param {string} setaId - SETA ID
 * @returns {Promise<Object|null>} SETA or null
 */
export const getSeta = async (setaId) => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.SETA(setaId))
    const seta = unwrapResponse(response)
    return normalizeEntity(seta)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting SETA:', error)
    throw error
  }
}

/**
 * Create a SETA
 * @param {Object} setaData - SETA data
 * @returns {Promise<string>} New SETA ID
 */
export const createSeta = async (setaData) => {
  try {
    const response = await apiClient.post(REFERENCE_ENDPOINTS.SETAS, setaData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating SETA:', error)
    throw error
  }
}

/**
 * Update a SETA
 * @param {string} setaId - SETA ID
 * @param {Object} setaData - SETA data
 * @returns {Promise<void>}
 */
export const updateSeta = async (setaId, setaData) => {
  try {
    const response = await apiClient.put(REFERENCE_ENDPOINTS.SETA(setaId), setaData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating SETA:', error)
    throw error
  }
}

/**
 * Delete a SETA
 * @param {string} setaId - SETA ID
 * @returns {Promise<void>}
 */
export const deleteSeta = async (setaId) => {
  try {
    const response = await apiClient.delete(REFERENCE_ENDPOINTS.SETA(setaId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting SETA:', error)
    throw error
  }
}

// =============================================================================
// JOB TITLES
// =============================================================================

/**
 * Get all job titles
 * @returns {Promise<Array>} Array of job titles
 */
export const getJobTitles = async () => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.JOB_TITLES)
    const titles = unwrapResponse(response)
    return normalizeEntities(titles)
  } catch (error) {
    console.error('Error getting job titles:', error)
    return []
  }
}

/**
 * Create a job title
 * @param {Object} titleData - Job title data
 * @returns {Promise<string>} New job title ID
 */
export const createJobTitle = async (titleData) => {
  try {
    const response = await apiClient.post(REFERENCE_ENDPOINTS.JOB_TITLES, titleData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating job title:', error)
    throw error
  }
}

/**
 * Update a job title
 * @param {string} titleId - Job title ID
 * @param {Object} titleData - Job title data
 * @returns {Promise<void>}
 */
export const updateJobTitle = async (titleId, titleData) => {
  try {
    const response = await apiClient.put(REFERENCE_ENDPOINTS.JOB_TITLE(titleId), titleData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating job title:', error)
    throw error
  }
}

/**
 * Delete a job title
 * @param {string} titleId - Job title ID
 * @returns {Promise<void>}
 */
export const deleteJobTitle = async (titleId) => {
  try {
    const response = await apiClient.delete(REFERENCE_ENDPOINTS.JOB_TITLE(titleId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting job title:', error)
    throw error
  }
}

// =============================================================================
// PRODUCTS
// =============================================================================

/**
 * Get all products
 * @returns {Promise<Array>} Array of products
 */
export const getProducts = async () => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.PRODUCTS)
    const products = unwrapResponse(response)
    return normalizeEntities(products)
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
    const response = await apiClient.get(REFERENCE_ENDPOINTS.PRODUCT(productId))
    const product = unwrapResponse(response)
    return normalizeEntity(product)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting product:', error)
    throw error
  }
}

/**
 * Create a product
 * @param {Object} productData - Product data
 * @returns {Promise<string>} New product ID
 */
export const createProduct = async (productData) => {
  try {
    const response = await apiClient.post(REFERENCE_ENDPOINTS.PRODUCTS, productData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

/**
 * Update a product
 * @param {string} productId - Product ID
 * @param {Object} productData - Product data
 * @returns {Promise<void>}
 */
export const updateProduct = async (productId, productData) => {
  try {
    const response = await apiClient.put(REFERENCE_ENDPOINTS.PRODUCT(productId), productData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating product:', error)
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
    const response = await apiClient.delete(REFERENCE_ENDPOINTS.PRODUCT(productId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

// =============================================================================
// ROLES
// =============================================================================

/**
 * Get all roles
 * @returns {Promise<Array>} Array of roles
 */
export const getRoles = async () => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.ROLES)
    const roles = unwrapResponse(response)
    return normalizeEntities(roles)
  } catch (error) {
    console.error('Error getting roles:', error)
    return []
  }
}

/**
 * Get a single role
 * @param {string} roleId - Role ID
 * @returns {Promise<Object|null>} Role or null
 */
export const getRole = async (roleId) => {
  try {
    const response = await apiClient.get(REFERENCE_ENDPOINTS.ROLE(roleId))
    const role = unwrapResponse(response)
    return normalizeEntity(role)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting role:', error)
    throw error
  }
}

/**
 * Create a role
 * @param {Object} roleData - Role data
 * @returns {Promise<string>} New role ID
 */
export const createRole = async (roleData) => {
  try {
    const response = await apiClient.post(REFERENCE_ENDPOINTS.ROLES, roleData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating role:', error)
    throw error
  }
}

/**
 * Update a role
 * @param {string} roleId - Role ID
 * @param {Object} roleData - Role data
 * @returns {Promise<void>}
 */
export const updateRole = async (roleId, roleData) => {
  try {
    const response = await apiClient.put(REFERENCE_ENDPOINTS.ROLE(roleId), roleData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating role:', error)
    throw error
  }
}

/**
 * Delete a role
 * @param {string} roleId - Role ID
 * @returns {Promise<void>}
 */
export const deleteRole = async (roleId) => {
  try {
    const response = await apiClient.delete(REFERENCE_ENDPOINTS.ROLE(roleId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting role:', error)
    throw error
  }
}
