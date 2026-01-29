/**
 * Financial Upload Service
 * Handles CSV uploads for prior year data, budgets, and YTD actuals
 *
 * Data Types:
 * - YTD-3: Year-to-date 3 years ago (e.g., 2021/2022)
 * - YTD-2: Year-to-date 2 years ago (e.g., 2022/2023)
 * - YTD-1: Year-to-date prior year (e.g., 2023/2024)
 * - BUDGET: Budget for current year (e.g., 2024/2025)
 * - YTD_ACTUAL: Actual YTD numbers for current year (e.g., 2024/2025)
 *
 * CSV Format:
 * - Column A: Client Name
 * - Column B: Product Name
 * - Columns C onwards: Month columns using "Month 1", "Month 2", ... "Month 12" format
 *   (Month 1 = first month of financial year, Month 12 = last month)
 *   Legacy formats (Jan, Feb, March, etc.) are also supported for backwards compatibility
 */

import { apiClient } from '../api/config/apiClient'
import { FINANCIAL_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates } from '../api/adapters/idAdapter'

// Upload types
export const UPLOAD_TYPES = {
  YTD_3: 'ytd-3',
  YTD_2: 'ytd-2',
  YTD_1: 'ytd-1',
  BUDGET: 'budget',
  YTD_ACTUAL: 'ytd-actual'  // Current year actuals
}

// Standard month keys for financial year (Month 1 = first month of FY, Month 12 = last month)
const MONTH_KEYS = [
  'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
  'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'
]

// Legacy month names (for backwards compatibility)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Short month names for CSV headers (legacy)
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DATE_FIELDS = ['uploadedAt', 'updatedAt', 'completedAt']

/**
 * Parse CSV file content into structured data
 * @param {string} csvContent - Raw CSV content
 * @returns {Object} Parsed data with headers and rows
 */
export const parseCSV = (csvContent) => {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])

  // Validate required columns
  const clientNameCol = headers.findIndex(h =>
    h.toLowerCase().includes('client') || h.toLowerCase() === 'client name'
  )
  const productNameCol = headers.findIndex(h =>
    h.toLowerCase().includes('product') || h.toLowerCase() === 'product name'
  )

  if (clientNameCol === -1) {
    throw new Error('CSV must have a "Client Name" column')
  }
  if (productNameCol === -1) {
    throw new Error('CSV must have a "Product Name" column')
  }

  // Find month columns - supports "Month 1" through "Month 12" format (preferred)
  // Also supports legacy month names (Jan, Feb, March, etc.) for backwards compatibility
  const monthColumns = []
  headers.forEach((header, index) => {
    if (index <= 1) return // Skip client and product columns

    const headerLower = header.toLowerCase().trim()

    // Check for "Month N" format (preferred)
    // Matches: "Month 1", "Month 2", "month 1", "MONTH 1", "Month1", "M1", etc.
    const monthNumMatch = headerLower.match(/^(?:month\s*)?(\d{1,2})$|^m(\d{1,2})$/)
    if (monthNumMatch) {
      const monthNum = parseInt(monthNumMatch[1] || monthNumMatch[2], 10)
      if (monthNum >= 1 && monthNum <= 12) {
        monthColumns.push({
          index,
          month: `Month ${monthNum}`,  // Standardize to "Month N" format
          monthNumber: monthNum - 1     // 0-indexed for internal use
        })
        return
      }
    }

    // Legacy: Check if header matches short month names (Jan, Feb, etc.)
    const shortMonthIndex = SHORT_MONTHS.findIndex(m =>
      headerLower.startsWith(m.toLowerCase())
    )
    if (shortMonthIndex !== -1) {
      // Convert legacy month names to Month N format based on position in array
      // Position in upload = Month N (1-indexed)
      const monthNum = monthColumns.length + 1
      monthColumns.push({
        index,
        month: `Month ${monthNum}`,
        monthNumber: monthNum - 1,
        legacyName: MONTHS[shortMonthIndex]  // Keep for reference
      })
      return
    }

    // Legacy: Try full month names
    const fullMonthIndex = MONTHS.findIndex(m =>
      headerLower.startsWith(m.toLowerCase())
    )
    if (fullMonthIndex !== -1) {
      const monthNum = monthColumns.length + 1
      monthColumns.push({
        index,
        month: `Month ${monthNum}`,
        monthNumber: monthNum - 1,
        legacyName: MONTHS[fullMonthIndex]
      })
    }
  })

  if (monthColumns.length === 0) {
    throw new Error('CSV must have month columns. Use "Month 1", "Month 2", ... "Month 12" format (or legacy: Jan, Feb, March, etc.)')
  }

  if (monthColumns.length !== 12) {
    console.warn(`CSV has ${monthColumns.length} month columns. Expected 12 for a full financial year.`)
  }

  // Parse data rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const clientName = values[clientNameCol]?.trim()
    const productName = values[productNameCol]?.trim()

    if (!clientName || !productName) continue

    const monthlyData = {}
    let rowTotal = 0

    monthColumns.forEach(({ index, month }) => {
      const value = parseFloat(values[index]?.replace(/[^\d.-]/g, '') || '0')
      monthlyData[month] = value
      rowTotal += value
    })

    rows.push({
      clientName,
      productName,
      monthlyData,
      total: rowTotal
    })
  }

  return {
    headers,
    monthColumns: monthColumns.map(m => m.month),
    rows,
    totalAmount: rows.reduce((sum, row) => sum + row.total, 0)
  }
}

