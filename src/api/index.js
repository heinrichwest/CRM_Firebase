/**
 * API Module Public Exports
 *
 * This file provides the public API for the REST API integration layer.
 * Import from 'src/api' to access all API functionality.
 */

// =============================================================================
// API CLIENT
// =============================================================================

export { apiClient, ApiError, getApiBaseUrl, isMockAuthEnabled } from './config/apiClient'

// =============================================================================
// ENDPOINTS
// =============================================================================

export {
  USER_ENDPOINTS,
  CLIENT_ENDPOINTS,
  DEAL_ENDPOINTS,
  TASK_ENDPOINTS,
  FINANCIAL_ENDPOINTS,
  TENANT_ENDPOINTS,
  REFERENCE_ENDPOINTS,
  SETTINGS_ENDPOINTS,
  REPORT_ENDPOINTS,
  buildUrl,
  buildPaginationParams
} from './config/endpoints'

// =============================================================================
// AUTH
// =============================================================================

export {
  login,
  logout,
  register,
  validateRegister,
  forgotPassword,
  changePassword,
  sendOtp,
  validateOtp,
  getUserDetail,
  getUserPermissions,
  updateUserProfile,
  validateInvite,
  isAuthenticated,
  getCurrentUserId,
  getCurrentTenantId,
  getCurrentRole,
  getCurrentClaims,
  parseToken,
  isTokenExpired
} from './auth/authService'

export {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  hasTokens,
  updateAccessToken
} from './auth/tokenStorage'

// =============================================================================
// ADAPTERS
// =============================================================================

export {
  unwrapResponse,
  unwrapPagedResponse,
  extractItems,
  isSuccessResponse,
  extractErrorMessage,
  getUserFriendlyError
} from './adapters/responseAdapter'

export {
  normalizeEntity,
  normalizeEntities,
  denormalizeEntity,
  getApiId,
  isGuid,
  normalizeDates,
  serializeDates
} from './adapters/idAdapter'

// =============================================================================
// SERVICES
// =============================================================================

// Client Service
export {
  getClients,
  getClientsPaginated,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  updateClientPipelineStatus,
  getClientActivities,
  addClientActivity,
  getClientInteractions,
  createInteraction,
  getClientsByPipelineStatus,
  getPipelineStatusAnalytics
} from './services/clientApiService'

// Deal Service
export {
  getDeals,
  getDealsPaginated,
  getDeal,
  getDealsByClient,
  getDealsByStage,
  createDeal,
  updateDeal,
  deleteDeal,
  moveDealStage,
  getDealProducts,
  addDealProduct,
  calculateDealValue
} from './services/dealApiService'

// Task Service
export {
  getFollowUpTasks,
  getTasksPaginated,
  getFollowUpTask,
  getTasksByUser,
  getTasksByClient,
  getOverdueTasks,
  getUpcomingTasks,
  createFollowUpTask,
  updateFollowUpTask,
  deleteFollowUpTask,
  completeFollowUpTask,
  rescheduleTask,
  getTaskStats
} from './services/taskApiService'

// User Service
export {
  getUsers,
  getUsersByTenant,
  getUser,
  getCurrentUserDetail,
  updatePhoneNo,
  changeEmail,
  sendChangeEmailOTP,
  deactivateProfile,
  reactivateUser,
  updateEmailSettings,
  updateInfoSharing,
  getUserHierarchy,
  getDirectReports,
  getAccessibleUserIds,
  getEffectiveProductLineIds,
  createPassword,
  isSystemAdmin,
  isManager
} from './services/userApiService'

// Reference Data Service
export {
  getPipelineStatuses,
  savePipelineStatuses,
  getSkillsPartners,
  getSkillsPartner,
  createSkillsPartner,
  updateSkillsPartner,
  deleteSkillsPartner,
  getSetas,
  getSeta,
  createSeta,
  updateSeta,
  deleteSeta,
  getJobTitles,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} from './services/referenceApiService'

// Settings Service
export {
  getSettings,
  updateSettings,
  getCalculationTemplates,
  getCalculationTemplate,
  createCalculationTemplate,
  updateCalculationTemplate,
  deleteCalculationTemplate,
  getTenantSettings,
  updateTenantSettings,
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant
} from './services/settingsApiService'

// Financial Service
export {
  getFinancialDashboard,
  updateFinancialDashboard,
  getClientFinancial,
  getClientFinancials,
  getClientFinancialsByYear,
  getClientFinancialsByClient,
  calculateFullYearForecast,
  saveClientFinancial,
  batchSaveClientFinancials,
  deleteClientFinancial,
  getFinancialSummaryByProductLine,
  getBudgets,
  getBudgetsBySalesperson,
  saveBudget,
  deleteBudget,
  getBudgetVsForecast,
  getFinancialYearSettings,
  saveFinancialYearSettings,
  calculateFinancialYearMonths,
  getForecast,
  saveForecast,
  uploadFinancialFile,
  getDefaultProductLines,
  saveDefaultProductLines
} from './services/financialApiService'

// Report Service
export {
  getDashboardReport,
  getSalesPipelineReport,
  getPipelineAnalytics,
  getClientActivityReport,
  getClientEngagementMetrics,
  getFinancialSummaryReport,
  getRevenueByProductLine,
  getMonthlyRevenueTrend,
  getUserPerformanceReport,
  getTeamPerformanceComparison,
  getSalespersonLeaderboard,
  getTaskCompletionReport,
  exportReport,
  getAvailableReportTypes,
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport
} from './services/reportApiService'

// Product Line Service
export {
  getProductLines,
  getProductLine,
  saveProductLine,
  updateProductLine,
  deleteProductLine,
  getProducts as getCatalogProducts,
  getProduct as getCatalogProduct,
  createCatalogProduct,
  createProduct as createCatalogProductAlias,
  updateProduct as updateCatalogProduct,
  archiveProduct,
  deleteProduct as deleteCatalogProduct,
  initializeProductCatalog,
  DEFAULT_CALCULATION_METHODS,
  calculateProductTotal
} from './services/productLineApiService'

// Message Service
export {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  markMessageAsRead,
  deleteMessage
} from './services/messageApiService'

// Settings Service - Additional Exports
export {
  getCalculationOptions,
  saveCalculationOptions,
  getLegalDocumentTypes,
  saveLegalDocumentTypes,
  getDefaultSalespersonProductLines,
  saveDefaultSalespersonProductLines
} from './services/settingsApiService'
