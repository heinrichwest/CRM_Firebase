/**
 * Calculation Template Service
 *
 * Provides calculation template operations via REST API.
 */

import { apiClient } from '../api/config/apiClient'
import { CALCULATION_TEMPLATE_ENDPOINTS, buildUrl } from '../api/config/endpoints'
import { unwrapResponse } from '../api/adapters/responseAdapter'
import { normalizeEntity, normalizeEntities, normalizeDates, serializeDates } from '../api/adapters/idAdapter'

const DATE_FIELDS = ['createdAt', 'updatedAt']

// ============================================================================
// CALCULATION TEMPLATES
// ============================================================================

/**
 * Get all calculation templates
 * @returns {Promise<Array>} Array of calculation template documents
 */
export const getCalculationTemplates = async () => {
  try {
    const response = await apiClient.get(CALCULATION_TEMPLATE_ENDPOINTS.LIST)
    const templates = unwrapResponse(response)
    const normalized = normalizeEntities(templates).map(t => normalizeDates(t, DATE_FIELDS))
    return normalized
      .filter(t => t.status !== 'deleted')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting calculation templates:', error)
    // Return default templates from memory on error
    return Object.entries(DEFAULT_CALCULATION_TEMPLATES).map(([id, data]) => ({
      id,
      ...data
    }))
  }
}

/**
 * Get a single calculation template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Template document or null
 */
export const getCalculationTemplate = async (templateId) => {
  try {
    const response = await apiClient.get(CALCULATION_TEMPLATE_ENDPOINTS.GET_BY_ID(templateId))
    const template = unwrapResponse(response)
    if (template) {
      return normalizeDates(normalizeEntity(template), DATE_FIELDS)
    }
    return null
  } catch (error) {
    // If API fails, check default templates
    if (DEFAULT_CALCULATION_TEMPLATES[templateId]) {
      return { id: templateId, ...DEFAULT_CALCULATION_TEMPLATES[templateId] }
    }
    console.error('Error getting calculation template:', error)
    return null
  }
}

/**
 * Create a new calculation template
 * @param {Object} templateData - Template data
 * @returns {Promise<string>} New template ID
 */
export const createCalculationTemplate = async (templateData) => {
  try {
    const payload = serializeDates({
      ...templateData,
      status: templateData.status || 'active',
      version: templateData.version || '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    const response = await apiClient.post(CALCULATION_TEMPLATE_ENDPOINTS.CREATE, payload)
    const result = unwrapResponse(response)
    return result.key || result.id
  } catch (error) {
    console.error('Error creating calculation template:', error)
    throw error
  }
}

/**
 * Create a calculation template with a specific ID
 * @param {string} templateId - Template ID to use
 * @param {Object} templateData - Template data
 * @returns {Promise<string>} Template ID
 */
export const createCalculationTemplateWithId = async (templateId, templateData) => {
  try {
    const payload = serializeDates({
      id: templateId,
      ...templateData,
      status: templateData.status || 'active',
      version: templateData.version || '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    await apiClient.post(CALCULATION_TEMPLATE_ENDPOINTS.CREATE, payload)
    return templateId
  } catch (error) {
    console.error('Error creating calculation template with ID:', error)
    throw error
  }
}

/**
 * Update an existing calculation template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Updated template data
 */
export const updateCalculationTemplate = async (templateId, templateData) => {
  try {
    const payload = serializeDates({
      ...templateData,
      updatedAt: new Date().toISOString()
    }, DATE_FIELDS)

    await apiClient.put(CALCULATION_TEMPLATE_ENDPOINTS.UPDATE(templateId), payload)
  } catch (error) {
    console.error('Error updating calculation template:', error)
    throw error
  }
}

/**
 * Archive a calculation template (soft delete)
 * @param {string} templateId - Template ID
 */
export const archiveCalculationTemplate = async (templateId) => {
  try {
    await apiClient.put(CALCULATION_TEMPLATE_ENDPOINTS.UPDATE(templateId), {
      status: 'archived',
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error archiving calculation template:', error)
    throw error
  }
}

// ============================================================================
// DEFAULT TEMPLATES - Initialize with existing calculation methods
// ============================================================================

/**
 * Default calculation templates matching current system functionality
 */
export const DEFAULT_CALCULATION_TEMPLATES = {
  learnership: {
    id: 'learnership',
    name: 'Learnership Program',
    description: 'For learnership programs with monthly income distribution over the program duration',
    version: '1.0',
    status: 'active',

    // Input fields for the calculation
    fields: [
      {
        id: 'dealName',
        name: 'Deal Name',
        type: 'text',
        required: true,
        helpText: 'A descriptive name for this learnership deal'
      },
      {
        id: 'certaintyPercentage',
        name: 'Certainty %',
        type: 'percentage',
        required: true,
        default: 100,
        validation: { min: 0, max: 100 },
        helpText: 'Probability of this deal closing (affects forecast calculations)'
      },
      {
        id: 'learnerCount',
        name: 'Number of Learners',
        type: 'number',
        required: true,
        validation: { min: 1 },
        helpText: 'Total number of learners in this program'
      },
      {
        id: 'costPerLearner',
        name: 'Income per Learner (R)',
        type: 'currency',
        required: true,
        helpText: 'Revenue amount per learner'
      },
      {
        id: 'fundingType',
        name: 'Funding Type',
        type: 'select',
        required: true,
        listKey: 'fundingTypes',
        listType: 'tenant-configurable'
      },
      {
        id: 'duration',
        name: 'Duration (Months)',
        type: 'number',
        required: true,
        default: 12,
        validation: { min: 1, max: 36 },
        helpText: 'Length of the learnership program'
      },
      {
        id: 'paymentStartDate',
        name: 'Payment Start Date',
        type: 'date',
        required: true,
        helpText: 'When income payments begin'
      },
      {
        id: 'paymentFrequency',
        name: 'Payment Frequency',
        type: 'select',
        required: true,
        default: 'Monthly',
        listKey: 'paymentFrequencies',
        listType: 'system'
      }
    ],

    // Cost structure
    costFields: [
      {
        id: 'facilitatorCost',
        name: 'Facilitator Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership']
      },
      {
        id: 'commissionPercentage',
        name: 'Commission',
        type: 'percentage',
        isPercentage: true,
        percentageOf: 'totalAmount',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership']
      },
      {
        id: 'travelCost',
        name: 'Travel Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership']
      },
      {
        id: 'assessorCost',
        name: 'Assessor Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership']
      },
      {
        id: 'moderatorCost',
        name: 'Moderator Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership']
      },
      {
        id: 'customCost',
        name: 'Other Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income', 'End of Learnership'],
        hasCustomLabel: true
      }
    ],

    // Formula
    formula: {
      type: 'simple',
      expression: 'learnerCount * costPerLearner',
      description: 'Number of Learners × Income per Learner'
    },

    // Distribution settings
    distributionType: 'monthly',
    hasPaymentFrequency: true,
    hasCertaintyPercentage: true,
    hasContractDuration: true,

    // UI settings
    modalWidth: 'wide',
    showBreakdownPreview: true,

    // System lists used by this template
    systemLists: {
      paymentFrequencies: [
        { id: 'monthly', name: 'Monthly', value: 'Monthly' },
        { id: 'once-off', name: 'Once-off', value: 'Once-off' }
      ]
    },

    // Default custom lists (tenant can override)
    defaultCustomLists: {
      fundingTypes: [
        { id: 'seta', name: 'SETA Funded', value: 'seta' },
        { id: 'self', name: 'Self Funded', value: 'self' },
        { id: 'tax', name: 'Tax Rebate', value: 'tax' }
      ],
      learnershipTypes: [
        { id: 'generic-management', name: 'Generic Management NQF 4', value: 'generic-management' },
        { id: 'business-admin', name: 'Business Administration NQF 3', value: 'business-admin' },
        { id: 'business-admin-nqf4', name: 'Business Administration NQF 4', value: 'business-admin-nqf4' },
        { id: 'human-resources', name: 'Human Resources NQF 4', value: 'human-resources' },
        { id: 'project-management', name: 'Project Management NQF 4', value: 'project-management' },
        { id: 'contact-centre', name: 'Contact Centre NQF 3', value: 'contact-centre' },
        { id: 'wholesale-retail', name: 'Wholesale & Retail NQF 3', value: 'wholesale-retail' },
        { id: 'wholesale-retail-nqf4', name: 'Wholesale & Retail NQF 4', value: 'wholesale-retail-nqf4' },
        { id: 'new-venture-creation', name: 'New Venture Creation NQF 4', value: 'new-venture-creation' },
        { id: 'it-end-user', name: 'IT End User Computing NQF 3', value: 'it-end-user' },
        { id: 'other', name: 'Other', value: 'other' }
      ]
    }
  },

  // Compliance Training - inherits from once-off-training but with specific course options
  compliance: {
    id: 'compliance',
    name: 'Compliance Training',
    description: 'For compliance courses like First Aid, Fire Safety, OHS',
    version: '1.0',
    status: 'active',
    inheritsFrom: 'once-off-training',

    defaultCustomLists: {
      courseOptions: [
        { id: 'first-aid-1', name: 'First Aid Level 1', value: 'First Aid Level 1' },
        { id: 'first-aid-2', name: 'First Aid Level 2', value: 'First Aid Level 2' },
        { id: 'first-aid-3', name: 'First Aid Level 3', value: 'First Aid Level 3' },
        { id: 'fire-fighting', name: 'Fire Fighting', value: 'Fire Fighting' },
        { id: 'fire-marshal', name: 'Fire Marshal', value: 'Fire Marshal' },
        { id: 'health-safety-rep', name: 'Health & Safety Rep', value: 'Health & Safety Rep' },
        { id: 'evacuation-marshal', name: 'Evacuation Marshal', value: 'Evacuation Marshal' },
        { id: 'ohs-act', name: 'OHS Act Training', value: 'OHS Act Training' },
        { id: 'incident-investigation', name: 'Incident Investigation', value: 'Incident Investigation' },
        { id: 'working-at-heights', name: 'Working at Heights', value: 'Working at Heights' },
        { id: 'confined-spaces', name: 'Confined Spaces', value: 'Confined Spaces' },
        { id: 'forklift-operation', name: 'Forklift Operation', value: 'Forklift Operation' },
        { id: 'other', name: 'Other', value: 'Other' }
      ]
    }
  },

  // Other Courses - soft skills and general training
  otherCourses: {
    id: 'otherCourses',
    name: 'Other Courses',
    description: 'For workshops and soft skills training',
    version: '1.0',
    status: 'active',
    inheritsFrom: 'once-off-training',

    defaultCustomLists: {
      courseOptions: [
        { id: 'leadership-workshop', name: 'Leadership Workshop', value: 'Leadership Workshop' },
        { id: 'communication-skills', name: 'Communication Skills', value: 'Communication Skills' },
        { id: 'project-management', name: 'Project Management', value: 'Project Management' },
        { id: 'time-management', name: 'Time Management', value: 'Time Management' },
        { id: 'team-building', name: 'Team Building', value: 'Team Building' },
        { id: 'excel-basic', name: 'Excel Basic', value: 'Excel Basic' },
        { id: 'excel-intermediate', name: 'Excel Intermediate', value: 'Excel Intermediate' },
        { id: 'excel-advanced', name: 'Excel Advanced', value: 'Excel Advanced' },
        { id: 'word-processing', name: 'Word Processing', value: 'Word Processing' },
        { id: 'powerpoint', name: 'PowerPoint', value: 'PowerPoint' },
        { id: 'customer-service', name: 'Customer Service', value: 'Customer Service' },
        { id: 'sales-training', name: 'Sales Training', value: 'Sales Training' },
        { id: 'other', name: 'Other', value: 'Other' }
      ]
    }
  },

  subscription: {
    id: 'subscription',
    name: 'Subscription Service',
    description: 'For recurring subscription-based products like TAP Business',
    version: '1.0',
    status: 'active',

    fields: [
      {
        id: 'dealName',
        name: 'Deal Name',
        type: 'text',
        required: true
      },
      {
        id: 'certaintyPercentage',
        name: 'Certainty %',
        type: 'percentage',
        required: true,
        default: 100,
        validation: { min: 0, max: 100 }
      },
      {
        id: 'employeeCount',
        name: 'Number of Employees',
        type: 'number',
        required: true,
        validation: { min: 1 }
      },
      {
        id: 'costPerEmployee',
        name: 'Cost per Employee/Month (R)',
        type: 'currency',
        required: true
      },
      {
        id: 'packageType',
        name: 'Package Type',
        type: 'select',
        required: false,
        listKey: 'packageTypes',
        listType: 'tenant-configurable'
      },
      {
        id: 'paymentStartDate',
        name: 'Start Date',
        type: 'date',
        required: true
      },
      {
        id: 'paymentType',
        name: 'Payment Type',
        type: 'select',
        required: true,
        default: 'Monthly',
        listKey: 'subscriptionPaymentTypes',
        listType: 'system'
      },
      {
        id: 'contractMonths',
        name: 'Contract Duration (Months)',
        type: 'number',
        required: true,
        default: 12,
        validation: { min: 1, max: 60 }
      }
    ],

    costFields: [
      {
        id: 'commissionPercentage',
        name: 'Commission',
        type: 'percentage',
        isPercentage: true,
        percentageOf: 'totalAmount',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income']
      },
      {
        id: 'customCost',
        name: 'Other Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Monthly', 'Once-off', 'With Income'],
        hasCustomLabel: true
      }
    ],

    formula: {
      type: 'simple',
      expression: 'employeeCount * costPerEmployee * contractMonths',
      description: 'Employees × Monthly Fee × Contract Months'
    },

    distributionType: 'monthly',
    hasPaymentFrequency: true,
    hasCertaintyPercentage: true,
    hasContractDuration: true,

    modalWidth: 'wide',
    showBreakdownPreview: true,

    systemLists: {
      subscriptionPaymentTypes: [
        { id: 'monthly', name: 'Monthly', value: 'Monthly' },
        { id: 'annual', name: 'Annual', value: 'Annual' }
      ]
    },

    defaultCustomLists: {
      packageTypes: [
        { id: 'basic', name: 'Basic Package', value: 'basic' },
        { id: 'standard', name: 'Standard Package', value: 'standard' },
        { id: 'premium', name: 'Premium Package', value: 'premium' },
        { id: 'enterprise', name: 'Enterprise Package', value: 'enterprise' }
      ]
    }
  },

  'once-off-training': {
    id: 'once-off-training',
    name: 'Once-Off Training',
    description: 'For single training events like compliance courses or workshops',
    version: '1.0',
    status: 'active',

    fields: [
      {
        id: 'dealName',
        name: 'Deal Name',
        type: 'text',
        required: true
      },
      {
        id: 'certaintyPercentage',
        name: 'Certainty %',
        type: 'percentage',
        required: true,
        default: 100,
        validation: { min: 0, max: 100 }
      },
      {
        id: 'courseName',
        name: 'Course',
        type: 'select',
        required: true,
        listKey: 'courseOptions',
        listType: 'tenant-configurable',
        allowCustom: true
      },
      {
        id: 'traineeCount',
        name: 'Number of Trainees',
        type: 'number',
        required: true,
        validation: { min: 1 }
      },
      {
        id: 'pricePerPerson',
        name: 'Price per Person (R)',
        type: 'currency',
        required: true
      },
      {
        id: 'trainingDate',
        name: 'Training Date',
        type: 'date',
        required: true
      }
    ],

    costFields: [
      {
        id: 'commissionPercentage',
        name: 'Commission',
        type: 'percentage',
        isPercentage: true,
        percentageOf: 'totalAmount',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income']
      },
      {
        id: 'travelCost',
        name: 'Travel Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income']
      },
      {
        id: 'manualsCost',
        name: 'Manuals/Materials',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income']
      },
      {
        id: 'accommodationCost',
        name: 'Accommodation',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income']
      },
      {
        id: 'accreditationCost',
        name: 'Accreditation',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income']
      },
      {
        id: 'customCost',
        name: 'Other Cost',
        type: 'currency',
        hasFrequency: true,
        frequencyOptions: ['Once-off', 'With Income'],
        hasCustomLabel: true
      }
    ],

    formula: {
      type: 'simple',
      expression: 'traineeCount * pricePerPerson',
      description: 'Number of Trainees × Price per Person'
    },

    distributionType: 'once-off',
    hasPaymentFrequency: false,
    hasCertaintyPercentage: true,
    hasContractDuration: false,

    modalWidth: 'wide',
    showBreakdownPreview: true,

    systemLists: {},

    defaultCustomLists: {
      courseOptions: [
        { id: 'first-aid-1', name: 'First Aid Level 1', value: 'first-aid-1' },
        { id: 'first-aid-2', name: 'First Aid Level 2', value: 'first-aid-2' },
        { id: 'first-aid-3', name: 'First Aid Level 3', value: 'first-aid-3' },
        { id: 'fire-safety', name: 'Fire Safety', value: 'fire-safety' },
        { id: 'ohs', name: 'Occupational Health & Safety', value: 'ohs' }
      ]
    }
  },

  consulting: {
    id: 'consulting',
    name: 'Consulting Service',
    description: 'For consulting engagements billed by hours or days',
    version: '1.0',
    status: 'active',

    fields: [
      {
        id: 'dealName',
        name: 'Engagement Name',
        type: 'text',
        required: true
      },
      {
        id: 'certaintyPercentage',
        name: 'Certainty %',
        type: 'percentage',
        required: true,
        default: 100,
        validation: { min: 0, max: 100 }
      },
      {
        id: 'consultationType',
        name: 'Consultation Type',
        type: 'select',
        required: true,
        listKey: 'consultationTypes',
        listType: 'tenant-configurable'
      },
      {
        id: 'billingUnit',
        name: 'Billing Unit',
        type: 'select',
        required: true,
        default: 'hours',
        listKey: 'billingUnits',
        listType: 'system'
      },
      {
        id: 'quantity',
        name: 'Hours/Days',
        type: 'number',
        required: true,
        validation: { min: 0.5 }
      },
      {
        id: 'ratePerUnit',
        name: 'Rate (R)',
        type: 'currency',
        required: true
      },
      {
        id: 'serviceDate',
        name: 'Service Date',
        type: 'date',
        required: true
      }
    ],

    costFields: [
      {
        id: 'travelCost',
        name: 'Travel Cost',
        type: 'currency',
        hasFrequency: false
      },
      {
        id: 'materialsCost',
        name: 'Materials/Resources',
        type: 'currency',
        hasFrequency: false
      },
      {
        id: 'subcontractorCost',
        name: 'Subcontractor Cost',
        type: 'currency',
        hasFrequency: false
      },
      {
        id: 'customCost',
        name: 'Other Cost',
        type: 'currency',
        hasFrequency: false,
        hasCustomLabel: true
      }
    ],

    formula: {
      type: 'simple',
      expression: 'quantity * ratePerUnit',
      description: 'Hours/Days × Rate'
    },

    distributionType: 'once-off',
    hasPaymentFrequency: false,
    hasCertaintyPercentage: true,
    hasContractDuration: false,

    modalWidth: 'standard',
    showBreakdownPreview: true,

    systemLists: {
      billingUnits: [
        { id: 'hours', name: 'Hours', value: 'hours' },
        { id: 'days', name: 'Days', value: 'days' }
      ]
    },

    defaultCustomLists: {
      consultationTypes: [
        { id: 'strategy', name: 'Strategic Planning', value: 'strategy' },
        { id: 'hr', name: 'HR Consulting', value: 'hr' },
        { id: 'training-needs', name: 'Training Needs Analysis', value: 'training-needs' },
        { id: 'compliance', name: 'Compliance Advisory', value: 'compliance' },
        { id: 'general', name: 'General Consulting', value: 'general' }
      ]
    }
  }
}

/**
 * Initialize default calculation templates via API
 * Only creates templates that don't already exist
 */
export const initializeCalculationTemplates = async () => {
  try {
    const existingTemplates = await getCalculationTemplates()
    const existingIds = new Set(existingTemplates.map(t => t.id))

    let createdCount = 0

    for (const [templateId, templateData] of Object.entries(DEFAULT_CALCULATION_TEMPLATES)) {
      if (!existingIds.has(templateId)) {
        await createCalculationTemplateWithId(templateId, templateData)
        createdCount++
      }
    }

    if (createdCount > 0) {
      console.log(`Initialized ${createdCount} calculation templates`)
    }

    return createdCount
  } catch (error) {
    console.error('Error initializing calculation templates:', error)
    throw error
  }
}

// ============================================================================
// CALCULATION EXECUTION
// ============================================================================

/**
 * Execute a simple formula expression
 * @param {string} expression - Formula expression (e.g., 'learnerCount * costPerLearner')
 * @param {Object} fieldValues - Object with field values
 * @returns {number} Calculated result
 */
export const executeFormula = (expression, fieldValues) => {
  try {
    // Replace field names with their values
    let evaluableExpression = expression

    // Get all field names from the expression
    const fieldNames = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []

    for (const fieldName of fieldNames) {
      const value = parseFloat(fieldValues[fieldName]) || 0
      evaluableExpression = evaluableExpression.replace(
        new RegExp(`\\b${fieldName}\\b`, 'g'),
        value.toString()
      )
    }

    // Safely evaluate the expression
    // Only allow numbers and basic math operators
    if (!/^[\d\s+\-*/().]+$/.test(evaluableExpression)) {
      console.error('Invalid formula expression:', evaluableExpression)
      return 0
    }

    // eslint-disable-next-line no-eval
    const result = eval(evaluableExpression)
    return isNaN(result) ? 0 : result
  } catch (error) {
    console.error('Error executing formula:', error)
    return 0
  }
}

