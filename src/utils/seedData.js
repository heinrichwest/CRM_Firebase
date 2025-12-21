/**
 * Seed Data Generator for CRM
 * Generates consistent, linked data across all modules:
 * - Clients
 * - Client Financials (with deal details)
 * - Invoices (matching financial data)
 * - Quotes
 * - Interactions
 * - Tasks
 * - Feedback
 * - Contracts
 */

import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

// South African company names for realistic data
const companyNames = [
  { name: 'Sasol Limited', industry: 'Energy & Chemicals', seta: 'MERSETA' },
  { name: 'FirstRand Bank', industry: 'Financial Services', seta: 'BANKSETA' },
  { name: 'Shoprite Holdings', industry: 'Retail', seta: 'W&RSETA' },
  { name: 'MTN South Africa', industry: 'Telecommunications', seta: 'MICT SETA' },
  { name: 'Vodacom Group', industry: 'Telecommunications', seta: 'MICT SETA' },
  { name: 'Nedbank Group', industry: 'Financial Services', seta: 'BANKSETA' },
  { name: 'Pick n Pay Stores', industry: 'Retail', seta: 'W&RSETA' },
  { name: 'Tiger Brands', industry: 'Manufacturing', seta: 'FOODBEV' },
  { name: 'Discovery Limited', industry: 'Insurance', seta: 'INSETA' },
  { name: 'Standard Bank Group', industry: 'Financial Services', seta: 'BANKSETA' },
  { name: 'Capitec Bank', industry: 'Financial Services', seta: 'BANKSETA' },
  { name: 'Woolworths Holdings', industry: 'Retail', seta: 'W&RSETA' },
  { name: 'Anglo American SA', industry: 'Mining', seta: 'MQA' },
  { name: 'Eskom Holdings', industry: 'Energy', seta: 'EWSETA' },
  { name: 'Transnet SOC', industry: 'Transport', seta: 'TETA' },
]

const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'James', 'Jessica', 'Robert', 'Michelle', 'Thabo', 'Nomsa', 'Sipho', 'Palesa', 'Kagiso']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Nkosi', 'Dlamini', 'Molefe', 'Mbeki', 'Van der Berg', 'Botha', 'Du Plessis']

const productLines = ['Learnerships', 'TAP Business', 'Compliance Training', 'Other Courses']

const interactionTypes = ['call', 'meeting', 'email', 'whatsapp', 'teams', 'sms']

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))

const generatePhoneNumber = () => {
  const prefixes = ['011', '012', '021', '031', '041', '082', '083', '084', '072', '073', '074']
  return `${randomElement(prefixes)} ${randomNumber(100, 999)} ${randomNumber(1000, 9999)}`
}

const generateEmail = (firstName, lastName, company) => {
  const domain = company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '') + '.co.za'
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
}

const generateVATNumber = () => `4${randomNumber(100000000, 999999999)}`

/**
 * Get current financial year info
 * FY runs March to February, so FY2025 = March 2024 - February 2025
 */
const getFinancialYearInfo = () => {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-indexed
  const currentYear = now.getFullYear()

  // FY end is February (month 1)
  // If we're in Jan-Feb, we're in the FY ending this year
  // If we're in Mar-Dec, we're in the FY ending next year
  const fyEndYear = currentMonth <= 1 ? currentYear : currentYear + 1

  // FY starts in March (month 2) of the previous calendar year
  const fyStartYear = fyEndYear - 1

  // Calculate reporting month (assume current month minus 1 for YTD)
  const reportingMonth = currentMonth === 0 ? 11 : currentMonth - 1

  // Generate all FY months
  const fyMonths = []
  for (let i = 0; i < 12; i++) {
    const monthNum = (2 + i) % 12 // Start from March (2)
    const year = monthNum < 2 ? fyEndYear : fyStartYear // Jan-Feb are in end year
    fyMonths.push({
      month: monthNum,
      year: year,
      key: `${year}-${monthNum}`
    })
  }

  // Determine which months are YTD vs forecast
  const ytdMonths = []
  const forecastMonths = []

  fyMonths.forEach((m, index) => {
    const monthDate = new Date(m.year, m.month, 15)
    const reportingDate = new Date(currentYear, reportingMonth, 15)

    if (monthDate <= reportingDate) {
      ytdMonths.push(m)
    } else {
      forecastMonths.push(m)
    }
  })

  return {
    fyEndYear,
    fyStartYear,
    fyMonths,
    ytdMonths,
    forecastMonths,
    reportingMonth
  }
}

