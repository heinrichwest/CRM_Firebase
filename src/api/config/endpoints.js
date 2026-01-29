/**
 * API Endpoint Constants
 *
 * Centralized endpoint definitions for all API routes.
 * Matches backend action-based URL patterns.
 */

// =============================================================================
// USER / AUTH ENDPOINTS
// =============================================================================

export const USER_ENDPOINTS = {
  // Auth
  LOGIN: '/api/User/Login',
  REFRESH_TOKEN: '/api/User/RefreshToken',
  REGISTER: '/api/User/Register',
  VALIDATE_REGISTER: '/api/User/ValidateRegister',
  SEND_OTP: '/api/User/SendOtp',
  VALIDATE_OTP: '/api/User/ValidateOtp',
  FORGET_PASSWORD: '/api/User/ForgetPassword',
  CHANGE_PASSWORD: '/api/User/ChangePassword',
  LOGOUT: '/api/User/LogOut',
  USER_DETAIL: '/api/User/UserDetail',
  CHANGE_USER_PASSWORD: '/api/User/ChangeUserPassword',
  UPDATE_PHONE: '/api/User/UpdatePhoneNo',
  CHANGE_EMAIL: '/api/User/ChangeEmail',
  SEND_CHANGE_EMAIL_OTP: '/api/User/SendChangeEmailOTP',
  DEACTIVATE_PROFILE: '/api/User/DeactiveProfile',
  REACTIVATE: '/api/User/Reactivate',
  UPDATE_INFO_SHARING: '/api/User/UpdateEnabledInfoSharing',
  UPDATE_PROFILE: '/api/User/UpdateUserProfile',
  UPDATE_SELECTION: '/api/User/UpdateUserSelection',
  SEND_CHANGE_REQUEST_MAIL: '/api/User/SendChangeRequestMail',
  CREATE_PASSWORD: '/api/User/CreatePassword',
  VALIDATE_TOKEN: '/api/User/ValidateToken',
  SEND_CREATE_PASSWORD_OTP: '/api/User/SendCreatePasswordOTP',
  GET_MIGRATION_CHECK: '/api/User/GetMigrationCheck',
  MIGRATE_STUDENT: '/api/User/MigrateStudent',
  UPDATE_EMAIL_ADDRESS: '/api/User/UpdateEmailAddress',
  DOWNLOAD_CV: '/api/User/DownloadUserCV',
  UPDATE_EMAIL_SETTING: '/api/User/UpdateEmailSetting',
  GET_PERMISSIONS: '/api/User/GetUserPermissions',
  GENERATE_ENTERPRISE_TOKEN: '/api/User/GenerateEnterpriseUserAuthToken',
  VALIDATE_INVITE: '/api/User/ValidateInvite',
  // User Management
  LIST: '/api/User/GetList',
  GET_BY_ID: (userId) => `/api/User/GetById?userId=${userId}`,
  GET_BY_KEY: (userKey) => `/api/User/GetByKey?userKey=${userKey}`,
  GET_CURRENT: '/api/User/GetCurrentUser',
  CREATE: '/api/User/CreateUser',
  UPDATE: (userId) => `/api/User/UpdateUser?userId=${userId}`,
  DELETE: (userId) => `/api/User/Delete?userId=${userId}`,
  SOFT_DELETE: (userId) => `/api/User/SoftDelete?userId=${userId}`,
  UPDATE_ROLE: '/api/User/UpdateUserRole',
  UPDATE_MANAGER: '/api/User/UpdateUserManager',
  GET_DIRECT_REPORTS: (userId) => `/api/User/GetDirectReports?userId=${userId}`,
  GET_HIERARCHY: (userId) => `/api/User/GetUserHierarchy?userId=${userId}`,
  GET_TEAM_MEMBERS: (userId) => `/api/User/GetTeamMembers?userId=${userId}`,
  BATCH_CREATE: '/api/User/BatchCreate'
}

// =============================================================================
// CLIENT ENDPOINTS
// =============================================================================