/**
 * Calculate total for a template with given field values
 * @param {Object} template - Calculation template
 * @param {Object} fieldValues - Field values from the form
 * @returns {number} Calculated total
 */
export const calculateTemplateTotal = (template, fieldValues) => {
  if (!template || !template.formula) return 0

  if (template.formula.type === 'simple') {
    return executeFormula(template.formula.expression, fieldValues)
  }

  // For custom formulas, we'll need to implement specific calculators
  // This can be expanded later
  return 0
}

/**
 * Calculate costs for a template
 * @param {Object} template - Calculation template
 * @param {Object} costValues - Cost field values
 * @param {number} totalAmount - Total income amount (for percentage calculations)
 * @returns {Object} Calculated costs breakdown
 */
export const calculateTemplateCosts = (template, costValues, totalAmount) => {
  if (!template || !template.costFields) {
    return { totalCosts: 0, breakdown: {} }
  }

  let totalCosts = 0
  const breakdown = {}

  for (const costField of template.costFields) {
    let costAmount = 0

    if (costField.isPercentage) {
      // This is a percentage-based cost
      const percentage = parseFloat(costValues[costField.id]) || 0
      costAmount = (totalAmount * percentage) / 100
    } else {
      // This is a fixed cost
      costAmount = parseFloat(costValues[costField.id]) || 0
    }

    breakdown[costField.id] = {
      amount: costAmount,
      frequency: costValues[`${costField.id}Frequency`] || 'Once-off',
      label: costValues[`${costField.id}Label`] || costField.name
    }

    totalCosts += costAmount
  }

  return { totalCosts, breakdown }
}

