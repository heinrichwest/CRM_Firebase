/**
 * Settings API Service
 *
 * Provides API operations for system settings:
 * - Calculation templates
 * - Sales teams
 * - Tenant settings
 */

import { apiClient } from '../config/apiClient'
import { SETTINGS_ENDPOINTS, TENANT_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const SETTINGS_DATE_FIELDS = ['createdAt', 'updatedAt']

// =============================================================================
// GENERAL SETTINGS
// =============================================================================

/**
 * Get system settings
 * @returns {Promise<Object>} Settings object
 */
export const getSettings = async () => {
  try {
    const response = await apiClient.get(SETTINGS_ENDPOINTS.GET)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting settings:', error)
    return {}
  }
}

/**
 * Update system settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<void>}
 */
export const updateSettings = async (settings) => {
  try {
    const response = await apiClient.put(SETTINGS_ENDPOINTS.UPDATE, settings)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
}

// =============================================================================
// CALCULATION TEMPLATES
// =============================================================================

/**
 * Get all calculation templates
 * @returns {Promise<Array>} Array of calculation templates
 */
export const getCalculationTemplates = async () => {
  try {
    const response = await apiClient.get(SETTINGS_ENDPOINTS.CALCULATION_TEMPLATES)
    const templates = unwrapResponse(response)
    return normalizeEntities(templates).map(t => normalizeDates(t, SETTINGS_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting calculation templates:', error)
    return []
  }
}

/**
 * Get a single calculation template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Template or null
 */
export const getCalculationTemplate = async (templateId) => {
  try {
    const response = await apiClient.get(SETTINGS_ENDPOINTS.CALCULATION_TEMPLATE(templateId))
    const template = unwrapResponse(response)
    return normalizeDates(normalizeEntity(template), SETTINGS_DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting calculation template:', error)
    throw error
  }
}

/**
 * Create a calculation template
 * @param {Object} templateData - Template data
 * @returns {Promise<string>} New template ID
 */
export const createCalculationTemplate = async (templateData) => {
  try {
    const payload = serializeDates({ ...templateData }, SETTINGS_DATE_FIELDS)
    const response = await apiClient.post(SETTINGS_ENDPOINTS.CALCULATION_TEMPLATES, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating calculation template:', error)
    throw error
  }
}

/**
 * Update a calculation template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Template data
 * @returns {Promise<void>}
 */
export const updateCalculationTemplate = async (templateId, templateData) => {
  try {
    const payload = serializeDates({ ...templateData }, SETTINGS_DATE_FIELDS)
    const response = await apiClient.put(SETTINGS_ENDPOINTS.CALCULATION_TEMPLATE(templateId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating calculation template:', error)
    throw error
  }
}

/**
 * Delete a calculation template
 * @param {string} templateId - Template ID
 * @returns {Promise<void>}
 */
export const deleteCalculationTemplate = async (templateId) => {
  try {
    const response = await apiClient.delete(SETTINGS_ENDPOINTS.CALCULATION_TEMPLATE(templateId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting calculation template:', error)
    throw error
  }
}

// =============================================================================
// TENANT SETTINGS
// =============================================================================

/**
 * Get tenant settings
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Tenant settings
 */
export const getTenantSettings = async (tenantId) => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.SETTINGS(tenantId))
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting tenant settings:', error)
    return {}
  }
}

/**
 * Update tenant settings
 * @param {string} tenantId - Tenant ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<void>}
 */
export const updateTenantSettings = async (tenantId, settings) => {
  try {
    const response = await apiClient.put(TENANT_ENDPOINTS.UPDATE_SETTINGS(tenantId), settings)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating tenant settings:', error)
    throw error
  }
}

// =============================================================================
// TENANTS (Admin only)
// =============================================================================

/**
 * Get all tenants
 * @returns {Promise<Array>} Array of tenants
 */
export const getTenants = async () => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.LIST)
    const tenants = unwrapResponse(response)
    return normalizeEntities(tenants).map(t => normalizeDates(t, SETTINGS_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting tenants:', error)
    return []
  }
}

/**
 * Get a single tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Tenant or null
 */
export const getTenant = async (tenantId) => {
  try {
    const response = await apiClient.get(TENANT_ENDPOINTS.GET(tenantId))
    const tenant = unwrapResponse(response)
    return normalizeDates(normalizeEntity(tenant), SETTINGS_DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting tenant:', error)
    throw error
  }
}

/**
 * Create a tenant
 * @param {Object} tenantData - Tenant data
 * @returns {Promise<string>} New tenant ID
 */
export const createTenant = async (tenantData) => {
  try {
    const payload = serializeDates({ ...tenantData }, SETTINGS_DATE_FIELDS)
    const response = await apiClient.post(TENANT_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating tenant:', error)
    throw error
  }
}

/**
 * Update a tenant
 * @param {string} tenantId - Tenant ID
 * @param {Object} tenantData - Tenant data
 * @returns {Promise<void>}
 */
export const updateTenant = async (tenantId, tenantData) => {
  try {
    const payload = serializeDates({ ...tenantData }, SETTINGS_DATE_FIELDS)
    const response = await apiClient.put(TENANT_ENDPOINTS.UPDATE(tenantId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating tenant:', error)
    throw error
  }
}

/**
 * Delete a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<void>}
 */
export const deleteTenant = async (tenantId) => {
  try {
    const response = await apiClient.delete(TENANT_ENDPOINTS.DELETE(tenantId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting tenant:', error)
    throw error
  }
}

// =============================================================================
// CALCULATION OPTIONS
// =============================================================================

/**
 * Get calculation options
 * @returns {Promise<Object>} Calculation options
 */
export const getCalculationOptions = async () => {
  try {
    const response = await apiClient.get(SETTINGS_ENDPOINTS.CALCULATION_OPTIONS)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting calculation options:', error)
    return {}
  }
}

/**
 * Save calculation options
 * @param {Object} options - Calculation options
 * @returns {Promise<void>}
 */
export const saveCalculationOptions = async (options) => {
  try {
    const response = await apiClient.put(SETTINGS_ENDPOINTS.CALCULATION_OPTIONS, options)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving calculation options:', error)
    throw error
  }
}

// =============================================================================
// LEGAL DOCUMENT TYPES
// =============================================================================

/**
 * Get legal document types
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<Array>} Array of legal document types
 */
export const getLegalDocumentTypes = async (tenantId = null) => {
  try {
    const params = tenantId ? { tenantId } : {}
    const url = buildUrl(SETTINGS_ENDPOINTS.LEGAL_DOCUMENT_TYPES, params)
    const response = await apiClient.get(url)
    const types = unwrapResponse(response)
    return normalizeEntities(types)
  } catch (error) {
    console.error('Error getting legal document types:', error)
    return []
  }
}

/**
 * Save legal document types
 * @param {Array} documentTypes - Array of document types
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<void>}
 */
export const saveLegalDocumentTypes = async (documentTypes, tenantId = null) => {
  try {
    const payload = {
      documentTypes,
      tenantId
    }
    const response = await apiClient.put(SETTINGS_ENDPOINTS.LEGAL_DOCUMENT_TYPES, payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving legal document types:', error)
    throw error
  }
}

// =============================================================================
// DEFAULT SALESPERSON PRODUCT LINES
// =============================================================================

/**
 * Get default product lines for salesperson forecast view
 * @returns {Promise<Array>} Array of default product lines
 */
export const getDefaultSalespersonProductLines = async () => {
  try {
    const response = await apiClient.get(SETTINGS_ENDPOINTS.DEFAULT_SALESPERSON_PRODUCT_LINES)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting default salesperson product lines:', error)
    return []
  }
}

/**
 * Save default product lines for salesperson forecast view
 * @param {Array} productLines - Array of product lines
 * @returns {Promise<void>}
 */
export const saveDefaultSalespersonProductLines = async (productLines) => {
  try {
    const response = await apiClient.put(SETTINGS_ENDPOINTS.DEFAULT_SALESPERSON_PRODUCT_LINES, { productLines })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving default salesperson product lines:', error)
    throw error
  }
}
