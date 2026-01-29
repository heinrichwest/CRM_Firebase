/**
 * Tenant Product Config Service
 *
 * Provides tenant-specific product configuration operations via REST API.
 */

import { apiClient } from '../api/config/apiClient'
import { TENANT_PRODUCT_CONFIG_ENDPOINTS, PRODUCT_ENDPOINTS, PRODUCT_LINE_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates } from '../api/adapters/idAdapter'
import { getCalculationTemplate } from './calculationTemplateService'

const DATE_FIELDS = ['updatedAt', 'enabledAt', 'disabledAt']

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all products from API
 */
const getProducts = async () => {
  try {
    const response = await apiClient.get(PRODUCT_ENDPOINTS.LIST)
    const products = unwrapResponse(response)
    return normalizeEntities(products)
  } catch (error) {
    console.error('Error getting products:', error)
    return []
  }
}

/**
 * Get all product lines from API
 */
const getProductLines = async () => {
  try {
    const response = await apiClient.get(PRODUCT_LINE_ENDPOINTS.LIST)
    const productLines = unwrapResponse(response)
    return normalizeEntities(productLines)
  } catch (error) {
    console.error('Error getting product lines:', error)
    return []
  }
}

// ============================================================================
// TENANT PRODUCT CONFIGURATION
// ============================================================================

/**
 * Get tenant product configuration
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Tenant product config or null
 */
export const getTenantProductConfig = async (tenantId) => {
  if (!tenantId) return null

  try {
    const response = await apiClient.get(TENANT_PRODUCT_CONFIG_ENDPOINTS.GET_CONFIG(tenantId))
    const config = unwrapResponse(response)

    if (config) {
      return normalizeDates(normalizeEntity(config), DATE_FIELDS)
    }

    // Return default config if none exists
    return {
      tenantId,
      enabledProducts: [],
      listOverrides: {},
      defaultValueOverrides: {}
    }
  } catch (error) {
    // If 404, return default config
    if (error.statusCode === 404) {
      return {
        tenantId,
        enabledProducts: [],
        listOverrides: {},
        defaultValueOverrides: {}
      }
    }
    console.error('Error getting tenant product config:', error)
    return null
  }
}

/**
 * Save tenant product configuration
 * @param {string} tenantId - Tenant ID
 * @param {Object} config - Configuration to save
 */
export const saveTenantProductConfig = async (tenantId, config) => {
  if (!tenantId) throw new Error('Tenant ID is required')

  try {
    const payload = {
      tenantId,
      ...config,
      updatedAt: new Date().toISOString()
    }

    await apiClient.put(TENANT_PRODUCT_CONFIG_ENDPOINTS.SAVE_CONFIG(tenantId), payload)
  } catch (error) {
    console.error('Error saving tenant product config:', error)
    throw error
  }
}

/**
 * Enable a product for a tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID to enable
 * @param {string} userId - User ID making the change
 */
export const enableProductForTenant = async (tenantId, productId, userId) => {
  if (!tenantId || !productId) throw new Error('Tenant ID and Product ID are required')

  try {
    const config = await getTenantProductConfig(tenantId)
    const enabledProducts = config?.enabledProducts || []

    // Check if already enabled
    const existingIndex = enabledProducts.findIndex(ep => ep.productId === productId)

    if (existingIndex >= 0) {
      // Update existing entry
      enabledProducts[existingIndex] = {
        ...enabledProducts[existingIndex],
        enabled: true,
        enabledAt: new Date().toISOString(),
        enabledBy: userId
      }
    } else {
      // Add new entry
      enabledProducts.push({
        productId,
        enabled: true,
        enabledAt: new Date().toISOString(),
        enabledBy: userId
      })
    }

    await saveTenantProductConfig(tenantId, { enabledProducts })
  } catch (error) {
    console.error('Error enabling product for tenant:', error)
    throw error
  }
}

/**
 * Disable a product for a tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID to disable
 */
export const disableProductForTenant = async (tenantId, productId) => {
  if (!tenantId || !productId) throw new Error('Tenant ID and Product ID are required')

  try {
    const config = await getTenantProductConfig(tenantId)
    const enabledProducts = config?.enabledProducts || []

    // Find and update the entry
    const existingIndex = enabledProducts.findIndex(ep => ep.productId === productId)

    if (existingIndex >= 0) {
      enabledProducts[existingIndex] = {
        ...enabledProducts[existingIndex],
        enabled: false,
        disabledAt: new Date().toISOString()
      }
    }

    await saveTenantProductConfig(tenantId, { enabledProducts })
  } catch (error) {
    console.error('Error disabling product for tenant:', error)
    throw error
  }
}

/**
 * Save tenant list override for a product
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID
 * @param {string} listKey - List key to override
 * @param {Array} options - New list options
 */