export const CLIENT_ENDPOINTS = {
  LIST: '/api/Client/GetList',
  GET_BY_ID: (clientId) => `/api/Client/GetById?clientId=${clientId}`,
  GET_BY_KEY: (clientKey) => `/api/Client/GetByKey?clientKey=${clientKey}`,
  // Alias for backward compatibility
  GET: (clientKey) => `/api/Client/GetByKey?clientKey=${clientKey}`,
  CREATE: '/api/Client/CreateClient',
  UPDATE: (clientId) => `/api/Client/UpdateClient?clientId=${clientId}`,
  DELETE: (clientId) => `/api/Client/Delete?clientId=${clientId}`,
  SOFT_DELETE: (clientId) => `/api/Client/SoftDelete?clientId=${clientId}`,
  // Search - uses GetList with search param
  SEARCH: '/api/Client/GetList',
  // Filter by pipeline status - uses GetList with pipelineStatusId param
  BY_PIPELINE: (status) => '/api/Client/GetList',
  // Assignment
  ASSIGN_SALESPERSON: (clientId) => `/api/Client/AssignSalesPerson?clientId=${clientId}`,
  ASSIGN_SKILLS_PARTNER: (clientId) => `/api/Client/AssignSkillsPartner?clientId=${clientId}`,
  UPDATE_PIPELINE_STATUS: (clientId) => `/api/Client/UpdatePipelineStatus?clientId=${clientId}`,
  // Activities & Interactions
  GET_ACTIVITIES: (clientId) => `/api/Client/GetClientActivities?clientId=${clientId}`,
  ACTIVITIES: (clientId) => `/api/Client/GetClientActivities?clientId=${clientId}`,
  ADD_ACTIVITY: (clientId) => `/api/Client/GetClientActivities?clientId=${clientId}`,
  GET_INTERACTIONS: (clientId) => `/api/Client/GetClientInteractions?clientId=${clientId}`,
  INTERACTIONS: (clientId) => `/api/Client/GetClientInteractions?clientId=${clientId}`,
  CREATE_INTERACTION: (clientId) => `/api/Client/CreateInteraction?clientId=${clientId}`,
  ADD_INTERACTION: (clientId) => `/api/Client/CreateInteraction?clientId=${clientId}`,
  // Follow-Up
  SET_FOLLOW_UP: (clientId) => `/api/Client/SetFollowUp?clientId=${clientId}`,
  UPDATE_FOLLOW_UP: (clientId) => `/api/Client/SetFollowUp?clientId=${clientId}`,
  CLEAR_FOLLOW_UP: (clientId) => `/api/Client/ClearFollowUp?clientId=${clientId}`,
  WITHOUT_FOLLOW_UP: '/api/Client/GetClientsWithoutFollowUp',
  WITH_OVERDUE_FOLLOW_UP: '/api/Client/GetClientsWithOverdueFollowUp',
  FOLLOW_UP_STATS: '/api/Report/GetFollowUpStats',
  FOR_FOLLOW_UP_MANAGEMENT: '/api/Client/GetList',
  // Allocation
  WITH_ALLOCATION_STATUS: '/api/Client/GetList',
  // Products
  GET_PRODUCTS: (clientId) => `/api/Client/GetClientProducts?clientId=${clientId}`,
  PRODUCTS: (clientId) => `/api/Client/GetClientProducts?clientId=${clientId}`,
  ADD_PRODUCT: (clientId) => `/api/Client/AddProduct?clientId=${clientId}`,
  UPDATE_PRODUCT: (clientId, clientProductId) => `/api/Client/UpdateClientProduct?clientId=${clientId}&clientProductId=${clientProductId}`,
  PRODUCT: (clientId, clientProductId) => `/api/Client/UpdateClientProduct?clientId=${clientId}&clientProductId=${clientProductId}`,
  REMOVE_PRODUCT: (clientId, clientProductId) => `/api/Client/RemoveProduct?clientId=${clientId}&clientProductId=${clientProductId}`
}

// =============================================================================
// DEAL ENDPOINTS
// =============================================================================

