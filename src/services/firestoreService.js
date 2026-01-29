/**
 * Data Service Facade
 *
 * This module acts as a facade that switches between Firebase (Firestore)
 * and REST API implementations based on the VITE_USE_FIREBASE environment variable.
 *
 * - VITE_USE_FIREBASE=true: Uses Firebase/Firestore directly
 * - VITE_USE_FIREBASE=false (default): Uses REST API services
 *
 * Components import from this file and don't need to know which backend is used.
 *
 * IMPORTANT: Firebase imports are dynamic (lazy-loaded) to prevent loading
 * Firebase SDK when running in REST API mode.
 */

// Feature flag - default to REST API (false) unless explicitly set to true
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true'

// =============================================================================
// FIREBASE IMPORTS (Lazy-loaded only when USE_FIREBASE=true)
// =============================================================================

// Firebase module is loaded dynamically to prevent loading Firebase SDK
// when running in REST API mode
let firebaseModule = null
const getFirebaseModule = async () => {
  if (!firebaseModule && USE_FIREBASE) {
    firebaseModule = await import('./firestoreServiceFirebase')
  }
  return firebaseModule
}

// =============================================================================
// REST API IMPORTS
// =============================================================================

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
// HELPER: Create wrapper for Firebase/API functions
// =============================================================================

