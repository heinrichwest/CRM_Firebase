/**
 * Data Service Facade
 *
 * All data goes through the REST API (https://crm-service.speccon.co.za).
 * Firebase is not used for the backend.
 */

import * as clientApi from '../api/services/clientApiService'
import * as dealApi from '../api/services/dealApiService'
import * as taskApi from '../api/services/taskApiService'
import * as userApi from '../api/services/userApiService'
import * as referenceApi from '../api/services/referenceApiService'
import * as settingsApi from '../api/services/settingsApiService'
import * as financialApi from '../api/services/financialApiService'
import * as productLineApi from '../api/services/productLineApiService'
import * as messageApi from '../api/services/messageApiService'

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export const getUsers = userApi.getUsers

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

export const getClients = clientApi.getClients
export const getClient = clientApi.getClient
export const createClient = clientApi.createClient
export const updateClient = clientApi.updateClient
export const updateClientPipelineStatus = clientApi.updateClientPipelineStatus
export const getClientActivities = clientApi.getClientActivities
export const addClientActivity = clientApi.addClientActivity
export const getClientInteractions = clientApi.getClientInteractions
export const createInteraction = clientApi.createInteraction
export const getPipelineStatusAnalytics = clientApi.getPipelineStatusAnalytics

// =============================================================================
// CLIENT ALLOCATION
// =============================================================================

export const getClientsWithAllocationStatus = clientApi.getClientsWithAllocationStatus
export const assignSalesPersonToClient = clientApi.assignSalesPersonToClient
export const assignSkillsPartnerToClient = clientApi.assignSkillsPartnerToClient

// =============================================================================
// CLIENT PRODUCTS
// =============================================================================

export const getClientProducts = clientApi.getClientProducts
export const addClientProduct = clientApi.addClientProduct
export const updateClientProduct = clientApi.updateClientProduct
export const deleteClientProduct = clientApi.deleteClientProduct

// =============================================================================
// CLIENT FOLLOW-UP MANAGEMENT
// =============================================================================

export const updateClientFollowUp = clientApi.updateClientFollowUp
export const clearClientFollowUp = clientApi.clearClientFollowUp
export const getClientsWithoutFollowUp = clientApi.getClientsWithoutFollowUp
export const getClientsWithOverdueFollowUp = clientApi.getClientsWithOverdueFollowUp
export const getFollowUpStats = clientApi.getFollowUpStats
export const getClientsForFollowUpManagement = clientApi.getClientsForFollowUpManagement

// =============================================================================
// PIPELINE STATUSES
// =============================================================================

export const getPipelineStatuses = referenceApi.getPipelineStatuses
export const savePipelineStatuses = referenceApi.savePipelineStatuses

// =============================================================================
// FOLLOW-UP TASKS
// =============================================================================

export const getFollowUpTasks = taskApi.getFollowUpTasks
export const createFollowUpTask = taskApi.createFollowUpTask
export const updateFollowUpTask = taskApi.updateFollowUpTask
export const completeFollowUpTask = taskApi.completeFollowUpTask

// =============================================================================
// DEALS
// =============================================================================

export const getDeals = dealApi.getDeals
export const createDeal = dealApi.createDeal
export const updateDeal = dealApi.updateDeal
export const moveDealStage = dealApi.moveDealStage

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

export const getFinancialDashboard = financialApi.getFinancialDashboard
export const updateFinancialDashboard = financialApi.updateFinancialDashboard

// =============================================================================
// BUDGETS
// =============================================================================

export const getBudgets = financialApi.getBudgets
export const getBudgetsBySalesperson = financialApi.getBudgetsBySalesperson
export const saveBudget = financialApi.saveBudget
export const deleteBudget = financialApi.deleteBudget
export const getBudgetVsForecast = financialApi.getBudgetVsForecast

// =============================================================================
// FINANCIAL YEAR SETTINGS
// =============================================================================

export const getFinancialYearSettings = financialApi.getFinancialYearSettings
export const saveFinancialYearSettings = financialApi.saveFinancialYearSettings
export const calculateFinancialYearMonths = financialApi.calculateFinancialYearMonths

// =============================================================================
// CLIENT FINANCIALS
// =============================================================================

export const getClientFinancial = financialApi.getClientFinancial
export const getClientFinancialsByYear = financialApi.getClientFinancialsByYear
export const getClientFinancialsByClient = financialApi.getClientFinancialsByClient
export const calculateFullYearForecast = financialApi.calculateFullYearForecast
export const saveClientFinancial = financialApi.saveClientFinancial
export const batchSaveClientFinancials = financialApi.batchSaveClientFinancials
export const deleteClientFinancial = financialApi.deleteClientFinancial
export const getClientFinancials = financialApi.getClientFinancials
export const getFinancialSummaryByProductLine = financialApi.getFinancialSummaryByProductLine

// =============================================================================
// FORECASTS
// =============================================================================

export const getForecast = financialApi.getForecast
export const saveForecast = financialApi.saveForecast

// =============================================================================
// SKILLS PARTNERS
// =============================================================================

export const getSkillsPartners = referenceApi.getSkillsPartners
export const getSkillsPartner = referenceApi.getSkillsPartner
export const createSkillsPartner = referenceApi.createSkillsPartner
export const updateSkillsPartner = referenceApi.updateSkillsPartner
export const deleteSkillsPartner = referenceApi.deleteSkillsPartner

// =============================================================================
// PRODUCT LINES
// =============================================================================

export const getProductLines = productLineApi.getProductLines
export const saveProductLine = productLineApi.saveProductLine
export const updateProductLine = productLineApi.updateProductLine

// =============================================================================
// PRODUCTS (CATALOG)
// =============================================================================

export const getProducts = productLineApi.getProducts
export const getProduct = productLineApi.getProduct
export const createCatalogProduct = productLineApi.createCatalogProduct
export const createProduct = productLineApi.createProduct
export const updateProduct = productLineApi.updateProduct
export const archiveProduct = productLineApi.archiveProduct

// =============================================================================
// CALCULATION OPTIONS
// =============================================================================

// For synchronous values, we use the API version directly when not using Firebase
// and create an async getter for Firebase mode
export const DEFAULT_CALCULATION_METHODS = productLineApi.DEFAULT_CALCULATION_METHODS

export const getCalculationOptions = settingsApi.getCalculationOptions
export const saveCalculationOptions = settingsApi.saveCalculationOptions
export const calculateProductTotal = productLineApi.calculateProductTotal

// =============================================================================
// DEFAULT SALESPERSON PRODUCT LINES
// =============================================================================

export const getDefaultSalespersonProductLines = settingsApi.getDefaultSalespersonProductLines
export const saveDefaultSalespersonProductLines = settingsApi.saveDefaultSalespersonProductLines

// =============================================================================
// PRODUCT CATALOG INITIALIZATION
// =============================================================================

export const initializeProductCatalog = productLineApi.initializeProductCatalog

// =============================================================================
// LEGAL DOCUMENT TYPES
// =============================================================================

export const getLegalDocumentTypes = settingsApi.getLegalDocumentTypes
export const saveLegalDocumentTypes = settingsApi.saveLegalDocumentTypes

// =============================================================================
// MESSAGES
// =============================================================================

export const getMessages = messageApi.getMessages
export const createMessage = messageApi.createMessage
export const markMessageAsRead = messageApi.markMessageAsRead

// =============================================================================
// UTILITY EXPORT - Check which backend is active
// =============================================================================

export const isUsingFirebase = () => false
export const getBackendType = () => 'api'
