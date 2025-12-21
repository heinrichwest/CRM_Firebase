import { useState, useEffect } from 'react'
import './DealEditorForm.css'

// Product configuration matching ProductManagement.jsx
const PRODUCT_CONFIG = {
  learnerships: {
    name: 'Learnerships',
    fields: {
      dealName: { label: 'Deal Name', type: 'text', required: true },
      certaintyPercentage: { label: 'Certainty %', type: 'number', min: 0, max: 100, default: 80 },
      description: { label: 'Description', type: 'text' },
      fundingType: { label: 'Funding Type', type: 'select', options: ['SETA', 'Self-funded', 'Mixed'] },
      learnerCount: { label: 'Number of Learners', type: 'number', min: 0, required: true },
      costPerLearner: { label: 'Cost per Learner (R)', type: 'number', min: 0, required: true },
      paymentStartDate: { label: 'Payment Start Date', type: 'date', required: true },
      paymentFrequency: { label: 'Payment Frequency', type: 'select', options: ['Monthly', 'Once-off', 'Annual'] },
      paymentMonths: { label: 'Payment Months', type: 'number', min: 1, max: 36, default: 12 }
    },
    costFields: {
      facilitatorCost: { label: 'Facilitator Cost', type: 'number', min: 0, default: 0 },
      commissionPercentage: { label: 'Commission %', type: 'number', min: 0, max: 100, default: 5 },
      travelCost: { label: 'Travel Cost', type: 'number', min: 0, default: 0 },
      assessorCost: { label: 'Assessor Cost', type: 'number', min: 0, default: 0 },
      moderatorCost: { label: 'Moderator Cost', type: 'number', min: 0, default: 0 },
      otherCost: { label: 'Other Cost', type: 'number', min: 0, default: 0 },
      customLabel: { label: 'Custom Cost Label', type: 'text' },
      customCost: { label: 'Custom Cost Amount', type: 'number', min: 0, default: 0 }
    }
  },
  compliance: {
    name: 'Compliance',
    fields: {
      dealName: { label: 'Deal Name', type: 'text', required: true },
      certaintyPercentage: { label: 'Certainty %', type: 'number', min: 0, max: 100, default: 100 },
      description: { label: 'Description', type: 'text' },
      courseName: { label: 'Course Name', type: 'select', options: ['First Aid Level 1', 'First Aid Level 2', 'Fire Safety', 'OHS Representative', 'Custom'] },
      customCourseName: { label: 'Custom Course Name', type: 'text' },
      trainingDate: { label: 'Training Date', type: 'date', required: true },
      numberOfTrainees: { label: 'Number of Trainees', type: 'number', min: 0, required: true },
      pricePerPerson: { label: 'Price per Person (R)', type: 'number', min: 0, required: true }
    },
    costFields: {
      commissionPercentage: { label: 'Commission %', type: 'number', min: 0, max: 100, default: 5 },
      travelCost: { label: 'Travel Cost', type: 'number', min: 0, default: 0 },
      manualsCost: { label: 'Manuals Cost', type: 'number', min: 0, default: 0 },
      accommodationCost: { label: 'Accommodation Cost', type: 'number', min: 0, default: 0 },
      accreditationCost: { label: 'Accreditation Cost', type: 'number', min: 0, default: 0 },
      customCostLabel: { label: 'Custom Cost Label', type: 'text' },
      customCost: { label: 'Custom Cost Amount', type: 'number', min: 0, default: 0 }
    }
  },
  otherCourses: {
    name: 'Other Courses',
    fields: {
      dealName: { label: 'Deal Name', type: 'text', required: true },
      certaintyPercentage: { label: 'Certainty %', type: 'number', min: 0, max: 100, default: 80 },
      description: { label: 'Description', type: 'text' },
      courseName: { label: 'Course Name', type: 'text', required: true },
      trainingDate: { label: 'Training Date', type: 'date', required: true },
      numberOfTrainees: { label: 'Number of Trainees', type: 'number', min: 0, required: true },
      pricePerPerson: { label: 'Price per Person (R)', type: 'number', min: 0, required: true }
    },
    costFields: {
      commissionPercentage: { label: 'Commission %', type: 'number', min: 0, max: 100, default: 5 },
      travelCost: { label: 'Travel Cost', type: 'number', min: 0, default: 0 },
      manualsCost: { label: 'Manuals Cost', type: 'number', min: 0, default: 0 },
      accommodationCost: { label: 'Accommodation Cost', type: 'number', min: 0, default: 0 },
      accreditationCost: { label: 'Accreditation Cost', type: 'number', min: 0, default: 0 },
      customCostLabel: { label: 'Custom Cost Label', type: 'text' },
      customCost: { label: 'Custom Cost Amount', type: 'number', min: 0, default: 0 }
    }
  },
  tapBusiness: {
    name: 'TAP Business',
    fields: {
      dealName: { label: 'Deal Name', type: 'text', required: true },
      certaintyPercentage: { label: 'Certainty %', type: 'number', min: 0, max: 100, default: 90 },
      description: { label: 'Description', type: 'text' },
      numberOfEmployees: { label: 'Number of Employees', type: 'number', min: 0, required: true },
      costPerEmployeePerMonth: { label: 'Cost per Employee per Month (R)', type: 'number', min: 0, required: true },
      paymentType: { label: 'Payment Type', type: 'select', options: ['Monthly', 'Annual'] },
      paymentStartDate: { label: 'Payment Start Date', type: 'date', required: true },
      contractMonths: { label: 'Contract Months', type: 'number', min: 1, max: 36, default: 12 }
    },
    costFields: {
      commissionPercentage: { label: 'Commission %', type: 'number', min: 0, max: 100, default: 5 },
      customCostLabel: { label: 'Custom Cost Label', type: 'text' },
      customCost: { label: 'Custom Cost Amount', type: 'number', min: 0, default: 0 }
    }
  }
}