/**
 * Get the effective list options for a field
 * @param {Object} template - Calculation template
 * @param {string} listKey - List key to look up
 * @param {Object} tenantOverrides - Tenant-specific list overrides
 * @param {Object} productLists - Product-specific custom lists
 * @returns {Array} List options
 */
export const getListOptions = (template, listKey, tenantOverrides = {}, productLists = {}) => {
  // 1. Check tenant overrides first
  if (tenantOverrides[listKey]) {
    return tenantOverrides[listKey]
  }

  // 2. Check product-specific lists
  if (productLists[listKey]?.defaultOptions) {
    return productLists[listKey].defaultOptions
  }
  if (productLists[listKey]?.options) {
    return productLists[listKey].options
  }

  // 3. Check template's default custom lists
  if (template?.defaultCustomLists?.[listKey]) {
    return template.defaultCustomLists[listKey]
  }

  // 4. Check template's system lists
  if (template?.systemLists?.[listKey]) {
    return template.systemLists[listKey]
  }

  // 5. Return empty array
  return []
}

export default {
  getCalculationTemplates,
  getCalculationTemplate,
  createCalculationTemplate,
  createCalculationTemplateWithId,
  updateCalculationTemplate,
  archiveCalculationTemplate,
  initializeCalculationTemplates,
  executeFormula,
  calculateTemplateTotal,
  calculateTemplateCosts,
  getListOptions,
  DEFAULT_CALCULATION_TEMPLATES
}