export const DEAL_ENDPOINTS = {
  LIST: '/api/Deal/GetList',
  GET_BY_ID: (dealId) => `/api/Deal/GetById?dealId=${dealId}`,
  GET_BY_KEY: (dealKey) => `/api/Deal/GetByKey?dealKey=${dealKey}`,
  CREATE: '/api/Deal/CreateDeal',
  UPDATE: (dealId) => `/api/Deal/UpdateDeal?dealId=${dealId}`,
  DELETE: (dealId) => `/api/Deal/Delete?dealId=${dealId}`,
  SOFT_DELETE: (dealId) => `/api/Deal/SoftDelete?dealId=${dealId}`,
  UPDATE_STAGE: (dealId) => `/api/Deal/UpdateDealStage?dealId=${dealId}`,
  GET_PIPELINE_KANBAN: '/api/Deal/GetPipelineKanban'
}

// =============================================================================
// TASK ENDPOINTS
// =============================================================================

export const TASK_ENDPOINTS = {
  LIST: '/api/Task/GetList',
  GET_BY_ID: (taskId) => `/api/Task/GetById?taskId=${taskId}`,
  GET_BY_KEY: (taskKey) => `/api/Task/GetByKey?taskKey=${taskKey}`,
  CREATE: '/api/Task/CreateTask',
  UPDATE: (taskId) => `/api/Task/UpdateTask?taskId=${taskId}`,
  DELETE: (taskId) => `/api/Task/Delete?taskId=${taskId}`,
  SOFT_DELETE: (taskId) => `/api/Task/SoftDelete?taskId=${taskId}`,
  COMPLETE: (taskId) => `/api/Task/CompleteTask?taskId=${taskId}`,
  GET_STATS: '/api/Task/GetTaskStats'
}

// =============================================================================
// MESSAGE ENDPOINTS
// =============================================================================

export const MESSAGE_ENDPOINTS = {
  LIST: '/api/Message/GetList',
  GET_BY_KEY: (messageKey) => `/api/Message/GetById?messageKey=${messageKey}`,
  SEND: '/api/Message/SendMessage',
  MARK_AS_READ: (messageKey) => `/api/Message/MarkAsRead?messageKey=${messageKey}`,
  ARCHIVE: (messageKey) => `/api/Message/ArchiveMessage?messageKey=${messageKey}`,
  GET_UNREAD_COUNT: '/api/Message/GetUnreadCount'
}

// =============================================================================
// ROLE ENDPOINTS
// =============================================================================

export const ROLE_ENDPOINTS = {
  LIST: '/api/Role/GetList',
  GET_BY_ID: (roleId) => `/api/Role/GetById?roleId=${roleId}`,
  GET_BY_KEY: (roleKey) => `/api/Role/GetByKey?roleKey=${roleKey}`,
  CREATE: '/api/Role/CreateRole',
  UPDATE: (roleId) => `/api/Role/UpdateRole?roleId=${roleId}`,
  DELETE: (roleId) => `/api/Role/Delete?roleId=${roleId}`,
  SOFT_DELETE: (roleId) => `/api/Role/SoftDelete?roleId=${roleId}`,
  GET_PERMISSIONS: (roleId) => `/api/Role/GetRolePermissions?roleId=${roleId}`,
  UPDATE_PERMISSIONS: (roleId) => `/api/Role/UpdateRolePermissions?roleId=${roleId}`
}

// =============================================================================
// PERMISSION ENDPOINTS
// =============================================================================

export const PERMISSION_ENDPOINTS = {
  LIST: '/api/Permission/GetList',
  BY_CATEGORY: '/api/Permission/GetByCategory'
}

// =============================================================================
// PRODUCT ENDPOINTS
// =============================================================================

export const PRODUCT_ENDPOINTS = {
  LIST: '/api/Product/GetList',
  GET_BY_ID: (productId) => `/api/Product/GetById?productId=${productId}`,
  GET_BY_KEY: (productKey) => `/api/Product/GetByKey?productKey=${productKey}`,
  CREATE: '/api/Product/CreateProduct',
  UPDATE: (productId) => `/api/Product/UpdateProduct?productId=${productId}`,
  ARCHIVE: (productId) => `/api/Product/ArchiveProduct?productId=${productId}`,
  DELETE: (productId) => `/api/Product/Delete?productId=${productId}`,
  SOFT_DELETE: (productId) => `/api/Product/SoftDelete?productId=${productId}`
}

