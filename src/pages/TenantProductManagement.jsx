import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import { getProductLines } from '../services/firestoreService'
import { getCalculationTemplate } from '../services/calculationTemplateService'
import {
  getAllProductsWithEnabledStatus,
  enableProductForTenant,
  disableProductForTenant,
  saveTenantListOverride,
  removeTenantListOverride,
  saveTenantDefaultValueOverride,
  getTenantProductConfig
} from '../services/tenantProductConfigService'
import './TenantProductManagement.css'

const TenantProductManagement = () => {
  const { currentTenant, currentUser, isSystemAdmin, userRole } = useTenant()
  const [products, setProducts] = useState([])
  const [productLines, setProductLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedProductLine, setSelectedProductLine] = useState('all')
  const [message, setMessage] = useState('')

  // Modal state for editing lists/defaults
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingListKey, setEditingListKey] = useState(null)
  const [editingListOptions, setEditingListOptions] = useState([])
  const [originalListOptions, setOriginalListOptions] = useState([])
  const [tenantConfig, setTenantConfig] = useState(null)

  const tenantId = currentTenant?.id

  // Check if user can manage products
  const canManageProducts = isSystemAdmin ||
    userRole?.permissions?.includes('manage_clients') ||
    userRole?.permissions?.includes('manage_users')

  useEffect(() => {
    if (tenantId) {
      loadData()
    }
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, productLinesData, configData] = await Promise.all([
        getAllProductsWithEnabledStatus(tenantId),
        getProductLines(),
        getTenantProductConfig(tenantId)
      ])
      setProducts(productsData)
      setProductLines(productLinesData)
      setTenantConfig(configData)
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('Failed to load product data')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProduct = async (product) => {
    try {
      setSaving(true)
      if (product.isEnabled) {
        await disableProductForTenant(tenantId, product.id)
      } else {
        await enableProductForTenant(tenantId, product.id, currentUser?.uid)
      }
      await loadData()
      setMessage(`${product.name} has been ${product.isEnabled ? 'disabled' : 'enabled'}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error toggling product:', error)
      setMessage('Failed to update product status')
    } finally {
      setSaving(false)
    }
  }

  const handleEnableAll = async () => {
    if (!window.confirm('Enable all products for this tenant?')) return

    try {
      setSaving(true)
      for (const product of products.filter(p => !p.isEnabled)) {
        await enableProductForTenant(tenantId, product.id, currentUser?.uid)
      }
      await loadData()
      setMessage('All products have been enabled')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error enabling all products:', error)
      setMessage('Failed to enable all products')
    } finally {
      setSaving(false)
    }
  }

  const handleDisableAll = async () => {
    if (!window.confirm('Disable all products for this tenant? Salespeople will not be able to use any products.')) return

    try {
      setSaving(true)
      for (const product of products.filter(p => p.isEnabled)) {
        await disableProductForTenant(tenantId, product.id)
      }
      await loadData()
      setMessage('All products have been disabled')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error disabling all products:', error)
      setMessage('Failed to disable all products')
    } finally {
      setSaving(false)
    }
  }

  const openListEditor = async (product, listKey) => {
    try {
      setEditingProduct(product)
      setEditingListKey(listKey)

      // Get current list options
      let currentOptions = []

      // Check for tenant override first
      if (tenantConfig?.listOverrides?.[product.id]?.[listKey]) {
        currentOptions = [...tenantConfig.listOverrides[product.id][listKey]]
      } else if (product.customLists?.[listKey]?.defaultOptions) {
        currentOptions = [...product.customLists[listKey].defaultOptions]
      } else if (product.customLists?.[listKey]?.options) {
        currentOptions = [...product.customLists[listKey].options]
      } else if (product.calculationTemplateId) {
        // Try to get from template
        const template = await getCalculationTemplate(product.calculationTemplateId)
        if (template?.defaultCustomLists?.[listKey]) {
          currentOptions = [...template.defaultCustomLists[listKey]]
        }
      }

      setEditingListOptions(currentOptions)
      setOriginalListOptions(JSON.stringify(currentOptions))
      setShowEditModal(true)
    } catch (error) {
      console.error('Error opening list editor:', error)
      setMessage('Failed to load list options')
    }
  }

  const handleAddListOption = () => {
    const newId = `option-${Date.now()}`
    setEditingListOptions(prev => [...prev, { id: newId, name: '', value: newId }])
  }

  const handleUpdateListOption = (index, field, value) => {
    setEditingListOptions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-generate value from name if not set
      if (field === 'name' && !updated[index].value) {
        updated[index].value = value.toLowerCase().replace(/\s+/g, '-')
      }
      return updated
    })
  }

  const handleRemoveListOption = (index) => {
    setEditingListOptions(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveListOptions = async () => {
    if (!editingProduct || !editingListKey) return

    try {
      setSaving(true)

      // Filter out empty options
      const validOptions = editingListOptions.filter(opt => opt.name && opt.name.trim())

      await saveTenantListOverride(tenantId, editingProduct.id, editingListKey, validOptions)
      await loadData()

      setShowEditModal(false)
      setEditingProduct(null)
      setEditingListKey(null)
      setEditingListOptions([])

      setMessage('List options saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving list options:', error)
      setMessage('Failed to save list options')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!editingProduct || !editingListKey) return
    if (!window.confirm('Reset this list to the default options? Your customizations will be removed.')) return

    try {
      setSaving(true)
      await removeTenantListOverride(tenantId, editingProduct.id, editingListKey)
      await loadData()

      setShowEditModal(false)
      setEditingProduct(null)
      setEditingListKey(null)
      setEditingListOptions([])

      setMessage('List reset to defaults')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error resetting list:', error)
      setMessage('Failed to reset list')
    } finally {
      setSaving(false)
    }
  }

  const getConfigurableLists = (product) => {
    // Get list of configurable lists from product or template
    const lists = []

    if (product.customLists) {
      for (const [key, config] of Object.entries(product.customLists)) {
        if (config.listType === 'tenant-configurable') {
          lists.push({
            key,
            name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            hasOverride: !!tenantConfig?.listOverrides?.[product.id]?.[key]
          })
        }
      }
    }

    return lists
  }

  const filteredProducts = selectedProductLine === 'all'
    ? products
    : products.filter(p => p.productLineId === selectedProductLine)

  // Group products by product line
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const lineId = product.productLineId || 'other'
    if (!acc[lineId]) {
      acc[lineId] = {
        name: product.productLineName || 'Other',
        products: []
      }
    }
    acc[lineId].products.push(product)
    return acc
  }, {})

  if (!tenantId) {
    return (
      <div className="tenant-product-management-page">
        <div className="access-denied">
          <h2>No Tenant Selected</h2>
          <p>Please select a tenant to manage products.</p>
        </div>
      </div>
    )
  }

  if (!canManageProducts) {
    return (
      <div className="tenant-product-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to manage products.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-loading">
        Loading product configuration...
      </div>
    )
  }

  return (
    <div className="tenant-product-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Enabled Products</h1>
          <p>
            Select which products are available for salespeople in{' '}
            <strong>{currentTenant?.name || 'this tenant'}</strong>
          </p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="toolbar">
        <div className="filter-group">
          <label>Filter by Product Line:</label>
          <select
            value={selectedProductLine}
            onChange={(e) => setSelectedProductLine(e.target.value)}
          >
            <option value="all">All Product Lines</option>
            {productLines.map(pl => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        </div>
        <div className="bulk-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleEnableAll}
            disabled={saving}
          >
            Enable All
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDisableAll}
            disabled={saving}
          >
            Disable All
          </button>
        </div>
      </div>

      <div className="products-summary">
        <div className="summary-stat">
          <span className="stat-value">{products.filter(p => p.isEnabled).length}</span>
          <span className="stat-label">Enabled</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{products.filter(p => !p.isEnabled).length}</span>
          <span className="stat-label">Disabled</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{products.filter(p => p.hasListOverrides).length}</span>
          <span className="stat-label">With Custom Lists</span>
        </div>
      </div>

      <div className="products-container">
        {Object.entries(groupedProducts).map(([lineId, group]) => (
          <div key={lineId} className="product-line-group">
            <h3 className="product-line-header">{group.name}</h3>
            <div className="products-list">
              {group.products.map(product => {
                const configurableLists = getConfigurableLists(product)

                return (
                  <div
                    key={product.id}
                    className={`product-card ${product.isEnabled ? 'enabled' : 'disabled'}`}
                  >
                    <div className="product-main">
                      <div className="product-toggle">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={product.isEnabled}
                            onChange={() => handleToggleProduct(product)}
                            disabled={saving}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="product-info">
                        <h4>{product.name}</h4>
                        {product.description && (
                          <p className="product-description">{product.description}</p>
                        )}
                        <div className="product-meta">
                          {product.hasListOverrides && (
                            <span className="meta-badge customized">Custom Lists</span>
                          )}
                          {product.hasDefaultOverrides && (
                            <span className="meta-badge customized">Custom Defaults</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {product.isEnabled && configurableLists.length > 0 && (
                      <div className="product-lists">
                        <div className="lists-header">
                          <span>Configurable Lists:</span>
                        </div>
                        <div className="lists-buttons">
                          {configurableLists.map(list => (
                            <button
                              key={list.key}
                              className={`btn btn-sm ${list.hasOverride ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => openListEditor(product, list.key)}
                            >
                              {list.name}
                              {list.hasOverride && ' ✓'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="empty-state">
            <p>No products found for this filter.</p>
          </div>
        )}
      </div>

      {/* List Editor Modal */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal list-editor-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {editingListKey?.replace(/([A-Z])/g, ' $1')} for {editingProduct.name}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Customize the dropdown options for this product. Changes only apply to your tenant.
              </p>

              <div className="list-options-editor">
                {editingListOptions.map((option, index) => (
                  <div key={option.id || index} className="list-option-row">
                    <input
                      type="text"
                      value={option.name || ''}
                      onChange={(e) => handleUpdateListOption(index, 'name', e.target.value)}
                      placeholder="Option name"
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveListOption(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary add-option-btn"
                  onClick={handleAddListOption}
                >
                  + Add Option
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleResetToDefault}
                disabled={saving}
              >
                Reset to Default
              </button>
              <div className="footer-right">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveListOptions}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TenantProductManagement