export const saveTenantListOverride = async (tenantId, productId, listKey, options) => {
  if (!tenantId || !productId || !listKey) {
    throw new Error('Tenant ID, Product ID, and List Key are required')
  }

  try {
    const config = await getTenantProductConfig(tenantId)
    const listOverrides = config?.listOverrides || {}

    // Ensure product entry exists
    if (!listOverrides[productId]) {
      listOverrides[productId] = {}
    }

    // Set or update the list
    listOverrides[productId][listKey] = options

    await saveTenantProductConfig(tenantId, { listOverrides })
  } catch (error) {
    console.error('Error saving tenant list override:', error)
    throw error
  }
}

/**
 * Remove tenant list override for a product (revert to default)
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID
 * @param {string} listKey - List key to remove override for
 */
export const removeTenantListOverride = async (tenantId, productId, listKey) => {
  if (!tenantId || !productId || !listKey) {
    throw new Error('Tenant ID, Product ID, and List Key are required')
  }

  try {
    const config = await getTenantProductConfig(tenantId)
    const listOverrides = config?.listOverrides || {}

    if (listOverrides[productId] && listOverrides[productId][listKey]) {
      delete listOverrides[productId][listKey]

      // Clean up empty product entries
      if (Object.keys(listOverrides[productId]).length === 0) {
        delete listOverrides[productId]
      }

      await saveTenantProductConfig(tenantId, { listOverrides })
    }
  } catch (error) {
    console.error('Error removing tenant list override:', error)
    throw error
  }
}

/**
 * Save tenant default value override for a product
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID
 * @param {Object} overrides - Default value overrides
 */
export const saveTenantDefaultValueOverride = async (tenantId, productId, overrides) => {
  if (!tenantId || !productId) {
    throw new Error('Tenant ID and Product ID are required')
  }

  try {
    const config = await getTenantProductConfig(tenantId)
    const defaultValueOverrides = config?.defaultValueOverrides || {}

    // Set or update the overrides
    defaultValueOverrides[productId] = overrides

    await saveTenantProductConfig(tenantId, { defaultValueOverrides })
  } catch (error) {
    console.error('Error saving tenant default value override:', error)
    throw error
  }
}

/**
 * Get enabled products for a tenant with merged configurations
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of enabled products with merged configs
 */
export const getEnabledProductsForTenant = async (tenantId) => {
  try {
    // Get all products and tenant config
    const [allProducts, productLines, tenantConfig] = await Promise.all([
      getProducts(),
      getProductLines(),
      getTenantProductConfig(tenantId)
    ])

    if (!tenantConfig || !tenantConfig.enabledProducts) {
      // If no config, return all active products (for backwards compatibility)
      return allProducts.filter(p => p.status === 'active').map(product => ({
        ...product,
        productLineName: productLines.find(pl => pl.id === product.productLineId)?.name || product.productLineId
      }))
    }

    // Filter to only enabled products
    const enabledProductIds = new Set(
      tenantConfig.enabledProducts
        .filter(ep => ep.enabled)
        .map(ep => ep.productId)
    )

    // If no products explicitly enabled, return all active products
    if (enabledProductIds.size === 0) {
      return allProducts.filter(p => p.status === 'active').map(product => ({
        ...product,
        productLineName: productLines.find(pl => pl.id === product.productLineId)?.name || product.productLineId
      }))
    }

    // Filter and merge configs
    const enabledProducts = allProducts
      .filter(p => p.status === 'active' && enabledProductIds.has(p.id))
      .map(product => {
        const productLineName = productLines.find(pl => pl.id === product.productLineId)?.name || product.productLineId

        // Merge list overrides
        const listOverrides = tenantConfig.listOverrides?.[product.id] || {}

        // Merge default value overrides
        const defaultValueOverrides = tenantConfig.defaultValueOverrides?.[product.id] || {}

        return {
          ...product,
          productLineName,
          tenantListOverrides: listOverrides,
          tenantDefaultValueOverrides: defaultValueOverrides
        }
      })

    return enabledProducts
  } catch (error) {
    console.error('Error getting enabled products for tenant:', error)
    return []
  }
}

/**
 * Get products grouped by product line for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Products grouped by product line
 */
export const getEnabledProductsByLine = async (tenantId) => {
  try {
    const enabledProducts = await getEnabledProductsForTenant(tenantId)
    const productLines = await getProductLines()

    const grouped = {}

    // Initialize with all product lines
    for (const pl of productLines) {
      grouped[pl.id] = {
        ...pl,
        products: []
      }
    }

    // Add products to their lines
    for (const product of enabledProducts) {
      if (grouped[product.productLineId]) {
        grouped[product.productLineId].products.push(product)
      }
    }

    return grouped
  } catch (error) {
    console.error('Error getting enabled products by line:', error)
    return {}
  }
}

/**
 * Check if a product is enabled for a tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>} True if product is enabled
 */
