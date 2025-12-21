/**
 * Deal Distribution Utility
 *
 * Converts deal structures with product-specific fields into monthly forecast distributions
 * based on payment schedules and cost frequencies.
 */

/**
 * Distributes a deal's income and costs across months based on payment schedule
 * @param {Object} deal - The deal object with values and calculation
 * @param {Array} fyMonths - Array of financial year months
 * @returns {Object} - Monthly distribution { monthKey: amount }
 */
export const distributeDealToMonths = (deal, fyMonths) => {
  if (!deal || !deal.values || !deal.calculation) {
    return {}
  }

  const monthlyDistribution = {}
  const values = deal.values
  const calculation = deal.calculation

  // Initialize all months to 0
  fyMonths.forEach(m => {
    const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
    monthlyDistribution[monthKey] = 0
  })

  // Distribute income based on product type and payment schedule
  switch (deal.productType) {
    case 'learnerships':
      distributeLearnershipIncome(deal, monthlyDistribution, fyMonths)
      break

    case 'compliance':
    case 'otherCourses':
      distributeOnceOffIncome(deal, monthlyDistribution, fyMonths)
      break

    case 'tapBusiness':
      distributeTAPIncome(deal, monthlyDistribution, fyMonths)
      break
  }

  return monthlyDistribution
}

/**
 * Distribute learnership income across months
 */
const distributeLearnershipIncome = (deal, distribution, fyMonths) => {
  const values = deal.values
  const calculation = deal.calculation
  const paymentFrequency = values.paymentFrequency || 'Monthly'
  const paymentStartDate = values.paymentStartDate ? new Date(values.paymentStartDate) : new Date()
  const paymentMonths = values.paymentMonths || 12
  const totalIncome = calculation.totalIncome || 0

  if (paymentFrequency === 'Once-off') {
    // Single payment in the start month
    const startMonthKey = getMonthKeyFromDate(paymentStartDate)
    if (distribution.hasOwnProperty(startMonthKey)) {
      distribution[startMonthKey] += totalIncome
    }
  } else if (paymentFrequency === 'Annual') {
    // Annual payment in the start month
    const startMonthKey = getMonthKeyFromDate(paymentStartDate)
    if (distribution.hasOwnProperty(startMonthKey)) {
      distribution[startMonthKey] += totalIncome
    }
  } else {
    // Monthly payments
    const monthlyAmount = totalIncome / paymentMonths
    const startMonth = fyMonths.find(m => {
      const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
      const monthDate = new Date(m.year, m.calendarMonth, 1)
      return monthDate >= paymentStartDate
    })

    if (startMonth) {
      const startIndex = fyMonths.indexOf(startMonth)
      for (let i = 0; i < paymentMonths && (startIndex + i) < fyMonths.length; i++) {
        const month = fyMonths[startIndex + i]
        const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
        distribution[monthKey] += monthlyAmount
      }
    }
  }
}

/**
 * Distribute once-off training income (Compliance, Other Courses)
 */
const distributeOnceOffIncome = (deal, distribution, fyMonths) => {
  const values = deal.values
  const calculation = deal.calculation
  const trainingDate = values.trainingDate ? new Date(values.trainingDate) : new Date()
  const totalIncome = calculation.totalIncome || 0

  const monthKey = getMonthKeyFromDate(trainingDate)
  if (distribution.hasOwnProperty(monthKey)) {
    distribution[monthKey] += totalIncome
  }
}

/**
 * Distribute TAP Business income across months
 */
const distributeTAPIncome = (deal, distribution, fyMonths) => {
  const values = deal.values
  const calculation = deal.calculation
  const paymentType = values.paymentType || 'Monthly'
  const paymentStartDate = values.paymentStartDate ? new Date(values.paymentStartDate) : new Date()
  const contractMonths = values.contractMonths || 12
  const totalIncome = calculation.totalIncome || 0
  const monthlyIncome = calculation.monthlyIncome || 0

  if (paymentType === 'Annual') {
    // Single annual payment in start month
    const startMonthKey = getMonthKeyFromDate(paymentStartDate)
    if (distribution.hasOwnProperty(startMonthKey)) {
      distribution[startMonthKey] += totalIncome
    }
  } else {
    // Monthly subscription payments
    const startMonth = fyMonths.find(m => {
      const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
      const monthDate = new Date(m.year, m.calendarMonth, 1)
      return monthDate >= paymentStartDate
    })

    if (startMonth) {
      const startIndex = fyMonths.indexOf(startMonth)
      for (let i = 0; i < contractMonths && (startIndex + i) < fyMonths.length; i++) {
        const month = fyMonths[startIndex + i]
        const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
        distribution[monthKey] += monthlyIncome
      }
    }
  }
}

/**
 * Get month key (YYYY-MM) from a date
 */
const getMonthKeyFromDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Aggregate multiple deals into a single monthly distribution
 * @param {Array} deals - Array of deal objects
 * @param {Array} fyMonths - Array of financial year months
 * @returns {Object} - Aggregated monthly distribution
 */
export const aggregateDealsToMonths = (deals, fyMonths) => {
  const aggregated = {}

  // Initialize all months to 0
  fyMonths.forEach(m => {
    const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
    aggregated[monthKey] = 0
  })

  // Sum up all deals
  deals.forEach(deal => {
    const dealDistribution = distributeDealToMonths(deal, fyMonths)
    Object.entries(dealDistribution).forEach(([monthKey, amount]) => {
      aggregated[monthKey] = (aggregated[monthKey] || 0) + amount
    })
  })

  return aggregated
}

/**
 * Calculate totals across all product lines for a client
 * @param {Object} dealsbyProductLine - { productLine: [deals] }
 * @param {Array} fyMonths - Array of financial year months
 * @returns {Object} - { totalIncome, totalCosts, grossProfit, monthlyBreakdown }
 */
export const calculateClientTotals = (dealsByProductLine, fyMonths) => {
  let totalIncome = 0
  let totalCosts = 0
  let grossProfit = 0
  const monthlyBreakdown = {}

  // Initialize months
  fyMonths.forEach(m => {
    const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
    monthlyBreakdown[monthKey] = 0
  })

  // Aggregate across all product lines
  Object.values(dealsByProductLine).forEach(deals => {
    deals.forEach(deal => {
      if (deal.calculation) {
        totalIncome += deal.calculation.totalIncome || 0
        totalCosts += deal.calculation.totalCosts || 0
        grossProfit += deal.calculation.grossProfit || 0
      }

      // Add to monthly breakdown
      const dealDistribution = distributeDealToMonths(deal, fyMonths)
      Object.entries(dealDistribution).forEach(([monthKey, amount]) => {
        monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + amount
      })
    })
  })

  return {
    totalIncome,
    totalCosts,
    grossProfit,
    monthlyBreakdown
  }
}

/**
 * Apply certainty percentage to monthly distribution
 * @param {Object} distribution - Monthly distribution
 * @param {Number} certaintyPercentage - Certainty percentage (0-100)
 * @returns {Object} - Adjusted distribution
 */
export const applyCertaintyToDistribution = (distribution, certaintyPercentage = 100) => {
  const adjusted = {}
  const factor = certaintyPercentage / 100

  Object.entries(distribution).forEach(([monthKey, amount]) => {
    adjusted[monthKey] = amount * factor
  })

  return adjusted
}
