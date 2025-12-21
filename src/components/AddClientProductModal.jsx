import { useState, useEffect } from 'react'
import {
  getProductLines,
  getProducts,
  getCalculationOptions,
  calculateProductTotal,
  addClientProduct,
  DEFAULT_CALCULATION_METHODS
} from '../services/firestoreService'
import './AddClientProductModal.css'

const AddClientProductModal = ({ clientId, clientName, onClose, onProductAdded }) => {
  const [productLines, setProductLines] = useState([])
  const [products, setProducts] = useState([])
  const [calculationOptions, setCalculationOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedProductLineId, setSelectedProductLineId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [fieldValues, setFieldValues] = useState({})
  const [calculatedTotal, setCalculatedTotal] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // When product line changes, reset product selection
    setSelectedProductId('')
    setSelectedProduct(null)
    setFieldValues({})
    setCalculatedTotal(0)
  }, [selectedProductLineId])

  useEffect(() => {
    // When product changes, set default values
    if (selectedProduct && selectedProductLineId) {
      const method = DEFAULT_CALCULATION_METHODS[getCalculationMethodId()]
      if (method) {
        const defaults = {}
        method.fields.forEach(field => {
          if (field.default !== undefined) {
            defaults[field.id] = field.default
          }
        })

        // Apply product-specific defaults
        if (selectedProduct.defaultCostPerLearner) {
          defaults.costPerLearner = selectedProduct.defaultCostPerLearner
        }
        if (selectedProduct.defaultMonthlyFee) {
          defaults.monthlyFee = selectedProduct.defaultMonthlyFee
        }
        if (selectedProduct.defaultCostPerTrainee) {
          defaults.costPerTrainee = selectedProduct.defaultCostPerTrainee
        }
        if (selectedProduct.defaultDailyRate) {
          defaults.dailyRate = selectedProduct.defaultDailyRate
        }
        if (selectedProduct.defaultDuration) {
          defaults.durationDays = selectedProduct.defaultDuration
        }

        setFieldValues(defaults)
      }
    }
  }, [selectedProduct, selectedProductLineId])

  useEffect(() => {
    // Recalculate total when field values change
    const methodId = getCalculationMethodId()
    if (methodId) {
      const total = calculateProductTotal(methodId, fieldValues)
      setCalculatedTotal(total)
    }
  }, [fieldValues, selectedProductLineId])

  const loadData = async () => {
    try {
      const [productLinesData, productsData, optionsData] = await Promise.all([
        getProductLines(),
        getProducts(),
        getCalculationOptions()
      ])

      setProductLines(productLinesData.filter(pl => pl.status === 'active'))
      setProducts(productsData.filter(p => p.status === 'active'))
      setCalculationOptions(optionsData)
    } catch (error) {
      console.error('Error loading product data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCalculationMethodId = () => {
    const productLine = productLines.find(pl => pl.id === selectedProductLineId)
    return productLine?.calculationMethodId || selectedProductLineId
  }

  const getCalculationMethod = () => {
    const methodId = getCalculationMethodId()
    return DEFAULT_CALCULATION_METHODS[methodId]
  }

  const getFilteredProducts = () => {
    if (!selectedProductLineId) return []
    return products.filter(p => p.productLineId === selectedProductLineId)
  }

  const handleProductLineChange = (e) => {
    setSelectedProductLineId(e.target.value)
  }

  const handleProductChange = (e) => {
    const productId = e.target.value
    setSelectedProductId(productId)
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product)
  }

  const handleFieldChange = (fieldId, value, fieldType) => {
    let parsedValue = value

    if (fieldType === 'number' || fieldType === 'currency') {
      parsedValue = parseFloat(value) || 0
    }

    setFieldValues(prev => ({
      ...prev,
      [fieldId]: parsedValue
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedProductId) {
      alert('Please select a product')
      return
    }

    const method = getCalculationMethod()
    if (!method) {
      alert('Invalid product configuration')
      return
    }

    // Validate required fields
    for (const field of method.fields) {
      if (field.required && !fieldValues[field.id]) {
        alert(`${field.name} is required`)
        return
      }
    }

    try {
      setSaving(true)

      const productData = {
        productId: selectedProductId,
        productName: selectedProduct?.name || '',
        productLineId: selectedProductLineId,
        productLineName: productLines.find(pl => pl.id === selectedProductLineId)?.name || '',
        calculationMethodId: getCalculationMethodId(),
        fieldValues: fieldValues,
        calculatedTotal: calculatedTotal
      }

      await addClientProduct(clientId, productData)

      if (onProductAdded) {
        onProductAdded(productData)
      }

      onClose()
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const renderField = (field) => {
    const value = fieldValues[field.id] ?? field.default ?? ''

    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
            min="0"
            required={field.required}
          />
        )

      case 'currency':
        return (
          <input
            type="number"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
            min="0"
            step="0.01"
            required={field.required}
          />
        )

      case 'select':
        const options = calculationOptions[field.optionsKey] || []
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
            required={field.required}
          >
            <option value="">Select {field.name}</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.value}>{opt.name}</option>
            ))}
          </select>
        )

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
            required={field.required}
          />
        )

      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
            required={field.required}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="add-product-modal-overlay">
        <div className="add-product-modal">
          <div className="modal-loading">Loading products...</div>
        </div>
      </div>
    )
  }

  const method = getCalculationMethod()
  const filteredProducts = getFilteredProducts()

  return (
    <div className="add-product-modal-overlay" onClick={onClose}>
      <div className="add-product-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Product to {clientName}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Step 1: Select Product Line */}
            <div className="form-group">
              <label htmlFor="productLine">Product Line *</label>
              <select
                id="productLine"
                value={selectedProductLineId}
                onChange={handleProductLineChange}
                required
              >
                <option value="">Select Product Line</option>
                {productLines.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Product */}
            {selectedProductLineId && (
              <div className="form-group">
                <label htmlFor="product">Product *</label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={handleProductChange}
                  required
                >
                  <option value="">Select Product</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3: Dynamic fields based on calculation method */}
            {method && selectedProductId && (
              <>
                <div className="form-section-divider">
                  <span>Product Details</span>
                </div>

                <div className="calculation-info">
                  <span className="formula-label">Calculation:</span>
                  <span className="formula-text">{method.formulaDescription}</span>
                </div>

                <div className="dynamic-fields">
                  {method.fields.map(field => (
                    <div key={field.id} className="form-group">
                      <label htmlFor={field.id}>
                        {field.name}
                        {field.required && <span className="required">*</span>}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>

                {/* Calculated Total */}
                <div className="calculated-total">
                  <span className="total-label">Calculated Total:</span>
                  <span className="total-value">{formatCurrency(calculatedTotal)}</span>
                </div>
              </>
            )}

            {productLines.length === 0 && (
              <div className="empty-state">
                <p>No products have been set up yet. Please ask an administrator to initialize the product catalog.</p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !selectedProductId}
            >
              {saving ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddClientProductModal
