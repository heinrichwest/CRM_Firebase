/**
 * Validation utilities for the CRM application
 */

/**
 * Validate financial year format (YYYY/YYYY)
 * @param {string} value - The financial year string to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateFinancialYear = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Financial year is required' }
  }

  const trimmed = value.trim()
  const pattern = /^\d{4}\/\d{4}$/

  if (!pattern.test(trimmed)) {
    return { isValid: false, error: 'Format must be YYYY/YYYY (e.g., 2024/2025)' }
  }

  const [startYear, endYear] = trimmed.split('/').map(Number)

  if (endYear !== startYear + 1) {
    return { isValid: false, error: 'End year must be exactly one year after start year' }
  }

  if (startYear < 2000 || startYear > 2100) {
    return { isValid: false, error: 'Year must be between 2000 and 2100' }
  }

  return { isValid: true, error: null }
}

/**
 * Validate currency amount (non-negative number)
 * @param {number|string} value - The currency value to validate
 * @param {object} options - { allowZero: boolean, maxValue: number }
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateCurrency = (value, options = {}) => {
  const { allowZero = true, maxValue = 999999999 } = options

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Must be a valid number' }
  }

  if (numValue < 0) {
    return { isValid: false, error: 'Amount cannot be negative' }
  }

  if (!allowZero && numValue === 0) {
    return { isValid: false, error: 'Amount must be greater than zero' }
  }

  if (numValue > maxValue) {
    return { isValid: false, error: `Amount cannot exceed ${maxValue.toLocaleString()}` }
  }

  return { isValid: true, error: null }
}

/**
 * Validate South African phone number
 * @param {string} value - The phone number to validate
 * @returns {object} - { isValid: boolean, error: string|null, formatted: string|null }
 */
export const validatePhoneNumber = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: true, error: null, formatted: null } // Phone is optional
  }

  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '')

  if (cleaned.length === 0) {
    return { isValid: true, error: null, formatted: null }
  }

  // South African phone patterns
  // Mobile: 0XX XXX XXXX (10 digits starting with 0)
  // International: +27 XX XXX XXXX (11 digits starting with +27)
  // Landline: 0XX XXX XXXX (10 digits)

  let normalized = cleaned

  // Convert +27 to 0
  if (normalized.startsWith('+27')) {
    normalized = '0' + normalized.substring(3)
  } else if (normalized.startsWith('27') && normalized.length === 11) {
    normalized = '0' + normalized.substring(2)
  }

  // Check length
  if (normalized.length !== 10) {
    return { isValid: false, error: 'Phone number must be 10 digits', formatted: null }
  }

  // Must start with 0
  if (!normalized.startsWith('0')) {
    return { isValid: false, error: 'Phone number must start with 0 or +27', formatted: null }
  }

  // Format as 0XX XXX XXXX
  const formatted = `${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6)}`

  return { isValid: true, error: null, formatted }
}

/**
 * Validate email address
 * @param {string} value - The email to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateEmail = (value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: true, error: null } // Email might be optional
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { isValid: true, error: null }
  }

  // Basic email pattern
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!pattern.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }

  return { isValid: true, error: null }
}

/**
 * Validate required field
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field for error message
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` }
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` }
  }

  return { isValid: true, error: null }
}

/**
 * Validate date is not in the past
 * @param {string|Date} value - The date to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateFutureDate = (value) => {
  if (!value) {
    return { isValid: true, error: null }
  }

  const date = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (date < today) {
    return { isValid: false, error: 'Date cannot be in the past' }
  }

  return { isValid: true, error: null }
}

/**
 * Validate a complete form object
 * @param {object} formData - The form data to validate
 * @param {object} rules - Validation rules keyed by field name
 * @returns {object} - { isValid: boolean, errors: { [fieldName]: string } }
 */
export const validateForm = (formData, rules) => {
  const errors = {}
  let isValid = true

  for (const [fieldName, validators] of Object.entries(rules)) {
    const value = formData[fieldName]

    for (const validator of validators) {
      const result = validator(value)
      if (!result.isValid) {
        errors[fieldName] = result.error
        isValid = false
        break // Stop at first error for this field
      }
    }
  }

  return { isValid, errors }
}
