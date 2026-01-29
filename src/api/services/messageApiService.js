/**
 * Message API Service
 *
 * Provides API operations for internal messages.
 */

import { apiClient } from '../config/apiClient'
import { MESSAGE_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const MESSAGE_DATE_FIELDS = ['createdAt', 'updatedAt', 'sentAt', 'readAt']

// =============================================================================
// MESSAGES
// =============================================================================

/**
 * Get messages with optional status filter
 * @param {string} status - Optional status filter ('read', 'unread', 'archived')
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (status = null) => {
  try {
    let url
    if (status) {
      url = MESSAGE_ENDPOINTS.BY_STATUS(status)
    } else {
      url = MESSAGE_ENDPOINTS.LIST
    }
    const response = await apiClient.get(url)
    const messages = unwrapResponse(response)
    return normalizeEntities(messages).map(m => normalizeDates(m, MESSAGE_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting messages:', error)
    return []
  }
}

/**
 * Get a single message
 * @param {string} messageId - Message ID
 * @returns {Promise<Object|null>} Message or null
 */
export const getMessage = async (messageId) => {
  try {
    const response = await apiClient.get(MESSAGE_ENDPOINTS.GET(messageId))
    const message = unwrapResponse(response)
    return normalizeDates(normalizeEntity(message), MESSAGE_DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting message:', error)
    throw error
  }
}

/**
 * Create a new message
 * @param {Object} messageData - Message data
 * @returns {Promise<string>} New message ID
 */
export const createMessage = async (messageData) => {
  try {
    const payload = serializeDates({
      ...messageData,
      status: messageData.status || 'unread'
    }, MESSAGE_DATE_FIELDS)

    const response = await apiClient.post(MESSAGE_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating message:', error)
    throw error
  }
}

/**
 * Update a message
 * @param {string} messageId - Message ID
 * @param {Object} messageData - Updated message data
 * @returns {Promise<void>}
 */
export const updateMessage = async (messageId, messageData) => {
  try {
    const payload = serializeDates({ ...messageData }, MESSAGE_DATE_FIELDS)
    const response = await apiClient.put(MESSAGE_ENDPOINTS.UPDATE(messageId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating message:', error)
    throw error
  }
}

/**
 * Mark a message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<void>}
 */
export const markMessageAsRead = async (messageId) => {
  try {
    await updateMessage(messageId, {
      status: 'read',
      readAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error marking message as read:', error)
    throw error
  }
}

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Promise<void>}
 */
export const deleteMessage = async (messageId) => {
  try {
    const response = await apiClient.delete(MESSAGE_ENDPOINTS.DELETE(messageId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting message:', error)
    throw error
  }
}