/**
 * Generate learnership deal details for a client
 */
const generateLearnershipDeals = (numDeals, fyInfo) => {
  const deals = []

  for (let i = 0; i < numDeals; i++) {
    const learners = randomNumber(5, 30)
    const costPerLearner = randomNumber(15000, 45000)
    const totalAmount = learners * costPerLearner

    // Payment starts in a random month
    const startMonthIndex = randomNumber(0, 8)
    const startMonth = fyInfo.fyMonths[startMonthIndex]
    const paymentMonths = randomNumber(6, 12)

    deals.push({
      id: `L${i + 1}`,
      name: `${randomElement(['NQF', 'Artisan', 'Business', 'IT', 'Admin'])} Learnership ${i + 1}`,
      description: `${learners} learners at R${costPerLearner.toLocaleString()} each`,
      certaintyPercentage: randomElement([70, 80, 90, 100, 100]),
      learners,
      costPerLearner,
      totalAmount,
      fundingType: randomElement(['SETA', 'Self Funded', 'Tax Rebate']),
      paymentStartDate: `${startMonth.year}-${String(startMonth.month + 1).padStart(2, '0')}-01`,
      paymentFrequency: 'Monthly',
      paymentMonths,
      // Costs
      facilitatorCost: randomNumber(5000, 15000),
      facilitatorCostFrequency: 'Monthly',
      commissionPercentage: randomNumber(5, 15),
      commissionFrequency: 'With Income',
      travelCost: randomNumber(2000, 8000),
      travelCostFrequency: 'Monthly',
      assessorCost: randomNumber(15000, 35000),
      assessorCostFrequency: 'End of Learnership',
      moderatorCost: randomNumber(10000, 25000),
      moderatorCostFrequency: 'End of Learnership',
      otherCost: 0,
      otherCostFrequency: 'Once-off'
    })
  }

  return deals
}

/**
 * Generate TAP Business deal details
 */
const generateTapBusinessDeals = (numDeals, fyInfo) => {
  const deals = []

  for (let i = 0; i < numDeals; i++) {
    const employees = randomNumber(20, 150)
    const costPerEmployee = randomNumber(150, 350)
    const contractMonths = randomElement([6, 12, 12, 24])

    const startMonthIndex = randomNumber(0, 6)
    const startMonth = fyInfo.fyMonths[startMonthIndex]

    deals.push({
      id: `TAP${i + 1}`,
      name: `TAP ${randomElement(['Basic', 'Standard', 'Premium', 'Enterprise'])} Package`,
      description: `${employees} employees on TAP platform`,
      certaintyPercentage: randomElement([80, 90, 100, 100]),
      numberOfEmployees: employees,
      costPerEmployeePerMonth: costPerEmployee,
      paymentStartDate: `${startMonth.year}-${String(startMonth.month + 1).padStart(2, '0')}-01`,
      paymentType: 'Monthly',
      contractMonths,
      commissionPercentage: randomNumber(8, 15),
      commissionFrequency: 'With Income',
      customCostLabel: '',
      customCost: 0,
      customCostFrequency: 'Once-off'
    })
  }

  return deals
}

/**
 * Generate Compliance Training deal details
 */
const generateComplianceDeals = (numDeals, fyInfo) => {
  const courseNames = [
    'First Aid Level 1',
    'First Aid Level 2',
    'Fire Fighter',
    'OHS Representative',
    'Working at Heights',
    'Forklift Operation'
  ]

  const deals = []

  for (let i = 0; i < numDeals; i++) {
    const trainees = randomNumber(10, 50)
    const pricePerPerson = randomNumber(1500, 5500)

    const trainingMonthIndex = randomNumber(0, 10)
    const trainingMonth = fyInfo.fyMonths[trainingMonthIndex]

    deals.push({
      id: `COMP${i + 1}`,
      name: `${randomElement(courseNames)} Training`,
      description: `${trainees} trainees`,
      certaintyPercentage: randomElement([80, 90, 100, 100]),
      courseName: randomElement(courseNames),
      customCourseName: '',
      numberOfTrainees: trainees,
      pricePerPerson,
      trainingDate: `${trainingMonth.year}-${String(trainingMonth.month + 1).padStart(2, '0')}-15`,
      commissionPercentage: randomNumber(5, 12),
      commissionFrequency: 'With Income',
      travelCost: randomNumber(1000, 5000),
      travelCostFrequency: 'Once-off',
      manualsCost: trainees * randomNumber(50, 150),
      manualsCostFrequency: 'Once-off',
      accommodationCost: 0,
      accommodationCostFrequency: 'Once-off',
      accreditationCost: randomNumber(500, 2000),
      accreditationCostFrequency: 'Once-off'
    })
  }

  return deals
}

