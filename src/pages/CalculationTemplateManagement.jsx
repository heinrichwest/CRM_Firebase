import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  getCalculationTemplates,
  getCalculationTemplate,
  createCalculationTemplateWithId,
  updateCalculationTemplate,
  archiveCalculationTemplate,
  initializeCalculationTemplates,
  DEFAULT_CALCULATION_TEMPLATES,
  calculateTemplateTotal,
  calculateTemplateCosts
} from '../services/calculationTemplateService'
import './CalculationTemplateManagement.css'

const CalculationTemplateManagement = () => {
  const { isSystemAdmin } = useTenant()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewValues, setPreviewValues] = useState({})
  const [previewCostValues, setPreviewCostValues] = useState({})
  const [initMessage, setInitMessage] = useState('')

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    status: 'active',
    version: '1.0',
    fields: [],
    costFields: [],
    formula: { type: 'simple', expression: '', description: '' },
    distributionType: 'once-off',
    hasPaymentFrequency: false,
    hasCertaintyPercentage: true,
    hasContractDuration: false,
    modalWidth: 'standard',
    showBreakdownPreview: true,
    systemLists: {},
    defaultCustomLists: {}
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templatesData = await getCalculationTemplates()
      setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeDefaults = async () => {
    if (!window.confirm('This will create the default calculation templates. Continue?')) {
      return
    }

    try {
      setSaving(true)
      const count = await initializeCalculationTemplates()
      await loadTemplates()
      setInitMessage(`Successfully initialized ${count} calculation templates!`)
      setTimeout(() => setInitMessage(''), 5000)
    } catch (error) {
      console.error('Error initializing templates:', error)
      setInitMessage('Failed to initialize templates. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleViewTemplate = async (templateId) => {
    try {
      const template = await getCalculationTemplate(templateId)
      setSelectedTemplate(template)
      setActiveTab('view')

      // Initialize preview values with defaults
      const values = {}
      const costVals = {}
      if (template.fields) {
        template.fields.forEach(field => {
          values[field.id] = field.default || ''
        })
      }
      if (template.costFields) {
        template.costFields.forEach(cost => {
          costVals[cost.id] = 0
          if (cost.hasFrequency) {
            costVals[`${cost.id}Frequency`] = cost.frequencyOptions?.[0] || 'Once-off'
          }
        })
      }
      setPreviewValues(values)
      setPreviewCostValues(costVals)
    } catch (error) {
      console.error('Error viewing template:', error)
    }
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name || '',
      description: template.description || '',
      status: template.status || 'active',
      version: template.version || '1.0',
      fields: template.fields || [],
      costFields: template.costFields || [],
      formula: template.formula || { type: 'simple', expression: '', description: '' },
      distributionType: template.distributionType || 'once-off',
      hasPaymentFrequency: template.hasPaymentFrequency || false,
      hasCertaintyPercentage: template.hasCertaintyPercentage !== false,
      hasContractDuration: template.hasContractDuration || false,
      modalWidth: template.modalWidth || 'standard',
      showBreakdownPreview: template.showBreakdownPreview !== false,
      systemLists: template.systemLists || {},
      defaultCustomLists: template.defaultCustomLists || {}
    })
    setActiveTab('edit')
  }

  const handleArchiveTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to archive this template? It will no longer be available for new products.')) {
      return
    }

    try {
      setSaving(true)
      await archiveCalculationTemplate(templateId)
      await loadTemplates()
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
        setActiveTab('list')
      }
    } catch (error) {
      console.error('Error archiving template:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      alert('Template name is required')
      return
    }

    try {
      setSaving(true)

      if (editingTemplate) {
        await updateCalculationTemplate(editingTemplate.id, templateForm)
      } else {
        const templateId = templateForm.name.toLowerCase().replace(/\s+/g, '-')
        await createCalculationTemplateWithId(templateId, templateForm)
      }

      await loadTemplates()
      setActiveTab('list')
      setEditingTemplate(null)
      setInitMessage('Template saved successfully!')
      setTimeout(() => setInitMessage(''), 3000)
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewChange = (fieldId, value) => {
    setPreviewValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleCostPreviewChange = (fieldId, value) => {
    setPreviewCostValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const getCalculatedPreviewTotal = () => {
    if (!selectedTemplate) return 0
    return calculateTemplateTotal(selectedTemplate, previewValues)
  }

  const getCalculatedCosts = () => {
    if (!selectedTemplate) return { totalCosts: 0, breakdown: {} }
    const total = getCalculatedPreviewTotal()
    return calculateTemplateCosts(selectedTemplate, previewCostValues, total)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const getFieldTypeLabel = (type) => {
    const labels = {
      text: 'Text',
      number: 'Number',
      currency: 'Currency (R)',
      percentage: 'Percentage (%)',
      date: 'Date',
      select: 'Dropdown List'
    }
    return labels[type] || type
  }

  // Check access
  if (!isSystemAdmin) {
    return (
      <div className="calculation-template-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Only system administrators can manage calculation templates.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-loading">
        Loading calculation templates...
      </div>
    )
  }

  return (
    <div className="calculation-template-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Calculation Templates</h1>
          <p>Define calculation methods that can be used by products across all tenants</p>
        </div>
        <div className="header-actions">
          {templates.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={handleInitializeDefaults}
              disabled={saving}
            >
              {saving ? 'Initializing...' : 'Initialize Default Templates'}
            </button>
          )}
        </div>
      </div>

      {initMessage && (
        <div className={`init-message ${initMessage.includes('Failed') ? 'error' : 'success'}`}>
          {initMessage}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          All Templates
        </button>
        {selectedTemplate && (
          <button
            className={`tab ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            View: {selectedTemplate.name}
          </button>
        )}
        {editingTemplate && (
          <button
            className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            Edit: {editingTemplate.name}
          </button>
        )}
      </div>

      {/* Templates List */}
      {activeTab === 'list' && (
        <div className="tab-content">
          {templates.length === 0 ? (
            <div className="empty-state">
              <h3>No Calculation Templates</h3>
              <p>Click "Initialize Default Templates" to create the standard templates, or create a new template manually.</p>
            </div>
          ) : (
            <div className="templates-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`template-card ${template.status === 'archived' ? 'archived' : ''}`}
                >
                  <div className="template-card-header">
                    <h3>{template.name}</h3>
                    <span className={`status-badge ${template.status}`}>
                      {template.status}
                    </span>
                  </div>
                  <p className="template-description">
                    {template.description || 'No description'}
                  </p>
                  <div className="template-meta">
                    <span className="meta-item">
                      <strong>Version:</strong> {template.version || '1.0'}
                    </span>
                    <span className="meta-item">
                      <strong>Distribution:</strong> {template.distributionType || 'once-off'}
                    </span>
                    <span className="meta-item">
                      <strong>Fields:</strong> {template.fields?.length || 0}
                    </span>
                    <span className="meta-item">
                      <strong>Cost Items:</strong> {template.costFields?.length || 0}
                    </span>
                  </div>
                  <div className="template-formula">
                    <strong>Formula:</strong> {template.formula?.description || template.formula?.expression || 'Not defined'}
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewTemplate(template.id)}
                    >
                      View & Test
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit
                    </button>
                    {template.status !== 'archived' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleArchiveTemplate(template.id)}
                        disabled={saving}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Template */}
      {activeTab === 'view' && selectedTemplate && (
        <div className="tab-content">
          <div className="template-view">
            <div className="view-header">
              <h2>{selectedTemplate.name}</h2>
              <div className="view-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Hide Preview' : 'Show Calculation Preview'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEditTemplate(selectedTemplate)}
                >
                  Edit Template
                </button>
              </div>
            </div>

            <div className="template-details">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Description</label>
                    <p>{selectedTemplate.description || 'No description'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Version</label>
                    <p>{selectedTemplate.version}</p>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <p><span className={`status-badge ${selectedTemplate.status}`}>{selectedTemplate.status}</span></p>
                  </div>
                  <div className="detail-item">
                    <label>Distribution Type</label>
                    <p>{selectedTemplate.distributionType}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Input Fields ({selectedTemplate.fields?.length || 0})</h3>
                <table className="fields-table">
                  <thead>
                    <tr>
                      <th>Field ID</th>
                      <th>Display Name</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Default</th>
                      <th>List Key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTemplate.fields?.map(field => (
                      <tr key={field.id}>
                        <td><code>{field.id}</code></td>
                        <td>{field.name}</td>
                        <td>{getFieldTypeLabel(field.type)}</td>
                        <td>{field.required ? 'Yes' : 'No'}</td>
                        <td>{field.default !== undefined ? String(field.default) : '-'}</td>
                        <td>{field.listKey ? <code>{field.listKey}</code> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="detail-section">
                <h3>Cost Fields ({selectedTemplate.costFields?.length || 0})</h3>
                <table className="fields-table">
                  <thead>
                    <tr>
                      <th>Field ID</th>
                      <th>Display Name</th>
                      <th>Type</th>
                      <th>Has Frequency</th>
                      <th>Is Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTemplate.costFields?.map(field => (
                      <tr key={field.id}>
                        <td><code>{field.id}</code></td>
                        <td>{field.name}</td>
                        <td>{getFieldTypeLabel(field.type)}</td>
                        <td>{field.hasFrequency ? 'Yes' : 'No'}</td>
                        <td>{field.isPercentage ? `Yes (of ${field.percentageOf})` : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="detail-section">
                <h3>Formula</h3>
                <div className="formula-display">
                  <div className="formula-expression">
                    <label>Expression:</label>
                    <code>{selectedTemplate.formula?.expression}</code>
                  </div>
                  <div className="formula-description">
                    <label>Description:</label>
                    <p>{selectedTemplate.formula?.description}</p>
                  </div>
                </div>
              </div>

              {(Object.keys(selectedTemplate.systemLists || {}).length > 0 ||
                Object.keys(selectedTemplate.defaultCustomLists || {}).length > 0) && (
                  <div className="detail-section">
                    <h3>Lists</h3>
                    {Object.entries(selectedTemplate.systemLists || {}).map(([key, options]) => (
                      <div key={key} className="list-display">
                        <label>{key} <span className="list-type">(System - Read Only)</span></label>
                        <ul>
                          {options.map(opt => (
                            <li key={opt.id}>{opt.name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {Object.entries(selectedTemplate.defaultCustomLists || {}).map(([key, options]) => (
                      <div key={key} className="list-display">
                        <label>{key} <span className="list-type">(Tenant Configurable)</span></label>
                        <ul>
                          {options.map(opt => (
                            <li key={opt.id}>{opt.name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Calculation Preview */}
            {showPreview && (
              <div className="calculation-preview">
                <h3>Calculation Preview</h3>
                <p className="preview-description">
                  Test the calculation by entering values below. This shows how the calculation modal will work.
                </p>

                <div className="preview-grid">
                  <div className="preview-inputs">
                    <h4>Input Values</h4>
                    {selectedTemplate.fields?.map(field => (
                      <div key={field.id} className="preview-field">
                        <label>{field.name} {field.required && <span className="required">*</span>}</label>
                        {field.type === 'select' ? (
                          <select
                            value={previewValues[field.id] || ''}
                            onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                          >
                            <option value="">Select...</option>
                            {(selectedTemplate.defaultCustomLists?.[field.listKey] ||
                              selectedTemplate.systemLists?.[field.listKey] || []).map(opt => (
                                <option key={opt.id} value={opt.value}>{opt.name}</option>
                              ))}
                          </select>
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={previewValues[field.id] || ''}
                            onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                          />
                        ) : (
                          <input
                            type={field.type === 'currency' || field.type === 'number' || field.type === 'percentage' ? 'number' : 'text'}
                            value={previewValues[field.id] || ''}
                            onChange={(e) => handlePreviewChange(field.id, e.target.value)}
                            placeholder={field.helpText}
                          />
                        )}
                      </div>
                    ))}

                    <h4>Cost Values</h4>
                    {selectedTemplate.costFields?.map(field => (
                      <div key={field.id} className="preview-field">
                        <label>{field.name}</label>
                        <div className="cost-field-row">
                          <input
                            type="number"
                            value={previewCostValues[field.id] || ''}
                            onChange={(e) => handleCostPreviewChange(field.id, e.target.value)}
                            placeholder={field.isPercentage ? '%' : 'R'}
                          />
                          {field.hasFrequency && (
                            <select
                              value={previewCostValues[`${field.id}Frequency`] || ''}
                              onChange={(e) => handleCostPreviewChange(`${field.id}Frequency`, e.target.value)}
                            >
                              {field.frequencyOptions?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="preview-results">
                    <h4>Calculated Results</h4>
                    <div className="result-card">
                      <label>Total Income</label>
                      <span className="result-value income">
                        {formatCurrency(getCalculatedPreviewTotal())}
                      </span>
                    </div>
                    <div className="result-card">
                      <label>Total Costs</label>
                      <span className="result-value costs">
                        {formatCurrency(getCalculatedCosts().totalCosts)}
                      </span>
                    </div>
                    <div className="result-card highlight">
                      <label>Gross Profit</label>
                      <span className="result-value profit">
                        {formatCurrency(getCalculatedPreviewTotal() - getCalculatedCosts().totalCosts)}
                      </span>
                    </div>

                    {Object.keys(getCalculatedCosts().breakdown).length > 0 && (
                      <div className="costs-breakdown">
                        <h5>Cost Breakdown</h5>
                        {Object.entries(getCalculatedCosts().breakdown).map(([key, cost]) => (
                          <div key={key} className="breakdown-item">
                            <span>{cost.label}</span>
                            <span>{formatCurrency(cost.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Template */}
      {activeTab === 'edit' && (
        <div className="tab-content">
          <div className="template-editor">
            <div className="editor-header">
              <h2>{editingTemplate ? `Edit: ${editingTemplate.name}` : 'New Template'}</h2>
              <div className="editor-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setActiveTab('list')
                    setEditingTemplate(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveTemplate}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>

            <div className="editor-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Template Name *</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Consulting Service"
                    />
                  </div>
                  <div className="form-group">
                    <label>Version</label>
                    <input
                      type="text"
                      value={templateForm.version}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="1.0"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe when this calculation template should be used"
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Calculation Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Distribution Type</label>
                    <select
                      value={templateForm.distributionType}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, distributionType: e.target.value }))}
                    >
                      <option value="once-off">Once-off (single payment)</option>
                      <option value="monthly">Monthly (distributed over time)</option>
                      <option value="annual">Annual (yearly payments)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Modal Width</label>
                    <select
                      value={templateForm.modalWidth}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, modalWidth: e.target.value }))}
                    >
                      <option value="standard">Standard</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={templateForm.hasCertaintyPercentage}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, hasCertaintyPercentage: e.target.checked }))}
                      />
                      Include Certainty Percentage
                    </label>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={templateForm.hasPaymentFrequency}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, hasPaymentFrequency: e.target.checked }))}
                      />
                      Include Payment Frequency
                    </label>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={templateForm.hasContractDuration}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, hasContractDuration: e.target.checked }))}
                      />
                      Include Contract Duration
                    </label>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={templateForm.showBreakdownPreview}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, showBreakdownPreview: e.target.checked }))}
                      />
                      Show Breakdown Preview
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Formula</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Formula Expression</label>
                    <input
                      type="text"
                      value={templateForm.formula.expression}
                      onChange={(e) => setTemplateForm(prev => ({
                        ...prev,
                        formula: { ...prev.formula, expression: e.target.value }
                      }))}
                      placeholder="e.g., quantity * ratePerUnit"
                    />
                    <small>Use field IDs from the input fields. Supported operators: + - * / ( )</small>
                  </div>
                  <div className="form-group">
                    <label>Formula Description</label>
                    <input
                      type="text"
                      value={templateForm.formula.description}
                      onChange={(e) => setTemplateForm(prev => ({
                        ...prev,
                        formula: { ...prev.formula, description: e.target.value }
                      }))}
                      placeholder="e.g., Hours × Rate"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Input Fields</h3>
                <p className="section-description">
                  Define the input fields that users will fill in. These field IDs can be used in the formula.
                </p>
                <div className="fields-list">
                  {templateForm.fields.map((field, index) => (
                    <div key={index} className="field-editor">
                      <div className="field-row">
                        <input
                          type="text"
                          value={field.id}
                          onChange={(e) => {
                            const newFields = [...templateForm.fields]
                            newFields[index] = { ...field, id: e.target.value }
                            setTemplateForm(prev => ({ ...prev, fields: newFields }))
                          }}
                          placeholder="Field ID (e.g., quantity)"
                        />
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const newFields = [...templateForm.fields]
                            newFields[index] = { ...field, name: e.target.value }
                            setTemplateForm(prev => ({ ...prev, fields: newFields }))
                          }}
                          placeholder="Display Name"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newFields = [...templateForm.fields]
                            newFields[index] = { ...field, type: e.target.value }
                            setTemplateForm(prev => ({ ...prev, fields: newFields }))
                          }}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="percentage">Percentage</option>
                          <option value="date">Date</option>
                          <option value="select">Dropdown</option>
                        </select>
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const newFields = [...templateForm.fields]
                              newFields[index] = { ...field, required: e.target.checked }
                              setTemplateForm(prev => ({ ...prev, fields: newFields }))
                            }}
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const newFields = templateForm.fields.filter((_, i) => i !== index)
                            setTemplateForm(prev => ({ ...prev, fields: newFields }))
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      {field.type === 'select' && (
                        <div className="field-options">
                          <input
                            type="text"
                            value={field.listKey || ''}
                            onChange={(e) => {
                              const newFields = [...templateForm.fields]
                              newFields[index] = { ...field, listKey: e.target.value }
                              setTemplateForm(prev => ({ ...prev, fields: newFields }))
                            }}
                            placeholder="List Key (e.g., consultationTypes)"
                          />
                          <select
                            value={field.listType || 'tenant-configurable'}
                            onChange={(e) => {
                              const newFields = [...templateForm.fields]
                              newFields[index] = { ...field, listType: e.target.value }
                              setTemplateForm(prev => ({ ...prev, fields: newFields }))
                            }}
                          >
                            <option value="system">System (Fixed)</option>
                            <option value="tenant-configurable">Tenant Configurable</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setTemplateForm(prev => ({
                        ...prev,
                        fields: [...prev.fields, { id: '', name: '', type: 'text', required: false }]
                      }))
                    }}
                  >
                    + Add Field
                  </button>
                </div>
              </div>

              <div className="form-section">
                <h3>Cost Fields</h3>
                <p className="section-description">
                  Define the cost items that can be entered for this calculation.
                </p>
                <div className="fields-list">
                  {templateForm.costFields.map((field, index) => (
                    <div key={index} className="field-editor">
                      <div className="field-row">
                        <input
                          type="text"
                          value={field.id}
                          onChange={(e) => {
                            const newFields = [...templateForm.costFields]
                            newFields[index] = { ...field, id: e.target.value }
                            setTemplateForm(prev => ({ ...prev, costFields: newFields }))
                          }}
                          placeholder="Field ID"
                        />
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const newFields = [...templateForm.costFields]
                            newFields[index] = { ...field, name: e.target.value }
                            setTemplateForm(prev => ({ ...prev, costFields: newFields }))
                          }}
                          placeholder="Display Name"
                        />
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={field.isPercentage}
                            onChange={(e) => {
                              const newFields = [...templateForm.costFields]
                              newFields[index] = { ...field, isPercentage: e.target.checked }
                              setTemplateForm(prev => ({ ...prev, costFields: newFields }))
                            }}
                          />
                          Is %
                        </label>
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={field.hasFrequency}
                            onChange={(e) => {
                              const newFields = [...templateForm.costFields]
                              newFields[index] = { ...field, hasFrequency: e.target.checked }
                              setTemplateForm(prev => ({ ...prev, costFields: newFields }))
                            }}
                          />
                          Has Frequency
                        </label>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const newFields = templateForm.costFields.filter((_, i) => i !== index)
                            setTemplateForm(prev => ({ ...prev, costFields: newFields }))
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setTemplateForm(prev => ({
                        ...prev,
                        costFields: [...prev.costFields, { id: '', name: '', type: 'currency', hasFrequency: false }]
                      }))
                    }}
                  >
                    + Add Cost Field
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalculationTemplateManagement
