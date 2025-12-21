import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Clear all collections (for reset)
 */
export const clearAllData = async () => {
  try {
    const batch = writeBatch(db)

    // Clear clients and subcollections
    const clientsSnapshot = await getDocs(collection(db, 'clients'))
    for (const clientDoc of clientsSnapshot.docs) {
      // Clear subcollections
      const productsSnapshot = await getDocs(collection(db, 'clients', clientDoc.id, 'products'))
      productsSnapshot.docs.forEach(productDoc => {
        batch.delete(doc(db, 'clients', clientDoc.id, 'products', productDoc.id))
      })

      const contractsSnapshot = await getDocs(collection(db, 'clients', clientDoc.id, 'contracts'))
      contractsSnapshot.docs.forEach(contractDoc => {
        batch.delete(doc(db, 'clients', clientDoc.id, 'contracts', contractDoc.id))
      })

      const activitiesSnapshot = await getDocs(collection(db, 'clients', clientDoc.id, 'activities'))
      activitiesSnapshot.docs.forEach(activityDoc => {
        batch.delete(doc(db, 'clients', clientDoc.id, 'activities', activityDoc.id))
      })

      const interactionsSnapshot = await getDocs(collection(db, 'clients', clientDoc.id, 'interactions'))
      interactionsSnapshot.docs.forEach(interactionDoc => {
        batch.delete(doc(db, 'clients', clientDoc.id, 'interactions', interactionDoc.id))
      })

      batch.delete(doc(db, 'clients', clientDoc.id))
    }

    // Clear other collections
    const collections = ['deals', 'quotes', 'invoices', 'messages', 'forecasts', 'feedback', 'financialDashboard', 'clientFinancials', 'followUpTasks']

    for (const collName of collections) {
      const snapshot = await getDocs(collection(db, collName))
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    }

    await batch.commit()
    console.log('All data cleared successfully')
  } catch (error) {
    console.error('Error clearing data:', error)
    throw error
  }
}

/**
 * Seed all test data - 5 clients with comprehensive history
 * @param {Object} userIds - Object with salesPerson1, salesPerson2, admin, manager user IDs
 */