export const isProductEnabledForTenant = async (tenantId, productId) => {
  if (!tenantId || !productId) return false

  try {
    const config = await getTenantProductConfig(tenantId)

    if (!config || !config.enabledProducts || config.enabledProducts.length === 0) {
      // No config means all products are enabled (backwards compatibility)
      return true
    }

    const productConfig = config.enabledProducts.find(ep => ep.productId === productId)
    return productConfig?.enabled === true
  } catch (error) {
    console.error('Error checking if product is enabled:', error)
    return false
  }
}

/**
 * Get the effective list options for a product field
 * Resolves in order: Tenant Override > Product Default > Template Default
 * @param {string} tenantId - Tenant ID
 * @param {Object} product - Product document
 * @param {string} listKey - List key to get options for
 * @returns {Promise<Array>} List options
 */
export const getEffectiveListOptions = async (tenantId, product, listKey) => {
  try {
    // 1. Check tenant overrides
    if (tenantId) {
      const config = await getTenantProductConfig(tenantId)
      const tenantList = config?.listOverrides?.[product.id]?.[listKey]
      if (tenantList && tenantList.length > 0) {
        return tenantList
      }
    }

    // 2. Check product custom lists
    if (product.customLists?.[listKey]) {
      const productList = product.customLists[listKey]
      if (productList.defaultOptions) return productList.defaultOptions
      if (productList.options) return productList.options
    }

    // 3. Check calculation template
    if (product.calculationTemplateId) {
      const template = await getCalculationTemplate(product.calculationTemplateId)
      if (template) {
        // Check default custom lists
        if (template.defaultCustomLists?.[listKey]) {
          return template.defaultCustomLists[listKey]
        }
        // Check system lists
        if (template.systemLists?.[listKey]) {
          return template.systemLists[listKey]
        }
      }
    }

    // 4. Return empty array
    return []
  } catch (error) {
    console.error('Error getting effective list options:', error)
    return []
  }
}

/**
 * Get effective default values for a product
 * Merges: Template Defaults < Product Defaults < Tenant Overrides
 * @param {string} tenantId - Tenant ID
 * @param {Object} product - Product document
 * @returns {Promise<Object>} Merged default values
 */
export const getEffectiveDefaultValues = async (tenantId, product) => {
  try {
    let defaults = {}

    // 1. Get template defaults
    if (product.calculationTemplateId) {
      const template = await getCalculationTemplate(product.calculationTemplateId)
      if (template?.fields) {
        for (const field of template.fields) {
          if (field.default !== undefined) {
            defaults[field.id] = field.default
          }
        }
      }
    }

    // 2. Merge product defaults
    if (product.defaultValues) {
      defaults = { ...defaults, ...product.defaultValues }
    }

    // 3. Merge tenant overrides
    if (tenantId) {
      const config = await getTenantProductConfig(tenantId)
      const tenantOverrides = config?.defaultValueOverrides?.[product.id]
      if (tenantOverrides) {
        defaults = { ...defaults, ...tenantOverrides }
      }
    }

    return defaults
  } catch (error) {
    console.error('Error getting effective default values:', error)
    return product.defaultValues || {}
  }
}

/**
 * Get all products with their enabled status for a tenant
 * Used for the tenant product management page
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} All products with enabled status
 */
export const getAllProductsWithEnabledStatus = async (tenantId) => {
  try {
    const [allProducts, productLines, tenantConfig] = await Promise.all([
      getProducts(),
      getProductLines(),
      getTenantProductConfig(tenantId)
    ])

    const enabledMap = new Map()
    if (tenantConfig?.enabledProducts) {
      for (const ep of tenantConfig.enabledProducts) {
        enabledMap.set(ep.productId, ep)
      }
    }

    return allProducts
      .filter(p => p.status === 'active')
      .map(product => {
        const enabledConfig = enabledMap.get(product.id)
        const productLine = productLines.find(pl => pl.id === product.productLineId)

        return {
          ...product,
          productLineName: productLine?.name || product.productLineId,
          isEnabled: enabledConfig?.enabled ?? true, // Default to enabled if no config
          enabledConfig: enabledConfig || null,
          hasListOverrides: !!tenantConfig?.listOverrides?.[product.id],
          hasDefaultOverrides: !!tenantConfig?.defaultValueOverrides?.[product.id]
        }
      })
      .sort((a, b) => {
        // Sort by product line, then by name
        if (a.productLineId !== b.productLineId) {
          return (a.productLineName || '').localeCompare(b.productLineName || '')
        }
        return (a.name || '').localeCompare(b.name || '')
      })
  } catch (error) {
    console.error('Error getting all products with enabled status:', error)
    return []
  }
}

export default {
  getTenantProductConfig,
  saveTenantProductConfig,
  enableProductForTenant,
  disableProductForTenant,
  saveTenantListOverride,
  removeTenantListOverride,
  saveTenantDefaultValueOverride,
  getEnabledProductsForTenant,
  getEnabledProductsByLine,
  isProductEnabledForTenant,
  getEffectiveListOptions,
  getEffectiveDefaultValues,
  getAllProductsWithEnabledStatus
}