const COST_FREQUENCIES = ['Once-off', 'Monthly', 'With Income', 'End of Learnership', 'Annual']

const DealEditorForm = ({ productType, deal, onSave, onCancel }) => {
  const config = PRODUCT_CONFIG[productType]
  const [formValues, setFormValues] = useState({})
  const [costFrequencies, setCostFrequencies] = useState({})
  const [calculation, setCalculation] = useState(null)

  useEffect(() => {
    // Initialize form with existing deal data or defaults
    const initialValues = {}
    const initialFrequencies = {}

    // Set basic fields
    Object.keys(config.fields).forEach(key => {
      const fieldConfig = config.fields[key]
      if (deal && deal.values && deal.values[key] !== undefined) {
        initialValues[key] = deal.values[key]
      } else if (fieldConfig.default !== undefined) {
        initialValues[key] = fieldConfig.default
      } else if (fieldConfig.type === 'date') {
        initialValues[key] = new Date().toISOString().split('T')[0]
      } else if (fieldConfig.type === 'number') {
        initialValues[key] = 0
      } else {
        initialValues[key] = ''
      }
    })

    // Set cost fields
    Object.keys(config.costFields).forEach(key => {
      const fieldConfig = config.costFields[key]
      if (deal && deal.values && deal.values[key] !== undefined) {
        initialValues[key] = deal.values[key]
      } else if (fieldConfig.default !== undefined) {
        initialValues[key] = fieldConfig.default
      } else if (fieldConfig.type === 'number') {
        initialValues[key] = 0
      } else {
        initialValues[key] = ''
      }

      // Set frequency for cost fields (except percentages)
      if (key.includes('Cost') && !key.includes('Percentage')) {
        const freqKey = `${key}Frequency`
        if (deal && deal.values && deal.values[freqKey]) {
          initialFrequencies[key] = deal.values[freqKey]
        } else {
          initialFrequencies[key] = 'Once-off'
        }
      } else if (key === 'commissionPercentage') {
        const freqKey = 'commissionFrequency'
        if (deal && deal.values && deal.values[freqKey]) {
          initialFrequencies['commission'] = deal.values[freqKey]
        } else {
          initialFrequencies['commission'] = 'With Income'
        }
      }
    })

    setFormValues(initialValues)
    setCostFrequencies(initialFrequencies)
  }, [productType, deal])

  useEffect(() => {
    // Recalculate whenever form values change
    if (Object.keys(formValues).length > 0) {
      calculateDeal()
    }
  }, [formValues, costFrequencies])

  const handleFieldChange = (fieldName, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleFrequencyChange = (costField, frequency) => {
    setCostFrequencies(prev => ({
      ...prev,
      [costField]: frequency
    }))
  }

  const calculateDeal = () => {
    let totalIncome = 0
    let totalCosts = 0
    let monthlyIncome = 0
    let formula = ''
    let distribution = ''

    // Calculate based on product type
    switch (productType) {
      case 'learnerships':
        totalIncome = (formValues.learnerCount || 0) * (formValues.costPerLearner || 0)
        const commissionAmount = (totalIncome * (formValues.commissionPercentage || 0)) / 100
        totalCosts = commissionAmount +
          (formValues.facilitatorCost || 0) +
          (formValues.travelCost || 0) +
          (formValues.assessorCost || 0) +
          (formValues.moderatorCost || 0) +
          (formValues.otherCost || 0) +
          (formValues.customCost || 0)
        monthlyIncome = totalIncome / (formValues.paymentMonths || 12)
        formula = `${formValues.learnerCount || 0} learners × R${(formValues.costPerLearner || 0).toLocaleString()} = Total Income`
        distribution = formValues.paymentFrequency === 'Once-off'
          ? `Once-off payment starting ${formValues.paymentStartDate || 'TBD'}`
          : `R${monthlyIncome.toLocaleString()}/month over ${formValues.paymentMonths || 12} months`
        break

      case 'compliance':
      case 'otherCourses':
        totalIncome = (formValues.numberOfTrainees || 0) * (formValues.pricePerPerson || 0)
        const compCommission = (totalIncome * (formValues.commissionPercentage || 0)) / 100
        totalCosts = compCommission +
          (formValues.travelCost || 0) +
          (formValues.manualsCost || 0) +
          (formValues.accommodationCost || 0) +
          (formValues.accreditationCost || 0) +
          (formValues.customCost || 0)
        formula = `${formValues.numberOfTrainees || 0} trainees × R${(formValues.pricePerPerson || 0).toLocaleString()} = Total Income`
        distribution = `Once-off payment on training date: ${formValues.trainingDate || 'TBD'}`
        break

      case 'tapBusiness':
        const employees = formValues.numberOfEmployees || 0
        const costPerEmployee = formValues.costPerEmployeePerMonth || 0
        const paymentType = formValues.paymentType || 'Monthly'
        const contractMonths = paymentType === 'Annual' ? 1 : (formValues.contractMonths || 12)

        if (paymentType === 'Annual') {
          totalIncome = employees * costPerEmployee * 12
        } else {
          totalIncome = employees * costPerEmployee * contractMonths
        }

        monthlyIncome = employees * costPerEmployee
        const tapCommission = (totalIncome * (formValues.commissionPercentage || 0)) / 100
        totalCosts = tapCommission + (formValues.customCost || 0)
        formula = paymentType === 'Annual'
          ? `${employees} employees × R${costPerEmployee.toLocaleString()}/month × 12 months (Annual)`
          : `${employees} employees × R${costPerEmployee.toLocaleString()}/month × ${contractMonths} months`
        distribution = paymentType === 'Annual'
          ? `Annual payment starting ${formValues.paymentStartDate || 'TBD'}`
          : `Monthly payments of R${monthlyIncome.toLocaleString()}/month over ${contractMonths} months`
        break
    }

    const grossProfit = totalIncome - totalCosts
    const certainty = formValues.certaintyPercentage ?? 100
    const adjustedGP = grossProfit * (certainty / 100)
    const gpMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

    setCalculation({
      totalIncome,
      totalCosts,
      grossProfit,
      adjustedGP,
      gpMargin,
      certaintyPercentage: certainty,
      monthlyIncome,
      formula,
      distribution
    })
  }

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'R 0'
    return `R ${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate required fields
    const missingFields = []
    Object.entries(config.fields).forEach(([key, fieldConfig]) => {
      if (fieldConfig.required && !formValues[key]) {
        missingFields.push(fieldConfig.label)
      }
    })

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`)
      return
    }

    // Combine values with frequencies
    const allValues = { ...formValues }
    Object.entries(costFrequencies).forEach(([costField, frequency]) => {
      if (costField === 'commission') {
        allValues['commissionFrequency'] = frequency
      } else {
        allValues[`${costField}Frequency`] = frequency
      }
    })

    // Create deal data structure
    const dealData = {
      id: deal?.id || `deal-${Date.now()}`,
      productType,
      dealName: formValues.dealName,
      values: allValues,
      calculation,
      isNew: deal?.isNew || false
    }

    onSave(dealData)
  }

  const renderField = (fieldName, fieldConfig) => {
    const value = formValues[fieldName] || ''

    switch (fieldConfig.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldConfig.required}
          >
            <option value="">Select...</option>
            {fieldConfig.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value) || 0)}
            min={fieldConfig.min}
            max={fieldConfig.max}
            step={fieldConfig.step || 0.01}
            required={fieldConfig.required}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldConfig.required}
          />
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldConfig.required}
          />
        )
    }
  }

  return (
    <div className="deal-editor-form">
      <div className="form-header">
        <h3>{deal?.isNew ? 'Add New Deal' : 'Edit Deal'} - {config.name}</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-body">
          {/* Basic Fields */}
          <div className="form-section">
            <h4>Deal Information</h4>
            <div className="form-grid">
              {Object.entries(config.fields).map(([fieldName, fieldConfig]) => (
                <div key={fieldName} className="form-field">
                  <label>
                    {fieldConfig.label}
                    {fieldConfig.required && <span className="required">*</span>}
                  </label>
                  {renderField(fieldName, fieldConfig)}
                </div>
              ))}
            </div>
          </div>

          {/* Cost of Sales */}
          <div className="form-section">
            <h4>Cost of Sales</h4>
            <div className="cost-fields">
              {Object.entries(config.costFields).map(([fieldName, fieldConfig]) => {
                const isCostField = fieldName.includes('Cost') && !fieldName.includes('Percentage')
                const isCommission = fieldName === 'commissionPercentage'
                const showFrequency = isCostField || isCommission

                return (
                  <div key={fieldName} className="cost-field-row">
                    <div className="cost-field">
                      <label>{fieldConfig.label}</label>
                      {renderField(fieldName, fieldConfig)}
                    </div>
                    {showFrequency && (
                      <div className="frequency-field">
                        <label>Frequency</label>
                        <select
                          value={costFrequencies[isCommission ? 'commission' : fieldName] || 'Once-off'}
                          onChange={(e) => handleFrequencyChange(isCommission ? 'commission' : fieldName, e.target.value)}
                        >
                          {COST_FREQUENCIES.map(freq => (
                            <option key={freq} value={freq}>{freq}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Calculation Preview */}
          {calculation && (
            <div className="form-section calculation-preview">
              <h4>Calculation Preview</h4>
              <div className="preview-content">
                <div className="preview-formula">
                  <strong>Formula:</strong> {calculation.formula}
                </div>
                <div className="preview-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Total Income:</span>
                    <span className="metric-value">{formatCurrency(calculation.totalIncome)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Total Costs:</span>
                    <span className="metric-value">{formatCurrency(calculation.totalCosts)}</span>
                  </div>
                  <div className="metric-item highlight">
                    <span className="metric-label">Gross Profit:</span>
                    <span className="metric-value profit">{formatCurrency(calculation.grossProfit)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">GP Margin:</span>
                    <span className="metric-value">{calculation.gpMargin.toFixed(2)}%</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Certainty:</span>
                    <span className="metric-value">{calculation.certaintyPercentage}%</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Adjusted GP:</span>
                    <span className="metric-value">{formatCurrency(calculation.adjustedGP)}</span>
                  </div>
                </div>
                <div className="preview-distribution">
                  <strong>Distribution:</strong> {calculation.distribution}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-footer">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="save-btn">
            Save Deal
          </button>
        </div>
      </form>
    </div>
  )
}

export default DealEditorForm