/**
 * Parse a single CSV line handling quoted values
 */
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

/**
 * Validate uploaded data against existing clients and products
 * @param {Array} rows - Parsed CSV rows
 * @param {Array} clients - Existing clients from database
 * @param {Array} productLines - Existing product lines from database
 * @returns {Object} Validation results
 */
export const validateUploadData = (rows, clients, productLines) => {
  const matchedRows = []
  const unmatchedClients = []
  const unmatchedProducts = []
  const duplicateRows = []
  const seenCombinations = new Set()

  // Create lookup maps for faster matching
  const clientNameMap = new Map()
  clients.forEach(client => {
    const normalizedName = normalizeString(client.name || client.companyName || '')
    if (normalizedName) {
      clientNameMap.set(normalizedName, client)
    }
  })

  const productNameMap = new Map()
  productLines.forEach(product => {
    const normalizedName = normalizeString(product.name)
    if (normalizedName) {
      productNameMap.set(normalizedName, product)
    }
  })

  rows.forEach((row, index) => {
    const normalizedClientName = normalizeString(row.clientName)
    const normalizedProductName = normalizeString(row.productName)

    // Check for duplicates
    const key = `${normalizedClientName}|${normalizedProductName}`
    if (seenCombinations.has(key)) {
      duplicateRows.push({
        ...row,
        rowIndex: index + 2, // +2 for header row and 0-based index
        reason: 'Duplicate client/product combination'
      })
      return
    }
    seenCombinations.add(key)

    // Match client
    const matchedClient = clientNameMap.get(normalizedClientName)
    const matchedProduct = productNameMap.get(normalizedProductName)

    if (!matchedClient) {
      unmatchedClients.push({
        clientName: row.clientName,
        productName: row.productName,
        total: row.total,
        rowIndex: index + 2
      })
    }

    if (!matchedProduct) {
      // Check if product already in unmatched list
      if (!unmatchedProducts.find(p => normalizeString(p.productName) === normalizedProductName)) {
        unmatchedProducts.push({
          productName: row.productName,
          rowIndex: index + 2
        })
      }
    }

    if (matchedClient && matchedProduct) {
      matchedRows.push({
        ...row,
        clientId: matchedClient.id,
        clientName: matchedClient.name || matchedClient.companyName,
        productId: matchedProduct.id,
        productLine: matchedProduct.name,
        rowIndex: index + 2
      })
    }
  })

  const matchedTotal = matchedRows.reduce((sum, row) => sum + row.total, 0)
  const unmatchedTotal = unmatchedClients.reduce((sum, row) => sum + row.total, 0)

  return {
    matchedRows,
    unmatchedClients,
    unmatchedProducts,
    duplicateRows,
    summary: {
      totalRows: rows.length,
      matchedCount: matchedRows.length,
      unmatchedClientCount: unmatchedClients.length,
      unmatchedProductCount: unmatchedProducts.length,
      duplicateCount: duplicateRows.length,
      totalAmount: rows.reduce((sum, row) => sum + row.total, 0),
      matchedAmount: matchedTotal,
      unmatchedAmount: unmatchedTotal
    }
  }
}

/**
 * Normalize string for matching (lowercase, remove extra spaces, etc.)
 */