// =============================================================================
// PRODUCT LINE ENDPOINTS
// =============================================================================

export const PRODUCT_LINE_ENDPOINTS = {
  LIST: '/api/ProductLine/GetList',
  GET_BY_ID: (productLineId) => `/api/ProductLine/GetById?productLineId=${productLineId}`,
  GET_BY_KEY: (productLineKey) => `/api/ProductLine/GetByKey?productLineKey=${productLineKey}`,
  CREATE: '/api/ProductLine/CreateProductLine',
  UPDATE: (productLineId) => `/api/ProductLine/UpdateProductLine?productLineId=${productLineId}`,
  DELETE: (productLineId) => `/api/ProductLine/Delete?productLineId=${productLineId}`,
  SOFT_DELETE: (productLineId) => `/api/ProductLine/SoftDelete?productLineId=${productLineId}`
}

// =============================================================================
// SKILLS PARTNER ENDPOINTS
// =============================================================================

export const SKILLS_PARTNER_ENDPOINTS = {
  LIST: '/api/SkillsPartner/GetList',
  GET_BY_KEY: (skillsPartnerKey) => `/api/SkillsPartner/GetById?skillsPartnerKey=${skillsPartnerKey}`,
  CREATE: '/api/SkillsPartner/CreateSkillsPartner',
  UPDATE: (skillsPartnerKey) => `/api/SkillsPartner/UpdateSkillsPartner?skillsPartnerKey=${skillsPartnerKey}`,
  DELETE: (skillsPartnerKey) => `/api/SkillsPartner/Delete?skillsPartnerKey=${skillsPartnerKey}`,
  SOFT_DELETE: (skillsPartnerKey) => `/api/SkillsPartner/SoftDelete?skillsPartnerKey=${skillsPartnerKey}`
}

// =============================================================================
// SETA ENDPOINTS
// =============================================================================

export const SETA_ENDPOINTS = {
  LIST: '/api/Seta/GetList',
  GET_BY_KEY: (setaKey) => `/api/Seta/GetById?setaKey=${setaKey}`,
  CREATE: '/api/Seta/CreateSeta',
  UPDATE: (setaKey) => `/api/Seta/UpdateSeta?setaKey=${setaKey}`,
  DELETE: (setaKey) => `/api/Seta/Delete?setaKey=${setaKey}`,
  SOFT_DELETE: (setaKey) => `/api/Seta/SoftDelete?setaKey=${setaKey}`
}

// =============================================================================
// PIPELINE STATUS ENDPOINTS
// =============================================================================

export const PIPELINE_STATUS_ENDPOINTS = {
  LIST: '/api/PipelineStatus/GetList',
  GET_BY_KEY: (pipelineStatusKey) => `/api/PipelineStatus/GetById?pipelineStatusKey=${pipelineStatusKey}`,
  CREATE: '/api/PipelineStatus/CreatePipelineStatus',
  UPDATE: (pipelineStatusKey) => `/api/PipelineStatus/UpdatePipelineStatus?pipelineStatusKey=${pipelineStatusKey}`,
  REORDER: '/api/PipelineStatus/ReorderPipelineStatuses',
  SETUP_DEFAULTS: '/api/PipelineStatus/SetupDefaultPipelineStatuses'
}

// =============================================================================
// REPORT ENDPOINTS
// =============================================================================

export const REPORT_ENDPOINTS = {
  DEAL_AGING: '/api/Report/GetDealAgingReport',
  PIPELINE_ANALYTICS: '/api/Report/GetPipelineAnalytics',
  TEAM_PERFORMANCE: '/api/Report/GetTeamPerformance',
  FOLLOW_UP_STATS: '/api/Report/GetFollowUpStats',
  FINANCIAL_SUMMARY: '/api/Report/GetFinancialSummary'
}

