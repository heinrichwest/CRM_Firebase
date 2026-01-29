/**
 * ID Adapter
 *
 * Handles ID normalization between API and frontend.
 *
 * API uses:
 * - id: numeric (int) - database primary key
 * - key: GUID string - unique identifier for external references
 *
 * Frontend uses:
 * - id: string (GUID key) - for compatibility with existing Firebase code
 * - _apiId: numeric - stored for rare cases needing the numeric ID
 */

/**
 * Normalize a single entity from API format to frontend format
 * Uses the GUID key as the frontend id for Firebase compatibility
 *
 * @param {Object} entity - Entity from API
 * @returns {Object} Normalized entity with id as GUID key
 */
export const normalizeEntity = (entity) => {
  if (!entity) {
    return null
  }

  return {
    ...entity,
    id: entity.key || entity.id,  // Use GUID key as frontend id
    _apiId: entity.id              // Keep numeric ID for edge cases
  }
}

/**
 * Normalize an array of entities
 * @param {Array} entities - Array of entities from API
 * @returns {Array} Array of normalized entities
 */
export const normalizeEntities = (entities) => {
  if (!Array.isArray(entities)) {
    return []
  }

  return entities.map(normalizeEntity)
}

/**
 * Denormalize entity for API submission
 * Converts frontend id back to API format if needed
 *
 * @param {Object} entity - Entity from frontend
 * @returns {Object} Entity formatted for API
 */
export const denormalizeEntity = (entity) => {
  if (!entity) {
    return null
  }

  const { _apiId, ...rest } = entity

  // If we have the numeric API ID stored, use it
  if (_apiId !== undefined) {
    return {
      ...rest,
      id: _apiId,
      key: entity.id
    }
  }

  // Otherwise, assume id is the key (for new entities)
  return {
    ...rest,
    key: entity.id
  }
}

/**
 * Extract the API-compatible ID for URL parameters
 * Prefers numeric ID for API endpoints
 *
 * @param {Object|string} entityOrId - Entity object or ID string
 * @returns {string|number} ID for API endpoint
 */
export const getApiId = (entityOrId) => {
  if (typeof entityOrId === 'object' && entityOrId !== null) {
    // Return numeric ID if available, otherwise the key
    return entityOrId._apiId || entityOrId.key || entityOrId.id
  }

  return entityOrId
}

/**
 * Check if an ID is a valid GUID format
 * @param {string} id - ID to check
 * @returns {boolean} True if ID is a valid GUID
 */
export const isGuid = (id) => {
  if (typeof id !== 'string') {
    return false
  }

  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return guidRegex.test(id)
}

/**
 * Normalize timestamps from API format to JavaScript Date
 * Handles various date formats that might come from the API
 *
 * @param {Object} entity - Entity with timestamp fields
 * @param {string[]} dateFields - Array of field names to convert
 * @returns {Object} Entity with normalized date fields
 */
export const normalizeDates = (entity, dateFields = ['createdAt', 'updatedAt', 'lastContact']) => {
  if (!entity) {
    return null
  }

  const normalized = { ...entity }

  dateFields.forEach(field => {
    if (normalized[field]) {
      const value = normalized[field]

      // Handle Firestore Timestamp format (has toDate method)
      if (typeof value?.toDate === 'function') {
        normalized[field] = value.toDate()
      }
      // Handle ISO string
      else if (typeof value === 'string') {
        normalized[field] = new Date(value)
      }
      // Handle seconds timestamp
      else if (typeof value === 'number') {
        normalized[field] = new Date(value * 1000)
      }
      // Handle object with seconds (Firestore-like)
      else if (value?.seconds) {
        normalized[field] = new Date(value.seconds * 1000)
      }
    }
  })

  return normalized
}

/**
 * Convert Date objects to ISO strings for API submission
 * @param {Object} entity - Entity with Date fields
 * @param {string[]} dateFields - Array of field names to convert
 * @returns {Object} Entity with ISO string dates
 */
export const serializeDates = (entity, dateFields = ['createdAt', 'updatedAt', 'lastContact']) => {
  if (!entity) {
    return null
  }

  const serialized = { ...entity }

  dateFields.forEach(field => {
    if (serialized[field] instanceof Date) {
      serialized[field] = serialized[field].toISOString()
    }
  })

  return serialized
}