export const seedAllData = async (userIds = {}) => {
  try {
    // Use provided user IDs or try to auto-detect
    let salesPerson1 = userIds.salesPerson1
    let salesPerson2 = userIds.salesPerson2
    let admin = userIds.admin
    let manager = userIds.manager

    // If not provided, try to auto-detect from Firestore
    if (!salesPerson1 || !salesPerson2) {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      if (!salesPerson1) {
        salesPerson1 = users.find(u => u.email?.toLowerCase().includes('sales') || u.title?.toLowerCase().includes('sales'))?.id || users[0]?.id || 'salesperson1'
      }
      if (!salesPerson2) {
        salesPerson2 = users.find(u => u.id !== salesPerson1 && (u.email?.toLowerCase().includes('sales') || u.title?.toLowerCase().includes('sales')))?.id || users[1]?.id || 'salesperson2'
      }
      if (!admin) {
        admin = users.find(u => u.email?.toLowerCase().includes('admin') || u.title?.toLowerCase().includes('admin'))?.id || users[2]?.id || 'admin'
      }
      if (!manager) {
        manager = users.find(u => u.email?.toLowerCase().includes('manager') || u.title?.toLowerCase().includes('manager'))?.id || users[3]?.id || 'manager'
      }
    }

    console.log('Using user IDs:', { salesPerson1, salesPerson2, admin, manager })

    const batch = writeBatch(db)

    // Seed Financial Dashboard Data
    // Note: fullYear = ytd + forecast
    const financialDashboardData = {
      learnerships: {
        previousYear: 2800000,
        ytd: 1850000,
        forecast: 2100000,
        fullYear: 3950000  // 1,850,000 + 2,100,000
      },
      tapBusiness: {
        previousYear: 1900000,
        ytd: 1250000,
        forecast: 1450000,
        fullYear: 2700000  // 1,250,000 + 1,450,000
      },
      compliance: {
        previousYear: 920000,
        ytd: 580000,
        forecast: 680000,
        fullYear: 1260000  // 580,000 + 680,000
      },
      otherCourses: {
        previousYear: 420000,
        ytd: 260000,
        forecast: 330000,
        fullYear: 590000  // 260,000 + 330,000
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    batch.set(doc(db, 'financialDashboard', 'main'), financialDashboardData)

    // ========================================
    // 5 CLIENTS ONLY - Comprehensive seed data
    // ========================================
    const clients = [
      {
        id: 'client1',
        name: 'ABC Manufacturing',
        legalName: 'ABC Manufacturing (Pty) Ltd',
        tradingName: 'ABC Manufacturing',
        type: 'Corporate',
        status: 'Active',
        industry: 'Manufacturing',
        sector: 'Heavy Industry',
        seta: 'MERSETA',
        bbbeeLevel: 'Level 2',
        vatNumber: '4123456789',
        address: '123 Industrial Road, Johannesburg, 2000',
        physicalAddress: '123 Industrial Road, Johannesburg, 2000',
        country: 'South Africa',
        financialYearEnd: 'February',
        sharePointLink: 'https://sharepoint.com/abc-manufacturing',
        primaryContact: 'John Smith',
        contactEmail: 'john.smith@abcmanufacturing.co.za',
        phone: '011 555 1234',
        hrContactPerson: 'Sarah Williams',
        hrContactEmail: 's.williams@abcmanufacturing.co.za',
        hrContactPhone: '011 555 1235',
        sdfName: 'Michael Jones',
        sdfEmail: 'm.jones@abcmanufacturing.co.za',
        sdfPhone: '011 555 1236',
        decisionMakerName: 'Peter van der Berg',
        decisionMakerEmail: 'p.vanderberg@abcmanufacturing.co.za',
        decisionMakerPhone: '011 555 1237',
        currentLmsUsage: 'Yes',
        lmsId: 'LMS-1001',
        ytdRevenue: 1250000,
        pipelineValue: 450000,
        lastContact: Timestamp.fromDate(new Date('2025-01-15')),
        assignedSalesPerson: salesPerson1,
        notes: 'Key manufacturing client. Strong learnership pipeline.',
        createdAt: Timestamp.fromDate(new Date('2024-01-10')),
        updatedAt: serverTimestamp()
      },
      {
        id: 'client2',
        name: 'Tech Solutions SA',
        legalName: 'Tech Solutions South Africa (Pty) Ltd',
        tradingName: 'Tech Solutions',
        type: 'Corporate',
        status: 'Active',
        industry: 'Technology',
        sector: 'IT Services',
        seta: 'MICT SETA',
        bbbeeLevel: 'Level 1',
        vatNumber: '4234567890',
        address: '456 Innovation Drive, Cape Town, 8001',
        physicalAddress: '456 Innovation Drive, Cape Town, 8001',
        country: 'South Africa',
        financialYearEnd: 'December',
        sharePointLink: 'https://sharepoint.com/tech-solutions',
        primaryContact: 'Sarah Johnson',
        contactEmail: 'sarah.j@techsolutions.co.za',
        phone: '021 555 2345',
        hrContactPerson: 'David Brown',
        hrContactEmail: 'd.brown@techsolutions.co.za',
        hrContactPhone: '021 555 2346',
        sdfName: 'Emily Davis',
        sdfEmail: 'e.davis@techsolutions.co.za',
        sdfPhone: '021 555 2347',
        decisionMakerName: 'Robert Chen',
        decisionMakerEmail: 'r.chen@techsolutions.co.za',
        decisionMakerPhone: '021 555 2348',
        currentLmsUsage: 'Yes',
        lmsId: 'LMS-1002',
        ytdRevenue: 980000,
        pipelineValue: 320000,
        lastContact: Timestamp.fromDate(new Date('2025-01-20')),
        assignedSalesPerson: salesPerson1,
        notes: 'Growing tech company with focus on digital skills training.',
        createdAt: Timestamp.fromDate(new Date('2024-02-15')),
        updatedAt: serverTimestamp()
      },
      {
        id: 'client3',
        name: 'Greenfield High School',
        legalName: 'Greenfield High School',
        tradingName: 'Greenfield High',
        type: 'School',
        status: 'Active',
        industry: 'Education',
        sector: 'Secondary Education',
        seta: 'ETDP SETA',
        bbbeeLevel: 'Level 3',
        vatNumber: '4345678901',
        address: '789 Education Street, Durban, 4001',
        physicalAddress: '789 Education Street, Durban, 4001',
        country: 'South Africa',
        financialYearEnd: 'December',
        sharePointLink: 'https://sharepoint.com/greenfield-high',
        primaryContact: 'Michael Brown',
        contactEmail: 'm.brown@greenfieldhigh.co.za',
        phone: '031 555 3456',
        hrContactPerson: 'Lisa Anderson',
        hrContactEmail: 'l.anderson@greenfieldhigh.co.za',
        hrContactPhone: '031 555 3457',
        sdfName: 'James Wilson',
        sdfEmail: 'j.wilson@greenfieldhigh.co.za',
        sdfPhone: '031 555 3458',
        decisionMakerName: 'Principal Nkosi',
        decisionMakerEmail: 'principal@greenfieldhigh.co.za',
        decisionMakerPhone: '031 555 3459',
        currentLmsUsage: 'No',
        lmsId: '',
        ytdRevenue: 450000,
        pipelineValue: 180000,
        lastContact: Timestamp.fromDate(new Date('2025-01-18')),
        assignedSalesPerson: salesPerson2,
        notes: 'School client focused on compliance and staff training.',
        createdAt: Timestamp.fromDate(new Date('2024-03-01')),
        updatedAt: serverTimestamp()
      },
      {
        id: 'client4',
        name: 'Metro Logistics',
        legalName: 'Metro Logistics Group (Pty) Ltd',
        tradingName: 'Metro Logistics',
        type: 'Corporate',
        status: 'Active',
        industry: 'Transport & Logistics',
        sector: 'Freight',
        seta: 'TETA',
        bbbeeLevel: 'Level 2',
        vatNumber: '4456789012',
        address: '321 Transport Avenue, Pretoria, 0001',
        physicalAddress: '321 Transport Avenue, Pretoria, 0001',
        country: 'South Africa',
        financialYearEnd: 'June',
        sharePointLink: 'https://sharepoint.com/metro-logistics',
        primaryContact: 'Lisa Williams',
        contactEmail: 'l.williams@metrologistics.co.za',
        phone: '012 555 4567',
        hrContactPerson: 'Thomas Moore',
        hrContactEmail: 't.moore@metrologistics.co.za',
        hrContactPhone: '012 555 4568',
        sdfName: 'Patricia Taylor',
        sdfEmail: 'p.taylor@metrologistics.co.za',
        sdfPhone: '012 555 4569',
        decisionMakerName: 'CEO Molefe',
        decisionMakerEmail: 'ceo@metrologistics.co.za',
        decisionMakerPhone: '012 555 4570',
        currentLmsUsage: 'Yes',
        lmsId: 'LMS-1004',
        ytdRevenue: 780000,
        pipelineValue: 250000,
        lastContact: Timestamp.fromDate(new Date('2025-01-10')),
        assignedSalesPerson: salesPerson2,
        notes: 'Strong compliance training needs for drivers and warehouse staff.',
        createdAt: Timestamp.fromDate(new Date('2024-04-20')),
        updatedAt: serverTimestamp()
      },
      {
        id: 'client5',
        name: 'Premier Academy',
        legalName: 'Premier Academy Trust',
        tradingName: 'Premier Academy',
        type: 'School',
        status: 'Prospect',
        industry: 'Education',
        sector: 'Primary & Secondary Education',
        seta: 'ETDP SETA',
        bbbeeLevel: 'Level 4',
        vatNumber: '4567890123',
        address: '654 Learning Lane, Port Elizabeth, 6001',
        physicalAddress: '654 Learning Lane, Port Elizabeth, 6001',
        country: 'South Africa',
        financialYearEnd: 'December',
        sharePointLink: '',
        primaryContact: 'David Miller',
        contactEmail: 'd.miller@premieracademy.co.za',
        phone: '041 555 5678',
        hrContactPerson: 'Jennifer Clark',
        hrContactEmail: 'j.clark@premieracademy.co.za',
        hrContactPhone: '041 555 5679',
        sdfName: 'Richard Harris',
        sdfEmail: 'r.harris@premieracademy.co.za',
        sdfPhone: '041 555 5680',
        decisionMakerName: 'Board Chair Dlamini',
        decisionMakerEmail: 'board@premieracademy.co.za',
        decisionMakerPhone: '041 555 5681',
        currentLmsUsage: 'No',
        lmsId: '',
        ytdRevenue: 0,
        pipelineValue: 150000,
        lastContact: Timestamp.fromDate(new Date('2025-01-05')),
        assignedSalesPerson: salesPerson1,
        notes: 'New prospect - interested in full training solution.',
        createdAt: Timestamp.fromDate(new Date('2024-12-15')),
        updatedAt: serverTimestamp()
      }
    ]

    // Add clients
    for (const client of clients) {
      const { id, ...clientData } = client
      batch.set(doc(db, 'clients', id), clientData)
    }

    // ============================================================================
    // Client Financials - Detailed forecasting data for each client + product line
    // ============================================================================
    const currentFinancialYear = 2025

    const clientFinancialsData = [
      // Client 1 - ABC Manufacturing
      {
        id: 'client1_2025_Learnerships',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        financialYear: 2025,
        productLine: 'Learnerships',
        history: { yearMinus3: 280000, yearMinus2: 350000, yearMinus1: 420000, currentYearYTD: 320000 },
        fullYearForecast: 520000,
        learnershipDetails: [
          {
            id: 'L1',
            name: 'NQF4 Business Admin Learnership',
            description: '15 learners in business administration',
            certaintyPercentage: 100,
            learners: 15,
            costPerLearner: 28000,
            fundingType: 'SETA',
            paymentStartDate: '2024-04-01',
            paymentFrequency: 'Monthly',
            paymentMonths: 12
          }
        ],
        months: {},
        comments: 'Strong learnership uptake expected',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client1_2025_TAP_Business',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        financialYear: 2025,
        productLine: 'TAP Business',
        history: { yearMinus3: 180000, yearMinus2: 220000, yearMinus1: 280000, currentYearYTD: 180000 },
        fullYearForecast: 350000,
        tapBusinessDetails: [
          {
            id: 'TAP1',
            name: 'TAP Premium Package',
            description: '28 employees on TAP platform',
            certaintyPercentage: 100,
            numberOfEmployees: 28,
            costPerEmployeePerMonth: 250,
            paymentStartDate: '2024-02-01',
            paymentType: 'Monthly',
            contractMonths: 18
          }
        ],
        months: {},
        comments: 'Renewal pending',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client1_2025_Compliance_Training',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        financialYear: 2025,
        productLine: 'Compliance Training',
        history: { yearMinus3: 85000, yearMinus2: 95000, yearMinus1: 120000, currentYearYTD: 75000 },
        fullYearForecast: 180000,
        complianceDetails: [
          {
            id: 'COMP1',
            name: 'First Aid Level 1 Training',
            description: '25 trainees',
            certaintyPercentage: 100,
            courseName: 'First Aid Level 1',
            numberOfTrainees: 25,
            pricePerPerson: 2800,
            trainingDate: '2024-06-15'
          }
        ],
        months: {},
        comments: 'Annual compliance cycle',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client1_2025_Other_Courses',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        financialYear: 2025,
        productLine: 'Other Courses',
        history: { yearMinus3: 45000, yearMinus2: 55000, yearMinus1: 65000, currentYearYTD: 35000 },
        fullYearForecast: 95000,
        otherCoursesDetails: [
          {
            id: 'COURSE1',
            name: 'Excel Advanced Training',
            description: '12 participants',
            certaintyPercentage: 80,
            courseName: 'Excel Advanced',
            numberOfTrainees: 12,
            pricePerPerson: 3500,
            trainingDate: '2025-03-20'
          }
        ],
        months: {},
        comments: 'Skills development focus',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      // Client 2 - Tech Solutions
      {
        id: 'client2_2025_Learnerships',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        financialYear: 2025,
        productLine: 'Learnerships',
        history: { yearMinus3: 150000, yearMinus2: 200000, yearMinus1: 280000, currentYearYTD: 220000 },
        fullYearForecast: 380000,
        learnershipDetails: [
          {
            id: 'L2',
            name: 'IT Support Learnership',
            description: '10 learners in IT support',
            certaintyPercentage: 100,
            learners: 10,
            costPerLearner: 32000,
            fundingType: 'Self Funded',
            paymentStartDate: '2024-05-01',
            paymentFrequency: 'Monthly',
            paymentMonths: 12
          }
        ],
        months: {},
        comments: 'Tech focused learnerships',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client2_2025_TAP_Business',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        financialYear: 2025,
        productLine: 'TAP Business',
        history: { yearMinus3: 220000, yearMinus2: 280000, yearMinus1: 350000, currentYearYTD: 280000 },
        fullYearForecast: 450000,
        tapBusinessDetails: [
          {
            id: 'TAP2',
            name: 'TAP Enterprise Package',
            description: '35 employees on TAP platform',
            certaintyPercentage: 100,
            numberOfEmployees: 35,
            costPerEmployeePerMonth: 300,
            paymentStartDate: '2024-03-01',
            paymentType: 'Monthly',
            contractMonths: 18
          }
        ],
        months: {},
        comments: 'Growing user base',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client2_2025_Other_Courses',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        financialYear: 2025,
        productLine: 'Other Courses',
        history: { yearMinus3: 60000, yearMinus2: 80000, yearMinus1: 95000, currentYearYTD: 65000 },
        fullYearForecast: 120000,
        otherCoursesDetails: [
          {
            id: 'COURSE2',
            name: 'Project Management Fundamentals',
            description: '15 participants',
            certaintyPercentage: 90,
            courseName: 'Project Management',
            numberOfTrainees: 15,
            pricePerPerson: 4500,
            trainingDate: '2025-02-28'
          }
        ],
        months: {},
        comments: 'Digital skills focus',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      // Client 3 - Greenfield High School
      {
        id: 'client3_2025_Learnerships',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        financialYear: 2025,
        productLine: 'Learnerships',
        history: { yearMinus3: 120000, yearMinus2: 150000, yearMinus1: 180000, currentYearYTD: 140000 },
        fullYearForecast: 250000,
        learnershipDetails: [
          {
            id: 'L3',
            name: 'Education Support Learnership',
            description: '8 teacher assistants',
            certaintyPercentage: 100,
            learners: 8,
            costPerLearner: 25000,
            fundingType: 'SETA',
            paymentStartDate: '2024-03-01',
            paymentFrequency: 'Monthly',
            paymentMonths: 12
          }
        ],
        months: {},
        comments: 'School learnership program',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client3_2025_Compliance_Training',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        financialYear: 2025,
        productLine: 'Compliance Training',
        history: { yearMinus3: 55000, yearMinus2: 65000, yearMinus1: 80000, currentYearYTD: 50000 },
        fullYearForecast: 120000,
        complianceDetails: [
          {
            id: 'COMP2',
            name: 'OHS Representative Training',
            description: '19 staff members',
            certaintyPercentage: 100,
            courseName: 'OHS Representative',
            numberOfTrainees: 19,
            pricePerPerson: 3200,
            trainingDate: '2024-08-10'
          }
        ],
        months: {},
        comments: 'Annual compliance requirements',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      // Client 4 - Metro Logistics
      {
        id: 'client4_2025_Learnerships',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        financialYear: 2025,
        productLine: 'Learnerships',
        history: { yearMinus3: 180000, yearMinus2: 220000, yearMinus1: 280000, currentYearYTD: 200000 },
        fullYearForecast: 380000,
        learnershipDetails: [
          {
            id: 'L4',
            name: 'Freight Handling Learnership',
            description: '12 warehouse staff',
            certaintyPercentage: 100,
            learners: 12,
            costPerLearner: 26000,
            fundingType: 'SETA',
            paymentStartDate: '2024-04-15',
            paymentFrequency: 'Monthly',
            paymentMonths: 12
          }
        ],
        months: {},
        comments: 'Transport sector focus',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client4_2025_TAP_Business',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        financialYear: 2025,
        productLine: 'TAP Business',
        history: { yearMinus3: 120000, yearMinus2: 150000, yearMinus1: 180000, currentYearYTD: 140000 },
        fullYearForecast: 250000,
        tapBusinessDetails: [
          {
            id: 'TAP3',
            name: 'TAP Standard Package',
            description: '45 employees',
            certaintyPercentage: 100,
            numberOfEmployees: 45,
            costPerEmployeePerMonth: 180,
            paymentStartDate: '2024-05-01',
            paymentType: 'Monthly',
            contractMonths: 12
          }
        ],
        months: {},
        comments: 'Driver training focus',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      {
        id: 'client4_2025_Compliance_Training',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        financialYear: 2025,
        productLine: 'Compliance Training',
        history: { yearMinus3: 95000, yearMinus2: 120000, yearMinus1: 150000, currentYearYTD: 110000 },
        fullYearForecast: 200000,
        complianceDetails: [
          {
            id: 'COMP3',
            name: 'Forklift Operation Training',
            description: '30 warehouse operators',
            certaintyPercentage: 100,
            courseName: 'Forklift Operation',
            numberOfTrainees: 30,
            pricePerPerson: 3500,
            trainingDate: '2024-07-20'
          },
          {
            id: 'COMP4',
            name: 'Fire Fighter Training',
            description: '20 safety officers',
            certaintyPercentage: 90,
            courseName: 'Fire Fighter',
            numberOfTrainees: 20,
            pricePerPerson: 2800,
            trainingDate: '2025-02-15'
          }
        ],
        months: {},
        comments: 'Strong compliance needs',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      },
      // Client 5 - Premier Academy (Prospect)
      {
        id: 'client5_2025_Learnerships',
        clientId: 'client5',
        clientName: 'Premier Academy',
        financialYear: 2025,
        productLine: 'Learnerships',
        history: { yearMinus3: 0, yearMinus2: 0, yearMinus1: 0, currentYearYTD: 0 },
        fullYearForecast: 150000,
        learnershipDetails: [
          {
            id: 'L5',
            name: 'Teaching Assistant Learnership',
            description: 'Proposed 6 learners',
            certaintyPercentage: 60,
            learners: 6,
            costPerLearner: 25000,
            fundingType: 'SETA',
            paymentStartDate: '2025-06-01',
            paymentFrequency: 'Monthly',
            paymentMonths: 12
          }
        ],
        months: {},
        comments: 'Prospect - in negotiation',
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      }
    ]

    for (const financial of clientFinancialsData) {
      const { id, ...data } = financial
      batch.set(doc(db, 'clientFinancials', id), data)
    }

    // ============================================================================
    // QUOTES - Comprehensive history for all 5 clients
    // ============================================================================
    const quotes = [
      // Client 1 - ABC Manufacturing Quotes
      {
        id: 'quote1',
        quoteNumber: 'Q-2024-001',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships - NQF4 Business Admin',
        date: Timestamp.fromDate(new Date('2024-01-15')),
        amount: 420000,
        validUntil: Timestamp.fromDate(new Date('2024-02-15')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote2',
        quoteNumber: 'Q-2024-015',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'TAP Business Premium Package',
        date: Timestamp.fromDate(new Date('2024-02-01')),
        amount: 151200,
        validUntil: Timestamp.fromDate(new Date('2024-03-01')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote3',
        quoteNumber: 'Q-2024-028',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'First Aid Level 1 Training',
        date: Timestamp.fromDate(new Date('2024-05-20')),
        amount: 70000,
        validUntil: Timestamp.fromDate(new Date('2024-06-20')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote4',
        quoteNumber: 'Q-2025-001',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Excel Advanced Training',
        date: Timestamp.fromDate(new Date('2025-01-10')),
        amount: 42000,
        validUntil: Timestamp.fromDate(new Date('2025-02-10')),
        status: 'Sent',
        createdAt: serverTimestamp()
      },
      // Client 2 - Tech Solutions Quotes
      {
        id: 'quote5',
        quoteNumber: 'Q-2024-008',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'IT Support Learnership',
        date: Timestamp.fromDate(new Date('2024-03-10')),
        amount: 320000,
        validUntil: Timestamp.fromDate(new Date('2024-04-10')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote6',
        quoteNumber: 'Q-2024-012',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'TAP Enterprise Package',
        date: Timestamp.fromDate(new Date('2024-02-15')),
        amount: 189000,
        validUntil: Timestamp.fromDate(new Date('2024-03-15')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote7',
        quoteNumber: 'Q-2025-003',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'Project Management Training',
        date: Timestamp.fromDate(new Date('2025-01-15')),
        amount: 67500,
        validUntil: Timestamp.fromDate(new Date('2025-02-15')),
        status: 'Pending',
        createdAt: serverTimestamp()
      },
      // Client 3 - Greenfield High Quotes
      {
        id: 'quote8',
        quoteNumber: 'Q-2024-005',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Education Support Learnership',
        date: Timestamp.fromDate(new Date('2024-02-01')),
        amount: 200000,
        validUntil: Timestamp.fromDate(new Date('2024-03-01')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote9',
        quoteNumber: 'Q-2024-022',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'OHS Representative Training',
        date: Timestamp.fromDate(new Date('2024-07-05')),
        amount: 60800,
        validUntil: Timestamp.fromDate(new Date('2024-08-05')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote10',
        quoteNumber: 'Q-2025-005',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Leadership Development',
        date: Timestamp.fromDate(new Date('2025-01-18')),
        amount: 45000,
        validUntil: Timestamp.fromDate(new Date('2025-02-18')),
        status: 'Sent',
        createdAt: serverTimestamp()
      },
      // Client 4 - Metro Logistics Quotes
      {
        id: 'quote11',
        quoteNumber: 'Q-2024-010',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Freight Handling Learnership',
        date: Timestamp.fromDate(new Date('2024-03-20')),
        amount: 312000,
        validUntil: Timestamp.fromDate(new Date('2024-04-20')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote12',
        quoteNumber: 'Q-2024-018',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'TAP Standard Package',
        date: Timestamp.fromDate(new Date('2024-04-15')),
        amount: 97200,
        validUntil: Timestamp.fromDate(new Date('2024-05-15')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote13',
        quoteNumber: 'Q-2024-025',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Forklift Operation Training',
        date: Timestamp.fromDate(new Date('2024-06-25')),
        amount: 105000,
        validUntil: Timestamp.fromDate(new Date('2024-07-25')),
        status: 'Accepted',
        createdAt: serverTimestamp()
      },
      {
        id: 'quote14',
        quoteNumber: 'Q-2025-002',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Fire Fighter Training',
        date: Timestamp.fromDate(new Date('2025-01-12')),
        amount: 56000,
        validUntil: Timestamp.fromDate(new Date('2025-02-12')),
        status: 'Sent',
        createdAt: serverTimestamp()
      },
      // Client 5 - Premier Academy Quotes (Prospect)
      {
        id: 'quote15',
        quoteNumber: 'Q-2025-008',
        clientId: 'client5',
        clientName: 'Premier Academy',
        product: 'Teaching Assistant Learnership',
        date: Timestamp.fromDate(new Date('2025-01-05')),
        amount: 150000,
        validUntil: Timestamp.fromDate(new Date('2025-02-05')),
        status: 'Pending',
        createdAt: serverTimestamp()
      }
    ]

    for (const quote of quotes) {
      const { id, ...quoteData } = quote
      batch.set(doc(db, 'quotes', id), quoteData)
    }

    // ============================================================================
    // INVOICES - Comprehensive history for all 5 clients
    // ============================================================================
    const invoices = [
      // Client 1 - ABC Manufacturing Invoices (Historical + Current)
      {
        id: 'inv1',
        invoiceNumber: 'INV-2024-001',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships - NQF4 Business Admin (Month 1)',
        issueDate: Timestamp.fromDate(new Date('2024-04-05')),
        amount: 35000,
        dueDate: Timestamp.fromDate(new Date('2024-05-05')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv2',
        invoiceNumber: 'INV-2024-015',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships - NQF4 Business Admin (Month 2)',
        issueDate: Timestamp.fromDate(new Date('2024-05-05')),
        amount: 35000,
        dueDate: Timestamp.fromDate(new Date('2024-06-05')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv3',
        invoiceNumber: 'INV-2024-028',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships - NQF4 Business Admin (Month 3)',
        issueDate: Timestamp.fromDate(new Date('2024-06-05')),
        amount: 35000,
        dueDate: Timestamp.fromDate(new Date('2024-07-05')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv4',
        invoiceNumber: 'INV-2024-041',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'TAP Business Premium (Q1)',
        issueDate: Timestamp.fromDate(new Date('2024-05-01')),
        amount: 21000,
        dueDate: Timestamp.fromDate(new Date('2024-06-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv5',
        invoiceNumber: 'INV-2024-055',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'TAP Business Premium (Q2)',
        issueDate: Timestamp.fromDate(new Date('2024-08-01')),
        amount: 21000,
        dueDate: Timestamp.fromDate(new Date('2024-09-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv6',
        invoiceNumber: 'INV-2024-068',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'First Aid Level 1 Training',
        issueDate: Timestamp.fromDate(new Date('2024-06-20')),
        amount: 70000,
        dueDate: Timestamp.fromDate(new Date('2024-07-20')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv7',
        invoiceNumber: 'INV-2025-001',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships - NQF4 Business Admin (Month 10)',
        issueDate: Timestamp.fromDate(new Date('2025-01-05')),
        amount: 35000,
        dueDate: Timestamp.fromDate(new Date('2025-02-05')),
        status: 'Pending',
        createdAt: serverTimestamp()
      },
      // Client 2 - Tech Solutions Invoices
      {
        id: 'inv8',
        invoiceNumber: 'INV-2024-008',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'IT Support Learnership (Month 1)',
        issueDate: Timestamp.fromDate(new Date('2024-05-10')),
        amount: 26667,
        dueDate: Timestamp.fromDate(new Date('2024-06-10')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv9',
        invoiceNumber: 'INV-2024-022',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'IT Support Learnership (Month 2)',
        issueDate: Timestamp.fromDate(new Date('2024-06-10')),
        amount: 26667,
        dueDate: Timestamp.fromDate(new Date('2024-07-10')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv10',
        invoiceNumber: 'INV-2024-035',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'TAP Enterprise Package (Q1)',
        issueDate: Timestamp.fromDate(new Date('2024-06-01')),
        amount: 31500,
        dueDate: Timestamp.fromDate(new Date('2024-07-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv11',
        invoiceNumber: 'INV-2024-048',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'TAP Enterprise Package (Q2)',
        issueDate: Timestamp.fromDate(new Date('2024-09-01')),
        amount: 31500,
        dueDate: Timestamp.fromDate(new Date('2024-10-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv12',
        invoiceNumber: 'INV-2025-003',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'TAP Enterprise Package (Q4)',
        issueDate: Timestamp.fromDate(new Date('2025-01-05')),
        amount: 31500,
        dueDate: Timestamp.fromDate(new Date('2025-02-05')),
        status: 'Unpaid',
        createdAt: serverTimestamp()
      },
      // Client 3 - Greenfield High School Invoices
      {
        id: 'inv13',
        invoiceNumber: 'INV-2024-005',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Education Support Learnership (Month 1)',
        issueDate: Timestamp.fromDate(new Date('2024-03-10')),
        amount: 16667,
        dueDate: Timestamp.fromDate(new Date('2024-04-10')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv14',
        invoiceNumber: 'INV-2024-018',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Education Support Learnership (Month 2)',
        issueDate: Timestamp.fromDate(new Date('2024-04-10')),
        amount: 16667,
        dueDate: Timestamp.fromDate(new Date('2024-05-10')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv15',
        invoiceNumber: 'INV-2024-042',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'OHS Representative Training',
        issueDate: Timestamp.fromDate(new Date('2024-08-15')),
        amount: 60800,
        dueDate: Timestamp.fromDate(new Date('2024-09-15')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv16',
        invoiceNumber: 'INV-2025-005',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Education Support Learnership (Month 11)',
        issueDate: Timestamp.fromDate(new Date('2025-01-10')),
        amount: 16667,
        dueDate: Timestamp.fromDate(new Date('2025-02-10')),
        status: 'Pending',
        createdAt: serverTimestamp()
      },
      // Client 4 - Metro Logistics Invoices
      {
        id: 'inv17',
        invoiceNumber: 'INV-2024-010',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Freight Handling Learnership (Month 1)',
        issueDate: Timestamp.fromDate(new Date('2024-04-20')),
        amount: 26000,
        dueDate: Timestamp.fromDate(new Date('2024-05-20')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv18',
        invoiceNumber: 'INV-2024-024',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Freight Handling Learnership (Month 2)',
        issueDate: Timestamp.fromDate(new Date('2024-05-20')),
        amount: 26000,
        dueDate: Timestamp.fromDate(new Date('2024-06-20')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv19',
        invoiceNumber: 'INV-2024-037',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'TAP Standard Package (Month 1-3)',
        issueDate: Timestamp.fromDate(new Date('2024-08-01')),
        amount: 24300,
        dueDate: Timestamp.fromDate(new Date('2024-09-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv20',
        invoiceNumber: 'INV-2024-050',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Forklift Operation Training',
        issueDate: Timestamp.fromDate(new Date('2024-07-25')),
        amount: 105000,
        dueDate: Timestamp.fromDate(new Date('2024-08-25')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv21',
        invoiceNumber: 'INV-2024-063',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'TAP Standard Package (Month 4-6)',
        issueDate: Timestamp.fromDate(new Date('2024-11-01')),
        amount: 24300,
        dueDate: Timestamp.fromDate(new Date('2024-12-01')),
        status: 'Paid',
        createdAt: serverTimestamp()
      },
      {
        id: 'inv22',
        invoiceNumber: 'INV-2025-002',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Freight Handling Learnership (Month 9)',
        issueDate: Timestamp.fromDate(new Date('2025-01-15')),
        amount: 26000,
        dueDate: Timestamp.fromDate(new Date('2025-02-15')),
        status: 'Pending',
        createdAt: serverTimestamp()
      }
      // Client 5 - Premier Academy has no invoices yet (Prospect)
    ]

    for (const invoice of invoices) {
      const { id, ...invoiceData } = invoice
      batch.set(doc(db, 'invoices', id), invoiceData)
    }

    // ============================================================================
    // DEALS - Sales pipeline for each client
    // ============================================================================
    const deals = [
      {
        id: 'deal1',
        name: 'ABC Manufacturing - 2025 Learnership Expansion',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        product: 'Learnerships',
        value: 520000,
        stage: 'negotiation',
        probability: 85,
        lastContact: Timestamp.fromDate(new Date('2025-01-15')),
        expectedCloseDate: Timestamp.fromDate(new Date('2025-03-15')),
        assignedTo: salesPerson1,
        nextAction: 'Finalize contract terms',
        createdAt: serverTimestamp()
      },
      {
        id: 'deal2',
        name: 'Tech Solutions - TAP Renewal',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        product: 'TAP Business',
        value: 450000,
        stage: 'proposal',
        probability: 75,
        lastContact: Timestamp.fromDate(new Date('2025-01-20')),
        expectedCloseDate: Timestamp.fromDate(new Date('2025-02-28')),
        assignedTo: salesPerson1,
        nextAction: 'Send renewal proposal',
        createdAt: serverTimestamp()
      },
      {
        id: 'deal3',
        name: 'Greenfield High - Leadership Program',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        product: 'Other Courses',
        value: 45000,
        stage: 'qualification',
        probability: 60,
        lastContact: Timestamp.fromDate(new Date('2025-01-18')),
        expectedCloseDate: Timestamp.fromDate(new Date('2025-04-01')),
        assignedTo: salesPerson2,
        nextAction: 'Schedule needs assessment',
        createdAt: serverTimestamp()
      },
      {
        id: 'deal4',
        name: 'Metro Logistics - Fire Fighter Training',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        product: 'Compliance Training',
        value: 56000,
        stage: 'proposal',
        probability: 80,
        lastContact: Timestamp.fromDate(new Date('2025-01-12')),
        expectedCloseDate: Timestamp.fromDate(new Date('2025-02-15')),
        assignedTo: salesPerson2,
        nextAction: 'Await quote approval',
        createdAt: serverTimestamp()
      },
      {
        id: 'deal5',
        name: 'Premier Academy - Full Training Solution',
        clientId: 'client5',
        clientName: 'Premier Academy',
        product: 'Learnerships',
        value: 150000,
        stage: 'discovery',
        probability: 40,
        lastContact: Timestamp.fromDate(new Date('2025-01-05')),
        expectedCloseDate: Timestamp.fromDate(new Date('2025-06-30')),
        assignedTo: salesPerson1,
        nextAction: 'Schedule discovery meeting',
        createdAt: serverTimestamp()
      }
    ]

    for (const deal of deals) {
      const { id, ...dealData } = deal
      batch.set(doc(db, 'deals', id), dealData)
    }

    // ============================================================================
    // FOLLOW-UP TASKS
    // ============================================================================
    const tasks = [
      {
        id: 'task1',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        description: 'Send Excel training proposal',
        type: 'document',
        status: 'pending',
        priority: 'Medium',
        dueDate: Timestamp.fromDate(new Date('2025-01-25')),
        assignedTo: salesPerson1,
        assignedToName: 'Sales Person 1',
        notes: 'Client requested quote for 12 participants',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'task2',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        description: 'Follow up on TAP renewal',
        type: 'call',
        status: 'pending',
        priority: 'High',
        dueDate: Timestamp.fromDate(new Date('2025-01-22')),
        assignedTo: salesPerson1,
        assignedToName: 'Sales Person 1',
        notes: 'Contract expires end of March',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'task3',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        description: 'Schedule leadership training needs assessment',
        type: 'meeting',
        status: 'pending',
        priority: 'Medium',
        dueDate: Timestamp.fromDate(new Date('2025-01-30')),
        assignedTo: salesPerson2,
        assignedToName: 'Sales Person 2',
        notes: 'Principal interested in staff development',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'task4',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        description: 'Check invoice payment status',
        type: 'review',
        status: 'pending',
        priority: 'High',
        dueDate: Timestamp.fromDate(new Date('2025-01-20')),
        assignedTo: salesPerson2,
        assignedToName: 'Sales Person 2',
        notes: 'January invoice still pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'task5',
        clientId: 'client5',
        clientName: 'Premier Academy',
        description: 'Send introductory presentation',
        type: 'email',
        status: 'pending',
        priority: 'Medium',
        dueDate: Timestamp.fromDate(new Date('2025-01-28')),
        assignedTo: salesPerson1,
        assignedToName: 'Sales Person 1',
        notes: 'New prospect - requires education on services',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ]

    for (const task of tasks) {
      const { id, ...taskData } = task
      batch.set(doc(db, 'followUpTasks', id), taskData)
    }

    // ============================================================================
    // FEEDBACK / COMMENTS
    // ============================================================================
    const feedback = [
      {
        id: 'fb1',
        clientId: 'client1',
        clientName: 'ABC Manufacturing',
        type: 'comment',
        content: 'Excellent learnership results - 95% pass rate. Client very satisfied.',
        date: Timestamp.fromDate(new Date('2024-12-15')),
        userName: 'Sales Person 1',
        userId: salesPerson1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'fb2',
        clientId: 'client2',
        clientName: 'Tech Solutions SA',
        type: 'feedback',
        content: 'TAP platform usage has increased significantly. Client considering expansion.',
        date: Timestamp.fromDate(new Date('2025-01-10')),
        userName: 'Sales Person 1',
        userId: salesPerson1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'fb3',
        clientId: 'client3',
        clientName: 'Greenfield High School',
        type: 'note',
        content: 'Budget approval pending for next quarter training. Follow up in February.',
        date: Timestamp.fromDate(new Date('2025-01-18')),
        userName: 'Sales Person 2',
        userId: salesPerson2,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'fb4',
        clientId: 'client4',
        clientName: 'Metro Logistics',
        type: 'comment',
        content: 'Forklift training received excellent feedback from warehouse supervisors.',
        date: Timestamp.fromDate(new Date('2024-08-20')),
        userName: 'Sales Person 2',
        userId: salesPerson2,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ]

    for (const fb of feedback) {
      const { id, ...fbData } = fb
      batch.set(doc(db, 'feedback', id), fbData)
    }

    // ============================================================================
    // MESSAGES
    // ============================================================================
    const messages = [
      {
        id: 'msg1',
        subject: 'New Quote Request - ABC Manufacturing',
        from: 'john.smith@abcmanufacturing.co.za',
        to: salesPerson1,
        content: 'Hi, we need a quote for Excel Advanced training for 12 staff members. Please advise on availability.',
        status: 'unread',
        priority: 'normal',
        clientId: 'client1',
        date: Timestamp.fromDate(new Date('2025-01-19')),
        createdAt: serverTimestamp()
      },
      {
        id: 'msg2',
        subject: 'TAP Renewal Discussion',
        from: 'sarah.j@techsolutions.co.za',
        to: salesPerson1,
        content: 'Our TAP contract is up for renewal. Can we schedule a call to discuss pricing?',
        status: 'read',
        priority: 'high',
        clientId: 'client2',
        date: Timestamp.fromDate(new Date('2025-01-17')),
        createdAt: serverTimestamp()
      },
      {
        id: 'msg3',
        subject: 'Leadership Training Inquiry',
        from: 'principal@greenfieldhigh.co.za',
        to: salesPerson2,
        content: 'We are interested in leadership development programs for our senior staff. Please provide information.',
        status: 'unread',
        priority: 'normal',
        clientId: 'client3',
        date: Timestamp.fromDate(new Date('2025-01-18')),
        createdAt: serverTimestamp()
      },
      {
        id: 'msg4',
        subject: 'Invoice Query',
        from: 'l.williams@metrologistics.co.za',
        to: salesPerson2,
        content: 'Please provide a breakdown of the January invoice for learnership training.',
        status: 'read',
        priority: 'normal',
        clientId: 'client4',
        date: Timestamp.fromDate(new Date('2025-01-15')),
        createdAt: serverTimestamp()
      }
    ]

    for (const msg of messages) {
      const { id, ...msgData } = msg
      batch.set(doc(db, 'messages', id), msgData)
    }

    // Commit all changes
    await batch.commit()

    console.log('Seed data created successfully!')
    return { success: true, message: 'Seed data with 5 clients created successfully!' }
  } catch (error) {
    console.error('Error seeding data:', error)
    throw error
  }
}

/**
 * Reset and seed - clear all data then seed fresh
 */
export const resetAndSeed = async (userIds = {}) => {
  try {
    await clearAllData()
    const result = await seedAllData(userIds)
    return { success: true, message: 'Data reset and seeded successfully with 5 clients!' }
  } catch (error) {
    console.error('Error in reset and seed:', error)
    throw error
  }
}