// =============================================================================
// TENANT ENDPOINTS
// =============================================================================

export const TENANT_ENDPOINTS = {
  LIST: '/api/Tenant/GetList',
  GET_BY_ID: (tenantId) => `/api/Tenant/GetById?tenantId=${tenantId}`,
  GET_BY_KEY: (tenantKey) => `/api/Tenant/GetByKey?tenantKey=${tenantKey}`,
  CREATE: '/api/Tenant/CreateTenant',
  UPDATE: (tenantId) => `/api/Tenant/UpdateTenant?tenantId=${tenantId}`,
  DELETE: (tenantId) => `/api/Tenant/Delete?tenantId=${tenantId}`,
  SOFT_DELETE: (tenantId) => `/api/Tenant/SoftDelete?tenantId=${tenantId}`,
  GET_STATISTICS: (tenantId) => `/api/Tenant/GetTenantStatistics?tenantId=${tenantId}`
}

// =============================================================================
// SYSTEM SETTINGS ENDPOINTS
// =============================================================================

export const SETTINGS_ENDPOINTS = {
  LIST: '/api/SystemSetting/GetList',
  GET_BY_KEY: (settingKey) => `/api/SystemSetting/GetByKey?settingKey=${settingKey}`,
  CREATE_OR_UPDATE: (settingKey) => `/api/SystemSetting/CreateOrUpdateSystemSetting?settingKey=${settingKey}`,
  GET_FINANCIAL_YEAR: '/api/SystemSetting/GetFinancialYearSettings',
  UPDATE_FINANCIAL_YEAR: '/api/SystemSetting/UpdateFinancialYearSettings'
}

// =============================================================================
// CALCULATION TEMPLATE ENDPOINTS
// =============================================================================

export const CALCULATION_TEMPLATE_ENDPOINTS = {
  LIST: '/api/CalculationTemplate/GetList',
  GET_BY_ID: (calculationTemplateId) => `/api/CalculationTemplate/GetById?calculationTemplateId=${calculationTemplateId}`,
  GET_BY_KEY: (calculationTemplateKey) => `/api/CalculationTemplate/GetByKey?calculationTemplateKey=${calculationTemplateKey}`,
  CREATE: '/api/CalculationTemplate/CreateCalculationTemplate',
  UPDATE: (calculationTemplateId) => `/api/CalculationTemplate/UpdateCalculationTemplate?calculationTemplateId=${calculationTemplateId}`,
  DELETE: (calculationTemplateId) => `/api/CalculationTemplate/Delete?calculationTemplateId=${calculationTemplateId}`,
  SOFT_DELETE: (calculationTemplateId) => `/api/CalculationTemplate/SoftDelete?calculationTemplateId=${calculationTemplateId}`,
  EXECUTE: (calculationTemplateId) => `/api/CalculationTemplate/ExecuteCalculation?calculationTemplateId=${calculationTemplateId}`
}

// =============================================================================
// TENANT PRODUCT CONFIG ENDPOINTS
// =============================================================================

export const TENANT_PRODUCT_CONFIG_ENDPOINTS = {
  GET_CONFIG: (tenantId) => `/api/TenantProductConfig/GetConfig?tenantId=${tenantId}`,
  SAVE_CONFIG: (tenantId) => `/api/TenantProductConfig/SaveConfig?tenantId=${tenantId}`,
  ENABLE_PRODUCT: (tenantId) => `/api/TenantProductConfig/EnableProduct?tenantId=${tenantId}`,
  DISABLE_PRODUCT: (tenantId) => `/api/TenantProductConfig/DisableProduct?tenantId=${tenantId}`,
  SAVE_LIST_OVERRIDE: (tenantId) => `/api/TenantProductConfig/SaveListOverride?tenantId=${tenantId}`,
  REMOVE_LIST_OVERRIDE: (tenantId) => `/api/TenantProductConfig/RemoveListOverride?tenantId=${tenantId}`,
  SAVE_DEFAULT_OVERRIDE: (tenantId) => `/api/TenantProductConfig/SaveDefaultOverride?tenantId=${tenantId}`,
  GET_ENABLED_PRODUCTS: (tenantId) => `/api/TenantProductConfig/GetEnabledProducts?tenantId=${tenantId}`,
  GET_ALL_PRODUCTS_STATUS: (tenantId) => `/api/TenantProductConfig/GetAllProductsStatus?tenantId=${tenantId}`
}