/**
 * Generate Other Courses deal details
 */
const generateOtherCoursesDeals = (numDeals, fyInfo) => {
  const courseNames = [
    'Excel Advanced',
    'Project Management',
    'Leadership Development',
    'Communication Skills',
    'Sales Training',
    'Customer Service'
  ]

  const deals = []

  for (let i = 0; i < numDeals; i++) {
    const trainees = randomNumber(8, 30)
    const pricePerPerson = randomNumber(2000, 8000)

    const trainingMonthIndex = randomNumber(0, 10)
    const trainingMonth = fyInfo.fyMonths[trainingMonthIndex]

    deals.push({
      id: `COURSE${i + 1}`,
      name: randomElement(courseNames),
      description: `${trainees} participants`,
      certaintyPercentage: randomElement([70, 80, 90, 100]),
      courseName: randomElement(courseNames),
      customCourseName: '',
      numberOfTrainees: trainees,
      pricePerPerson,
      trainingDate: `${trainingMonth.year}-${String(trainingMonth.month + 1).padStart(2, '0')}-15`,
      commissionPercentage: randomNumber(5, 10),
      commissionFrequency: 'With Income',
      travelCost: randomNumber(500, 3000),
      travelCostFrequency: 'Once-off',
      manualsCost: trainees * randomNumber(80, 200),
      manualsCostFrequency: 'Once-off',
      accommodationCost: 0,
      accommodationCostFrequency: 'Once-off',
      accreditationCost: 0,
      accreditationCostFrequency: 'Once-off'
    })
  }

  return deals
}

/**
 * Calculate monthly revenue from deals
 */
const calculateMonthlyRevenueFromDeals = (deals, dealType, fyInfo) => {
  const monthlyRevenue = {}
  let ytdTotal = 0
  let forecastTotal = 0

  // Initialize all months to 0
  fyInfo.fyMonths.forEach(m => {
    monthlyRevenue[m.key] = 0
  })

  deals.forEach(deal => {
    const certainty = (deal.certaintyPercentage || 100) / 100

    if (dealType === 'learnership') {
      // Calculate monthly payment
      const monthlyPayment = (deal.totalAmount / deal.paymentMonths) * certainty
      const startDate = new Date(deal.paymentStartDate)

      for (let i = 0; i < deal.paymentMonths; i++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + i)
        const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`

        if (monthlyRevenue[key] !== undefined) {
          monthlyRevenue[key] += monthlyPayment
        }
      }
    } else if (dealType === 'tap') {
      // TAP Business - monthly recurring
      const monthlyAmount = (deal.numberOfEmployees * deal.costPerEmployeePerMonth) * certainty
      const startDate = new Date(deal.paymentStartDate)

      for (let i = 0; i < deal.contractMonths && i < 12; i++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + i)
        const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`

        if (monthlyRevenue[key] !== undefined) {
          monthlyRevenue[key] += monthlyAmount
        }
      }
    } else if (dealType === 'compliance' || dealType === 'courses') {
      // One-time training - revenue in training month
      const totalAmount = (deal.numberOfTrainees * deal.pricePerPerson) * certainty
      const trainingDate = new Date(deal.trainingDate)
      const key = `${trainingDate.getFullYear()}-${trainingDate.getMonth()}`

      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += totalAmount
      }
    }
  })

  // Calculate YTD and forecast totals
  fyInfo.ytdMonths.forEach(m => {
    ytdTotal += monthlyRevenue[m.key] || 0
  })

  fyInfo.forecastMonths.forEach(m => {
    forecastTotal += monthlyRevenue[m.key] || 0
  })

  return {
    months: monthlyRevenue,
    ytdTotal: Math.round(ytdTotal),
    forecastTotal: Math.round(forecastTotal),
    fullYear: Math.round(ytdTotal + forecastTotal)
  }
}

