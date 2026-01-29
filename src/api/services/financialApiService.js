/**
 * Financial API Service
 *
 * Provides all financial-related API operations:
 * - Financial dashboard
 * - Client financials (forecasts)
 * - Budgets
 * - Financial year settings
 */

import { apiClient } from '../config/apiClient'
import { FINANCIAL_ENDPOINTS, buildUrl, buildPaginationParams } from '../config/endpoints'
import { unwrapResponse, unwrapPagedResponse } from '../adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../adapters/idAdapter'

const FINANCIAL_DATE_FIELDS = ['createdAt', 'updatedAt']

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

/**
 * Get financial dashboard data
 * @returns {Promise<Object>} Dashboard data with revenue by product line
 */
export const getFinancialDashboard = async () => {
  try {
    const response = await apiClient.get(FINANCIAL_ENDPOINTS.DASHBOARD)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting financial dashboard:', error)
    // Return default structure on error
    return {
      learnerships: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      tapBusiness: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      compliance: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      otherCourses: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 }
    }
  }
}

/**
 * Update financial dashboard data
 * @param {Object} financialData - Dashboard data to update
 * @returns {Promise<void>}
 */
export const updateFinancialDashboard = async (financialData) => {
  try {
    const payload = serializeDates({ ...financialData }, FINANCIAL_DATE_FIELDS)
    const response = await apiClient.put(FINANCIAL_ENDPOINTS.DASHBOARD, payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating financial dashboard:', error)
    throw error
  }
}

// =============================================================================
// CLIENT FINANCIALS
// =============================================================================

/**
 * Get a single client financial record
 * @param {string} clientId - Client ID
 * @param {string|number} financialYear - Financial year (e.g., "2024/2025" or 2025)
 * @param {string} productLine - Product line name
 * @returns {Promise<Object|null>} Client financial record or null
 */
export const getClientFinancial = async (clientId, financialYear, productLine) => {
  try {
    const params = { financialYear, productLine }
    const url = buildUrl(FINANCIAL_ENDPOINTS.CLIENT_SUMMARY(clientId), params)
    const response = await apiClient.get(url)
    const financial = unwrapResponse(response)
    return financial ? normalizeDates(normalizeEntity(financial), FINANCIAL_DATE_FIELDS) : null
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting client financial:', error)
    throw error
  }
}

/**
 * Get all client financials with optional filters
 * @param {Array<string>|null} clientIds - Optional array of client IDs to filter
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancials = async (clientIds = null) => {
  try {
    // If clientIds is an empty array, return empty (no clients = no financials)
    if (Array.isArray(clientIds) && clientIds.length === 0) {
      return []
    }

    const params = clientIds ? { clientIds: clientIds.join(',') } : {}
    const url = buildUrl('/api/Financial/ClientFinancials', params)
    const response = await apiClient.get(url)
    const financials = unwrapResponse(response)
    return normalizeEntities(financials).map(f => normalizeDates(f, FINANCIAL_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting client financials:', error)
    return []
  }
}

/**
 * Get all client financials for a specific financial year
 * @param {string|number} financialYear - Financial year
 * @param {Object} filters - Optional filters (clientId, productLine)
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancialsByYear = async (financialYear, filters = {}) => {
  try {
    const params = { financialYear, ...filters }
    const url = buildUrl('/api/Financial/ClientFinancials/ByYear', params)
    const response = await apiClient.get(url)
    const financials = unwrapResponse(response)
    return normalizeEntities(financials).map(f => normalizeDates(f, FINANCIAL_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting client financials by year:', error)
    return []
  }
}

/**
 * Get all client financials for a specific client
 * @param {string} clientId - Client ID
 * @param {string|number} financialYear - Optional financial year filter
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancialsByClient = async (clientId, financialYear = null) => {
  try {
    const params = financialYear ? { financialYear } : {}
    const url = buildUrl(FINANCIAL_ENDPOINTS.CLIENT_ENTRIES(clientId), params)
    const response = await apiClient.get(url)
    const financials = unwrapResponse(response)
    return normalizeEntities(financials).map(f => normalizeDates(f, FINANCIAL_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting client financials by client:', error)
    return []
  }
}

/**
 * Calculate full year forecast from YTD + remaining months
 * @param {Object} financialData - Financial data with history and months
 * @returns {number} Full year forecast amount
 */
export const calculateFullYearForecast = (financialData) => {
  const ytd = financialData.history?.currentYearYTD || 0
  const months = financialData.months || {}

  // Sum all remaining month forecasts
  const monthTotal = Object.values(months).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  return ytd + monthTotal
}

/**
 * Save or update a client financial record
 * @param {string} clientId - Client ID
 * @param {string} clientName - Client name
 * @param {string|number} financialYear - Financial year
 * @param {string} productLine - Product line
 * @param {Object} financialData - Financial data to save
 * @param {string} userId - User performing the action
 * @returns {Promise<string>} Financial record ID
 */
export const saveClientFinancial = async (clientId, clientName, financialYear, productLine, financialData, userId) => {
  try {
    // Calculate full year forecast if not provided
    const fullYearForecast = financialData.fullYearForecast !== undefined
      ? financialData.fullYearForecast
      : calculateFullYearForecast(financialData)

    const payload = {
      clientId,
      clientName,
      financialYear,
      productLine,
      history: financialData.history || {
        yearMinus1: 0,
        yearMinus2: 0,
        yearMinus3: 0,
        currentYearYTD: 0
      },
      months: financialData.months || {},
      monthComments: financialData.monthComments || {},
      fullYearForecast,
      comments: financialData.comments || '',
      learnershipDetails: financialData.learnershipDetails || [],
      tapBusinessDetails: financialData.tapBusinessDetails || [],
      complianceDetails: financialData.complianceDetails || [],
      otherCoursesDetails: financialData.otherCoursesDetails || [],
      updatedBy: userId
    }

    const response = await apiClient.post(FINANCIAL_ENDPOINTS.CREATE_ENTRY, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error saving client financial:', error)
    throw error
  }
}

/**
 * Batch save multiple client financial records (for CSV import)
 * @param {Array} financialRecords - Array of financial record objects
 * @param {string} userId - User performing the action
 * @returns {Promise<Object>} Result with success count and errors
 */
export const batchSaveClientFinancials = async (financialRecords, userId) => {
  try {
    const payload = {
      records: financialRecords.map(record => ({
        clientId: record.clientId,
        clientName: record.clientName,
        financialYear: record.financialYear,
        productLine: record.productLine,
        history: record.financialData?.history || {},
        months: record.financialData?.months || {},
        fullYearForecast: calculateFullYearForecast(record.financialData || {}),
        comments: record.financialData?.comments || '',
        learnershipDetails: record.financialData?.learnershipDetails || [],
        tapBusinessDetails: record.financialData?.tapBusinessDetails || [],
        complianceDetails: record.financialData?.complianceDetails || [],
        otherCoursesDetails: record.financialData?.otherCoursesDetails || []
      })),
      updatedBy: userId
    }

    const response = await apiClient.post('/api/Financial/BatchSave', payload)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error batch saving client financials:', error)
    throw error
  }
}

/**
 * Delete a client financial record
 * @param {string} financialId - Financial record ID
 * @returns {Promise<void>}
 */
export const deleteClientFinancial = async (financialId) => {
  try {
    const response = await apiClient.delete(FINANCIAL_ENDPOINTS.DELETE_ENTRY(financialId))
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting client financial:', error)
    throw error
  }
}

/**
 * Get aggregated financial summary by product line for a financial year
 * @param {string|number} financialYear - Financial year
 * @returns {Promise<Object>} Summary object keyed by product line
 */
export const getFinancialSummaryByProductLine = async (financialYear) => {
  try {
    const params = { financialYear }
    const url = buildUrl('/api/Financial/Summary/ByProductLine', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting financial summary by product line:', error)
    return {}
  }
}

// =============================================================================
// BUDGETS
// =============================================================================

/**
 * Get all budgets for a financial year
 * @param {string} financialYear - Financial year (e.g., "2024/2025")
 * @returns {Promise<Array>} Array of budget records
 */
export const getBudgets = async (financialYear = null) => {
  try {
    const params = financialYear ? { financialYear } : {}
    const url = buildUrl('/api/Financial/Budgets', params)
    const response = await apiClient.get(url)
    const budgets = unwrapResponse(response)
    return normalizeEntities(budgets).map(b => normalizeDates(b, FINANCIAL_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting budgets:', error)
    return []
  }
}

/**
 * Get budgets for a specific salesperson
 * @param {string} userId - Salesperson user ID
 * @param {string} financialYear - Optional financial year filter
 * @returns {Promise<Array>} Array of budget records
 */
export const getBudgetsBySalesperson = async (userId, financialYear = null) => {
  try {
    const params = { salespersonId: userId }
    if (financialYear) {
      params.financialYear = financialYear
    }
    const url = buildUrl('/api/Financial/Budgets/BySalesperson', params)
    const response = await apiClient.get(url)
    const budgets = unwrapResponse(response)
    return normalizeEntities(budgets).map(b => normalizeDates(b, FINANCIAL_DATE_FIELDS))
  } catch (error) {
    console.error('Error getting budgets by salesperson:', error)
    return []
  }
}

/**
 * Save or update a budget record
 * @param {string} salespersonId - Salesperson user ID
 * @param {string} productLine - Product line
 * @param {string} financialYear - Financial year
 * @param {number} budgetAmount - Budget amount
 * @param {string} updatedBy - User performing the action
 * @returns {Promise<string>} Budget ID
 */
export const saveBudget = async (salespersonId, productLine, financialYear, budgetAmount, updatedBy) => {
  try {
    const payload = {
      salespersonId,
      productLine,
      financialYear,
      budgetAmount: parseFloat(budgetAmount) || 0,
      updatedBy
    }

    const response = await apiClient.post('/api/Financial/Budgets', payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error saving budget:', error)
    throw error
  }
}

/**
 * Delete a budget record
 * @param {string} budgetId - Budget document ID
 * @returns {Promise<void>}
 */
export const deleteBudget = async (budgetId) => {
  try {
    const response = await apiClient.delete(`/api/Financial/Budgets/${budgetId}`)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting budget:', error)
    throw error
  }
}

/**
 * Get budget vs forecast comparison for all salespeople
 * @param {string} financialYear - Financial year
 * @returns {Promise<Array>} Array with budget vs forecast data per salesperson
 */
export const getBudgetVsForecast = async (financialYear) => {
  try {
    const params = { financialYear }
    const url = buildUrl('/api/Financial/BudgetVsForecast', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting budget vs forecast:', error)
    return []
  }
}

// =============================================================================
// FINANCIAL YEAR SETTINGS
// =============================================================================

/**
 * Get financial year settings for a tenant
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<Object>} Financial year settings
 */
export const getFinancialYearSettings = async (tenantId = null) => {
  try {
    const params = tenantId ? { tenantId } : {}
    const url = buildUrl('/api/Financial/Settings/FinancialYear', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting financial year settings:', error)
    // Return defaults on error
    return {
      currentFinancialYear: '2024/2025',
      financialYearStart: 'March',
      financialYearEnd: 'February',
      reportingMonth: 'February',
      tenantId: tenantId
    }
  }
}

/**
 * Save financial year settings for a tenant
 * @param {Object} settings - Financial year settings
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<void>}
 */
export const saveFinancialYearSettings = async (settings, tenantId = null) => {
  try {
    const payload = {
      ...settings,
      tenantId
    }
    const response = await apiClient.put('/api/Financial/Settings/FinancialYear', payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving financial year settings:', error)
    throw error
  }
}

/**
 * Get month number from month name
 * @param {string} monthName - Month name (e.g., "March")
 * @returns {number} Month number (1-12)
 */
const getMonthNumber = (monthName) => {
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  }
  return months[monthName.toLowerCase()] || 1
}

/**
 * Calculate financial year months structure
 * @param {string} tenantId - Optional tenant ID
 * @returns {Promise<Object>} Financial year months configuration
 */
export const calculateFinancialYearMonths = async (tenantId = null) => {
  try {
    const fySettings = await getFinancialYearSettings(tenantId)
    const fyStartMonth = getMonthNumber(fySettings.financialYearStart || 'March')
    const fyEndMonth = getMonthNumber(fySettings.financialYearEnd || 'February')
    const reportingMonthNumber = getMonthNumber(fySettings.reportingMonth || fySettings.financialYearEnd || 'February')

    // Determine financial year end year from string like "2024/2025"
    let fyEndYear = new Date().getFullYear()
    if (typeof fySettings.currentFinancialYear === 'string') {
      const parts = fySettings.currentFinancialYear.split('/')
      if (parts.length === 2) {
        fyEndYear = parseInt(parts[1], 10)
      }
    }

    // Build months array based on financial year
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const months = []

    for (let i = 0; i < 12; i++) {
      const monthIndex = (fyStartMonth - 1 + i) % 12
      const year = monthIndex < fyStartMonth - 1 ? fyEndYear : fyEndYear - 1
      months.push({
        name: monthNames[monthIndex],
        monthNumber: monthIndex + 1,
        year,
        key: `${monthNames[monthIndex].toLowerCase()}${year}`
      })
    }

    return {
      months,
      fyStartMonth,
      fyEndMonth,
      reportingMonth: reportingMonthNumber,
      currentFinancialYear: fySettings.currentFinancialYear
    }
  } catch (error) {
    console.error('Error calculating financial year months:', error)
    throw error
  }
}

// =============================================================================
// FORECASTS
// =============================================================================

/**
 * Get forecast for a client and period
 * @param {string} clientId - Client ID
 * @param {string} period - Forecast period
 * @returns {Promise<Object|null>} Forecast data or null
 */
export const getForecast = async (clientId, period) => {
  try {
    const params = { period }
    const url = buildUrl(`/api/Financial/Forecast/${clientId}`, params)
    const response = await apiClient.get(url)
    const forecast = unwrapResponse(response)
    return forecast ? normalizeDates(normalizeEntity(forecast), FINANCIAL_DATE_FIELDS) : null
  } catch (error) {
    if (error.statusCode === 404) return null
    console.error('Error getting forecast:', error)
    throw error
  }
}

/**
 * Save forecast for a client and period
 * @param {string} clientId - Client ID
 * @param {string} period - Forecast period
 * @param {Object} forecastData - Forecast data
 * @returns {Promise<void>}
 */
export const saveForecast = async (clientId, period, forecastData) => {
  try {
    const payload = {
      clientId,
      period,
      ...forecastData
    }
    const response = await apiClient.post('/api/Financial/Forecast', payload)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving forecast:', error)
    throw error
  }
}

// =============================================================================
// FILE UPLOAD
// =============================================================================

/**
 * Upload financial data file (CSV/Excel)
 * @param {File} file - File to upload
 * @param {string} financialYear - Target financial year
 * @returns {Promise<Object>} Upload result with processed records
 */
export const uploadFinancialFile = async (file, financialYear) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('financialYear', financialYear)

    const response = await apiClient.upload(FINANCIAL_ENDPOINTS.UPLOAD, formData)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error uploading financial file:', error)
    throw error
  }
}

// =============================================================================
// DEFAULT PRODUCT LINES
// =============================================================================

/**
 * Get default product lines for salesperson forecast view
 * @returns {Promise<Array>} Array of default product lines
 */
export const getDefaultProductLines = async () => {
  try {
    const response = await apiClient.get('/api/Financial/Settings/DefaultProductLines')
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting default product lines:', error)
    // Return default product lines on error
    return [
      { id: 'learnerships', name: 'Learnerships', order: 1 },
      { id: 'tap-business', name: 'TAP Business', order: 2 },
      { id: 'compliance', name: 'Compliance', order: 3 },
      { id: 'other-courses', name: 'Other Courses', order: 4 }
    ]
  }
}

/**
 * Save default product lines for salesperson forecast view
 * @param {Array} productLines - Array of product lines
 * @returns {Promise<void>}
 */
export const saveDefaultProductLines = async (productLines) => {
  try {
    const response = await apiClient.put('/api/Financial/Settings/DefaultProductLines', { productLines })
    unwrapResponse(response)
  } catch (error) {
    console.error('Error saving default product lines:', error)
    throw error
  }
}
