import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  getProductLines,
  updateProductLine,
  initializeProductCatalog
} from '../services/firestoreService'
import {
  getCalculationTemplates,
  initializeCalculationTemplates,
  DEFAULT_CALCULATION_TEMPLATES
} from '../services/calculationTemplateService'
import './ProductManagement.css'

// Product configuration with their templates and demo values
const PRODUCT_CONFIG = {
  learnerships: {
    name: 'Learnerships',
    description: 'SETA-funded and self-funded learnership programs',
    templateId: 'learnership',
    icon: '📚',
    demoValues: {
      // Basic deal info
      dealName: 'ABC Company Learnership',
      certaintyPercentage: 80,
      description: 'NQF Level 4 Generic Management',
      fundingType: 'SETA',
      // Learner details
      learnerCount: 10,
      costPerLearner: 25000,
      // Payment schedule
      paymentStartDate: new Date().toISOString().split('T')[0],
      paymentFrequency: 'Monthly',
      paymentMonths: 12,
      // Costs
      facilitatorCost: 50000,
      facilitatorCostFrequency: 'Monthly',
      commissionPercentage: 5,
      commissionFrequency: 'With Income',
      travelCost: 15000,
      travelCostFrequency: 'Monthly',
      assessorCost: 8000,
      assessorCostFrequency: 'End of Learnership',
      moderatorCost: 5000,
      moderatorCostFrequency: 'End of Learnership',
      otherCost: 0,
      otherCostFrequency: 'Once-off',
      customLabel: '',
      customCost: 0,
      customCostFrequency: 'Once-off'
    },
    demoCalculation: (values) => {
      const totalIncome = (values.learnerCount || 0) * (values.costPerLearner || 0)
      const commissionAmount = (totalIncome * (values.commissionPercentage || 0)) / 100
      const totalCosts =
        (values.facilitatorCost || 0) +
        commissionAmount +
        (values.travelCost || 0) +
        (values.assessorCost || 0) +
        (values.moderatorCost || 0) +
        (values.otherCost || 0) +
        (values.customCost || 0)
      const grossProfit = totalIncome - totalCosts
      const certainty = values.certaintyPercentage ?? 100
      const adjustedGP = grossProfit * (certainty / 100)
      const gpMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

      return {
        totalIncome,
        totalCosts,
        grossProfit,
        adjustedGP,
        gpMargin,
        commissionAmount,
        certaintyPercentage: certainty,
        monthlyIncome: totalIncome / (values.paymentMonths || 12),
        formula: `${values.learnerCount || 0} learners × R${(values.costPerLearner || 0).toLocaleString()} = Total Income`,
        distribution: values.paymentFrequency === 'Once-off'
          ? `Once-off payment starting ${values.paymentStartDate || 'TBD'}`
          : `R${(totalIncome / (values.paymentMonths || 12)).toLocaleString()}/month over ${values.paymentMonths || 12} months`
      }
    }
  },
  compliance: {
    name: 'Compliance',
    description: 'Compliance training courses (First Aid, Fire Safety, OHS)',
    templateId: 'once-off-training',
    icon: '✓',
    demoValues: {
      // Basic deal info
      dealName: 'ABC Company First Aid Training',
      certaintyPercentage: 100,
      description: 'Annual first aid certification for staff',
      courseName: 'First Aid Level 1',
      customCourseName: '',
      // Training details
      trainingDate: new Date().toISOString().split('T')[0],
      numberOfTrainees: 20,
      pricePerPerson: 1500,
      // Costs
      commissionPercentage: 5,
      commissionFrequency: 'With Income',
      travelCost: 2000,
      travelCostFrequency: 'Once-off',
      manualsCost: 500,
      manualsCostFrequency: 'Once-off',
      accommodationCost: 0,
      accommodationCostFrequency: 'Once-off',
      accreditationCost: 1000,
      accreditationCostFrequency: 'Once-off',
      customCostLabel: '',
      customCost: 0,
      customCostFrequency: 'Once-off'
    },
    demoCalculation: (values) => {
      const totalIncome = (values.numberOfTrainees || 0) * (values.pricePerPerson || 0)
      const commissionAmount = (totalIncome * (values.commissionPercentage || 0)) / 100
      const totalCosts =
        commissionAmount +
        (values.travelCost || 0) +
        (values.manualsCost || 0) +
        (values.accommodationCost || 0) +
        (values.accreditationCost || 0) +
        (values.customCost || 0)
      const grossProfit = totalIncome - totalCosts
      const certainty = values.certaintyPercentage ?? 100
      const adjustedGP = grossProfit * (certainty / 100)
      const gpMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

      return {
        totalIncome,
        totalCosts,
        grossProfit,
        adjustedGP,
        gpMargin,
        commissionAmount,
        certaintyPercentage: certainty,
        formula: `${values.numberOfTrainees || 0} trainees × R${(values.pricePerPerson || 0).toLocaleString()} = Total Income`,
        distribution: `Once-off payment on training date: ${values.trainingDate || 'TBD'}`
      }
    }
  },
  otherCourses: {
    name: 'Other Courses',
    description: 'General training courses and workshops',
    templateId: 'once-off-training',
    icon: '🎓',
    demoValues: {
      // Basic deal info
      dealName: 'Leadership Development Workshop',
      certaintyPercentage: 80,
      description: 'Management leadership training program',
      courseName: 'Leadership Workshop',
      customCourseName: '',
      // Training details
      trainingDate: new Date().toISOString().split('T')[0],
      numberOfTrainees: 15,
      pricePerPerson: 2500,
      // Costs
      commissionPercentage: 5,
      commissionFrequency: 'With Income',
      travelCost: 3000,
      travelCostFrequency: 'Once-off',
      manualsCost: 750,
      manualsCostFrequency: 'Once-off',
      accommodationCost: 5000,
      accommodationCostFrequency: 'Once-off',
      accreditationCost: 0,
      accreditationCostFrequency: 'Once-off',
      customCostLabel: '',
      customCost: 0,
      customCostFrequency: 'Once-off'
    },
    demoCalculation: (values) => {
      const totalIncome = (values.numberOfTrainees || 0) * (values.pricePerPerson || 0)
      const commissionAmount = (totalIncome * (values.commissionPercentage || 0)) / 100
      const totalCosts =
        commissionAmount +
        (values.travelCost || 0) +
        (values.manualsCost || 0) +
        (values.accommodationCost || 0) +
        (values.accreditationCost || 0) +
        (values.customCost || 0)
      const grossProfit = totalIncome - totalCosts
      const certainty = values.certaintyPercentage ?? 100
      const adjustedGP = grossProfit * (certainty / 100)
      const gpMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

      return {
        totalIncome,
        totalCosts,
        grossProfit,
        adjustedGP,
        gpMargin,
        commissionAmount,
        certaintyPercentage: certainty,
        formula: `${values.numberOfTrainees || 0} trainees × R${(values.pricePerPerson || 0).toLocaleString()} = Total Income`,
        distribution: `Once-off payment on training date: ${values.trainingDate || 'TBD'}`
      }
    }
  },
  tapBusiness: {
    name: 'TAP Business',
    description: 'Subscription-based TAP Business service',
    templateId: 'subscription',
    icon: '💼',
    demoValues: {
      // Basic deal info
      dealName: 'XYZ Corp TAP Subscription',
      certaintyPercentage: 90,
      description: 'Annual TAP Business subscription',
      // TAP details
      numberOfEmployees: 50,
      costPerEmployeePerMonth: 150,
      paymentType: 'Monthly', // 'Monthly' or 'Annual'
      paymentStartDate: new Date().toISOString().split('T')[0],
      contractMonths: 12,
      // Costs
      commissionPercentage: 5,
      commissionFrequency: 'With Income',
      customCostLabel: '',
      customCost: 0,
      customCostFrequency: 'Once-off'
    },
    demoCalculation: (values) => {
      const employees = values.numberOfEmployees || 0
      const costPerEmployee = values.costPerEmployeePerMonth || 0
      const paymentType = values.paymentType || 'Monthly'
      const contractMonths = paymentType === 'Annual' ? 1 : (values.contractMonths || 12)

      // Calculate total income based on payment type
      let totalIncome
      if (paymentType === 'Annual') {
        totalIncome = employees * costPerEmployee * 12 // Annual fee is 12 months worth
      } else {
        totalIncome = employees * costPerEmployee * contractMonths
      }

      const monthlyIncome = employees * costPerEmployee
      const commissionAmount = (totalIncome * (values.commissionPercentage || 0)) / 100
      const totalCosts = commissionAmount + (values.customCost || 0)
      const grossProfit = totalIncome - totalCosts
      const certainty = values.certaintyPercentage ?? 100
      const adjustedGP = grossProfit * (certainty / 100)
      const gpMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

      return {
        totalIncome,
        totalCosts,
        grossProfit,
        adjustedGP,
        gpMargin,
        monthlyIncome,
        commissionAmount,
        certaintyPercentage: certainty,
        formula: paymentType === 'Annual'
          ? `${employees} employees × R${costPerEmployee.toLocaleString()}/month × 12 months (Annual)`
          : `${employees} employees × R${costPerEmployee.toLocaleString()}/month × ${contractMonths} months`,
        distribution: paymentType === 'Annual'
          ? `Annual payment starting ${values.paymentStartDate || 'TBD'}`
          : `Monthly payments of R${monthlyIncome.toLocaleString()}/month over ${contractMonths} months`
      }
    }
  }
}

