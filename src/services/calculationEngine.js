/**
 * Calculation Engine Service
 *
 * Centralized calculation logic for template-driven calculations.
 * Handles formula execution, monthly distribution, cost calculations, and GP.
 */

import { getCalculationTemplate, executeFormula, DEFAULT_CALCULATION_TEMPLATES } from './calculationTemplateService'
import { getEffectiveListOptions } from './tenantProductConfigService'

/**
 * Calculate total based on template and field values
 * @param {string} templateId - The calculation template ID
 * @param {Object} fieldValues - Values for all input fields
 * @param {Object} product - Product with default values
 * @returns {Object} - Calculation result with total and breakdown
 */
export const calculateTotal = async (templateId, fieldValues, product = null) => {
  const template = await getCalculationTemplate(templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Merge default values from product with provided field values
  const mergedValues = {
    ...(product?.defaultValues || {}),
    ...fieldValues
  }

  // Execute the formula
  let total = 0
  let breakdown = {}

  if (template.formula?.type === 'simple' && template.formula?.expression) {
    total = executeFormula(template.formula.expression, mergedValues)
    breakdown.formula = template.formula.expression
    breakdown.values = mergedValues
  } else if (template.formula?.type === 'custom') {
    // Handle custom calculation types
    const result = executeCustomCalculation(template.formula.customCalculatorId, mergedValues)
    total = result.total
    breakdown = result.breakdown
  }

  return {
    total,
    breakdown,
    templateId,
    templateName: template.name
  }
}

/**
 * Execute custom calculation based on calculator ID
 * @param {string} calculatorId - Custom calculator identifier
 * @param {Object} values - Field values
 * @returns {Object} - Result with total and breakdown
 */
const executeCustomCalculation = (calculatorId, values) => {
  // Custom calculators for complex calculations
  const customCalculators = {
    'learnership-complex': (v) => {
      const learnerCount = Number(v.learnerCount) || 0
      const costPerLearner = Number(v.costPerLearner) || 0
      const duration = Number(v.duration) || 12
      const discount = Number(v.discountPercentage) || 0

      const subtotal = learnerCount * costPerLearner
      const discountAmount = subtotal * (discount / 100)
      const total = subtotal - discountAmount

      return {
        total,
        breakdown: {
          learnerCount,
          costPerLearner,
          duration,
          subtotal,
          discountPercentage: discount,
          discountAmount,
          total
        }
      }
    },
    'subscription-tiered': (v) => {
      const users = Number(v.users) || 0
      const baseRate = Number(v.baseRate) || 0
      const tierDiscounts = [
        { threshold: 50, discount: 0.10 },
        { threshold: 100, discount: 0.15 },
        { threshold: 200, discount: 0.20 }
      ]

      let discount = 0
      for (const tier of tierDiscounts) {
        if (users >= tier.threshold) {
          discount = tier.discount
        }
      }

      const subtotal = users * baseRate
      const discountAmount = subtotal * discount
      const total = subtotal - discountAmount

      return {
        total,
        breakdown: {
          users,
          baseRate,
          subtotal,
          tierDiscount: discount * 100,
          discountAmount,
          total
        }
      }
    }
  }

  const calculator = customCalculators[calculatorId]
  if (calculator) {
    return calculator(values)
  }

  // Default: return 0
  return { total: 0, breakdown: { error: 'Unknown calculator' } }
}

/**
 * Calculate monthly distribution of income
 * @param {string} templateId - The calculation template ID
 * @param {Object} fieldValues - Field values including dates and total
 * @param {Object} fyInfo - Financial year information
 * @returns {Object} - Monthly breakdown
 */
export const calculateMonthlyDistribution = async (templateId, fieldValues, fyInfo) => {
  const template = await getCalculationTemplate(templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  const total = Number(fieldValues.totalAmount) || 0
  const certainty = Number(fieldValues.certaintyPercentage) || 100
  const adjustedTotal = total * (certainty / 100)

  const distributionType = template.distributionType || 'monthly'
  const months = {}

  // Initialize all months to 0
  const fyStartMonth = fyInfo?.startMonth || 3 // Default to March (South African FY)
  for (let i = 0; i < 12; i++) {
    const monthIndex = (fyStartMonth + i) % 12
    const monthKey = getMonthKey(monthIndex, fyInfo?.startYear || new Date().getFullYear())
    months[monthKey] = 0
  }

  switch (distributionType) {
    case 'once-off':
      // All income in a single month
      const incomeMonth = fieldValues.incomeMonth || fieldValues.startDate
      if (incomeMonth) {
        const date = new Date(incomeMonth)
        const monthKey = getMonthKey(date.getMonth(), date.getFullYear())
        months[monthKey] = adjustedTotal
      }
      break

    case 'annual':
      // Spread evenly across 12 months
      const monthlyAmount = adjustedTotal / 12
      for (const key of Object.keys(months)) {
        months[key] = Math.round(monthlyAmount * 100) / 100
      }
      break

    case 'monthly':
    default:
      // Spread across contract duration
      const startDate = fieldValues.startDate ? new Date(fieldValues.startDate) : new Date()
      const durationMonths = Number(fieldValues.duration) || Number(fieldValues.contractMonths) || 12
      const monthlyIncome = adjustedTotal / durationMonths

      let currentDate = new Date(startDate)
      for (let i = 0; i < durationMonths; i++) {
        const monthKey = getMonthKey(currentDate.getMonth(), currentDate.getFullYear())
        if (months.hasOwnProperty(monthKey)) {
          months[monthKey] = (months[monthKey] || 0) + Math.round(monthlyIncome * 100) / 100
        }
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
      break
  }

  return {
    distributionType,
    total: adjustedTotal,
    certaintyPercentage: certainty,
    originalTotal: total,
    months,
    fyInfo
  }
}

/**
 * Generate month key for storage
 */
const getMonthKey = (monthIndex, year) => {
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  return `${monthNames[monthIndex]}${year}`
}

/**
 * Calculate costs based on template and cost values
 * @param {string} templateId - The calculation template ID
 * @param {Object} costValues - Values for cost fields
 * @param {number} totalIncome - Total income for percentage calculations
 * @returns {Object} - Cost breakdown
 */
export const calculateCosts = async (templateId, costValues, totalIncome = 0) => {
  const template = await getCalculationTemplate(templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  const costs = {}
  let totalCost = 0

  for (const costField of (template.costFields || [])) {
    const value = costValues[costField.id]

    if (costField.isPercentage && costField.percentageOf === 'totalAmount') {
      // Calculate percentage of total income
      const percentage = Number(value) || 0
      const amount = totalIncome * (percentage / 100)
      costs[costField.id] = {
        type: 'percentage',
        percentage,
        amount: Math.round(amount * 100) / 100,
        frequency: costValues[`${costField.id}Frequency`] || 'once-off'
      }
      totalCost += amount
    } else {
      // Fixed amount
      const amount = Number(value) || 0
      costs[costField.id] = {
        type: 'fixed',
        amount: Math.round(amount * 100) / 100,
        frequency: costValues[`${costField.id}Frequency`] || 'once-off'
      }
      totalCost += amount
    }
  }

  return {
    costs,
    totalCost: Math.round(totalCost * 100) / 100,
    templateId
  }
}

/**
 * Distribute costs across months based on frequency
 * @param {Object} costs - Cost breakdown from calculateCosts
 * @param {Object} fieldValues - Field values with dates
 * @param {Object} fyInfo - Financial year information
 * @returns {Object} - Monthly cost distribution
 */
export const distributesCostsMonthly = (costs, fieldValues, fyInfo) => {
  const months = {}

  // Initialize all months to 0
  const fyStartMonth = fyInfo?.startMonth || 3
  for (let i = 0; i < 12; i++) {
    const monthIndex = (fyStartMonth + i) % 12
    const monthKey = getMonthKey(monthIndex, fyInfo?.startYear || new Date().getFullYear())
    months[monthKey] = 0
  }

  const startDate = fieldValues.startDate ? new Date(fieldValues.startDate) : new Date()
  const durationMonths = Number(fieldValues.duration) || Number(fieldValues.contractMonths) || 12

  for (const [costId, costData] of Object.entries(costs.costs || {})) {
    const { amount, frequency } = costData

    switch (frequency) {
      case 'monthly':
        // Spread across all months of contract
        const monthlyAmount = amount / durationMonths
        let currentDate = new Date(startDate)
        for (let i = 0; i < durationMonths; i++) {
          const monthKey = getMonthKey(currentDate.getMonth(), currentDate.getFullYear())
          if (months.hasOwnProperty(monthKey)) {
            months[monthKey] += Math.round(monthlyAmount * 100) / 100
          }
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
        break

      case 'with-income':
        // Same distribution as income (handled separately)
        break

      case 'end-of-program':
        // All at end of contract
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + durationMonths - 1)
        const endMonthKey = getMonthKey(endDate.getMonth(), endDate.getFullYear())
        if (months.hasOwnProperty(endMonthKey)) {
          months[endMonthKey] += amount
        }
        break

      case 'once-off':
      default:
        // All in first month
        const firstMonthKey = getMonthKey(startDate.getMonth(), startDate.getFullYear())
        if (months.hasOwnProperty(firstMonthKey)) {
          months[firstMonthKey] += amount
        }
        break
    }
  }

  return { months, totalCost: costs.totalCost }
}

/**
 * Calculate gross profit
 * @param {number} income - Total income
 * @param {number} costs - Total costs
 * @returns {Object} - GP amount and percentage
 */
export const calculateGrossProfit = (income, costs) => {
  const grossProfit = income - costs
  const gpPercentage = income > 0 ? (grossProfit / income) * 100 : 0

  return {
    income: Math.round(income * 100) / 100,
    costs: Math.round(costs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    gpPercentage: Math.round(gpPercentage * 10) / 10
  }
}

/**
 * Full calculation including income, costs, GP, and monthly distribution
 * @param {string} templateId - Template ID
 * @param {Object} fieldValues - All field values
 * @param {Object} costValues - All cost values
 * @param {Object} fyInfo - Financial year info
 * @param {Object} product - Product with defaults
 * @returns {Object} - Complete calculation result
 */
export const calculateFull = async (templateId, fieldValues, costValues, fyInfo, product = null) => {
  // Calculate income
  const incomeResult = await calculateTotal(templateId, fieldValues, product)

  // Calculate costs
  const costsResult = await calculateCosts(templateId, costValues, incomeResult.total)

  // Calculate GP
  const gpResult = calculateGrossProfit(incomeResult.total, costsResult.totalCost)

  // Calculate monthly distribution for income
  const incomeDistribution = await calculateMonthlyDistribution(
    templateId,
    { ...fieldValues, totalAmount: incomeResult.total },
    fyInfo
  )

  // Calculate monthly distribution for costs
  const costsDistribution = distributesCostsMonthly(costsResult, fieldValues, fyInfo)

  // Calculate monthly GP
  const monthlyGP = {}
  for (const monthKey of Object.keys(incomeDistribution.months)) {
    const monthIncome = incomeDistribution.months[monthKey] || 0
    const monthCost = costsDistribution.months[monthKey] || 0
    monthlyGP[monthKey] = Math.round((monthIncome - monthCost) * 100) / 100
  }

  return {
    templateId,
    templateName: incomeResult.templateName,
    income: {
      total: incomeResult.total,
      breakdown: incomeResult.breakdown,
      monthly: incomeDistribution.months
    },
    costs: {
      total: costsResult.totalCost,
      breakdown: costsResult.costs,
      monthly: costsDistribution.months
    },
    grossProfit: {
      ...gpResult,
      monthly: monthlyGP
    },
    summary: {
      totalIncome: incomeResult.total,
      totalCosts: costsResult.totalCost,
      grossProfit: gpResult.grossProfit,
      gpPercentage: gpResult.gpPercentage
    }
  }
}

/**
 * Get field value with proper type conversion based on field definition
 * @param {Object} field - Field definition from template
 * @param {any} value - Raw value
 * @returns {any} - Converted value
 */
export const getTypedFieldValue = (field, value) => {
  if (value === undefined || value === null || value === '') {
    return field.default !== undefined ? field.default : null
  }

  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percentage':
      return Number(value) || 0
    case 'date':
      return value instanceof Date ? value : new Date(value)
    case 'select':
      return String(value)
    case 'text':
    default:
      return String(value)
  }
}

/**
 * Validate field values against template requirements
 * @param {string} templateId - Template ID
 * @param {Object} fieldValues - Values to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateFieldValues = async (templateId, fieldValues) => {
  const template = await getCalculationTemplate(templateId)
  if (!template) {
    return { isValid: false, errors: { _template: 'Template not found' } }
  }

  const errors = {}

  for (const field of (template.fields || [])) {
    const value = fieldValues[field.id]

    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.id] = `${field.name} is required`
      continue
    }

    // Check validation rules
    if (value !== undefined && value !== null && value !== '' && field.validation) {
      const numValue = Number(value)

      if (field.validation.min !== undefined && numValue < field.validation.min) {
        errors[field.id] = `${field.name} must be at least ${field.validation.min}`
      }

      if (field.validation.max !== undefined && numValue > field.validation.max) {
        errors[field.id] = `${field.name} must be at most ${field.validation.max}`
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Get display format for a value based on field type
 * @param {Object} field - Field definition
 * @param {any} value - Value to format
 * @returns {string} - Formatted string
 */
export const formatFieldValue = (field, value) => {
  if (value === undefined || value === null) return '-'

  switch (field.type) {
    case 'currency':
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)

    case 'percentage':
      return `${value}%`

    case 'number':
      return new Intl.NumberFormat('en-ZA').format(value)

    case 'date':
      const date = value instanceof Date ? value : new Date(value)
      return date.toLocaleDateString('en-ZA')

    default:
      return String(value)
  }
}

export default {
  calculateTotal,
  calculateMonthlyDistribution,
  calculateCosts,
  distributesCostsMonthly,
  calculateGrossProfit,
  calculateFull,
  getTypedFieldValue,
  validateFieldValues,
  formatFieldValue
}