const normalizeString = (str) => {
  if (!str) return ''
  return str.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

/**
 * Save validated financial data via REST API
 * @param {Array} matchedRows - Validated rows with client/product IDs
 * @param {string} uploadType - Type of upload (ytd-3, ytd-2, ytd-1, budget)
 * @param {string} financialYear - Financial year string (e.g., "2024/2025")
 * @param {string} userId - User ID performing the upload
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Result with success/error counts
 */
export const saveFinancialUpload = async (matchedRows, uploadType, financialYear, userId, tenantId) => {
  try {
    const payload = {
      tenantId,
      uploadType,
      financialYear,
      uploadedBy: userId,
      rows: matchedRows.map(row => ({
        clientId: row.clientId,
        clientName: row.clientName,
        productId: row.productId,
        productLine: row.productLine,
        monthlyData: row.monthlyData,
        total: row.total
      })),
      totalAmount: matchedRows.reduce((sum, row) => sum + row.total, 0)
    }

    const response = await apiClient.post(FINANCIAL_ENDPOINTS.UPLOAD_DATA, payload)
    const result = unwrapResponse(response)

    return {
      uploadId: result.uploadId || result.id,
      successCount: result.successCount || matchedRows.length,
      errorCount: result.errorCount || 0,
      errors: result.errors || []
    }
  } catch (error) {
    console.error('Error saving financial upload:', error)
    throw error
  }
}

/**
 * Get financial data for a specific type and year
 * @param {string} uploadType - Upload type
 * @param {string} financialYear - Financial year
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Financial data records
 */
export const getFinancialData = async (uploadType, financialYear, tenantId) => {
  try {
    const url = buildUrl(FINANCIAL_ENDPOINTS.GET_BUDGETS, {
      tenantId,
      uploadType,
      financialYear
    })

    const response = await apiClient.get(url)
    const data = unwrapResponse(response)
    return normalizeEntities(data).map(d => normalizeDates(d, DATE_FIELDS))
  } catch (error) {
    console.error('Error getting financial data:', error)
    return []
  }
}

/**
 * Get financial data by client
 * @param {string} clientId - Client ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Financial data for the client
 */
export const getFinancialDataByClient = async (clientId, tenantId) => {
  try {
    const response = await apiClient.get(FINANCIAL_ENDPOINTS.GET_CLIENT_FINANCIALS(clientId))
    const data = unwrapResponse(response)
    return normalizeEntities(data).map(d => normalizeDates(d, DATE_FIELDS))
  } catch (error) {
    console.error('Error getting financial data by client:', error)
    return []
  }
}

/**
 * Get financial data by salesperson (via their clients)
 * @param {Array} clientIds - Array of client IDs assigned to the salesperson
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Financial data for the salesperson's clients
 */
export const getFinancialDataBySalesperson = async (clientIds, tenantId) => {
  if (!clientIds || clientIds.length === 0) {
    return []
  }

  try {
    const url = buildUrl(FINANCIAL_ENDPOINTS.GET_BUDGETS, {
      tenantId,
      clientIds: clientIds.join(',')
    })

    const response = await apiClient.get(url)
    const data = unwrapResponse(response)
    return normalizeEntities(data).map(d => normalizeDates(d, DATE_FIELDS))
  } catch (error) {
    console.error('Error getting financial data by salesperson:', error)
    return []
  }
}

/**
 * Get upload history for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Upload records
 */
export const getUploadHistory = async (tenantId) => {
  try {
    const url = buildUrl(FINANCIAL_ENDPOINTS.GET_UPLOAD_HISTORY, { tenantId })
    const response = await apiClient.get(url)
    const uploads = unwrapResponse(response)
    return normalizeEntities(uploads)
      .map(u => normalizeDates(u, DATE_FIELDS))
      .sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt) : new Date(0)
        const dateB = b.uploadedAt ? new Date(b.uploadedAt) : new Date(0)
        return dateB - dateA
      })
  } catch (error) {
    console.error('Error getting upload history:', error)
    return []
  }
}

/**
 * Delete financial data for a specific upload
 * @param {string} uploadId - Upload ID to delete
 * @param {string} tenantId - Tenant ID for verification
 */
export const deleteFinancialUpload = async (uploadId, tenantId) => {
  try {
    const response = await apiClient.delete(FINANCIAL_ENDPOINTS.DELETE_UPLOAD(uploadId))
    const result = unwrapResponse(response)
    return { deletedCount: result.deletedCount || 0 }
  } catch (error) {
    console.error('Error deleting financial upload:', error)
    throw error
  }
}

/**
 * Calculate financial year from current year and offset
 * @param {string} currentFY - Current financial year (e.g., "2024/2025")
 * @param {number} offset - Offset (0 = current, -1 = prior year, -2 = 2 years ago, -3 = 3 years ago)
 * @returns {string} Financial year string
 */
export const calculateFinancialYear = (currentFY, offset) => {
  if (!currentFY) return ''

  const parts = currentFY.split('/')
  if (parts.length !== 2) return currentFY

  const startYear = parseInt(parts[0], 10) + offset
  const endYear = parseInt(parts[1], 10) + offset

  return `${startYear}/${endYear}`
}

/**
 * Get aggregated financial comparison data
 * @param {string} tenantId - Tenant ID
 * @param {string} currentFY - Current financial year
 * @param {Array} clientIds - Optional filter by client IDs
 * @returns {Promise<Object>} Aggregated comparison data
 */
