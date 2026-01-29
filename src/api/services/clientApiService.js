/**
 * Client API Service
 *
 * Provides all client-related API operations.
 * Mirrors the interface from firestoreService.js for easy migration.
 */

import { apiClient } from '../config/apiClient'
import { CLIENT_ENDPOINTS, buildUrl, buildPaginationParams } from '../config/endpoints'
import { unwrapResponse, unwrapPagedResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const CLIENT_DATE_FIELDS = ['createdAt', 'updatedAt', 'lastContact', 'nextFollowUpDate', 'nextFollowUpCreatedAt']

/**
 * Normalize a client entity from API response
 */
const normalizeClient = (client) => {
  if (!client) return null
  const normalized = normalizeEntity(client)
  return normalizeDates(normalized, CLIENT_DATE_FIELDS)
}

/**
 * Get clients with optional filters
 * @param {Object} filters - Filter options (status, type, etc.)
 * @param {string} tenantId - Tenant ID (from JWT claims, optional)
 * @returns {Promise<Array>} Array of clients
 */
export const getClients = async (filters = {}, tenantId = null) => {
  try {
    const params = { ...filters }
    if (tenantId) {
      params.tenantId = tenantId
    }

    const url = buildUrl(CLIENT_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)

    return normalizeEntities(clients).map(c => normalizeDates(c, CLIENT_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting clients:', error)
    throw error
  }
}

/**
 * Get clients with pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Items per page
 * @param {Object} options.filters - Filter options
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort direction
 * @returns {Promise<Object>} { data: Client[], pagination: {...} }
 */
export const getClientsPaginated = async (options = {}) => {
  try {
    const { page = 1, pageSize = 25, filters = {}, sortBy = 'lastContact', sortOrder = 'desc' } = options

    const params = {
      ...buildPaginationParams(page, pageSize, sortBy, sortOrder),
      ...filters
    }

    const url = buildUrl(CLIENT_ENDPOINTS.LIST, params)
    const response = await apiClient.get(url)
    const result = unwrapPagedResponse(response)

    return {
      data: result.data.map(normalizeClient),
      pagination: result.pagination
    }
  } catch (error) {
    console.error('Error getting clients paginated:', error)
    throw error
  }
}

/**
 * Get a single client by ID
 * @param {string} clientId - Client ID (GUID key)
 * @returns {Promise<Object|null>} Client object or null
 */
export const getClient = async (clientId) => {
  try {
    const response = await apiClient.get(CLIENT_ENDPOINTS.GET(clientId))
    const client = unwrapResponse(response)
    return normalizeClient(client)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }
    console.error('Error getting client:', error)
    throw error
  }
}

/**
 * Create a new client
 * @param {Object} clientData - Client data
 * @param {string} tenantId - Tenant ID (from JWT claims, optional)
 * @returns {Promise<string>} New client ID
 */
export const createClient = async (clientData, tenantId = null) => {
  try {
    const payload = serializeDates({ ...clientData }, CLIENT_DATE_FIELDS)
    if (tenantId) {
      payload.tenantId = tenantId
    }

    const response = await apiClient.post(CLIENT_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)

    // Return the new client's key (GUID) as the ID
    return result.key || result.id
  } catch (error) {
    console.error('Error creating client:', error)
    throw error
  }
}

/**
 * Update a client
 * @param {string} clientId - Client ID
 * @param {Object} clientData - Fields to update
 * @returns {Promise<void>}
 */
export const updateClient = async (clientId, clientData) => {
  try {
    const payload = serializeDates({ ...clientData }, CLIENT_DATE_FIELDS)
    const response = await apiClient.put(CLIENT_ENDPOINTS.UPDATE(clientId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating client:', error)
    throw error
  }
}

/**
 * Delete a client
 * @param {string} clientId - Client ID
 * @returns {Promise<void>}
 */
export const deleteClient = async (clientId) => {
  try {
    const response = await apiClient.delete(CLIENT_ENDPOINTS.DELETE(clientId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting client:', error)
    throw error
  }
}

/**
 * Search clients
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Matching clients
 */
export const searchClients = async (query, filters = {}) => {
  try {
    const params = { q: query, ...filters }
    const url = buildUrl(CLIENT_ENDPOINTS.SEARCH, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)

    return normalizeEntities(clients).map(c => normalizeDates(c, CLIENT_DATE_FIELDS))
  } catch (error) {
    console.error('Error searching clients:', error)
    throw error
  }
}

/**
 * Update client's pipeline status with history tracking
 * @param {string} clientId - Client ID
 * @param {string} newStatus - New pipeline status
 * @param {string} userId - User making the change
 * @returns {Promise<Array>} Updated pipeline status history
 */
export const updateClientPipelineStatus = async (clientId, newStatus, userId = 'system') => {
  try {
    const response = await apiClient.put(CLIENT_ENDPOINTS.UPDATE_PIPELINE_STATUS(clientId), {
      status: newStatus,
      changedBy: userId
    })
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error updating pipeline status:', error)
    throw error
  }
}

/**
 * Get client activities
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Array of activities
 */
export const getClientActivities = async (clientId) => {
  try {
    const response = await apiClient.get(CLIENT_ENDPOINTS.ACTIVITIES(clientId))
    const activities = unwrapResponse(response)
    return normalizeEntities(activities).map(a => normalizeDates(a, ['timestamp', 'createdAt']))
  } catch (error) {
    console.error('Error getting client activities:', error)
    throw error
  }
}

/**
 * Add a client activity
 * @param {string} clientId - Client ID
 * @param {Object} activity - Activity data
 * @returns {Promise<string>} New activity ID
 */
export const addClientActivity = async (clientId, activity) => {
  try {
    const payload = serializeDates(activity, ['timestamp'])
    const response = await apiClient.post(CLIENT_ENDPOINTS.ADD_ACTIVITY(clientId), payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error adding activity:', error)
    throw error
  }
}

/**
 * Get client interactions
 * @param {string} clientId - Client ID
 * @param {Object} filters - Filter options (type, userId)
 * @returns {Promise<Array>} Array of interactions
 */
export const getClientInteractions = async (clientId, filters = {}) => {
  try {
    const url = buildUrl(CLIENT_ENDPOINTS.INTERACTIONS(clientId), filters)
    const response = await apiClient.get(url)
    const interactions = unwrapResponse(response)
    return normalizeEntities(interactions).map(i => normalizeDates(i, ['timestamp', 'createdAt']))
  } catch (error) {
    console.error('Error getting interactions:', error)
    throw error
  }
}

/**
 * Create a client interaction
 * @param {string} clientId - Client ID
 * @param {Object} interactionData - Interaction data
 * @returns {Promise<string>} New interaction ID
 */
export const createInteraction = async (clientId, interactionData) => {
  try {
    const payload = serializeDates(interactionData, ['timestamp', 'followUpDate'])
    const response = await apiClient.post(CLIENT_ENDPOINTS.ADD_INTERACTION(clientId), payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating interaction:', error)
    throw error
  }
}

/**
 * Get clients by pipeline status
 * @param {string} status - Pipeline status
 * @returns {Promise<Array>} Array of clients
 */
export const getClientsByPipelineStatus = async (status) => {
  try {
    const response = await apiClient.get(CLIENT_ENDPOINTS.BY_PIPELINE(status))
    const clients = unwrapResponse(response)
    return normalizeEntities(clients).map(normalizeClient)
  } catch (error) {
    console.error('Error getting clients by pipeline status:', error)
    throw error
  }
}

/**
 * Get pipeline status analytics
 * @returns {Promise<Object>} Analytics data
 */
export const getPipelineStatusAnalytics = async () => {
  try {
    const response = await apiClient.get('/api/Client/PipelineAnalytics')
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting pipeline analytics:', error)
    throw error
  }
}

// =============================================================================
// CLIENT ALLOCATION
// =============================================================================

/**
 * Get clients with their allocation status
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<Array>} Clients with allocation info
 */
export const getClientsWithAllocationStatus = async (tenantId = null) => {
  try {
    const params = tenantId ? { tenantId } : {}
    const url = buildUrl(CLIENT_ENDPOINTS.WITH_ALLOCATION_STATUS, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)
    return normalizeEntities(clients).map(normalizeClient)
  } catch (error) {
    console.error('Error getting clients with allocation status:', error)
    return []
  }
}

/**
 * Assign a salesperson to a client
 * @param {string} clientId - Client ID
 * @param {string} userId - Salesperson user ID
 * @returns {Promise<void>}
 */
export const assignSalesPersonToClient = async (clientId, userId) => {
  try {
    const response = await apiClient.put(CLIENT_ENDPOINTS.ASSIGN_SALESPERSON(clientId), {
      salespersonId: userId
    })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error assigning salesperson to client:', error)
    throw error
  }
}

/**
 * Assign a skills partner to a client
 * @param {string} clientId - Client ID
 * @param {string} partnerId - Skills partner ID
 * @returns {Promise<void>}
 */
export const assignSkillsPartnerToClient = async (clientId, partnerId) => {
  try {
    const response = await apiClient.put(CLIENT_ENDPOINTS.ASSIGN_SKILLS_PARTNER(clientId), {
      skillsPartnerId: partnerId
    })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error assigning skills partner to client:', error)
    throw error
  }
}

// =============================================================================
// CLIENT PRODUCTS
// =============================================================================

/**
 * Get products for a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Client products
 */
export const getClientProducts = async (clientId) => {
  try {
    const response = await apiClient.get(CLIENT_ENDPOINTS.PRODUCTS(clientId))
    const products = unwrapResponse(response)
    return normalizeEntities(products).map(p => normalizeDates(p, ['createdAt', 'updatedAt']))
  } catch (error) {
    console.error('Error getting client products:', error)
    return []
  }
}

/**
 * Add a product to a client
 * @param {string} clientId - Client ID
 * @param {Object} productData - Product data
 * @returns {Promise<string>} New product ID
 */
export const addClientProduct = async (clientId, productData) => {
  try {
    const response = await apiClient.post(CLIENT_ENDPOINTS.PRODUCTS(clientId), productData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error adding client product:', error)
    throw error
  }
}

/**
 * Update a client product
 * @param {string} clientId - Client ID
 * @param {string} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<void>}
 */
export const updateClientProduct = async (clientId, productId, productData) => {
  try {
    const response = await apiClient.put(CLIENT_ENDPOINTS.PRODUCT(clientId, productId), productData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating client product:', error)
    throw error
  }
}

/**
 * Delete a client product
 * @param {string} clientId - Client ID
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteClientProduct = async (clientId, productId) => {
  try {
    const response = await apiClient.delete(CLIENT_ENDPOINTS.PRODUCT(clientId, productId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting client product:', error)
    throw error
  }
}

// =============================================================================
// CLIENT FOLLOW-UP MANAGEMENT
// =============================================================================

/**
 * Update client follow-up information
 * @param {string} clientId - Client ID
 * @param {Object} followUpData - Follow-up data
 * @param {string} userId - User making the update
 * @returns {Promise<void>}
 */
export const updateClientFollowUp = async (clientId, followUpData, userId) => {
  try {
    const payload = serializeDates({
      ...followUpData,
      updatedBy: userId
    }, ['nextFollowUpDate'])
    const response = await apiClient.put(CLIENT_ENDPOINTS.UPDATE_FOLLOW_UP(clientId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating client follow-up:', error)
    throw error
  }
}

/**
 * Clear client follow-up
 * @param {string} clientId - Client ID
 * @returns {Promise<void>}
 */
export const clearClientFollowUp = async (clientId) => {
  try {
    const response = await apiClient.delete(CLIENT_ENDPOINTS.CLEAR_FOLLOW_UP(clientId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error clearing client follow-up:', error)
    throw error
  }
}

/**
 * Get clients without scheduled follow-up
 * @param {string} salespersonId - Optional salesperson filter
 * @returns {Promise<Array>} Clients without follow-up
 */
export const getClientsWithoutFollowUp = async (salespersonId = null) => {
  try {
    const params = salespersonId ? { salespersonId } : {}
    const url = buildUrl(CLIENT_ENDPOINTS.WITHOUT_FOLLOW_UP, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)
    return normalizeEntities(clients).map(normalizeClient)
  } catch (error) {
    console.error('Error getting clients without follow-up:', error)
    return []
  }
}

/**
 * Get clients with overdue follow-up
 * @param {string} salespersonId - Optional salesperson filter
 * @returns {Promise<Array>} Clients with overdue follow-up
 */
export const getClientsWithOverdueFollowUp = async (salespersonId = null) => {
  try {
    const params = salespersonId ? { salespersonId } : {}
    const url = buildUrl(CLIENT_ENDPOINTS.WITH_OVERDUE_FOLLOW_UP, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)
    return normalizeEntities(clients).map(normalizeClient)
  } catch (error) {
    console.error('Error getting clients with overdue follow-up:', error)
    return []
  }
}

/**
 * Get follow-up statistics
 * @param {string} salespersonId - Optional salesperson filter
 * @returns {Promise<Object>} Follow-up stats
 */
export const getFollowUpStats = async (salespersonId = null) => {
  try {
    const params = salespersonId ? { salespersonId } : {}
    const url = buildUrl(CLIENT_ENDPOINTS.FOLLOW_UP_STATS, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting follow-up stats:', error)
    return { total: 0, withFollowUp: 0, withoutFollowUp: 0, overdue: 0 }
  }
}

/**
 * Get clients for follow-up management view
 * @param {string} salespersonId - Optional salesperson filter
 * @param {string} filter - Filter type ('all', 'withFollowUp', 'withoutFollowUp', 'overdue')
 * @returns {Promise<Array>} Filtered clients
 */
export const getClientsForFollowUpManagement = async (salespersonId = null, filter = 'all') => {
  try {
    const params = { filter }
    if (salespersonId) {
      params.salespersonId = salespersonId
    }
    const url = buildUrl(CLIENT_ENDPOINTS.FOR_FOLLOW_UP_MANAGEMENT, params)
    const response = await apiClient.get(url)
    const clients = unwrapResponse(response)
    return normalizeEntities(clients).map(normalizeClient)
  } catch (error) {
    console.error('Error getting clients for follow-up management:', error)
    return []
  }
}
