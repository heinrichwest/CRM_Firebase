/**
 * Dynamic Calculation Modal
 *
 * A template-driven modal that renders calculation fields dynamically
 * based on the calculation template definition.
 */

import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import { getCalculationTemplate } from '../services/calculationTemplateService'
import { getEffectiveListOptions } from '../services/tenantProductConfigService'
import {
  calculateTotal,
  calculateCosts,
  calculateGrossProfit,
  validateFieldValues,
  formatFieldValue
} from '../services/calculationEngine'
import './DynamicCalculationModal.css'

const DynamicCalculationModal = ({
  isOpen,
  onClose,
  onSave,
  product,
  existingData = null,
  fyInfo = null
}) => {
  const { currentTenant } = useTenant()
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Field values state
  const [fieldValues, setFieldValues] = useState({})
  const [costValues, setCostValues] = useState({})

  // Calculation preview
  const [preview, setPreview] = useState(null)

  // List options cache
  const [listOptions, setListOptions] = useState({})

  const tenantId = currentTenant?.id

  useEffect(() => {
    if (isOpen && product?.calculationTemplateId) {
      loadTemplate()
    }
  }, [isOpen, product?.calculationTemplateId])

  useEffect(() => {
    // Recalculate preview when values change
    if (template && Object.keys(fieldValues).length > 0) {
      calculatePreview()
    }
  }, [fieldValues, costValues])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const templateData = await getCalculationTemplate(product.calculationTemplateId)

      if (!templateData) {
        setErrors({ _template: 'Calculation template not found' })
        setLoading(false)
        return
      }

      setTemplate(templateData)

      // Load list options for select fields
      const options = {}
      for (const field of (templateData.fields || [])) {
        if (field.type === 'select' && field.listKey) {
          options[field.listKey] = await getEffectiveListOptions(
            tenantId,
            product.id,
            field.listKey,
            product
          )
        }
      }
      setListOptions(options)

      // Initialize field values
      const initialFieldValues = {}
      const initialCostValues = {}

      // First, apply product defaults
      for (const field of (templateData.fields || [])) {
        if (product?.defaultValues?.[field.id] !== undefined) {
          initialFieldValues[field.id] = product.defaultValues[field.id]
        } else if (field.default !== undefined) {
          initialFieldValues[field.id] = field.default
        } else {
          initialFieldValues[field.id] = ''
        }
      }

      // Initialize cost fields
      for (const costField of (templateData.costFields || [])) {
        initialCostValues[costField.id] = ''
        if (costField.hasFrequency) {
          initialCostValues[`${costField.id}Frequency`] = costField.frequencyOptions?.[0] || 'once-off'
        }
      }

      // Then, apply existing data if editing
      if (existingData) {
        // Map existing data to field values
        for (const field of (templateData.fields || [])) {
          if (existingData[field.id] !== undefined) {
            initialFieldValues[field.id] = existingData[field.id]
          }
        }
        // Map existing cost data
        for (const costField of (templateData.costFields || [])) {
          if (existingData.costs?.[costField.id] !== undefined) {
            initialCostValues[costField.id] = existingData.costs[costField.id].amount || existingData.costs[costField.id]
          }
          if (existingData.costs?.[`${costField.id}Frequency`]) {
            initialCostValues[`${costField.id}Frequency`] = existingData.costs[`${costField.id}Frequency`]
          }
        }
        // Common fields
        if (existingData.certaintyPercentage !== undefined) {
          initialFieldValues.certaintyPercentage = existingData.certaintyPercentage
        }
        if (existingData.startDate) {
          initialFieldValues.startDate = existingData.startDate
        }
        if (existingData.endDate) {
          initialFieldValues.endDate = existingData.endDate
        }
      }

      setFieldValues(initialFieldValues)
      setCostValues(initialCostValues)
      setLoading(false)
    } catch (error) {
      console.error('Error loading template:', error)
      setErrors({ _template: 'Failed to load calculation template' })
      setLoading(false)
    }
  }

  const calculatePreview = async () => {
    try {
      // Calculate income
      const incomeResult = await calculateTotal(
        template.id,
        fieldValues,
        product
      )

      // Calculate costs
      const costsResult = await calculateCosts(
        template.id,
        costValues,
        incomeResult.total
      )

      // Calculate GP
      const gpResult = calculateGrossProfit(incomeResult.total, costsResult.totalCost)

      // Apply certainty if applicable
      const certainty = Number(fieldValues.certaintyPercentage) || 100
      const adjustedIncome = incomeResult.total * (certainty / 100)
      const adjustedGP = calculateGrossProfit(adjustedIncome, costsResult.totalCost)

      setPreview({
        income: incomeResult.total,
        adjustedIncome,
        costs: costsResult.totalCost,
        grossProfit: adjustedGP.grossProfit,
        gpPercentage: adjustedGP.gpPercentage,
        certainty,
        breakdown: incomeResult.breakdown
      })
    } catch (error) {
      console.error('Error calculating preview:', error)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  const handleCostChange = (costId, value) => {
    setCostValues(prev => ({ ...prev, [costId]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate
      const validation = await validateFieldValues(template.id, fieldValues)
      if (!validation.isValid) {
        setErrors(validation.errors)
        setSaving(false)
        return
      }

      // Build the data object to save
      const dataToSave = {
        productId: product.id,
        productName: product.name,
        calculationTemplateId: template.id,
        calculationTemplateName: template.name,
        ...fieldValues,
        costs: {},
        calculationResult: preview
      }

      // Add cost values
      for (const costField of (template.costFields || [])) {
        dataToSave.costs[costField.id] = {
          amount: Number(costValues[costField.id]) || 0,
          frequency: costValues[`${costField.id}Frequency`] || 'once-off'
        }
      }

      // Call the onSave callback
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Error saving calculation:', error)
      setErrors({ _save: 'Failed to save calculation' })
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field) => {
    const value = fieldValues[field.id]
    const error = errors[field.id]

    switch (field.type) {
      case 'number':
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              placeholder={field.helpText}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        )

      case 'currency':
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="currency-input">
              <span className="currency-prefix">R</span>
              <input
                type="number"
                id={field.id}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                min={0}
                placeholder="0"
              />
            </div>
            {error && <span className="field-error">{error}</span>}
          </div>
        )

      case 'percentage':
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="percentage-input">
              <input
                type="number"
                id={field.id}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                min={0}
                max={100}
                placeholder="0"
              />
              <span className="percentage-suffix">%</span>
            </div>
            {error && <span className="field-error">{error}</span>}
          </div>
        )

      case 'select':
        const options = listOptions[field.listKey] || []
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <select
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            >
              <option value="">Select {field.name}...</option>
              {options.map(opt => (
                <option key={opt.id || opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
            {error && <span className="field-error">{error}</span>}
          </div>
        )

      case 'date':
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="date"
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        )

      case 'text':
      default:
        return (
          <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              type="text"
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.helpText}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        )
    }
  }

  const renderCostField = (costField) => {
    const value = costValues[costField.id]
    const frequency = costValues[`${costField.id}Frequency`]

    return (
      <div key={costField.id} className="cost-field">
        <div className="cost-field-main">
          <label htmlFor={costField.id}>{costField.name}</label>
          <div className="currency-input">
            <span className="currency-prefix">R</span>
            <input
              type="number"
              id={costField.id}
              value={value || ''}
              onChange={(e) => handleCostChange(costField.id, e.target.value)}
              min={0}
              placeholder="0"
            />
          </div>
        </div>
        {costField.hasFrequency && (
          <div className="cost-field-frequency">
            <label htmlFor={`${costField.id}Frequency`}>When Paid</label>
            <select
              id={`${costField.id}Frequency`}
              value={frequency || ''}
              onChange={(e) => handleCostChange(`${costField.id}Frequency`, e.target.value)}
            >
              {(costField.frequencyOptions || ['Once-off', 'Monthly', 'With Income', 'End of Program']).map(opt => (
                <option key={opt} value={opt.toLowerCase().replace(/\s+/g, '-')}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`dynamic-calculation-modal ${template?.modalWidth === 'wide' ? 'wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{product?.name || 'Calculation'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Loading calculation template...</div>
          ) : errors._template ? (
            <div className="modal-error">{errors._template}</div>
          ) : (
            <>
              {/* Input Fields Section */}
              <div className="form-section">
                <h3>Calculation Details</h3>
                <div className="form-grid">
                  {(template?.fields || []).map(field => renderField(field))}

                  {/* Common fields if template supports them */}
                  {template?.hasCertaintyPercentage && (
                    <div className="form-field">
                      <label htmlFor="certaintyPercentage">
                        Certainty Percentage
                      </label>
                      <div className="percentage-input">
                        <input
                          type="number"
                          id="certaintyPercentage"
                          value={fieldValues.certaintyPercentage || 100}
                          onChange={(e) => handleFieldChange('certaintyPercentage', e.target.value)}
                          min={0}
                          max={100}
                        />
                        <span className="percentage-suffix">%</span>
                      </div>
                    </div>
                  )}

                  {template?.hasContractDuration && !template.fields?.find(f => f.id === 'duration') && (
                    <div className="form-field">
                      <label htmlFor="duration">Contract Duration (months)</label>
                      <input
                        type="number"
                        id="duration"
                        value={fieldValues.duration || 12}
                        onChange={(e) => handleFieldChange('duration', e.target.value)}
                        min={1}
                        max={60}
                      />
                    </div>
                  )}

                  {template?.distributionType === 'monthly' && (
                    <>
                      <div className="form-field">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                          type="date"
                          id="startDate"
                          value={fieldValues.startDate || ''}
                          onChange={(e) => handleFieldChange('startDate', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="endDate">End Date</label>
                        <input
                          type="date"
                          id="endDate"
                          value={fieldValues.endDate || ''}
                          onChange={(e) => handleFieldChange('endDate', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cost Fields Section */}
              {(template?.costFields?.length > 0) && (
                <div className="form-section">
                  <h3>Costs</h3>
                  <div className="costs-grid">
                    {(template.costFields || []).map(costField => renderCostField(costField))}
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {template?.showBreakdownPreview && preview && (
                <div className="form-section preview-section">
                  <h3>Calculation Preview</h3>
                  <div className="preview-grid">
                    <div className="preview-item">
                      <span className="preview-label">Total Income</span>
                      <span className="preview-value income">
                        {formatFieldValue({ type: 'currency' }, preview.income)}
                      </span>
                    </div>
                    {preview.certainty < 100 && (
                      <div className="preview-item">
                        <span className="preview-label">
                          Adjusted Income ({preview.certainty}% certainty)
                        </span>
                        <span className="preview-value income">
                          {formatFieldValue({ type: 'currency' }, preview.adjustedIncome)}
                        </span>
                      </div>
                    )}
                    <div className="preview-item">
                      <span className="preview-label">Total Costs</span>
                      <span className="preview-value costs">
                        {formatFieldValue({ type: 'currency' }, preview.costs)}
                      </span>
                    </div>
                    <div className="preview-item highlight">
                      <span className="preview-label">Gross Profit</span>
                      <span className={`preview-value gp ${preview.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                        {formatFieldValue({ type: 'currency' }, preview.grossProfit)}
                        <small>({preview.gpPercentage.toFixed(1)}%)</small>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {errors._save && (
                <div className="form-error">{errors._save}</div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || saving || errors._template}
          >
            {saving ? 'Saving...' : existingData ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DynamicCalculationModal