const createWrapper = (firebaseFnName, apiFn) => {
  if (!USE_FIREBASE) {
    return apiFn
  }
  return async (...args) => {
    const fb = await getFirebaseModule()
    return fb[firebaseFnName](...args)
  }
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export const getUsers = createWrapper('getUsers', userApi.getUsers)

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

export const getClients = createWrapper('getClients', clientApi.getClients)
export const getClient = createWrapper('getClient', clientApi.getClient)
export const createClient = createWrapper('createClient', clientApi.createClient)
export const updateClient = createWrapper('updateClient', clientApi.updateClient)
export const updateClientPipelineStatus = createWrapper('updateClientPipelineStatus', clientApi.updateClientPipelineStatus)
export const getClientActivities = createWrapper('getClientActivities', clientApi.getClientActivities)
export const addClientActivity = createWrapper('addClientActivity', clientApi.addClientActivity)
export const getClientInteractions = createWrapper('getClientInteractions', clientApi.getClientInteractions)
export const createInteraction = createWrapper('createInteraction', clientApi.createInteraction)
export const getPipelineStatusAnalytics = createWrapper('getPipelineStatusAnalytics', clientApi.getPipelineStatusAnalytics)

// =============================================================================
// CLIENT ALLOCATION
// =============================================================================

export const getClientsWithAllocationStatus = createWrapper('getClientsWithAllocationStatus', clientApi.getClientsWithAllocationStatus)
export const assignSalesPersonToClient = createWrapper('assignSalesPersonToClient', clientApi.assignSalesPersonToClient)
export const assignSkillsPartnerToClient = createWrapper('assignSkillsPartnerToClient', clientApi.assignSkillsPartnerToClient)

// =============================================================================
// CLIENT PRODUCTS
// =============================================================================

export const getClientProducts = createWrapper('getClientProducts', clientApi.getClientProducts)
export const addClientProduct = createWrapper('addClientProduct', clientApi.addClientProduct)
export const updateClientProduct = createWrapper('updateClientProduct', clientApi.updateClientProduct)
export const deleteClientProduct = createWrapper('deleteClientProduct', clientApi.deleteClientProduct)

// =============================================================================
// CLIENT FOLLOW-UP MANAGEMENT
// =============================================================================

export const updateClientFollowUp = createWrapper('updateClientFollowUp', clientApi.updateClientFollowUp)
export const clearClientFollowUp = createWrapper('clearClientFollowUp', clientApi.clearClientFollowUp)
export const getClientsWithoutFollowUp = createWrapper('getClientsWithoutFollowUp', clientApi.getClientsWithoutFollowUp)
export const getClientsWithOverdueFollowUp = createWrapper('getClientsWithOverdueFollowUp', clientApi.getClientsWithOverdueFollowUp)
export const getFollowUpStats = createWrapper('getFollowUpStats', clientApi.getFollowUpStats)
export const getClientsForFollowUpManagement = createWrapper('getClientsForFollowUpManagement', clientApi.getClientsForFollowUpManagement)

// =============================================================================
// PIPELINE STATUSES
// =============================================================================

export const getPipelineStatuses = createWrapper('getPipelineStatuses', referenceApi.getPipelineStatuses)
export const savePipelineStatuses = createWrapper('savePipelineStatuses', referenceApi.savePipelineStatuses)

// =============================================================================
// FOLLOW-UP TASKS
// =============================================================================

export const getFollowUpTasks = createWrapper('getFollowUpTasks', taskApi.getFollowUpTasks)
export const createFollowUpTask = createWrapper('createFollowUpTask', taskApi.createFollowUpTask)
export const updateFollowUpTask = createWrapper('updateFollowUpTask', taskApi.updateFollowUpTask)
export const completeFollowUpTask = createWrapper('completeFollowUpTask', taskApi.completeFollowUpTask)

// =============================================================================
// DEALS
// =============================================================================

export const getDeals = createWrapper('getDeals', dealApi.getDeals)
export const createDeal = createWrapper('createDeal', dealApi.createDeal)
export const updateDeal = createWrapper('updateDeal', dealApi.updateDeal)
export const moveDealStage = createWrapper('moveDealStage', dealApi.moveDealStage)

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

export const getFinancialDashboard = createWrapper('getFinancialDashboard', financialApi.getFinancialDashboard)
export const updateFinancialDashboard = createWrapper('updateFinancialDashboard', financialApi.updateFinancialDashboard)

// =============================================================================
// BUDGETS
// =============================================================================

export const getBudgets = createWrapper('getBudgets', financialApi.getBudgets)
export const getBudgetsBySalesperson = createWrapper('getBudgetsBySalesperson', financialApi.getBudgetsBySalesperson)
export const saveBudget = createWrapper('saveBudget', financialApi.saveBudget)
export const deleteBudget = createWrapper('deleteBudget', financialApi.deleteBudget)
export const getBudgetVsForecast = createWrapper('getBudgetVsForecast', financialApi.getBudgetVsForecast)

// =============================================================================
// FINANCIAL YEAR SETTINGS
// =============================================================================

export const getFinancialYearSettings = createWrapper('getFinancialYearSettings', financialApi.getFinancialYearSettings)
export const saveFinancialYearSettings = createWrapper('saveFinancialYearSettings', financialApi.saveFinancialYearSettings)
export const calculateFinancialYearMonths = createWrapper('calculateFinancialYearMonths', financialApi.calculateFinancialYearMonths)

// =============================================================================
// CLIENT FINANCIALS
// =============================================================================

export const getClientFinancial = createWrapper('getClientFinancial', financialApi.getClientFinancial)
export const getClientFinancialsByYear = createWrapper('getClientFinancialsByYear', financialApi.getClientFinancialsByYear)
export const getClientFinancialsByClient = createWrapper('getClientFinancialsByClient', financialApi.getClientFinancialsByClient)
export const calculateFullYearForecast = createWrapper('calculateFullYearForecast', financialApi.calculateFullYearForecast)
export const saveClientFinancial = createWrapper('saveClientFinancial', financialApi.saveClientFinancial)
export const batchSaveClientFinancials = createWrapper('batchSaveClientFinancials', financialApi.batchSaveClientFinancials)
export const deleteClientFinancial = createWrapper('deleteClientFinancial', financialApi.deleteClientFinancial)
export const getClientFinancials = createWrapper('getClientFinancials', financialApi.getClientFinancials)
export const getFinancialSummaryByProductLine = createWrapper('getFinancialSummaryByProductLine', financialApi.getFinancialSummaryByProductLine)

// =============================================================================
// FORECASTS
// =============================================================================

export const getForecast = createWrapper('getForecast', financialApi.getForecast)
export const saveForecast = createWrapper('saveForecast', financialApi.saveForecast)

// =============================================================================
// SKILLS PARTNERS
// =============================================================================

export const getSkillsPartners = createWrapper('getSkillsPartners', referenceApi.getSkillsPartners)
export const getSkillsPartner = createWrapper('getSkillsPartner', referenceApi.getSkillsPartner)
export const createSkillsPartner = createWrapper('createSkillsPartner', referenceApi.createSkillsPartner)
export const updateSkillsPartner = createWrapper('updateSkillsPartner', referenceApi.updateSkillsPartner)
export const deleteSkillsPartner = createWrapper('deleteSkillsPartner', referenceApi.deleteSkillsPartner)

// =============================================================================
// PRODUCT LINES
// =============================================================================

export const getProductLines = createWrapper('getProductLines', productLineApi.getProductLines)
export const saveProductLine = createWrapper('saveProductLine', productLineApi.saveProductLine)
export const updateProductLine = createWrapper('updateProductLine', productLineApi.updateProductLine)

// =============================================================================
// PRODUCTS (CATALOG)
// =============================================================================

export const getProducts = createWrapper('getProducts', productLineApi.getProducts)
export const getProduct = createWrapper('getProduct', productLineApi.getProduct)
export const createCatalogProduct = createWrapper('createCatalogProduct', productLineApi.createCatalogProduct)
export const createProduct = createWrapper('createProduct', productLineApi.createProduct)
export const updateProduct = createWrapper('updateProduct', productLineApi.updateProduct)
export const archiveProduct = createWrapper('archiveProduct', productLineApi.archiveProduct)

// =============================================================================
// CALCULATION OPTIONS
// =============================================================================

// For synchronous values, we use the API version directly when not using Firebase
// and create an async getter for Firebase mode
export const DEFAULT_CALCULATION_METHODS = productLineApi.DEFAULT_CALCULATION_METHODS

export const getCalculationOptions = createWrapper('getCalculationOptions', settingsApi.getCalculationOptions)
export const saveCalculationOptions = createWrapper('saveCalculationOptions', settingsApi.saveCalculationOptions)
export const calculateProductTotal = createWrapper('calculateProductTotal', productLineApi.calculateProductTotal)

// =============================================================================
// DEFAULT SALESPERSON PRODUCT LINES
// =============================================================================

export const getDefaultSalespersonProductLines = createWrapper('getDefaultSalespersonProductLines', settingsApi.getDefaultSalespersonProductLines)
export const saveDefaultSalespersonProductLines = createWrapper('saveDefaultSalespersonProductLines', settingsApi.saveDefaultSalespersonProductLines)

// =============================================================================
// PRODUCT CATALOG INITIALIZATION
// =============================================================================

export const initializeProductCatalog = createWrapper('initializeProductCatalog', productLineApi.initializeProductCatalog)

// =============================================================================
// LEGAL DOCUMENT TYPES
// =============================================================================

export const getLegalDocumentTypes = createWrapper('getLegalDocumentTypes', settingsApi.getLegalDocumentTypes)
export const saveLegalDocumentTypes = createWrapper('saveLegalDocumentTypes', settingsApi.saveLegalDocumentTypes)

// =============================================================================
// MESSAGES
// =============================================================================

export const getMessages = createWrapper('getMessages', messageApi.getMessages)
export const createMessage = createWrapper('createMessage', messageApi.createMessage)
export const markMessageAsRead = createWrapper('markMessageAsRead', messageApi.markMessageAsRead)

// =============================================================================
// UTILITY EXPORT - Check which backend is active
// =============================================================================

export const isUsingFirebase = () => USE_FIREBASE
export const getBackendType = () => USE_FIREBASE ? 'firebase' : 'api'