// =============================================================================
// FINANCIAL ENDPOINTS
// =============================================================================

export const FINANCIAL_ENDPOINTS = {
  GET_CLIENT_FINANCIALS: (clientKey) => `/api/Financial/GetClientFinancials?clientKey=${clientKey}`,
  UPDATE_CLIENT_FINANCIAL: (clientKey) => `/api/Financial/UpdateClientFinancial?clientKey=${clientKey}`,
  SAVE_CLIENT_DEALS: (clientKey) => `/api/Financial/SaveClientDeals?clientKey=${clientKey}`,
  GET_BUDGETS: '/api/Financial/GetBudgets',
  SAVE_BUDGET: '/api/Financial/SaveBudget',
  GET_BUDGET_VS_FORECAST: '/api/Financial/GetBudgetVsForecast',
  UPLOAD_DATA: '/api/Financial/UploadFinancialData',
  GET_UPLOAD_HISTORY: '/api/Financial/GetUploadHistory',
  GET_UPLOAD_BY_ID: (uploadId) => `/api/Financial/GetUploadById?uploadId=${uploadId}`,
  DELETE_UPLOAD: (uploadId) => `/api/Financial/DeleteUpload?uploadId=${uploadId}`,
  SOFT_DELETE_UPLOAD: (uploadId) => `/api/Financial/SoftDeleteUpload?uploadId=${uploadId}`,
  GET_DASHBOARD: '/api/Financial/GetFinancialDashboard'
}

// =============================================================================
// REFERENCE DATA ENDPOINTS (Legacy - for backward compatibility)
// =============================================================================

export const REFERENCE_ENDPOINTS = {
  // Pipeline Statuses - redirect to dedicated controller
  PIPELINE_STATUSES: PIPELINE_STATUS_ENDPOINTS.LIST,
  SAVE_PIPELINE_STATUSES: PIPELINE_STATUS_ENDPOINTS.REORDER,
  // Skills Partners - redirect to dedicated controller
  SKILLS_PARTNERS: SKILLS_PARTNER_ENDPOINTS.LIST,
  SKILLS_PARTNER: SKILLS_PARTNER_ENDPOINTS.GET_BY_KEY,
  // SETAs - redirect to dedicated controller
  SETAS: SETA_ENDPOINTS.LIST,
  SETA: SETA_ENDPOINTS.GET_BY_KEY,
  // Products - redirect to dedicated controller
  PRODUCTS: PRODUCT_ENDPOINTS.LIST,
  PRODUCT: PRODUCT_ENDPOINTS.GET_BY_KEY,
  // Roles - redirect to dedicated controller
  ROLES: ROLE_ENDPOINTS.LIST,
  ROLE: ROLE_ENDPOINTS.GET_BY_KEY
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build URL with query parameters
 * @param {string} baseUrl - Base endpoint URL
 * @param {Object} params - Query parameters
 * @returns {string} URL with query string
 */
export const buildUrl = (baseUrl, params = {}) => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

  if (Object.keys(filteredParams).length === 0) {
    return baseUrl
  }

  // Check if baseUrl already has query params
  const separator = baseUrl.includes('?') ? '&' : '?'
  const queryString = new URLSearchParams(filteredParams).toString()
  return `${baseUrl}${separator}${queryString}`
}

/**
 * Build pagination query parameters
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Object} Pagination params
 */
export const buildPaginationParams = (page = 1, pageSize = 20, sortBy = null, sortOrder = 'asc') => {
  const params = {
    page,
    pageSize
  }

  if (sortBy) {
    params.sortBy = sortBy
    params.sortOrder = sortOrder
  }

  return params
}
