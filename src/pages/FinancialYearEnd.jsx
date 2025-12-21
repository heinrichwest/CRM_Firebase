import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  getFinancialYearSettings,
  saveFinancialYearSettings
} from '../services/firestoreService'
import { validateFinancialYear } from '../utils/validation'
import './FinancialYearEnd.css'

const FinancialYearEnd = () => {
  const { getTenantId, currentTenant, isSystemAdmin } = useTenant()
  const tenantId = getTenantId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    currentFinancialYear: '',
    financialYearEnd: '',
    financialYearStart: '',
    reportingMonth: '',
    currencySymbol: 'R'
  })
  const [errors, setErrors] = useState({})
  const [isUsingSystemDefaults, setIsUsingSystemDefaults] = useState(false)

  useEffect(() => {
    if (tenantId) {
      loadFinancialYearData()
    }
  }, [tenantId])

  const loadFinancialYearData = async () => {
    try {
      const settings = await getFinancialYearSettings(tenantId)

      setFormData({
        currentFinancialYear: settings.currentFinancialYear || '',
        financialYearEnd: settings.financialYearEnd || '',
        financialYearStart: settings.financialYearStart || '',
        reportingMonth: settings.reportingMonth || settings.financialYearEnd || '',
        currencySymbol: settings.currencySymbol || 'R'
      })

      // Track if using system-wide defaults
      setIsUsingSystemDefaults(settings.isSystemWide || false)

      setLoading(false)
    } catch (error) {
      console.error('Error loading financial year data:', error)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Validate financial year format
    const fyValidation = validateFinancialYear(formData.currentFinancialYear)
    if (!fyValidation.isValid) {
      newErrors.currentFinancialYear = fyValidation.error
    }

    // Validate months are selected
    if (!formData.financialYearStart) {
      newErrors.financialYearStart = 'Please select a start month'
    }

    if (!formData.financialYearEnd) {
      newErrors.financialYearEnd = 'Please select an end month'
    }

    // Validate start/end month relationship (end should be month before start)
    if (formData.financialYearStart && formData.financialYearEnd) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
      const startIdx = months.indexOf(formData.financialYearStart)
      const endIdx = months.indexOf(formData.financialYearEnd)

      // Calculate expected end month (one month before start, wrapping around)
      const expectedEndIdx = (startIdx - 1 + 12) % 12

      if (endIdx !== expectedEndIdx) {
        newErrors.financialYearEnd = `For a 12-month FY starting in ${formData.financialYearStart}, the end month should be ${months[expectedEndIdx]}`
      }
    }

    if (!formData.reportingMonth) {
      newErrors.reportingMonth = 'Please select a reporting month'
    }

    // Validate reporting month is within the financial year
    if (formData.reportingMonth && formData.financialYearStart && formData.financialYearEnd) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
      const startIdx = months.indexOf(formData.financialYearStart)
      const endIdx = months.indexOf(formData.financialYearEnd)
      const reportIdx = months.indexOf(formData.reportingMonth)

      // Check if reporting month is within FY range
      let isInRange = false
      if (startIdx <= endIdx) {
        isInRange = reportIdx >= startIdx && reportIdx <= endIdx
      } else {
        // FY wraps around year boundary
        isInRange = reportIdx >= startIdx || reportIdx <= endIdx
      }

      if (!isInRange) {
        newErrors.reportingMonth = 'Reporting month must be within the financial year period'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      // Save tenant-specific settings
      await saveFinancialYearSettings(formData, tenantId)

      setIsUsingSystemDefaults(false)
      alert(`Financial year settings saved successfully for ${currentTenant?.name || tenantId}!`)
      setSaving(false)
    } catch (error) {
      console.error('Error saving financial year data:', error)
      alert('Failed to save financial year settings. Please try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="financial-year-end">
        <h1>Financial Year End Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  // Show message if no tenant
  if (!tenantId) {
    return (
      <div className="financial-year-end">
        <h1>Financial Year End Management</h1>
        <div className="error-banner">
          <p>You are not assigned to a tenant. Please contact your administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="financial-year-end">
      <div className="fy-header">
        <h1>Financial Year End Management</h1>
        <p className="fy-description">
          Configure the financial year settings for <strong>{currentTenant?.name || tenantId}</strong>.
        </p>
        {isUsingSystemDefaults && (
          <div className="info-banner" style={{ background: '#e3f2fd', padding: '12px 16px', borderRadius: '8px', marginTop: '12px', borderLeft: '4px solid #2196f3' }}>
            <strong>Note:</strong> Currently using system-wide defaults. Save to create tenant-specific settings.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="fy-form">
        <div className="form-section">
          <h2>Current Financial Year</h2>
          <div className="form-group">
            <label htmlFor="currentFinancialYear">Current Financial Year *</label>
            <input
              type="text"
              id="currentFinancialYear"
              name="currentFinancialYear"
              value={formData.currentFinancialYear}
              onChange={handleInputChange}
              placeholder="e.g., 2024/2025"
              className={errors.currentFinancialYear ? 'input-error' : ''}
              required
            />
            {errors.currentFinancialYear ? (
              <small className="error-text">{errors.currentFinancialYear}</small>
            ) : (
              <small>Format: YYYY/YYYY (e.g., 2024/2025)</small>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Financial Year Period</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="financialYearStart">Financial Year Start *</label>
              <select
                id="financialYearStart"
                name="financialYearStart"
                value={formData.financialYearStart}
                onChange={handleInputChange}
                className={errors.financialYearStart ? 'input-error' : ''}
                required
              >
                <option value="">Select Month</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              {errors.financialYearStart && (
                <small className="error-text">{errors.financialYearStart}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="financialYearEnd">Financial Year End *</label>
              <select
                id="financialYearEnd"
                name="financialYearEnd"
                value={formData.financialYearEnd}
                onChange={handleInputChange}
                className={errors.financialYearEnd ? 'input-error' : ''}
                required
              >
                <option value="">Select Month</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              {errors.financialYearEnd && (
                <small className="error-text">{errors.financialYearEnd}</small>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Reporting & Currency</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reportingMonth">Reporting Month (latest YTD month) *</label>
              <select
                id="reportingMonth"
                name="reportingMonth"
                value={formData.reportingMonth}
                onChange={handleInputChange}
                className={errors.reportingMonth ? 'input-error' : ''}
                required
              >
                <option value="">Select Month</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              {errors.reportingMonth ? (
                <small className="error-text">{errors.reportingMonth}</small>
              ) : (
                <small>
                  This is the last month for which actual YTD figures have been uploaded. Remaining
                  months will be used for forecast entry.
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="currencySymbol">Currency Symbol</label>
              <input
                type="text"
                id="currencySymbol"
                name="currencySymbol"
                value={formData.currencySymbol}
                onChange={handleInputChange}
                maxLength={5}
              />
              <small>Displayed in financial dashboards (e.g. R, $, €).</small>
            </div>
          </div>
        </div>

        <div className="form-info">
          <h3>Information</h3>
          <ul>
            <li>These settings are specific to <strong>{currentTenant?.name || tenantId}</strong> and will not affect other tenants.</li>
            <li>The financial year settings are used for forecasting calculations and reporting.</li>
            <li>All forecasts and reports will be based on these settings.</li>
            <li>Changes to these settings will affect future forecasts and reports for this tenant only.</li>
          </ul>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Financial Year Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FinancialYearEnd
