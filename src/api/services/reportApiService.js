/**
 * Report API Service
 *
 * Provides reporting and analytics API operations:
 * - Dashboard reports
 * - Sales pipeline reports
 * - Client activity reports
 * - Financial summary reports
 * - User performance reports
 * - Report exports
 */

import { apiClient } from '../config/apiClient'
import { REPORT_ENDPOINTS, buildUrl } from '../config/endpoints'
import { unwrapResponse } from '../adapters/responseAdapter'

// =============================================================================
// DASHBOARD REPORTS
// =============================================================================

/**
 * Get main dashboard report data
 * @param {Object} filters - Optional filters (dateRange, userId, tenantId)
 * @returns {Promise<Object>} Dashboard data
 */
export const getDashboardReport = async (filters = {}) => {
  try {
    const url = buildUrl(REPORT_ENDPOINTS.DASHBOARD, filters)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting dashboard report:', error)
    return {
      totalClients: 0,
      activeDeals: 0,
      pendingTasks: 0,
      revenue: 0,
      recentActivity: []
    }
  }
}

// =============================================================================
// SALES PIPELINE REPORTS
// =============================================================================

/**
 * Get sales pipeline report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Pipeline report data
 */
export const getSalesPipelineReport = async (options = {}) => {
  try {
    const {
      financialYear,
      userId,
      teamId,
      productLine,
      dateFrom,
      dateTo
    } = options

    const params = {}
    if (financialYear) params.financialYear = financialYear
    if (userId) params.userId = userId
    if (teamId) params.teamId = teamId
    if (productLine) params.productLine = productLine
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo

    const url = buildUrl(REPORT_ENDPOINTS.SALES_PIPELINE, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting sales pipeline report:', error)
    return {
      stages: [],
      totalValue: 0,
      dealCount: 0,
      conversionRate: 0
    }
  }
}

/**
 * Get pipeline status analytics
 * @param {string} financialYear - Financial year filter
 * @returns {Promise<Object>} Pipeline analytics data
 */
export const getPipelineAnalytics = async (financialYear = null) => {
  try {
    const params = financialYear ? { financialYear } : {}
    const url = buildUrl('/api/Report/PipelineAnalytics', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting pipeline analytics:', error)
    return {
      statusCounts: {},
      valueByStatus: {},
      avgDaysInStatus: {}
    }
  }
}

// =============================================================================
// CLIENT ACTIVITY REPORTS
// =============================================================================

/**
 * Get client activity report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Client activity report data
 */
export const getClientActivityReport = async (options = {}) => {
  try {
    const {
      clientId,
      userId,
      dateFrom,
      dateTo,
      activityType
    } = options

    const params = {}
    if (clientId) params.clientId = clientId
    if (userId) params.userId = userId
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (activityType) params.activityType = activityType

    const url = buildUrl(REPORT_ENDPOINTS.CLIENT_ACTIVITY, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting client activity report:', error)
    return {
      activities: [],
      totalCount: 0,
      byType: {}
    }
  }
}

/**
 * Get client engagement metrics
 * @param {string} clientId - Client ID
 * @param {string} period - Time period (week, month, quarter, year)
 * @returns {Promise<Object>} Engagement metrics
 */
export const getClientEngagementMetrics = async (clientId, period = 'month') => {
  try {
    const params = { period }
    const url = buildUrl(`/api/Report/ClientEngagement/${clientId}`, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting client engagement metrics:', error)
    return {
      interactions: 0,
      lastContact: null,
      responseRate: 0,
      engagementScore: 0
    }
  }
}

// =============================================================================
// FINANCIAL REPORTS
// =============================================================================

/**
 * Get financial summary report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Financial summary data
 */
export const getFinancialSummaryReport = async (options = {}) => {
  try {
    const {
      financialYear,
      userId,
      teamId,
      productLine,
      groupBy
    } = options

    const params = {}
    if (financialYear) params.financialYear = financialYear
    if (userId) params.userId = userId
    if (teamId) params.teamId = teamId
    if (productLine) params.productLine = productLine
    if (groupBy) params.groupBy = groupBy

    const url = buildUrl(REPORT_ENDPOINTS.FINANCIAL_SUMMARY, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting financial summary report:', error)
    return {
      totalRevenue: 0,
      totalBudget: 0,
      totalForecast: 0,
      variance: 0,
      byProductLine: {},
      byMonth: {}
    }
  }
}

/**
 * Get revenue by product line report
 * @param {string} financialYear - Financial year
 * @returns {Promise<Array>} Revenue by product line
 */
export const getRevenueByProductLine = async (financialYear) => {
  try {
    const params = { financialYear }
    const url = buildUrl('/api/Report/RevenueByProductLine', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting revenue by product line:', error)
    return []
  }
}

/**
 * Get monthly revenue trend
 * @param {string} financialYear - Financial year
 * @param {string} productLine - Optional product line filter
 * @returns {Promise<Array>} Monthly revenue data
 */
export const getMonthlyRevenueTrend = async (financialYear, productLine = null) => {
  try {
    const params = { financialYear }
    if (productLine) params.productLine = productLine

    const url = buildUrl('/api/Report/MonthlyRevenue', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting monthly revenue trend:', error)
    return []
  }
}

// =============================================================================
// USER PERFORMANCE REPORTS
// =============================================================================

/**
 * Get user performance report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} User performance data
 */
export const getUserPerformanceReport = async (options = {}) => {
  try {
    const {
      userId,
      teamId,
      financialYear,
      dateFrom,
      dateTo
    } = options

    const params = {}
    if (userId) params.userId = userId
    if (teamId) params.teamId = teamId
    if (financialYear) params.financialYear = financialYear
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo

    const url = buildUrl(REPORT_ENDPOINTS.USER_PERFORMANCE, params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting user performance report:', error)
    return {
      users: [],
      totalDeals: 0,
      totalRevenue: 0,
      avgConversionRate: 0
    }
  }
}

/**
 * Get team performance comparison
 * @param {string} financialYear - Financial year
 * @returns {Promise<Array>} Team performance data
 */
export const getTeamPerformanceComparison = async (financialYear) => {
  try {
    const params = { financialYear }
    const url = buildUrl('/api/Report/TeamPerformance', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting team performance comparison:', error)
    return []
  }
}

/**
 * Get salesperson leaderboard
 * @param {Object} options - Report options
 * @returns {Promise<Array>} Leaderboard data
 */
export const getSalespersonLeaderboard = async (options = {}) => {
  try {
    const {
      financialYear,
      metric = 'revenue',
      limit = 10
    } = options

    const params = { metric, limit }
    if (financialYear) params.financialYear = financialYear

    const url = buildUrl('/api/Report/Leaderboard', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting salesperson leaderboard:', error)
    return []
  }
}

// =============================================================================
// TASK REPORTS
// =============================================================================

/**
 * Get task completion report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Task completion data
 */
export const getTaskCompletionReport = async (options = {}) => {
  try {
    const {
      userId,
      dateFrom,
      dateTo,
      status
    } = options

    const params = {}
    if (userId) params.userId = userId
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (status) params.status = status

    const url = buildUrl('/api/Report/TaskCompletion', params)
    const response = await apiClient.get(url)
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting task completion report:', error)
    return {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      completionRate: 0
    }
  }
}

// =============================================================================
// REPORT EXPORTS
// =============================================================================

/**
 * Export report to file
 * @param {string} reportType - Type of report to export
 * @param {Object} options - Export options
 * @param {string} format - Export format (csv, xlsx, pdf)
 * @returns {Promise<Blob>} File blob
 */
export const exportReport = async (reportType, options = {}, format = 'xlsx') => {
  try {
    const params = {
      reportType,
      format,
      ...options
    }

    const url = buildUrl(REPORT_ENDPOINTS.EXPORT, params)
    const response = await apiClient.get(url)

    // For file downloads, the response might be the blob directly
    if (response instanceof Blob) {
      return response
    }

    // If wrapped in ResponseDto, unwrap it
    const result = unwrapResponse(response)
    return result
  } catch (error) {
    console.error('Error exporting report:', error)
    throw error
  }
}

/**
 * Get available report types
 * @returns {Promise<Array>} Available report types
 */
export const getAvailableReportTypes = async () => {
  try {
    const response = await apiClient.get('/api/Report/Types')
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting available report types:', error)
    return [
      { id: 'dashboard', name: 'Dashboard Summary' },
      { id: 'sales-pipeline', name: 'Sales Pipeline' },
      { id: 'client-activity', name: 'Client Activity' },
      { id: 'financial-summary', name: 'Financial Summary' },
      { id: 'user-performance', name: 'User Performance' }
    ]
  }
}

// =============================================================================
// SCHEDULED REPORTS
// =============================================================================

/**
 * Get scheduled reports
 * @returns {Promise<Array>} Scheduled reports
 */
export const getScheduledReports = async () => {
  try {
    const response = await apiClient.get('/api/Report/Scheduled')
    return unwrapResponse(response)
  } catch (error) {
    console.error('Error getting scheduled reports:', error)
    return []
  }
}

/**
 * Create a scheduled report
 * @param {Object} scheduleData - Schedule configuration
 * @returns {Promise<string>} Schedule ID
 */
export const createScheduledReport = async (scheduleData) => {
  try {
    const response = await apiClient.post('/api/Report/Scheduled', scheduleData)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating scheduled report:', error)
    throw error
  }
}

/**
 * Update a scheduled report
 * @param {string} scheduleId - Schedule ID
 * @param {Object} scheduleData - Updated schedule configuration
 * @returns {Promise<void>}
 */
export const updateScheduledReport = async (scheduleId, scheduleData) => {
  try {
    const response = await apiClient.put(`/api/Report/Scheduled/${scheduleId}`, scheduleData)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error updating scheduled report:', error)
    throw error
  }
}

/**
 * Delete a scheduled report
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<void>}
 */
export const deleteScheduledReport = async (scheduleId) => {
  try {
    const response = await apiClient.delete(`/api/Report/Scheduled/${scheduleId}`)
    unwrapResponse(response)
  } catch (error) {
    console.error('Error deleting scheduled report:', error)
    throw error
  }
}
