/**
 * Tenant Fix Service
 *
 * Firebase-backed tenant fix is not used. All data is managed via the REST API.
 * Async operations throw so the UI can show a clear message.
 */

const REST_API_ONLY_MSG = 'This feature is not available when using the REST API backend.'

export const TENANT_COLLECTIONS = [
  'users', 'clients', 'deals', 'messages', 'followUpTasks', 'quotes', 'invoices',
  'forecasts', 'feedback', 'clientFinancials', 'budgets', 'skillsPartners',
  'tenantProductConfigs', 'financialData', 'financialUploads', 'salesTeams', 'pipelineStatuses'
]

export const SYSTEM_COLLECTIONS = [
  'tenants', 'roles', 'calculationOptions', 'products', 'productLines', 'calculationTemplates'
]

export const fixCollectionTenantIds = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const fixAllTenantIds = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const auditTenantIds = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const fixUserTenantId = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const fixInfinityUsers = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const getSystemCollections = () => ({
  collections: SYSTEM_COLLECTIONS,
  description: 'These collections are system-wide defaults. Tenants customize via tenantProductConfigs.',
  details: {
    tenants: 'Tenant definitions - the root of all tenant data',
    roles: 'Role definitions shared across the entire system',
    calculationOptions: 'Dropdown options for calculations (shared)',
    products: 'System product catalog - tenants enable/customize via tenantProductConfigs',
    productLines: 'Product categories - shared across all tenants',
    calculationTemplates: 'Calculation logic templates - shared, customized per product'
  }
})