// Generate seed clients with comprehensive data
export const generateSeedClients = async (count = 10) => {
  const clients = []
  const fyInfo = getFinancialYearInfo()

  for (let i = 0; i < Math.min(count, companyNames.length); i++) {
    const company = companyNames[i]
    const primaryFirstName = randomElement(firstNames)
    const primaryLastName = randomElement(lastNames)
    const hrFirstName = randomElement(firstNames)
    const hrLastName = randomElement(lastNames)
    const sdfFirstName = randomElement(firstNames)
    const sdfLastName = randomElement(lastNames)
    const dmFirstName = randomElement(firstNames)
    const dmLastName = randomElement(lastNames)

    // Generate deal data for this client
    const learnershipDeals = generateLearnershipDeals(randomNumber(1, 3), fyInfo)
    const tapDeals = generateTapBusinessDeals(randomNumber(0, 2), fyInfo)
    const complianceDeals = generateComplianceDeals(randomNumber(1, 4), fyInfo)
    const otherDeals = generateOtherCoursesDeals(randomNumber(0, 3), fyInfo)

    // Calculate revenue from deals
    const learnershipRevenue = calculateMonthlyRevenueFromDeals(learnershipDeals, 'learnership', fyInfo)
    const tapRevenue = calculateMonthlyRevenueFromDeals(tapDeals, 'tap', fyInfo)
    const complianceRevenue = calculateMonthlyRevenueFromDeals(complianceDeals, 'compliance', fyInfo)
    const otherRevenue = calculateMonthlyRevenueFromDeals(otherDeals, 'courses', fyInfo)

    // Total YTD revenue for client
    const totalYtdRevenue = learnershipRevenue.ytdTotal + tapRevenue.ytdTotal +
                           complianceRevenue.ytdTotal + otherRevenue.ytdTotal

    // Total pipeline value (forecast)
    const pipelineValue = learnershipRevenue.forecastTotal + tapRevenue.forecastTotal +
                          complianceRevenue.forecastTotal + otherRevenue.forecastTotal

    const clientData = {
      name: company.name,
      legalName: company.name + ' (Pty) Ltd',
      tradingName: company.name,
      type: randomElement(['Corporate', 'Corporate', 'Corporate', 'School', 'Program']),
      status: randomElement(['Active', 'Active', 'Active', 'Prospect', 'Pending']),
      industry: company.industry,
      sector: company.industry,
      seta: company.seta,
      bbbeeLevel: randomElement(['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Non-Compliant']),
      vatNumber: generateVATNumber(),

      primaryContact: `${primaryFirstName} ${primaryLastName}`,
      contactEmail: generateEmail(primaryFirstName, primaryLastName, company.name),
      phone: generatePhoneNumber(),

      hrContactPerson: `${hrFirstName} ${hrLastName}`,
      hrContactEmail: generateEmail(hrFirstName, hrLastName, company.name),
      hrContactPhone: generatePhoneNumber(),

      sdfName: `${sdfFirstName} ${sdfLastName}`,
      sdfEmail: generateEmail(sdfFirstName, sdfLastName, company.name),
      sdfPhone: generatePhoneNumber(),

      decisionMakerName: `${dmFirstName} ${dmLastName}`,
      decisionMakerEmail: generateEmail(dmFirstName, dmLastName, company.name),
      decisionMakerPhone: generatePhoneNumber(),

      physicalAddress: `${randomNumber(1, 500)} ${randomElement(['Main', 'Church', 'Long', 'Voortrekker', 'Jan Smuts'])} Street, ${randomElement(['Sandton', 'Cape Town', 'Durban', 'Pretoria', 'Johannesburg'])}`,

      currentLmsUsage: randomElement(['Yes', 'No', 'No']),
      lmsId: `LMS-${randomNumber(1000, 9999)}`,

      assignedSalesPerson: randomElement(['Sales Rep 1', 'Sales Rep 2', 'Sales Rep 3']),
      financialYearEnd: 'February',

      // These values match the calculated financials
      ytdRevenue: totalYtdRevenue,
      pipelineValue: pipelineValue,

      notes: `Key client in the ${company.industry} sector. ${randomElement(['High growth potential.', 'Consistent performer.', 'New relationship - nurture carefully.', 'Long-standing partner.'])}`,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastContact: Timestamp.fromDate(randomDate(new Date(2024, 0, 1), new Date())),

      // Store deal data for financial generation
      _seedData: {
        learnershipDeals,
        tapDeals,
        complianceDeals,
        otherDeals,
        learnershipRevenue,
        tapRevenue,
        complianceRevenue,
        otherRevenue
      }
    }

    try {
      const docRef = await addDoc(collection(db, 'clients'), clientData)
      clients.push({ id: docRef.id, ...clientData })
      console.log(`Created client: ${company.name}`)
    } catch (error) {
      console.error(`Error creating client ${company.name}:`, error)
    }
  }

  return clients
}

