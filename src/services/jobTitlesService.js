/**
 * Job Titles Service
 *
 * Provides API operations for job titles.
 */

import { apiClient } from '../api/config/apiClient'
import { buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

// Job Titles endpoints (may need to be added to endpoints.js if not present)
const JOB_TITLE_ENDPOINTS = {
  LIST: '/api/JobTitle/GetList',
  GET_BY_KEY: (jobTitleKey) => `/api/JobTitle/GetById?jobTitleKey=${jobTitleKey}`,
  CREATE: '/api/JobTitle/CreateJobTitle',
  UPDATE: (jobTitleKey) => `/api/JobTitle/UpdateJobTitle?jobTitleKey=${jobTitleKey}`,
  DELETE: (jobTitleKey) => `/api/JobTitle/Delete?jobTitleKey=${jobTitleKey}`
}

const DATE_FIELDS = ['createdAt', 'updatedAt']

/**
 * Get all job titles
 * @returns {Promise<Array>} Array of job title objects
 */
export const getJobTitles = async () => {
  try {
    const response = await apiClient.get(JOB_TITLE_ENDPOINTS.LIST)
    const jobTitles = unwrapResponse(response)
    const normalized = normalizeEntities(jobTitles).map(j => normalizeDates(j, DATE_FIELDS))
    // Sort by title alphabetically
    return normalized.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  } catch (error) {
    console.error('Error getting job titles:', error)
    return []
  }
}

/**
 * Get a single job title by ID
 * @param {string} jobTitleId - The job title ID
 * @returns {Promise<Object>} Job title object
 */
export const getJobTitle = async (jobTitleId) => {
  try {
    const response = await apiClient.get(JOB_TITLE_ENDPOINTS.GET_BY_KEY(jobTitleId))
    const jobTitle = unwrapResponse(response)
    return normalizeDates(normalizeEntity(jobTitle), DATE_FIELDS)
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting job title:', error)
    throw error
  }
}

/**
 * Create a new job title
 * @param {Object} jobTitleData - Job title data {title}
 * @returns {Promise<string>} The new job title ID
 */
export const createJobTitle = async (jobTitleData) => {
  try {
    const payload = serializeDates({
      title: jobTitleData.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.post(JOB_TITLE_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating job title:', error)
    throw error
  }
}

/**
 * Update an existing job title
 * @param {string} jobTitleId - The job title ID
 * @param {Object} jobTitleData - Job title data to update {title}
 * @returns {Promise<void>}
 */
export const updateJobTitle = async (jobTitleId, jobTitleData) => {
  try {
    const payload = serializeDates({
      title: jobTitleData.title,
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.put(JOB_TITLE_ENDPOINTS.UPDATE(jobTitleId), payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating job title:', error)
    throw error
  }
}

/**
 * Delete a job title
 * @param {string} jobTitleId - The job title ID
 * @returns {Promise<void>}
 */
export const deleteJobTitle = async (jobTitleId) => {
  try {
    const response = await apiClient.delete(JOB_TITLE_ENDPOINTS.DELETE(jobTitleId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting job title:', error)
    throw error
  }
}

/**
 * Seed initial job title data
 * @returns {Promise<void>}
 */
export const seedJobTitles = async () => {
  try {
    const jobTitlesData = [
      { title: 'HR Manager' },
      { title: 'HR Admin' },
      { title: 'Skills and Development Facilitator' },
      { title: 'Transformations Manager' },
      { title: 'HR Director' },
      { title: 'Financial Manager' },
      { title: 'Financial Director' },
      { title: 'Managing Director' }
    ]

    const promises = jobTitlesData.map(jobTitle => createJobTitle(jobTitle))
    await Promise.all(promises)
    console.log('Job titles seeded successfully')
  } catch (error) {
    console.error('Error seeding job titles:', error)
    throw error
  }
}