export const getFinancialComparison = async (tenantId, currentFY, clientIds = null) => {
  try {
    // Calculate financial years
    const fy0 = currentFY // Current year budget
    const fy1 = calculateFinancialYear(currentFY, -1) // YTD-1
    const fy2 = calculateFinancialYear(currentFY, -2) // YTD-2
    const fy3 = calculateFinancialYear(currentFY, -3) // YTD-3

    // Fetch all data types
    const [budgetData, ytd1Data, ytd2Data, ytd3Data] = await Promise.all([
      getFinancialData(UPLOAD_TYPES.BUDGET, fy0, tenantId),
      getFinancialData(UPLOAD_TYPES.YTD_1, fy1, tenantId),
      getFinancialData(UPLOAD_TYPES.YTD_2, fy2, tenantId),
      getFinancialData(UPLOAD_TYPES.YTD_3, fy3, tenantId)
    ])

    // Filter by client IDs if provided
    const filterByClients = (data) => {
      if (!clientIds) return data
      return data.filter(d => clientIds.includes(d.clientId))
    }

    return {
      budget: {
        year: fy0,
        data: filterByClients(budgetData),
        total: filterByClients(budgetData).reduce((sum, d) => sum + (d.total || 0), 0)
      },
      ytd1: {
        year: fy1,
        data: filterByClients(ytd1Data),
        total: filterByClients(ytd1Data).reduce((sum, d) => sum + (d.total || 0), 0)
      },
      ytd2: {
        year: fy2,
        data: filterByClients(ytd2Data),
        total: filterByClients(ytd2Data).reduce((sum, d) => sum + (d.total || 0), 0)
      },
      ytd3: {
        year: fy3,
        data: filterByClients(ytd3Data),
        total: filterByClients(ytd3Data).reduce((sum, d) => sum + (d.total || 0), 0)
      }
    }
  } catch (error) {
    console.error('Error getting financial comparison:', error)
    throw error
  }
}

/**
 * Aggregate financial data by month for comparison charts
 * @param {Array} data - Financial data records
 * @param {Array} fyMonths - Financial year month order
 * @returns {Object} Monthly aggregated data
 */
export const aggregateByMonth = (data, fyMonths) => {
  const monthlyTotals = {}

  // Initialize all months to 0
  fyMonths.forEach(month => {
    monthlyTotals[month] = 0
  })

  // Sum up monthly data
  data.forEach(record => {
    if (record.monthlyData) {
      Object.entries(record.monthlyData).forEach(([month, amount]) => {
        if (monthlyTotals.hasOwnProperty(month)) {
          monthlyTotals[month] += amount || 0
        }
      })
    }
  })

  // Calculate cumulative YTD
  let cumulative = 0
  const ytdTotals = {}
  fyMonths.forEach(month => {
    cumulative += monthlyTotals[month]
    ytdTotals[month] = cumulative
  })

  return {
    monthly: monthlyTotals,
    ytd: ytdTotals,
    total: cumulative
  }
}

/**
 * Aggregate financial data by product line
 * @param {Array} data - Financial data records
 * @returns {Object} Product line aggregated data
 */
export const aggregateByProductLine = (data) => {
  const productTotals = {}

  data.forEach(record => {
    const productLine = record.productLine || 'Unknown'
    if (!productTotals[productLine]) {
      productTotals[productLine] = {
        total: 0,
        clientCount: 0,
        clients: new Set()
      }
    }
    productTotals[productLine].total += record.total || 0
    productTotals[productLine].clients.add(record.clientId)
  })

  // Convert Set to count
  Object.keys(productTotals).forEach(pl => {
    productTotals[pl].clientCount = productTotals[pl].clients.size
    delete productTotals[pl].clients
  })

  return productTotals
}

/**
 * Aggregate financial data by client
 * @param {Array} data - Financial data records
 * @returns {Array} Client aggregated data sorted by total descending
 */
export const aggregateByClient = (data) => {
  const clientTotals = {}

  data.forEach(record => {
    const clientId = record.clientId
    if (!clientTotals[clientId]) {
      clientTotals[clientId] = {
        clientId,
        clientName: record.clientName,
        total: 0,
        products: {}
      }
    }
    clientTotals[clientId].total += record.total || 0

    const productLine = record.productLine || 'Unknown'
    if (!clientTotals[clientId].products[productLine]) {
      clientTotals[clientId].products[productLine] = 0
    }
    clientTotals[clientId].products[productLine] += record.total || 0
  })

  return Object.values(clientTotals).sort((a, b) => b.total - a.total)
}

export default {
  UPLOAD_TYPES,
  parseCSV,
  validateUploadData,
  saveFinancialUpload,
  getFinancialData,
  getFinancialDataByClient,
  getFinancialDataBySalesperson,
  getUploadHistory,
  deleteFinancialUpload,
  calculateFinancialYear,
  getFinancialComparison,
  aggregateByMonth,
  aggregateByProductLine,
  aggregateByClient
}