// Generate interactions for a client
export const generateSeedInteractions = async (clientId, count = 10) => {
  const interactions = []
  const summaries = [
    'Discussed upcoming training requirements',
    'Followed up on quote sent last week',
    'Resolved billing query',
    'Presented new compliance courses',
    'Scheduled site visit for assessment',
    'Confirmed learnership intake dates',
    'Addressed concerns about course quality',
    'Introduced new facilitator team',
    'Discussed annual training calendar',
    'Reviewed learnership progress report'
  ]

  for (let i = 0; i < count; i++) {
    const userName = `${randomElement(firstNames)} ${randomElement(lastNames)}`
    const interactionData = {
      type: randomElement(interactionTypes),
      summary: randomElement(summaries),
      notes: `${randomElement(['Good call', 'Productive meeting', 'Quick follow-up', 'Important discussion'])}. ${randomElement(['Client is happy with service.', 'Need to send additional info.', 'Ready to proceed.', 'Considering options.'])}`,
      documentsShared: randomElement(['', 'Quote', 'Proposal', 'Contract', 'Course catalogue']),
      objectionsRaised: randomElement(['', '', 'Budget constraints', 'Timing issues', 'Need approval from board']),
      nextSteps: randomElement(['Send quote', 'Schedule meeting', 'Follow up next week', 'Prepare proposal', 'Await client response']),
      userId: `user_${randomNumber(1, 5)}`,
      userName: userName,
      timestamp: Timestamp.fromDate(randomDate(new Date(2024, 0, 1), new Date())),
      createdAt: serverTimestamp()
    }

    try {
      const docRef = await addDoc(collection(db, 'clients', clientId, 'interactions'), interactionData)
      interactions.push({ id: docRef.id, ...interactionData })
    } catch (error) {
      console.error('Error creating interaction:', error)
    }
  }

  return interactions
}

