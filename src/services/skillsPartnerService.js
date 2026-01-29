/**
 * Skills Partner Service
 *
 * Provides API operations for skills partners.
 */

import { apiClient } from '../api/config/apiClient'
import { SKILLS_PARTNER_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

const DATE_FIELDS = ['createdAt', 'updatedAt']

/**
 * Get all skills partners
 * @returns {Promise<Array>} Array of skills partner objects
 */
export const getSkillsPartners = async () => {
  try {
    const response = await apiClient.get(SKILLS_PARTNER_ENDPOINTS.LIST)
    const partners = unwrapResponse(response)
    const normalized = normalizeEntities(partners).map(p => normalizeDates(p, DATE_FIELDS))
    // Sort by name alphabetically
    return normalized.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting skills partners:', error)
    return []
  }
}

/**
 * Get active skills partners only
 * @returns {Promise<Array>} Array of active skills partner objects
 */
export const getActiveSkillsPartners = async () => {
  try {
    const partners = await getSkillsPartners()
    return partners.filter(p => p.status === 'active')
  } catch (error) {
    console.error('Error getting active skills partners:', error)
    return []
  }
}

/**
 * Get a single skills partner by ID
 * @param {string} partnerId - The skills partner ID
 * @returns {Promise<Object>} Skills partner object
 */
export const getSkillsPartner = async (partnerId) => {
  try {
    const response = await apiClient.get(SKILLS_PARTNER_ENDPOINTS.GET_BY_KEY(partnerId))
    const partner = unwrapResponse(response)
    return normalizeDates(normalizeEntity(partner), DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting skills partner:', error)
    throw error
  }
}

/**
 * Create a new skills partner
 * @param {Object} partnerData - Skills partner data
 * @returns {Promise<string>} ID of created skills partner
 */
export const createSkillsPartner = async (partnerData) => {
  try {
    const payload = serializeDates({
      ...partnerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.post(SKILLS_PARTNER_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating skills partner:', error)
    throw error
  }
}

/**
 * Update an existing skills partner
 * @param {string} partnerId - The skills partner ID
 * @param {Object} partnerData - Updated skills partner data
 * @returns {Promise<void>}
 */
export const updateSkillsPartner = async (partnerId, partnerData) => {
  try {
    const payload = serializeDates({
      ...partnerData,
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.put(SKILLS_PARTNER_ENDPOINTS.UPDATE(partnerId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating skills partner:', error)
    throw error
  }
}

/**
 * Delete a skills partner
 * @param {string} partnerId - The skills partner ID
 * @returns {Promise<void>}
 */
export const deleteSkillsPartner = async (partnerId) => {
  try {
    const response = await apiClient.delete(SKILLS_PARTNER_ENDPOINTS.DELETE(partnerId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting skills partner:', error)
    throw error
  }
}

/**
 * Get commission rate for a specific partner and product line
 * @param {string} partnerId - The skills partner ID
 * @param {string} productLineId - The product line ID
 * @returns {Promise<number>} Commission percentage (0-100)
 */
export const getCommissionRate = async (partnerId, productLineId) => {
  try {
    const partner = await getSkillsPartner(partnerId)
    if (!partner || !partner.commissionRates) {
      return 0
    }

    // Commission rates stored as { productLineId: percentage }
    return partner.commissionRates[productLineId] || 0
  } catch (error) {
    console.error('Error getting commission rate:', error)
    return 0
  }
}

/**
 * Seed initial skills partners (for testing/demo)
 * @returns {Promise<void>}
 */
export const seedSkillsPartners = async () => {
  try {
    const samplePartners = [
      {
        name: 'Skills Development Solutions',
        contactPerson: 'John Smith',
        email: 'john@skillsdev.co.za',
        phone: '+27 11 123 4567',
        status: 'active',
        agreementLink: 'https://drive.google.com/example1',
        commissionRates: {},
        notes: 'Primary skills partner for corporate training'
      },
      {
        name: 'Training Excellence Partners',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@trainingexcel.co.za',
        phone: '+27 21 987 6543',
        status: 'active',
        agreementLink: 'https://drive.google.com/example2',
        commissionRates: {},
        notes: 'Specialized in learnership programs'
      },
      {
        name: 'Workforce Development Co',
        contactPerson: 'Michael Brown',
        email: 'michael@workforce.co.za',
        phone: '+27 31 555 8888',
        status: 'active',
        agreementLink: '',
        commissionRates: {},
        notes: 'Focus on compliance training'
      }
    ]

    for (const partner of samplePartners) {
      await createSkillsPartner(partner)
    }

    console.log('Skills partners seeded successfully')
  } catch (error) {
    console.error('Error seeding skills partners:', error)
    throw error
  }
}
