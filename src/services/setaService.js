/**
 * SETA Service
 *
 * Provides API operations for SETAs (Sector Education and Training Authorities).
 */

import { apiClient } from '../api/config/apiClient'
import { SETA_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

const DATE_FIELDS = ['createdAt', 'updatedAt']

/**
 * Get all SETAs
 * @returns {Promise<Array>} Array of SETA objects
 */
export const getSetas = async () => {
  try {
    const response = await apiClient.get(SETA_ENDPOINTS.LIST)
    const setas = unwrapResponse(response)
    const normalized = normalizeEntities(setas).map(s => normalizeDates(s, DATE_FIELDS))
    // Sort by shortName alphabetically
    return normalized.sort((a, b) => (a.shortName || '').localeCompare(b.shortName || ''))
  } catch (error) {
    console.error('Error getting SETAs:', error)
    return []
  }
}

/**
 * Get a single SETA by ID
 * @param {string} setaId - The SETA ID
 * @returns {Promise<Object>} SETA object
 */
export const getSeta = async (setaId) => {
  try {
    const response = await apiClient.get(SETA_ENDPOINTS.GET_BY_KEY(setaId))
    const seta = unwrapResponse(response)
    return normalizeDates(normalizeEntity(seta), DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting SETA:', error)
    throw error
  }
}

/**
 * Create a new SETA
 * @param {Object} setaData - SETA data {shortName, fullName}
 * @returns {Promise<string>} The new SETA ID
 */
export const createSeta = async (setaData) => {
  try {
    const payload = serializeDates({
      shortName: setaData.shortName,
      fullName: setaData.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.post(SETA_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating SETA:', error)
    throw error
  }
}

/**
 * Update an existing SETA
 * @param {string} setaId - The SETA ID
 * @param {Object} setaData - SETA data to update {shortName, fullName}
 * @returns {Promise<void>}
 */
export const updateSeta = async (setaId, setaData) => {
  try {
    const payload = serializeDates({
      shortName: setaData.shortName,
      fullName: setaData.fullName,
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.put(SETA_ENDPOINTS.UPDATE(setaId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating SETA:', error)
    throw error
  }
}

/**
 * Delete a SETA
 * @param {string} setaId - The SETA ID
 * @returns {Promise<void>}
 */
export const deleteSeta = async (setaId) => {
  try {
    const response = await apiClient.delete(SETA_ENDPOINTS.DELETE(setaId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting SETA:', error)
    throw error
  }
}

/**
 * Seed initial SETA data
 * @returns {Promise<void>}
 */
export const seedSetas = async () => {
  try {
    const setasData = [
      { shortName: 'AgriSETA', fullName: 'Agricultural Sector Education and Training Authority' },
      { shortName: 'BANKSETA', fullName: 'Banking Sector Education and Training Authority' },
      { shortName: 'CHIETA', fullName: 'Chemical Industries Education and Training Authority' },
      { shortName: 'CETA', fullName: 'Construction Education and Training Authority' },
      { shortName: 'CATHSSETA', fullName: 'Culture, Arts, Tourism, Hospitality and Sport SETA' },
      { shortName: 'ETDP SETA', fullName: 'Education, Training and Development Practices SETA' },
      { shortName: 'EWSETA', fullName: 'Energy and Water SETA' },
      { shortName: 'FP&M SETA', fullName: 'Fibre Processing & Manufacturing SETA' },
      { shortName: 'FASSET', fullName: 'Finance and Accounting Services SETA' },
      { shortName: 'FoodBev SETA', fullName: 'Food and Beverage Manufacturing Industry SETA' },
      { shortName: 'HWSETA', fullName: 'Health and Welfare SETA' },
      { shortName: 'INSETA', fullName: 'Insurance SETA' },
      { shortName: 'LGSETA', fullName: 'Local Government SETA' },
      { shortName: 'merSETA', fullName: 'Manufacturing, Engineering and Related Services SETA' },
      { shortName: 'MICT SETA', fullName: 'Media, Information and Communication Technologies SETA' },
      { shortName: 'MQA', fullName: 'Mining Qualifications Authority' },
      { shortName: 'PSETA', fullName: 'Public Service SETA' },
      { shortName: 'SASSETA', fullName: 'Safety and Security SETA' },
      { shortName: 'SSETA', fullName: 'Services SETA' },
      { shortName: 'TETA', fullName: 'Transport Education and Training Authority' },
      { shortName: 'W&RSETA', fullName: 'Wholesale & Retail SETA' }
    ]

    const promises = setasData.map(seta => createSeta(seta))
    await Promise.all(promises)
    console.log('SETAs seeded successfully')
  } catch (error) {
    console.error('Error seeding SETAs:', error)
    throw error
  }
}