const ProductManagement = () => {
  const { isSystemAdmin } = useTenant()
  const [productLines, setProductLines] = useState([])
  const [calculationTemplates, setCalculationTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initMessage, setInitMessage] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [activeTab, setActiveTab] = useState('demo')

  // Editing state for lists
  const [editingLists, setEditingLists] = useState({})
  const [editingCostFields, setEditingCostFields] = useState([])

  // Demo calculation state
  const [demoValues, setDemoValues] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productLinesData, templatesData] = await Promise.all([
        getProductLines(),
        getCalculationTemplates()
      ])

      // Auto-initialize if no product lines exist
      if (productLinesData.length === 0) {
        setInitMessage('Setting up default products...')
        try {
          await initializeProductCatalog()
          await initializeCalculationTemplates()
          const [newProductLines, newTemplates] = await Promise.all([
            getProductLines(),
            getCalculationTemplates()
          ])
          setProductLines(newProductLines)
          setCalculationTemplates(newTemplates)
          setInitMessage('Products initialized successfully!')
          setTimeout(() => setInitMessage(''), 5000)
        } catch (initError) {
          console.error('Error auto-initializing:', initError)
          setInitMessage('Failed to initialize products.')
        }
      } else {
        setProductLines(productLinesData)
        setCalculationTemplates(templatesData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openProductModal = (productId) => {
    const productLine = productLines.find(p => p.id === productId)
    const config = PRODUCT_CONFIG[productId]
    const template = calculationTemplates.find(t => t.id === config?.templateId) ||
                     DEFAULT_CALCULATION_TEMPLATES[config?.templateId]

    setSelectedProduct({
      ...productLine,
      id: productId,
      config,
      template
    })

    // Initialize demo values
    setDemoValues({ ...config.demoValues })

    // Initialize lists from product line or template defaults
    const lists = {}
    if (template?.defaultCustomLists) {
      for (const [key, defaultOptions] of Object.entries(template.defaultCustomLists)) {
        lists[key] = productLine?.customLists?.[key]?.defaultOptions ||
                     productLine?.customLists?.[key] ||
                     [...defaultOptions]
      }
    }
    setEditingLists(lists)

    // Initialize cost fields from product line or template defaults
    const costFields = template?.costFields?.map(field => {
      const existingConfig = productLine?.costFieldsConfig?.[field.id] || {}
      return {
        ...field,
        enabled: existingConfig.enabled !== false,
        defaultValue: existingConfig.defaultValue || 0,
        defaultFrequency: existingConfig.defaultFrequency || field.frequencyOptions?.[0] || 'Once-off'
      }
    }) || []
    setEditingCostFields(costFields)

    setActiveTab('demo')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedProduct(null)
    setEditingLists({})
    setEditingCostFields([])
    setDemoValues({})
  }

  // Demo value handlers
  const handleDemoValueChange = (key, value) => {
    setDemoValues(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }))
  }

  // List management handlers
  const handleListItemChange = (listKey, index, value) => {
    setEditingLists(prev => {
      const updated = { ...prev }
      updated[listKey] = [...(updated[listKey] || [])]
      if (typeof updated[listKey][index] === 'string') {
        updated[listKey][index] = { id: `item-${index}`, name: value, value: value.toLowerCase().replace(/\s+/g, '-') }
      } else {
        updated[listKey][index] = { ...updated[listKey][index], name: value }
        if (!updated[listKey][index].value || updated[listKey][index].value === '') {
          updated[listKey][index].value = value.toLowerCase().replace(/\s+/g, '-')
        }
      }
      return updated
    })
  }

  const handleAddListItem = (listKey) => {
    const newId = `item-${Date.now()}`
    setEditingLists(prev => ({
      ...prev,
      [listKey]: [...(prev[listKey] || []), { id: newId, name: '', value: newId }]
    }))
  }

  const handleRemoveListItem = (listKey, index) => {
    setEditingLists(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index)
    }))
  }

  // Cost field handlers
  const handleCostFieldToggle = (fieldId) => {
    setEditingCostFields(prev =>
      prev.map(f => f.id === fieldId ? { ...f, enabled: !f.enabled } : f)
    )
  }

  const handleCostFieldChange = (fieldId, key, value) => {
    setEditingCostFields(prev =>
      prev.map(f => f.id === fieldId ? { ...f, [key]: value } : f)
    )
  }

  const handleSave = async () => {
    if (!selectedProduct) return

    try {
      setSaving(true)

      // Format custom lists for storage
      const customLists = {}
      for (const [key, options] of Object.entries(editingLists)) {
        const validOptions = options.filter(opt => {
          const name = typeof opt === 'string' ? opt : opt.name
          return name && name.trim()
        }).map(opt => {
          if (typeof opt === 'string') {
            return { id: opt.toLowerCase().replace(/\s+/g, '-'), name: opt, value: opt.toLowerCase().replace(/\s+/g, '-') }
          }
          return opt
        })
        if (validOptions.length > 0) {
          customLists[key] = {
            listType: 'tenant-configurable',
            defaultOptions: validOptions
          }
        }
      }

      // Format cost fields config
      const costFieldsConfig = {}
      for (const field of editingCostFields) {
        costFieldsConfig[field.id] = {
          enabled: field.enabled,
          defaultValue: parseFloat(field.defaultValue) || 0,
          defaultFrequency: field.defaultFrequency
        }
      }

      await updateProductLine(selectedProduct.id, {
        customLists,
        costFieldsConfig
      })

      await loadData()
      setInitMessage('Product saved successfully!')
      setTimeout(() => setInitMessage(''), 3000)
      closeModal()
    } catch (error) {
      console.error('Error saving product:', error)
      setInitMessage('Failed to save product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getListDisplayName = (key) => {
    const names = {
      fundingTypes: 'Funding Types',
      learnershipTypes: 'Learnership Types',
      packageTypes: 'Package Types',
      courseOptions: 'Course Options',
      consultationTypes: 'Consultation Types'
    }
    return names[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  // Get demo calculation result
  const getDemoResult = () => {
    if (!selectedProduct?.config?.demoCalculation) return null
    return selectedProduct.config.demoCalculation(demoValues)
  }

  if (loading) {
    return (
      <div className="page-loading">
        Loading product management...
      </div>
    )
  }

  return (
    <div className="product-management-page">
      <div className="page-header">
        <h1>Product Management</h1>
        <p>Configure products, default lists and costing options for each product line</p>
      </div>

      {initMessage && (
        <div className={`init-message ${initMessage.includes('Failed') ? 'error' : 'success'}`}>
          {initMessage}
        </div>
      )}

      {/* Product Cards Grid */}
      <div className="product-cards-grid">
        {Object.entries(PRODUCT_CONFIG).map(([productId, config]) => {
          const productLine = productLines.find(p => p.id === productId)
          const template = calculationTemplates.find(t => t.id === config.templateId) ||
                          DEFAULT_CALCULATION_TEMPLATES[config.templateId]
          const listCount = template?.defaultCustomLists ? Object.keys(template.defaultCustomLists).length : 0
          const costCount = template?.costFields?.length || 0

          return (
            <div
              key={productId}
              className="product-card"
              onClick={() => openProductModal(productId)}
            >
              <div className="product-card-icon">{config.icon}</div>
              <div className="product-card-content">
                <h3>{config.name}</h3>
                <p>{config.description}</p>
                <div className="product-card-stats">
                  <span className="stat">
                    <strong>{listCount}</strong> list{listCount !== 1 ? 's' : ''}
                  </span>
                  <span className="stat">
                    <strong>{costCount}</strong> cost line{costCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="product-card-arrow">→</div>
            </div>
          )
        })}
      </div>

      {/* Product Detail Modal */}
      {showModal && selectedProduct && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <span className="modal-icon">{selectedProduct.config?.icon}</span>
                <div>
                  <h2>{selectedProduct.config?.name}</h2>
                  <p className="modal-subtitle">{selectedProduct.config?.description}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            {/* Tabs inside modal */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => setActiveTab('demo')}
              >
                Demo Calculation
              </button>
              <button
                className={`modal-tab ${activeTab === 'lists' ? 'active' : ''}`}
                onClick={() => setActiveTab('lists')}
              >
                Default Lists
              </button>
              <button
                className={`modal-tab ${activeTab === 'costs' ? 'active' : ''}`}
                onClick={() => setActiveTab('costs')}
              >
                Costing Lines
              </button>
            </div>

            <div className="modal-body">
              {/* Demo Calculation Tab */}
              {activeTab === 'demo' && (
                <div className="demo-section">
                  <div className="demo-intro">
                    <p>This is exactly how a salesperson will see the {selectedProduct.config?.name} deal form when adding a forecast.</p>
                  </div>

                  {/* Full Learnership Deal Form - matches ClientFinancialEditor */}
                  {selectedProduct.id === 'learnerships' && (
                    <div className="learnership-demo-form">
                      <div className="demo-form-header">
                        <h4>Deal 1 - {demoValues.dealName || 'New Deal'}</h4>
                      </div>

                      <div className="demo-vertical-grid">
                        {/* Deal Name */}
                        <div className="demo-field">
                          <label>Deal Name</label>
                          <input
                            type="text"
                            value={demoValues.dealName || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, dealName: e.target.value }))}
                            placeholder="e.g., ABC Company Learnership"
                          />
                        </div>

                        {/* Certainty % */}
                        <div className="demo-field">
                          <label>Deal Certainty %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={demoValues.certaintyPercentage ?? 100}
                            onChange={(e) => handleDemoValueChange('certaintyPercentage', e.target.value)}
                            placeholder="100"
                          />
                        </div>

                        {/* Description */}
                        <div className="demo-field full-width">
                          <label>Description</label>
                          <textarea
                            value={demoValues.description || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Add notes about this deal..."
                            rows="2"
                          />
                        </div>

                        {/* Funding Type - uses configurable list */}
                        <div className="demo-field">
                          <label>Funding Type</label>
                          <select
                            value={demoValues.fundingType || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, fundingType: e.target.value }))}
                          >
                            <option value="">-- Select Funding Type --</option>
                            {(editingLists.fundingTypes || []).map((item, idx) => {
                              const name = typeof item === 'string' ? item : item.name
                              const value = typeof item === 'string' ? item : (item.value || item.name)
                              return (
                                <option key={item.id || idx} value={value}>{name}</option>
                              )
                            })}
                          </select>
                        </div>

                        {/* Learnership Type - uses configurable list */}
                        <div className="demo-field">
                          <label>Learnership Type</label>
                          <select
                            value={demoValues.learnershipType || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, learnershipType: e.target.value }))}
                          >
                            <option value="">-- Select Learnership Type --</option>
                            {(editingLists.learnershipTypes || []).map((item, idx) => {
                              const name = typeof item === 'string' ? item : item.name
                              const value = typeof item === 'string' ? item : (item.value || item.name)
                              return (
                                <option key={item.id || idx} value={value}>{name}</option>
                              )
                            })}
                          </select>
                        </div>

                        {/* No. Learners */}
                        <div className="demo-field">
                          <label>No. Learners</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.learnerCount || ''}
                            onChange={(e) => handleDemoValueChange('learnerCount', e.target.value)}
                          />
                        </div>

                        {/* Cost / Learner */}
                        <div className="demo-field">
                          <label>Cost / Learner</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.costPerLearner || ''}
                            onChange={(e) => handleDemoValueChange('costPerLearner', e.target.value)}
                          />
                        </div>

                        {/* Total Amount (calculated) */}
                        <div className="demo-field">
                          <label>Total Amount</label>
                          <div className="demo-calculated-value">
                            {formatCurrency((demoValues.learnerCount || 0) * (demoValues.costPerLearner || 0))}
                          </div>
                        </div>

                        {/* Payment Start Date */}
                        <div className="demo-field">
                          <label>Payment Start Date</label>
                          <input
                            type="date"
                            value={demoValues.paymentStartDate || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, paymentStartDate: e.target.value }))}
                          />
                        </div>

                        {/* Frequency */}
                        <div className="demo-field">
                          <label>Frequency</label>
                          <select
                            value={demoValues.paymentFrequency || 'Monthly'}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, paymentFrequency: e.target.value }))}
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Once-off">Once-off</option>
                          </select>
                        </div>

                        {/* Months */}
                        <div className="demo-field">
                          <label>Months</label>
                          <input
                            type="number"
                            min="1"
                            value={demoValues.paymentFrequency === 'Once-off' ? 1 : (demoValues.paymentMonths || 12)}
                            onChange={(e) => handleDemoValueChange('paymentMonths', e.target.value)}
                            disabled={demoValues.paymentFrequency === 'Once-off'}
                          />
                        </div>

                        {/* Cost of Sales Section */}
                        <div className="demo-costs-section">
                          <h5>Cost of Sales</h5>
                          <p className="costs-hint">Set when each cost will be paid to calculate GP correctly per period</p>

                          {/* Facilitator Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Facilitator Cost</label>
                              <input
                                type="number"
                                value={demoValues.facilitatorCost || ''}
                                onChange={(e) => handleDemoValueChange('facilitatorCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.facilitatorCostFrequency || 'Monthly'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, facilitatorCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Commission */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field commission-field">
                              <label>Commission %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={demoValues.commissionPercentage || ''}
                                onChange={(e) => handleDemoValueChange('commissionPercentage', e.target.value)}
                                placeholder="%"
                              />
                              <span className="commission-amount">
                                = {formatCurrency(((demoValues.learnerCount || 0) * (demoValues.costPerLearner || 0) * (demoValues.commissionPercentage || 0)) / 100)}
                              </span>
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.commissionFrequency || 'With Income'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, commissionFrequency: e.target.value }))}
                              >
                                <option value="With Income">With Income (same as revenue)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Travel Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Travel Cost</label>
                              <input
                                type="number"
                                value={demoValues.travelCost || ''}
                                onChange={(e) => handleDemoValueChange('travelCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.travelCostFrequency || 'Monthly'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, travelCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Assessor Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Assessor Cost</label>
                              <input
                                type="number"
                                value={demoValues.assessorCost || ''}
                                onChange={(e) => handleDemoValueChange('assessorCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.assessorCostFrequency || 'End of Learnership'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, assessorCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Moderator Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Moderator Cost</label>
                              <input
                                type="number"
                                value={demoValues.moderatorCost || ''}
                                onChange={(e) => handleDemoValueChange('moderatorCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.moderatorCostFrequency || 'End of Learnership'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, moderatorCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Other Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Other Cost</label>
                              <input
                                type="number"
                                value={demoValues.otherCost || ''}
                                onChange={(e) => handleDemoValueChange('otherCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.otherCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, otherCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>

                          {/* Custom Cost */}
                          <div className="cost-item-row custom-cost-row">
                            <div className="cost-label-field">
                              <label>Custom Label</label>
                              <input
                                type="text"
                                value={demoValues.customLabel || ''}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customLabel: e.target.value }))}
                                placeholder="e.g., Materials"
                              />
                            </div>
                            <div className="cost-amount-field">
                              <label>Amount</label>
                              <input
                                type="number"
                                value={demoValues.customCost || ''}
                                onChange={(e) => handleDemoValueChange('customCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.customCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customCostFrequency: e.target.value }))}
                              >
                                <option value="Monthly">Monthly (spread over duration)</option>
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="End of Learnership">End of Learnership</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Calculation Result Summary */}
                        <div className="demo-calculation-result">
                          <h5>Calculation Result</h5>
                          {(() => {
                            const result = getDemoResult()
                            if (!result) return <p>No calculation available</p>

                            return (
                              <div className="calc-result-content">
                                <div className="calc-formula">
                                  <span className="formula-label">Formula:</span>
                                  <span className="formula-text">{result.formula}</span>
                                </div>

                                <div className="calc-row">
                                  <div className="calc-item income">
                                    <label>Total Income</label>
                                    <div className="calc-value">{formatCurrency(result.totalIncome)}</div>
                                  </div>
                                  <div className="calc-item costs">
                                    <label>Total Costs</label>
                                    <div className="calc-value negative">-{formatCurrency(result.totalCosts)}</div>
                                  </div>
                                  <div className="calc-item gp">
                                    <label>Gross Profit</label>
                                    <div className={`calc-value ${result.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                                      {formatCurrency(result.grossProfit)}
                                    </div>
                                  </div>
                                </div>

                                {result.certaintyPercentage < 100 && (
                                  <div className="calc-certainty">
                                    <span className="certainty-label">With {result.certaintyPercentage}% certainty:</span>
                                    <span className="certainty-value">{formatCurrency(result.adjustedGP)}</span>
                                  </div>
                                )}

                                <div className="calc-breakdown">
                                  <label>Distribution:</label>
                                  <span className="breakdown-text">{result.distribution}</span>
                                </div>

                                <div className="calc-costs-summary">
                                  <label>Costs Breakdown:</label>
                                  <ul className="costs-list">
                                    {(demoValues.facilitatorCost || 0) > 0 && (
                                      <li>Facilitator: {formatCurrency(demoValues.facilitatorCost)} ({demoValues.facilitatorCostFrequency || 'Monthly'})</li>
                                    )}
                                    {result.commissionAmount > 0 && (
                                      <li>Commission ({demoValues.commissionPercentage}%): {formatCurrency(result.commissionAmount)} ({demoValues.commissionFrequency || 'With Income'})</li>
                                    )}
                                    {(demoValues.travelCost || 0) > 0 && (
                                      <li>Travel: {formatCurrency(demoValues.travelCost)} ({demoValues.travelCostFrequency || 'Monthly'})</li>
                                    )}
                                    {(demoValues.assessorCost || 0) > 0 && (
                                      <li>Assessor: {formatCurrency(demoValues.assessorCost)} ({demoValues.assessorCostFrequency || 'End of Learnership'})</li>
                                    )}
                                    {(demoValues.moderatorCost || 0) > 0 && (
                                      <li>Moderator: {formatCurrency(demoValues.moderatorCost)} ({demoValues.moderatorCostFrequency || 'End of Learnership'})</li>
                                    )}
                                    {(demoValues.otherCost || 0) > 0 && (
                                      <li>Other: {formatCurrency(demoValues.otherCost)} ({demoValues.otherCostFrequency || 'Once-off'})</li>
                                    )}
                                    {(demoValues.customCost || 0) > 0 && (
                                      <li>{demoValues.customLabel || 'Custom'}: {formatCurrency(demoValues.customCost)} ({demoValues.customCostFrequency || 'Once-off'})</li>
                                    )}
                                  </ul>
                                </div>

                                <div className="calc-gp-margin">
                                  <label>GP Margin:</label>
                                  <span className={`margin-value ${result.gpMargin >= 0 ? 'positive' : 'negative'}`}>
                                    {result.totalIncome > 0 ? `${result.gpMargin.toFixed(1)}%` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compliance / Other Courses full form - matches ClientFinancialEditor */}
                  {(selectedProduct.id === 'compliance' || selectedProduct.id === 'otherCourses') && (
                    <div className="learnership-demo-form">
                      <div className="demo-form-header">
                        <h4>Deal 1 - {demoValues.dealName || demoValues.courseName || 'New Training Deal'}</h4>
                      </div>

                      <div className="demo-vertical-grid">
                        {/* Course Selection - uses configurable list */}
                        <div className="demo-field">
                          <label>Course</label>
                          <select
                            value={demoValues.courseName || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, courseName: e.target.value }))}
                          >
                            <option value="">-- Select Course --</option>
                            {(editingLists.courseOptions || []).map((item, idx) => {
                              const name = typeof item === 'string' ? item : item.name
                              const value = typeof item === 'string' ? item : (item.value || item.name)
                              return (
                                <option key={item.id || idx} value={value}>{name}</option>
                              )
                            })}
                          </select>
                        </div>

                        {/* Custom Course Name (if Other selected) */}
                        {demoValues.courseName === 'Other' && (
                          <div className="demo-field">
                            <label>Custom Course Name</label>
                            <input
                              type="text"
                              value={demoValues.customCourseName || ''}
                              onChange={(e) => setDemoValues(prev => ({ ...prev, customCourseName: e.target.value }))}
                              placeholder="Enter course name"
                            />
                          </div>
                        )}

                        {/* Certainty % */}
                        <div className="demo-field">
                          <label>Deal Certainty %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={demoValues.certaintyPercentage ?? 100}
                            onChange={(e) => handleDemoValueChange('certaintyPercentage', e.target.value)}
                            placeholder="100"
                          />
                        </div>

                        {/* Description */}
                        <div className="demo-field full-width">
                          <label>Description</label>
                          <textarea
                            value={demoValues.description || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Add notes about this deal..."
                            rows="2"
                          />
                        </div>

                        {/* Training Date */}
                        <div className="demo-field">
                          <label>Training Date</label>
                          <input
                            type="date"
                            value={demoValues.trainingDate || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, trainingDate: e.target.value }))}
                          />
                        </div>

                        {/* Number of Trainees */}
                        <div className="demo-field">
                          <label>Number of Trainees</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.numberOfTrainees || ''}
                            onChange={(e) => handleDemoValueChange('numberOfTrainees', e.target.value)}
                          />
                        </div>

                        {/* Price per Person */}
                        <div className="demo-field">
                          <label>Price per Person</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.pricePerPerson || ''}
                            onChange={(e) => handleDemoValueChange('pricePerPerson', e.target.value)}
                          />
                        </div>

                        {/* Total Income (calculated) */}
                        <div className="demo-field">
                          <label>Total Income</label>
                          <div className="demo-calculated-value">
                            {formatCurrency((demoValues.numberOfTrainees || 0) * (demoValues.pricePerPerson || 0))}
                          </div>
                        </div>

                        {/* Cost of Sales Section */}
                        <div className="demo-costs-section">
                          <h5>Cost of Sales</h5>
                          <p className="costs-hint">Price can be zero for internal training - only costs will apply</p>

                          {/* Commission */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field commission-field">
                              <label>Commission %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={demoValues.commissionPercentage || ''}
                                onChange={(e) => handleDemoValueChange('commissionPercentage', e.target.value)}
                                placeholder="%"
                              />
                              <span className="commission-amount">
                                = {formatCurrency(((demoValues.numberOfTrainees || 0) * (demoValues.pricePerPerson || 0) * (demoValues.commissionPercentage || 0)) / 100)}
                              </span>
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.commissionFrequency || 'With Income'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, commissionFrequency: e.target.value }))}
                              >
                                <option value="With Income">With Income</option>
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>

                          {/* Travel Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Travel Cost</label>
                              <input
                                type="number"
                                value={demoValues.travelCost || ''}
                                onChange={(e) => handleDemoValueChange('travelCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.travelCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, travelCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>

                          {/* Manuals Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Manuals Cost</label>
                              <input
                                type="number"
                                value={demoValues.manualsCost || ''}
                                onChange={(e) => handleDemoValueChange('manualsCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.manualsCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, manualsCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>

                          {/* Accommodation Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Accommodation Cost</label>
                              <input
                                type="number"
                                value={demoValues.accommodationCost || ''}
                                onChange={(e) => handleDemoValueChange('accommodationCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.accommodationCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, accommodationCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>

                          {/* Accreditation Cost */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field">
                              <label>Accreditation Cost</label>
                              <input
                                type="number"
                                value={demoValues.accreditationCost || ''}
                                onChange={(e) => handleDemoValueChange('accreditationCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.accreditationCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, accreditationCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>

                          {/* Custom Cost */}
                          <div className="cost-item-row custom-cost-row">
                            <div className="cost-label-field">
                              <label>Custom Label</label>
                              <input
                                type="text"
                                value={demoValues.customCostLabel || ''}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customCostLabel: e.target.value }))}
                                placeholder="e.g., Catering"
                              />
                            </div>
                            <div className="cost-amount-field">
                              <label>Amount</label>
                              <input
                                type="number"
                                value={demoValues.customCost || ''}
                                onChange={(e) => handleDemoValueChange('customCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.customCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Calculation Result Summary */}
                        <div className="demo-calculation-result">
                          <h5>Calculation Result</h5>
                          {(() => {
                            const result = getDemoResult()
                            if (!result) return <p>No calculation available</p>

                            return (
                              <div className="calc-result-content">
                                <div className="calc-formula">
                                  <span className="formula-label">Formula:</span>
                                  <span className="formula-text">{result.formula}</span>
                                </div>

                                <div className="calc-row">
                                  <div className="calc-item income">
                                    <label>Total Income</label>
                                    <div className="calc-value">{formatCurrency(result.totalIncome)}</div>
                                  </div>
                                  <div className="calc-item costs">
                                    <label>Total Costs</label>
                                    <div className="calc-value negative">-{formatCurrency(result.totalCosts)}</div>
                                  </div>
                                  <div className="calc-item gp">
                                    <label>Gross Profit</label>
                                    <div className={`calc-value ${result.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                                      {formatCurrency(result.grossProfit)}
                                    </div>
                                  </div>
                                </div>

                                {result.certaintyPercentage < 100 && (
                                  <div className="calc-certainty">
                                    <span className="certainty-label">With {result.certaintyPercentage}% certainty:</span>
                                    <span className="certainty-value">{formatCurrency(result.adjustedGP)}</span>
                                  </div>
                                )}

                                <div className="calc-breakdown">
                                  <label>Distribution:</label>
                                  <span className="breakdown-text">{result.distribution}</span>
                                </div>

                                <div className="calc-costs-summary">
                                  <label>Costs Breakdown:</label>
                                  <ul className="costs-list">
                                    {result.commissionAmount > 0 && (
                                      <li>Commission ({demoValues.commissionPercentage}%): {formatCurrency(result.commissionAmount)} ({demoValues.commissionFrequency || 'With Income'})</li>
                                    )}
                                    {(demoValues.travelCost || 0) > 0 && (
                                      <li>Travel: {formatCurrency(demoValues.travelCost)} ({demoValues.travelCostFrequency || 'Once-off'})</li>
                                    )}
                                    {(demoValues.manualsCost || 0) > 0 && (
                                      <li>Manuals: {formatCurrency(demoValues.manualsCost)} ({demoValues.manualsCostFrequency || 'Once-off'})</li>
                                    )}
                                    {(demoValues.accommodationCost || 0) > 0 && (
                                      <li>Accommodation: {formatCurrency(demoValues.accommodationCost)} ({demoValues.accommodationCostFrequency || 'Once-off'})</li>
                                    )}
                                    {(demoValues.accreditationCost || 0) > 0 && (
                                      <li>Accreditation: {formatCurrency(demoValues.accreditationCost)} ({demoValues.accreditationCostFrequency || 'Once-off'})</li>
                                    )}
                                    {(demoValues.customCost || 0) > 0 && (
                                      <li>{demoValues.customCostLabel || 'Custom'}: {formatCurrency(demoValues.customCost)} ({demoValues.customCostFrequency || 'Once-off'})</li>
                                    )}
                                  </ul>
                                </div>

                                <div className="calc-gp-margin">
                                  <label>GP Margin:</label>
                                  <span className={`margin-value ${result.gpMargin >= 0 ? 'positive' : 'negative'}`}>
                                    {result.totalIncome > 0 ? `${result.gpMargin.toFixed(1)}%` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAP Business full form - matches ClientFinancialEditor */}
                  {selectedProduct.id === 'tapBusiness' && (
                    <div className="learnership-demo-form">
                      <div className="demo-form-header">
                        <h4>Deal 1 - {demoValues.dealName || 'New TAP Business Deal'}</h4>
                      </div>

                      <div className="demo-vertical-grid">
                        {/* Deal Name */}
                        <div className="demo-field">
                          <label>Deal Name</label>
                          <input
                            type="text"
                            value={demoValues.dealName || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, dealName: e.target.value }))}
                            placeholder="e.g., Company ABC TAP"
                          />
                        </div>

                        {/* Certainty % */}
                        <div className="demo-field">
                          <label>Deal Certainty %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={demoValues.certaintyPercentage ?? 100}
                            onChange={(e) => handleDemoValueChange('certaintyPercentage', e.target.value)}
                            placeholder="100"
                          />
                        </div>

                        {/* Description */}
                        <div className="demo-field full-width">
                          <label>Description</label>
                          <textarea
                            value={demoValues.description || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Add notes about this deal..."
                            rows="2"
                          />
                        </div>

                        {/* Number of Employees */}
                        <div className="demo-field">
                          <label>Number of Employees</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.numberOfEmployees || ''}
                            onChange={(e) => handleDemoValueChange('numberOfEmployees', e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        {/* Cost per Employee / Month */}
                        <div className="demo-field">
                          <label>Cost per Employee / Month</label>
                          <input
                            type="number"
                            min="0"
                            value={demoValues.costPerEmployeePerMonth || ''}
                            onChange={(e) => handleDemoValueChange('costPerEmployeePerMonth', e.target.value)}
                          />
                        </div>

                        {/* Payment Type */}
                        <div className="demo-field">
                          <label>Payment Type</label>
                          <select
                            value={demoValues.paymentType || 'Monthly'}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, paymentType: e.target.value }))}
                          >
                            <option value="Monthly">Monthly Fee</option>
                            <option value="Annual">Annual Fee</option>
                          </select>
                        </div>

                        {/* Payment Start Date */}
                        <div className="demo-field">
                          <label>Payment Start Date</label>
                          <input
                            type="date"
                            value={demoValues.paymentStartDate || ''}
                            onChange={(e) => setDemoValues(prev => ({ ...prev, paymentStartDate: e.target.value }))}
                          />
                        </div>

                        {/* Contract Duration (Months) */}
                        <div className="demo-field">
                          <label>Contract Duration (Months)</label>
                          <input
                            type="number"
                            min="1"
                            value={demoValues.paymentType === 'Annual' ? 1 : (demoValues.contractMonths || 12)}
                            onChange={(e) => handleDemoValueChange('contractMonths', e.target.value)}
                            disabled={demoValues.paymentType === 'Annual'}
                            title={demoValues.paymentType === 'Annual' ? 'Duration is automatically set to 1 for Annual payments' : ''}
                          />
                        </div>

                        {/* Total Income (calculated) */}
                        <div className="demo-field">
                          <label>Total Income</label>
                          <div className="demo-calculated-value">
                            {(() => {
                              const employees = demoValues.numberOfEmployees || 0
                              const costPerEmployee = demoValues.costPerEmployeePerMonth || 0
                              const paymentType = demoValues.paymentType || 'Monthly'
                              const contractMonths = paymentType === 'Annual' ? 1 : (demoValues.contractMonths || 12)
                              const totalIncome = paymentType === 'Annual'
                                ? employees * costPerEmployee * 12
                                : employees * costPerEmployee * contractMonths
                              return formatCurrency(totalIncome)
                            })()}
                          </div>
                        </div>

                        {/* Cost of Sales Section */}
                        <div className="demo-costs-section">
                          <h5>Cost of Sales</h5>
                          <p className="costs-hint">Set when each cost will be paid to calculate GP correctly per period</p>

                          {/* Commission */}
                          <div className="cost-item-row">
                            <div className="cost-amount-field commission-field">
                              <label>Commission %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={demoValues.commissionPercentage || ''}
                                onChange={(e) => handleDemoValueChange('commissionPercentage', e.target.value)}
                                placeholder="%"
                              />
                              <span className="commission-amount">
                                = {(() => {
                                  const employees = demoValues.numberOfEmployees || 0
                                  const costPerEmployee = demoValues.costPerEmployeePerMonth || 0
                                  const paymentType = demoValues.paymentType || 'Monthly'
                                  const contractMonths = paymentType === 'Annual' ? 1 : (demoValues.contractMonths || 12)
                                  const totalIncome = paymentType === 'Annual'
                                    ? employees * costPerEmployee * 12
                                    : employees * costPerEmployee * contractMonths
                                  return formatCurrency((totalIncome * (demoValues.commissionPercentage || 0)) / 100)
                                })()}
                              </span>
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.commissionFrequency || 'With Income'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, commissionFrequency: e.target.value }))}
                              >
                                <option value="With Income">With Income (same as revenue)</option>
                                <option value="Once-off">Once-off (at start)</option>
                              </select>
                            </div>
                          </div>

                          {/* Custom Cost */}
                          <div className="cost-item-row custom-cost-row">
                            <div className="cost-label-field">
                              <label>Custom Cost Label</label>
                              <input
                                type="text"
                                value={demoValues.customCostLabel || ''}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customCostLabel: e.target.value }))}
                                placeholder="e.g., Setup Fee"
                              />
                            </div>
                            <div className="cost-amount-field">
                              <label>Amount</label>
                              <input
                                type="number"
                                value={demoValues.customCost || ''}
                                onChange={(e) => handleDemoValueChange('customCost', e.target.value)}
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>When Paid</label>
                              <select
                                value={demoValues.customCostFrequency || 'Once-off'}
                                onChange={(e) => setDemoValues(prev => ({ ...prev, customCostFrequency: e.target.value }))}
                              >
                                <option value="Once-off">Once-off (at start)</option>
                                <option value="With Income">With Income (same as revenue)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Calculation Result Summary */}
                        <div className="demo-calculation-result">
                          <h5>Calculation Result</h5>
                          {(() => {
                            const result = getDemoResult()
                            if (!result) return <p>No calculation available</p>

                            return (
                              <div className="calc-result-content">
                                <div className="calc-formula">
                                  <span className="formula-label">Formula:</span>
                                  <span className="formula-text">{result.formula}</span>
                                </div>

                                <div className="calc-row">
                                  <div className="calc-item income">
                                    <label>Total Income</label>
                                    <div className="calc-value">{formatCurrency(result.totalIncome)}</div>
                                  </div>
                                  <div className="calc-item costs">
                                    <label>Total Costs</label>
                                    <div className="calc-value negative">-{formatCurrency(result.totalCosts)}</div>
                                  </div>
                                  <div className="calc-item gp">
                                    <label>Gross Profit</label>
                                    <div className={`calc-value ${result.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                                      {formatCurrency(result.grossProfit)}
                                    </div>
                                  </div>
                                </div>

                                {result.certaintyPercentage < 100 && (
                                  <div className="calc-certainty">
                                    <span className="certainty-label">With {result.certaintyPercentage}% certainty:</span>
                                    <span className="certainty-value">{formatCurrency(result.adjustedGP)}</span>
                                  </div>
                                )}

                                {result.monthlyIncome > 0 && (
                                  <div className="calc-monthly">
                                    <label>Monthly Income:</label>
                                    <span className="monthly-value">{formatCurrency(result.monthlyIncome)}</span>
                                  </div>
                                )}

                                <div className="calc-breakdown">
                                  <label>Distribution:</label>
                                  <span className="breakdown-text">{result.distribution}</span>
                                </div>

                                <div className="calc-costs-summary">
                                  <label>Costs Breakdown:</label>
                                  <ul className="costs-list">
                                    {result.commissionAmount > 0 && (
                                      <li>Commission ({demoValues.commissionPercentage}%): {formatCurrency(result.commissionAmount)} ({demoValues.commissionFrequency || 'With Income'})</li>
                                    )}
                                    {(demoValues.customCost || 0) > 0 && (
                                      <li>{demoValues.customCostLabel || 'Custom'}: {formatCurrency(demoValues.customCost)} ({demoValues.customCostFrequency || 'Once-off'})</li>
                                    )}
                                  </ul>
                                </div>

                                <div className="calc-gp-margin">
                                  <label>GP Margin:</label>
                                  <span className={`margin-value ${result.gpMargin >= 0 ? 'positive' : 'negative'}`}>
                                    {result.totalIncome > 0 ? `${result.gpMargin.toFixed(1)}%` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="demo-note">
                    <strong>Note:</strong> This demo shows exactly what salespeople will see when adding a {selectedProduct.config?.name} deal to their forecast.
                  </div>
                </div>
              )}

              {/* Lists Tab */}
              {activeTab === 'lists' && (
                <div className="lists-section">
                  {Object.keys(editingLists).length === 0 ? (
                    <div className="empty-state">
                      <p>No configurable lists for this product type.</p>
                    </div>
                  ) : (
                    Object.entries(editingLists).map(([listKey, options]) => (
                      <div key={listKey} className="list-editor">
                        <h4>{getListDisplayName(listKey)}</h4>
                        <p className="list-hint">These options will appear in dropdown menus for this product</p>

                        <div className="list-items">
                          {options.map((item, index) => {
                            const name = typeof item === 'string' ? item : item.name
                            return (
                              <div key={item.id || index} className="list-item-row">
                                <input
                                  type="text"
                                  value={name || ''}
                                  onChange={(e) => handleListItemChange(listKey, index, e.target.value)}
                                  placeholder="Option name"
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveListItem(listKey, index)}
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary add-item-btn"
                          onClick={() => handleAddListItem(listKey)}
                        >
                          + Add Option
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Costs Tab */}
              {activeTab === 'costs' && (
                <div className="costs-section">
                  {editingCostFields.length === 0 ? (
                    <div className="empty-state">
                      <p>No costing lines configured for this product type.</p>
                    </div>
                  ) : (
                    <div className="cost-fields-list">
                      {editingCostFields.map((field) => (
                        <div key={field.id} className={`cost-field-card ${!field.enabled ? 'disabled' : ''}`}>
                          <div className="cost-field-header">
                            <label className="toggle-label">
                              <input
                                type="checkbox"
                                checked={field.enabled}
                                onChange={() => handleCostFieldToggle(field.id)}
                              />
                              <span className="cost-field-name">{field.name}</span>
                            </label>
                            {field.isPercentage && (
                              <span className="cost-type-badge percentage">Percentage</span>
                            )}
                            {field.hasCustomLabel && (
                              <span className="cost-type-badge custom">Custom Label</span>
                            )}
                          </div>

                          {field.enabled && (
                            <div className="cost-field-options">
                              <div className="cost-field-row">
                                <div className="form-group">
                                  <label>Default {field.isPercentage ? '%' : 'Amount (R)'}</label>
                                  <input
                                    type="number"
                                    value={field.defaultValue || ''}
                                    onChange={(e) => handleCostFieldChange(field.id, 'defaultValue', e.target.value)}
                                    placeholder={field.isPercentage ? '0' : '0.00'}
                                    min="0"
                                    step={field.isPercentage ? '1' : '0.01'}
                                  />
                                </div>

                                {field.hasFrequency && field.frequencyOptions && (
                                  <div className="form-group">
                                    <label>Default Frequency</label>
                                    <select
                                      value={field.defaultFrequency || ''}
                                      onChange={(e) => handleCostFieldChange(field.id, 'defaultFrequency', e.target.value)}
                                    >
                                      {field.frequencyOptions.map(freq => (
                                        <option key={freq} value={freq}>{freq}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                {activeTab === 'demo' ? 'Close' : 'Cancel'}
              </button>
              {activeTab !== 'demo' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