// Generate quotes for a client - matching financial data
export const generateSeedQuotes = async (clientId, clientName, seedData) => {
  const quotes = []
  const fyInfo = getFinancialYearInfo()

  // Create quotes that match the financial forecasts
  const quoteData = [
    { product: 'Learnerships', revenue: seedData.learnershipRevenue },
    { product: 'TAP Business', revenue: seedData.tapRevenue },
    { product: 'Compliance Training', revenue: seedData.complianceRevenue },
    { product: 'Other Courses', revenue: seedData.otherRevenue }
  ]

  for (const item of quoteData) {
    if (item.revenue.fullYear > 0) {
      const quoteDoc = {
        clientId,
        clientName,
        quoteNumber: `QT-${fyInfo.fyEndYear}-${randomNumber(1000, 9999)}`,
        product: item.product,
        amount: item.revenue.fullYear,
        date: Timestamp.fromDate(randomDate(new Date(2024, 2, 1), new Date())),
        validUntil: Timestamp.fromDate(new Date(fyInfo.fyEndYear, 1, 28)), // Valid until FY end
        status: item.revenue.ytdTotal > 0 ? 'Accepted' : randomElement(['Sent', 'Pending']),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      try {
        const docRef = await addDoc(collection(db, 'quotes'), quoteDoc)
        quotes.push({ id: docRef.id, ...quoteDoc })
      } catch (error) {
        console.error('Error creating quote:', error)
      }
    }
  }

  return quotes
}

// Generate invoices matching YTD financials
export const generateSeedInvoices = async (clientId, clientName, seedData) => {
  const invoices = []
  const fyInfo = getFinancialYearInfo()

  // Create invoices for each product line's YTD revenue
  const invoiceData = [
    { product: 'Learnerships', revenue: seedData.learnershipRevenue, months: seedData.learnershipRevenue.months },
    { product: 'TAP Business', revenue: seedData.tapRevenue, months: seedData.tapRevenue.months },
    { product: 'Compliance Training', revenue: seedData.complianceRevenue, months: seedData.complianceRevenue.months },
    { product: 'Other Courses', revenue: seedData.otherRevenue, months: seedData.otherRevenue.months }
  ]

  for (const item of invoiceData) {
    // Create invoices for YTD months with revenue
    for (const m of fyInfo.ytdMonths) {
      const monthRevenue = item.months[m.key] || 0
      if (monthRevenue > 0) {
        const issueDate = new Date(m.year, m.month, randomNumber(1, 15))
        const dueDate = new Date(issueDate)
        dueDate.setDate(dueDate.getDate() + 30)

        const invoiceDoc = {
          clientId,
          clientName,
          invoiceNumber: `INV-${m.year}-${randomNumber(1000, 9999)}`,
          product: item.product,
          amount: Math.round(monthRevenue),
          issueDate: Timestamp.fromDate(issueDate),
          dueDate: Timestamp.fromDate(dueDate),
          status: randomElement(['Paid', 'Paid', 'Paid', 'Unpaid']), // Most YTD invoices are paid
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        try {
          const docRef = await addDoc(collection(db, 'invoices'), invoiceDoc)
          invoices.push({ id: docRef.id, ...invoiceDoc })
        } catch (error) {
          console.error('Error creating invoice:', error)
        }
      }
    }
  }

  return invoices
}

// Generate follow-up tasks for a client
export const generateSeedTasks = async (clientId, clientName, count = 5) => {
  const tasks = []
  const descriptions = [
    'Send updated quote',
    'Schedule training needs assessment',
    'Follow up on outstanding invoice',
    'Prepare quarterly review presentation',
    'Confirm learner registration details',
    'Send course completion certificates',
    'Review contract renewal terms',
    'Discuss expansion opportunities'
  ]

  for (let i = 0; i < count; i++) {
    const dueDate = randomDate(new Date(2024, 6, 1), new Date(2025, 6, 1))

    const taskData = {
      clientId,
      clientName,
      description: randomElement(descriptions),
      type: randomElement(['call', 'email', 'meeting', 'document', 'review']),
      status: randomElement(['pending', 'pending', 'pending', 'completed']),
      priority: randomElement(['High', 'Medium', 'Low']),
      dueDate: Timestamp.fromDate(dueDate),
      assignedTo: `user_${randomNumber(1, 5)}`,
      assignedToName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      notes: randomElement(['', 'Important client', 'Follow up from last meeting', 'Urgent request']),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      const docRef = await addDoc(collection(db, 'followUpTasks'), taskData)
      tasks.push({ id: docRef.id, ...taskData })
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  return tasks
}

// Generate client financials with deal details - matching invoices and client totals
export const generateSeedFinancials = async (clientId, clientName, seedData) => {
  const financials = []
  const fyInfo = getFinancialYearInfo()
  const financialYear = fyInfo.fyEndYear

  // Generate financial history (previous years)
  const generateHistory = (currentYtd) => {
    const yearMinus1 = Math.round(currentYtd * randomNumber(80, 120) / 100 + randomNumber(10000, 50000))
    const yearMinus2 = Math.round(yearMinus1 * randomNumber(85, 110) / 100 + randomNumber(5000, 30000))
    const yearMinus3 = Math.round(yearMinus2 * randomNumber(80, 105) / 100)
    return { yearMinus3, yearMinus2, yearMinus1 }
  }

  // Learnerships
  const learnershipHistory = generateHistory(seedData.learnershipRevenue.ytdTotal)
  const learnershipFinancialId = `${clientId}_${financialYear}_Learnerships`
  const learnershipData = {
    clientId,
    clientName,
    financialYear,
    productLine: 'Learnerships',
    history: {
      ...learnershipHistory,
      currentYearYTD: seedData.learnershipRevenue.ytdTotal
    },
    months: seedData.learnershipRevenue.months,
    fullYearForecast: seedData.learnershipRevenue.fullYear,
    learnershipDetails: seedData.learnershipDeals,
    comments: randomElement(['On track', 'Strong learnership pipeline', 'Good SETA relationships']),
    createdAt: serverTimestamp(),
    lastUpdatedBy: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
    lastUpdatedAt: serverTimestamp()
  }

  try {
    await setDoc(doc(db, 'clientFinancials', learnershipFinancialId), learnershipData)
    financials.push({ id: learnershipFinancialId, ...learnershipData })
  } catch (error) {
    console.error('Error creating learnership financial:', error)
  }

  // TAP Business
  if (seedData.tapRevenue.fullYear > 0 || seedData.tapDeals.length > 0) {
    const tapHistory = generateHistory(seedData.tapRevenue.ytdTotal)
    const tapFinancialId = `${clientId}_${financialYear}_TAP_Business`
    const tapData = {
      clientId,
      clientName,
      financialYear,
      productLine: 'TAP Business',
      history: {
        ...tapHistory,
        currentYearYTD: seedData.tapRevenue.ytdTotal
      },
      months: seedData.tapRevenue.months,
      fullYearForecast: seedData.tapRevenue.fullYear,
      tapBusinessDetails: seedData.tapDeals,
      comments: randomElement(['Recurring revenue stream', 'Growing user base', 'Renewal pending']),
      createdAt: serverTimestamp(),
      lastUpdatedBy: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      lastUpdatedAt: serverTimestamp()
    }

    try {
      await setDoc(doc(db, 'clientFinancials', tapFinancialId), tapData)
      financials.push({ id: tapFinancialId, ...tapData })
    } catch (error) {
      console.error('Error creating TAP financial:', error)
    }
  }

  // Compliance Training
  const complianceHistory = generateHistory(seedData.complianceRevenue.ytdTotal)
  const complianceFinancialId = `${clientId}_${financialYear}_Compliance_Training`
  const complianceData = {
    clientId,
    clientName,
    financialYear,
    productLine: 'Compliance Training',
    history: {
      ...complianceHistory,
      currentYearYTD: seedData.complianceRevenue.ytdTotal
    },
    months: seedData.complianceRevenue.months,
    fullYearForecast: seedData.complianceRevenue.fullYear,
    complianceDetails: seedData.complianceDeals,
    comments: randomElement(['Annual compliance schedule', 'Multiple site visits planned', 'First aid focus']),
    createdAt: serverTimestamp(),
    lastUpdatedBy: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
    lastUpdatedAt: serverTimestamp()
  }

  try {
    await setDoc(doc(db, 'clientFinancials', complianceFinancialId), complianceData)
    financials.push({ id: complianceFinancialId, ...complianceData })
  } catch (error) {
    console.error('Error creating compliance financial:', error)
  }

  // Other Courses
  if (seedData.otherRevenue.fullYear > 0 || seedData.otherDeals.length > 0) {
    const otherHistory = generateHistory(seedData.otherRevenue.ytdTotal)
    const otherFinancialId = `${clientId}_${financialYear}_Other_Courses`
    const otherData = {
      clientId,
      clientName,
      financialYear,
      productLine: 'Other Courses',
      history: {
        ...otherHistory,
        currentYearYTD: seedData.otherRevenue.ytdTotal
      },
      months: seedData.otherRevenue.months,
      fullYearForecast: seedData.otherRevenue.fullYear,
      otherCoursesDetails: seedData.otherDeals,
      comments: randomElement(['Skills development focus', 'Leadership pipeline', 'Excel training popular']),
      createdAt: serverTimestamp(),
      lastUpdatedBy: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      lastUpdatedAt: serverTimestamp()
    }

    try {
      await setDoc(doc(db, 'clientFinancials', otherFinancialId), otherData)
      financials.push({ id: otherFinancialId, ...otherData })
    } catch (error) {
      console.error('Error creating other courses financial:', error)
    }
  }

  return financials
}

// Generate feedback/comments for a client
export const generateSeedFeedback = async (clientId, clientName, count = 5) => {
  const feedbackItems = []
  const contents = [
    'Client expressed satisfaction with recent training program.',
    'Need to address concerns about facilitator availability.',
    'Excellent feedback from learners on course content.',
    'Budget approval pending for next quarter.',
    'Client interested in expanding to additional departments.',
    'Follow up required on workplace assessment dates.',
    'Great relationship - key account to nurture.',
    'Client prefers communication via email.'
  ]

  for (let i = 0; i < count; i++) {
    const userName = `${randomElement(firstNames)} ${randomElement(lastNames)}`

    const feedbackData = {
      clientId,
      clientName,
      type: randomElement(['comment', 'feedback', 'note']),
      content: randomElement(contents),
      date: Timestamp.fromDate(randomDate(new Date(2024, 0, 1), new Date())),
      userName,
      userId: `user_${randomNumber(1, 5)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      const docRef = await addDoc(collection(db, 'feedback'), feedbackData)
      feedbackItems.push({ id: docRef.id, ...feedbackData })
    } catch (error) {
      console.error('Error creating feedback:', error)
    }
  }

  return feedbackItems
}

// Generate contracts for a client
export const generateSeedContracts = async (clientId, count = 3) => {
  const contracts = []
  const contractTypes = ['Service Agreement', 'Learnership Agreement', 'Training Contract', 'SLA']

  for (let i = 0; i < count; i++) {
    const startDate = randomDate(new Date(2023, 0, 1), new Date(2024, 6, 1))
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + randomNumber(1, 3))

    const contractData = {
      name: `${randomElement(contractTypes)} - ${new Date().getFullYear()}`,
      type: randomElement(contractTypes),
      value: randomNumber(50000, 2000000),
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      status: randomElement(['Active', 'Active', 'Expired', 'Pending Renewal']),
      documentUrl: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      const docRef = await addDoc(collection(db, 'clients', clientId, 'contracts'), contractData)
      contracts.push({ id: docRef.id, ...contractData })
    } catch (error) {
      console.error('Error creating contract:', error)
    }
  }

  return contracts
}

// Generate deals for sales pipeline
export const generateSeedDeals = async (clientId, clientName, seedData) => {
  const deals = []
  const fyInfo = getFinancialYearInfo()

  // Create deals from the forecast data
  const dealSources = [
    { product: 'Learnerships', details: seedData.learnershipDeals, revenue: seedData.learnershipRevenue },
    { product: 'TAP Business', details: seedData.tapDeals, revenue: seedData.tapRevenue },
    { product: 'Compliance Training', details: seedData.complianceDeals, revenue: seedData.complianceRevenue },
    { product: 'Other Courses', details: seedData.otherDeals, revenue: seedData.otherRevenue }
  ]

  for (const source of dealSources) {
    if (source.revenue.forecastTotal > 0) {
      // Determine stage based on certainty
      const avgCertainty = source.details.length > 0
        ? source.details.reduce((sum, d) => sum + (d.certaintyPercentage || 100), 0) / source.details.length
        : 80

      let stage = 'proposal'
      if (avgCertainty >= 95) stage = 'negotiation'
      else if (avgCertainty >= 85) stage = 'proposal'
      else if (avgCertainty >= 70) stage = 'qualification'
      else stage = 'discovery'

      const dealData = {
        clientId,
        clientName,
        name: `${clientName} - ${source.product} FY${fyInfo.fyEndYear}`,
        product: source.product,
        value: source.revenue.forecastTotal,
        stage,
        probability: Math.round(avgCertainty),
        expectedCloseDate: Timestamp.fromDate(new Date(fyInfo.fyEndYear, 1, 28)), // End of FY
        lastContact: Timestamp.fromDate(randomDate(new Date(2024, 6, 1), new Date())),
        notes: `${source.details.length} deal(s) in pipeline`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      try {
        const docRef = await addDoc(collection(db, 'deals'), dealData)
        deals.push({ id: docRef.id, ...dealData })
      } catch (error) {
        console.error('Error creating deal:', error)
      }
    }
  }

  return deals
}

// Master seed function - generates all data for specified number of clients
export const seedAllData = async (clientCount = 10) => {
  console.log(`Starting seed data generation for ${clientCount} clients...`)
  console.log('Financial Year Info:', getFinancialYearInfo())

  try {
    // Generate clients with embedded seed data
    const clients = await generateSeedClients(clientCount)
    console.log(`Created ${clients.length} clients`)

    // For each client, generate related data
    for (const client of clients) {
      console.log(`Generating data for ${client.name}...`)

      const seedData = client._seedData

      await generateSeedInteractions(client.id, randomNumber(5, 15))
      await generateSeedQuotes(client.id, client.name, seedData)
      await generateSeedInvoices(client.id, client.name, seedData)
      await generateSeedTasks(client.id, client.name, randomNumber(3, 8))
      await generateSeedFinancials(client.id, client.name, seedData)
      await generateSeedFeedback(client.id, client.name, randomNumber(3, 8))
      await generateSeedContracts(client.id, randomNumber(1, 4))
      await generateSeedDeals(client.id, client.name, seedData)

      console.log(`Completed data for ${client.name}`)
    }

    console.log('Seed data generation complete!')
    return { success: true, clientCount: clients.length }
  } catch (error) {
    console.error('Error during seed data generation:', error)
    return { success: false, error: error.message }
  }
}

export default seedAllData
