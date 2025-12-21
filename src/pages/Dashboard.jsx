import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getMessages,
  getFeedback,
  getClientsWithAllocationStatus,
  getSkillsPartners,
  assignSalesPersonToClient,
  assignSkillsPartnerToClient,
  getPipelineStatusAnalytics,
  updateClientPipelineStatus,
  getClientFinancials,
  getFollowUpStats,
  getClientsForFollowUpManagement,
  updateClientFollowUp,
  getPipelineStatuses,
  calculateFinancialYearMonths,
  getFinancialYearSettings
} from '../services/firestoreService'
import { getFinancialData, UPLOAD_TYPES, calculateFinancialYear } from '../services/financialUploadService'
import { getUsersByTenant } from '../services/userService'
import { Timestamp } from 'firebase/firestore'
import { useTenant } from '../context/TenantContext'
import './Dashboard.css'

const Dashboard = () => {
  const [financialData, setFinancialData] = useState({
    learnerships: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0, budget: 0 },
    tapBusiness: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0, budget: 0 },
    compliance: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0, budget: 0 },
    otherCourses: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0, budget: 0 },
    other: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0, budget: 0 }
  })
  const [pipelineStats, setPipelineStats] = useState({
    leadGeneration: 0,
    initialContact: 0,
    needsAssessment: 0,
    proposalSent: 0,
    negotiation: 0,
    dealClosed: 0
  })
  const [messageStats, setMessageStats] = useState({
    unread: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0
  })
  const [recentFeedback, setRecentFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  // Manager-specific state
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [skillsPartners, setSkillsPartners] = useState([])
  const [allocationStats, setAllocationStats] = useState({
    totalClients: 0,
    unallocatedSalesPerson: 0,
    unallocatedSkillsPartner: 0
  })
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocationFilter, setAllocationFilter] = useState('all') // 'all', 'sales', 'skills'
  const [savingAllocation, setSavingAllocation] = useState(false)
  const [pipelineAnalytics, setPipelineAnalytics] = useState(null)
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [savingPipeline, setSavingPipeline] = useState(false)

  // Follow-up tracking state
  const [followUpStats, setFollowUpStats] = useState({
    noFollowUp: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    needsAttention: 0
  })
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpClients, setFollowUpClients] = useState([])
  const [followUpFilter, setFollowUpFilter] = useState('needs-attention')
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState(null)

  const followUpTypes = [
    { value: 'call', label: 'Call' },
    { value: 'email', label: 'Send Email' },
    { value: 'meeting', label: 'Schedule Meeting' },
    { value: 'proposal', label: 'Send Proposal' },
    { value: 'quote', label: 'Follow Up on Quote' },
    { value: 'demo', label: 'Schedule Demo' },
    { value: 'contract', label: 'Contract Discussion' },
    { value: 'other', label: 'Other' }
  ]

  // Pipeline stages loaded from database
  const [pipelineStages, setPipelineStages] = useState([
    { id: '', name: 'Not in Pipeline', color: '#f5f5f5' }
  ])

  // Tenant context - use team hierarchy for data filtering
  const {
    getTenantId,
    currentUser,
    isSystemAdmin,
    accessibleUserIds,
    isTeamManager,
    isSalesHead,
    hierarchyLoading
  } = useTenant()

  // Determine if user has manager-level view (can see team data)
  const isManager = isSystemAdmin || isTeamManager() || isSalesHead()
  const currentUserId = currentUser?.uid
  const tenantId = getTenantId()

  // Load data when hierarchy is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadAllData()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds, tenantId])

  const loadAllData = async () => {
    try {
      if (isManager) {
        await loadAllocationData()
        await loadPipelineAnalytics()
      } else {
        await loadSalespersonClients()
      }
      await loadFollowUpData()
      await loadDashboardData()
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  const loadSalespersonClients = async () => {
    try {
      // Filter clients by tenant first, then by accessible users
      const filterTenantId = isSystemAdmin ? null : tenantId
      const clientsData = await getClientsWithAllocationStatus(filterTenantId)
      // Filter to only show clients assigned to accessible users
      const myClients = clientsData.filter(c =>
        accessibleUserIds.includes(c.assignedSalesPerson) ||
        accessibleUserIds.includes(c.createdBy)
      )
      setClients(myClients)
    } catch (error) {
      console.error('Error loading salesperson clients:', error)
    }
  }

  const loadAllocationData = async () => {
    try {
      // Filter by tenant unless system admin
      const filterTenantId = isSystemAdmin ? null : tenantId
      const [clientsData, usersData, partnersData] = await Promise.all([
        getClientsWithAllocationStatus(filterTenantId),
        getUsersByTenant(filterTenantId),
        getSkillsPartners(filterTenantId)
      ])

      setClients(clientsData)
      setUsers(usersData)
      setSkillsPartners(partnersData)

      // Calculate allocation stats
      const unallocatedSP = clientsData.filter(c => !c.assignedSalesPerson).length
      const unallocatedSkills = clientsData.filter(c => !c.skillsPartnerId || c.skillsPartnerId === 'not-allocated').length

      setAllocationStats({
        totalClients: clientsData.length,
        unallocatedSalesPerson: unallocatedSP,
        unallocatedSkillsPartner: unallocatedSkills
      })
    } catch (error) {
      console.error('Error loading allocation data:', error)
    }
  }

  const loadPipelineAnalytics = async () => {
    try {
      const analytics = await getPipelineStatusAnalytics()
      setPipelineAnalytics(analytics)
    } catch (error) {
      console.error('Error loading pipeline analytics:', error)
    }
  }

  const loadFollowUpData = async () => {
    try {
      // For managers/sales heads, get all stats; for salespeople, filter by their accessible users
      const salespersonId = isManager ? null : currentUserId
      const stats = await getFollowUpStats(salespersonId)
      setFollowUpStats(stats)
    } catch (error) {
      console.error('Error loading follow-up stats:', error)
    }
  }

  const openFollowUpModal = async (filter = 'needs-attention') => {
    setFollowUpFilter(filter)
    setShowFollowUpModal(true)
    try {
      const salespersonId = isManager ? null : currentUserId
      let clientsData = await getClientsForFollowUpManagement(salespersonId, filter)
      // For team managers, filter to accessible users
      if (isTeamManager() && !isSalesHead() && !isSystemAdmin) {
        clientsData = clientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) ||
          accessibleUserIds.includes(c.createdBy)
        )
      }
      setFollowUpClients(clientsData)
    } catch (error) {
      console.error('Error loading follow-up clients:', error)
    }
  }

  const handleFollowUpFilterChange = async (newFilter) => {
    setFollowUpFilter(newFilter)
    try {
      const salespersonId = isManager ? null : currentUserId
      let clientsData = await getClientsForFollowUpManagement(salespersonId, newFilter)
      // For team managers, filter to accessible users
      if (isTeamManager() && !isSalesHead() && !isSystemAdmin) {
        clientsData = clientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) ||
          accessibleUserIds.includes(c.createdBy)
        )
      }
      setFollowUpClients(clientsData)
    } catch (error) {
      console.error('Error loading follow-up clients:', error)
    }
  }

  const handleSaveFollowUp = async (clientId, followUpData) => {
    setSavingFollowUp(true)
    try {
      const followUpDate = new Date(`${followUpData.date}T09:00:00`)
      const followUpTimestamp = Timestamp.fromDate(followUpDate)

      await updateClientFollowUp(clientId, {
        date: followUpTimestamp,
        reason: followUpData.reason,
        type: followUpData.type
      }, currentUserId)

      // Reload data
      await loadFollowUpData()
      const salespersonId = isManager ? null : currentUserId
      let clientsData = await getClientsForFollowUpManagement(salespersonId, followUpFilter)
      // For team managers, filter to accessible users
      if (isTeamManager() && !isSalesHead() && !isSystemAdmin) {
        clientsData = clientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) ||
          accessibleUserIds.includes(c.createdBy)
        )
      }
      setFollowUpClients(clientsData)
      setEditingFollowUp(null)
    } catch (error) {
      console.error('Error saving follow-up:', error)
      alert('Failed to save follow-up. Please try again.')
    } finally {
      setSavingFollowUp(false)
    }
  }

  const formatFollowUpDate = (timestamp) => {
    if (!timestamp) return 'Not set'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getFollowUpStatusBadge = (status, daysUntil) => {
    switch (status) {
      case 'overdue':
        return <span className="followup-badge overdue">Overdue by {Math.abs(daysUntil)} days</span>
      case 'due-today':
        return <span className="followup-badge due-today">Due Today</span>
      case 'due-this-week':
        return <span className="followup-badge due-soon">{daysUntil} days</span>
      case 'scheduled':
        return <span className="followup-badge scheduled">{daysUntil} days</span>
      case 'none':
      default:
        return <span className="followup-badge none">No follow-up</span>
    }
  }

  const loadDashboardData = async () => {
    try {
      // Load pipeline statuses from database
      const pipelineStatusesData = await getPipelineStatuses()
      setPipelineStages([
        { id: '', name: 'Not in Pipeline', color: '#f5f5f5' },
        ...pipelineStatusesData
      ])

      // Determine which clients to include based on user's role
      // First filter by tenant
      const filterTenantId = isSystemAdmin ? null : tenantId
      const allClientsData = await getClientsWithAllocationStatus(filterTenantId)
      let filteredClientsData = allClientsData

      // Then filter based on accessible user IDs (unless sales head or system admin)
      if (!isSystemAdmin && !isSalesHead()) {
        filteredClientsData = allClientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) ||
          accessibleUserIds.includes(c.createdBy)
        )
      }

      // Load financial dashboard data
      // Load financial year settings from tenant
      const fySettings = await getFinancialYearSettings(tenantId)
      const currentFY = fySettings.currentFinancialYear // e.g., "2024/2025"
      const fy1 = calculateFinancialYear(currentFY, -1) // Previous year e.g., "2023/2024"

      // Extract numeric financial year for filtering saved forecasts
      // currentFY is like "2024/2025", we need the start year (2024)
      const currentFinancialYear = currentFY && currentFY.includes('/')
        ? parseInt(currentFY.split('/')[0])
        : parseInt(currentFY) || new Date().getFullYear()

      // Calculate financial year info for YTD months
      const financialYearInfo = await calculateFinancialYearMonths(tenantId)
      const ytdMonthNames = (financialYearInfo?.ytdMonths || []).map(m => m.name)

      // Load uploaded financial data from accountant uploads
      const [uploadedYtdActual, uploadedYtd1, uploadedBudget] = await Promise.all([
        getFinancialData(UPLOAD_TYPES.YTD_ACTUAL, currentFY, tenantId),
        getFinancialData(UPLOAD_TYPES.YTD_1, fy1, tenantId),
        getFinancialData(UPLOAD_TYPES.BUDGET, currentFY, tenantId)
      ])

      console.log('Dashboard - Financial data loaded:', {
        currentFY,
        fy1,
        ytdActualCount: uploadedYtdActual?.length,
        ytd1Count: uploadedYtd1?.length,
        budgetCount: uploadedBudget?.length,
        ytdMonthNames,
        allMonthNames: (financialYearInfo?.months || []).map(m => m.name),
        sampleYtdActual: uploadedYtdActual?.[0],
        sampleBudget: uploadedBudget?.[0]
      })

      // Build a map of client names for fallback matching (when clientId doesn't match)
      const clientNameMap = new Map()
      filteredClientsData.forEach(c => {
        if (c.name) {
          clientNameMap.set(c.name.toLowerCase().trim(), c.id)
        }
      })
      const filteredClientIds = filteredClientsData.map(c => c.id)

      // Helper function to filter uploaded data by accessible clients (by ID or name)
      const filterUploadedByClients = (uploadedData) => {
        if (!uploadedData?.length) return []
        return uploadedData.filter(d => {
          // First try matching by clientId
          if (filteredClientIds.includes(d.clientId)) return true
          // Fallback: match by clientName (case-insensitive)
          if (d.clientName && clientNameMap.has(d.clientName.toLowerCase().trim())) return true
          return false
        })
      }

      // Filter uploaded data to accessible clients
      const myYtdActual = filterUploadedByClients(uploadedYtdActual)
      const myYtd1 = filterUploadedByClients(uploadedYtd1)
      const myBudget = filterUploadedByClients(uploadedBudget)

      // Helper to calculate YTD from monthly data
      const calculateYtdFromMonthly = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          ytdMonthNames.forEach(monthName => {
            total += monthData[monthName] || 0
          })
        })
        return total
      }

      // Helper to calculate full year from monthly data
      const calculateFullYearFromMonthly = (records) => {
        let total = 0
        const allMonths = (financialYearInfo?.months || []).map(m => m.name)
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          allMonths.forEach(monthName => {
            total += monthData[monthName] || 0
          })
        })
        return total
      }

      // Legacy product lines to exclude completely
      const legacyProductLines = ['general', 'consulting']

      if (!isManager) {
        // For salesperson: aggregate financials from their clients only
        const myClients = filteredClientsData
        const clientIds = myClients.map(c => c.id)

        // Get financial data for each client and aggregate by product line
        const aggregatedFinancials = {
          learnerships: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          tapBusiness: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          compliance: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          otherCourses: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          other: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 }
        }


        // Get forecast data for each client (for remaining forecast calculation)
        const myClientFinancials = await getClientFinancials(clientIds)
        const currentYearFinancials = myClientFinancials.filter(f => {
          const fy = f.financialYear
          if (!fy) return false
          const fyStr = String(fy)
          if (fyStr.includes('/')) {
            const startYear = parseInt(fyStr.split('/')[0])
            return startYear === currentFinancialYear
          }
          return parseInt(fyStr) === currentFinancialYear
        })

        // Aggregate YTD, Previous Year, and Budget from UPLOADED data by product line
        const productLineGroups = {}
        myYtdActual.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!productLineGroups[productLine]) {
            productLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          productLineGroups[productLine].ytdActual.push(record)
        })
        myYtd1.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!productLineGroups[productLine]) {
            productLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          productLineGroups[productLine].ytd1.push(record)
        })
        myBudget.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!productLineGroups[productLine]) {
            productLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          productLineGroups[productLine].budget.push(record)
        })

        // Calculate aggregates from uploaded data
        Object.entries(productLineGroups).forEach(([productLine, data]) => {
          const ytd = calculateYtdFromMonthly(data.ytdActual)
          const previousYear = calculateFullYearFromMonthly(data.ytd1)
          const budget = calculateFullYearFromMonthly(data.budget)

          if (productLine === 'learnerships') {
            aggregatedFinancials.learnerships.ytd += ytd
            aggregatedFinancials.learnerships.previousYear += previousYear
            aggregatedFinancials.learnerships.budget += budget
          } else if (productLine === 'tapbusiness') {
            aggregatedFinancials.tapBusiness.ytd += ytd
            aggregatedFinancials.tapBusiness.previousYear += previousYear
            aggregatedFinancials.tapBusiness.budget += budget
          } else if (productLine === 'compliancetraining') {
            aggregatedFinancials.compliance.ytd += ytd
            aggregatedFinancials.compliance.previousYear += previousYear
            aggregatedFinancials.compliance.budget += budget
          } else if (productLine === 'othercourses') {
            aggregatedFinancials.otherCourses.ytd += ytd
            aggregatedFinancials.otherCourses.previousYear += previousYear
            aggregatedFinancials.otherCourses.budget += budget
          } else {
            aggregatedFinancials.other.ytd += ytd
            aggregatedFinancials.other.previousYear += previousYear
            aggregatedFinancials.other.budget += budget
          }
        })

        // Get forecast from saved financials (remaining forecast = fullYearForecast - ytd)
        currentYearFinancials.forEach(cf => {
          const productLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return

          const fullYearForecast = cf.fullYearForecast || 0
          // Get YTD from uploaded data for this product line
          let ytdFromUploaded = 0
          if (productLine === 'learnerships') ytdFromUploaded = aggregatedFinancials.learnerships.ytd
          else if (productLine === 'tapbusiness') ytdFromUploaded = aggregatedFinancials.tapBusiness.ytd
          else if (productLine === 'compliancetraining') ytdFromUploaded = aggregatedFinancials.compliance.ytd
          else if (productLine === 'othercourses') ytdFromUploaded = aggregatedFinancials.otherCourses.ytd
          else ytdFromUploaded = aggregatedFinancials.other.ytd

          // Forecast is remaining after YTD (but calculated per client)
          const forecast = Math.max(0, fullYearForecast - (cf.history?.currentYearYTD || 0))

          if (productLine === 'learnerships') {
            aggregatedFinancials.learnerships.forecast += forecast
          } else if (productLine === 'tapbusiness') {
            aggregatedFinancials.tapBusiness.forecast += forecast
          } else if (productLine === 'compliancetraining') {
            aggregatedFinancials.compliance.forecast += forecast
          } else if (productLine === 'othercourses') {
            aggregatedFinancials.otherCourses.forecast += forecast
          } else {
            aggregatedFinancials.other.forecast += forecast
          }
        })

        setFinancialData(aggregatedFinancials)
      } else {
        // For manager: aggregate financials from tenant-filtered clients
        const managerClients = filteredClientsData
        const managerClientIds = managerClients.map(c => c.id)

        const managerAggregatedFinancials = {
          learnerships: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          tapBusiness: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          compliance: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          otherCourses: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 },
          other: { previousYear: 0, ytd: 0, forecast: 0, budget: 0 }
        }


        // Get forecast data for team's clients (for remaining forecast calculation)
        const managerClientFinancials = await getClientFinancials(managerClientIds)
        const managerCurrentYearFinancials = managerClientFinancials.filter(f => {
          const fy = f.financialYear
          if (!fy) return false
          const fyStr = String(fy)
          if (fyStr.includes('/')) {
            const startYear = parseInt(fyStr.split('/')[0])
            return startYear === currentFinancialYear
          }
          return parseInt(fyStr) === currentFinancialYear
        })

        // Aggregate YTD, Previous Year, and Budget from UPLOADED data by product line
        const managerProductLineGroups = {}
        myYtdActual.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!managerProductLineGroups[productLine]) {
            managerProductLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          managerProductLineGroups[productLine].ytdActual.push(record)
        })
        myYtd1.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!managerProductLineGroups[productLine]) {
            managerProductLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          managerProductLineGroups[productLine].ytd1.push(record)
        })
        myBudget.forEach(record => {
          const productLine = (record.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return
          if (!managerProductLineGroups[productLine]) {
            managerProductLineGroups[productLine] = { ytdActual: [], ytd1: [], budget: [] }
          }
          managerProductLineGroups[productLine].budget.push(record)
        })

        // Calculate aggregates from uploaded data
        Object.entries(managerProductLineGroups).forEach(([productLine, data]) => {
          const ytd = calculateYtdFromMonthly(data.ytdActual)
          const previousYear = calculateFullYearFromMonthly(data.ytd1)
          const budget = calculateFullYearFromMonthly(data.budget)

          if (productLine === 'learnerships') {
            managerAggregatedFinancials.learnerships.ytd += ytd
            managerAggregatedFinancials.learnerships.previousYear += previousYear
            managerAggregatedFinancials.learnerships.budget += budget
          } else if (productLine === 'tapbusiness') {
            managerAggregatedFinancials.tapBusiness.ytd += ytd
            managerAggregatedFinancials.tapBusiness.previousYear += previousYear
            managerAggregatedFinancials.tapBusiness.budget += budget
          } else if (productLine === 'compliancetraining') {
            managerAggregatedFinancials.compliance.ytd += ytd
            managerAggregatedFinancials.compliance.previousYear += previousYear
            managerAggregatedFinancials.compliance.budget += budget
          } else if (productLine === 'othercourses') {
            managerAggregatedFinancials.otherCourses.ytd += ytd
            managerAggregatedFinancials.otherCourses.previousYear += previousYear
            managerAggregatedFinancials.otherCourses.budget += budget
          } else {
            managerAggregatedFinancials.other.ytd += ytd
            managerAggregatedFinancials.other.previousYear += previousYear
            managerAggregatedFinancials.other.budget += budget
          }
        })

        // Get forecast from saved financials (remaining forecast = fullYearForecast - ytd)
        managerCurrentYearFinancials.forEach(cf => {
          const productLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return

          const fullYearForecast = cf.fullYearForecast || 0
          const forecast = Math.max(0, fullYearForecast - (cf.history?.currentYearYTD || 0))

          if (productLine === 'learnerships') {
            managerAggregatedFinancials.learnerships.forecast += forecast
          } else if (productLine === 'tapbusiness') {
            managerAggregatedFinancials.tapBusiness.forecast += forecast
          } else if (productLine === 'compliancetraining') {
            managerAggregatedFinancials.compliance.forecast += forecast
          } else if (productLine === 'othercourses') {
            managerAggregatedFinancials.otherCourses.forecast += forecast
          } else {
            managerAggregatedFinancials.other.forecast += forecast
          }
        })

        setFinancialData(managerAggregatedFinancials)
      }

      // Load pipeline stats from client pipelineStatus field - use filtered clients from above
      const stats = {
        leadGeneration: filteredClientsData.filter(c => c.pipelineStatus === 'new-lead').length,
        initialContact: filteredClientsData.filter(c => c.pipelineStatus === 'qualifying').length,
        needsAssessment: filteredClientsData.filter(c => c.pipelineStatus === 'qualifying').length,
        proposalSent: filteredClientsData.filter(c => c.pipelineStatus === 'proposal-sent').length,
        negotiation: filteredClientsData.filter(c => c.pipelineStatus === 'negotiation' || c.pipelineStatus === 'awaiting-decision').length,
        dealClosed: filteredClientsData.filter(c => c.pipelineStatus === 'won').length
      }
      setPipelineStats(stats)

      // Load message stats - filter by accessible users
      const messages = await getMessages()
      const filteredMessages = (!isSystemAdmin && !isSalesHead())
        ? messages.filter(m => accessibleUserIds.includes(m.assignedTo) || accessibleUserIds.includes(m.createdBy))
        : messages

      setMessageStats({
        unread: filteredMessages.filter(m => m.status === 'unread').length,
        assigned: filteredMessages.filter(m => m.status === 'assigned').length,
        inProgress: filteredMessages.filter(m => m.status === 'in-progress').length,
        resolved: filteredMessages.filter(m => m.status === 'resolved').length
      })

      // Load recent feedback - filter by accessible users
      const feedback = await getFeedback()
      const filteredFeedback = (!isSystemAdmin && !isSalesHead())
        ? feedback.filter(f => accessibleUserIds.includes(f.createdBy) || accessibleUserIds.includes(f.salesPersonId))
        : feedback
      setRecentFeedback(filteredFeedback.slice(0, 5))

      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleSalesPersonChange = async (clientId, userId) => {
    setSavingAllocation(true)
    try {
      await assignSalesPersonToClient(clientId, userId || null)
      await loadAllocationData()
    } catch (error) {
      console.error('Error assigning sales person:', error)
    } finally {
      setSavingAllocation(false)
    }
  }

  const handleSkillsPartnerChange = async (clientId, partnerId) => {
    setSavingAllocation(true)
    try {
      await assignSkillsPartnerToClient(clientId, partnerId || null)
      await loadAllocationData()
    } catch (error) {
      console.error('Error assigning skills partner:', error)
    } finally {
      setSavingAllocation(false)
    }
  }

  const handlePipelineChange = async (clientId, newStatus) => {
    setSavingPipeline(true)
    try {
      await updateClientPipelineStatus(clientId, newStatus)
      // Update local state
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, pipelineStatus: newStatus } : c
      ))
      // Reload pipeline analytics
      await loadPipelineAnalytics()
    } catch (error) {
      console.error('Error updating pipeline status:', error)
    } finally {
      setSavingPipeline(false)
    }
  }

  const getClientsWithoutPipeline = () => {
    return clients.filter(c => !c.pipelineStatus)
  }

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <div className="dashboard-content">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <h1>Dashboard {!isManager && <span className="dashboard-subtitle">(My Performance)</span>}</h1>

      {/* Manager Stats - Unallocated Clients */}
      {isManager && (allocationStats.unallocatedSalesPerson > 0 || allocationStats.unallocatedSkillsPartner > 0) && (
        <div className="manager-alert-bar">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              {allocationStats.unallocatedSalesPerson > 0 && (
                <span
                  className="alert-stat clickable"
                  onClick={() => {
                    setAllocationFilter('sales')
                    setShowAllocationModal(true)
                  }}
                >
                  <strong>{allocationStats.unallocatedSalesPerson}</strong> clients without sales person
                </span>
              )}
              {allocationStats.unallocatedSalesPerson > 0 && allocationStats.unallocatedSkillsPartner > 0 && ' | '}
              {allocationStats.unallocatedSkillsPartner > 0 && (
                <span
                  className="alert-stat clickable"
                  onClick={() => {
                    setAllocationFilter('skills')
                    setShowAllocationModal(true)
                  }}
                >
                  <strong>{allocationStats.unallocatedSkillsPartner}</strong> clients without skills partner
                </span>
              )}
            </span>
          </div>
          <button
            className="allocate-btn"
            onClick={() => {
              setAllocationFilter('all')
              setShowAllocationModal(true)
            }}
          >
            Manage Allocations
          </button>
        </div>
      )}

      {/* Pipeline Warning Bar - for all users with clients missing pipeline */}
      {getClientsWithoutPipeline().length > 0 && (
        <div className="manager-alert-bar pipeline-alert">
          <div className="alert-content">
            <span className="alert-icon">📊</span>
            <span className="alert-text">
              <span
                className="alert-stat clickable"
                onClick={() => setShowPipelineModal(true)}
              >
                <strong>{getClientsWithoutPipeline().length}</strong> {isManager ? 'clients' : 'of your clients'} without pipeline status
              </span>
            </span>
          </div>
          <button
            className="allocate-btn"
            onClick={() => setShowPipelineModal(true)}
          >
            Manage Pipeline
          </button>
        </div>
      )}

      {/* Follow-Up Warning Bar - for all users with clients needing follow-up attention */}
      {followUpStats.needsAttention > 0 && (
        <div className="manager-alert-bar followup-alert">
          <div className="alert-content">
            <span className="alert-icon">📅</span>
            <span className="alert-text">
              {followUpStats.overdue > 0 && (
                <span
                  className="alert-stat clickable"
                  onClick={() => openFollowUpModal('overdue')}
                >
                  <strong>{followUpStats.overdue}</strong> overdue follow-ups
                </span>
              )}
              {followUpStats.overdue > 0 && followUpStats.noFollowUp > 0 && ' | '}
              {followUpStats.noFollowUp > 0 && (
                <span
                  className="alert-stat clickable"
                  onClick={() => openFollowUpModal('no-followup')}
                >
                  <strong>{followUpStats.noFollowUp}</strong> {isManager ? 'clients' : 'of your clients'} without follow-up
                </span>
              )}
              {followUpStats.dueToday > 0 && (
                <>
                  {' | '}
                  <span
                    className="alert-stat clickable"
                    onClick={() => openFollowUpModal('due-today')}
                  >
                    <strong>{followUpStats.dueToday}</strong> due today
                  </span>
                </>
              )}
            </span>
          </div>
          <button
            className="allocate-btn"
            onClick={() => openFollowUpModal('needs-attention')}
          >
            Manage Follow-Ups
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Financial Dashboard */}
        <div className="dashboard-widget financial-dashboard">
          <div className="widget-header">
            <h2>{isManager ? 'Financial Dashboard' : 'My Financial Performance'}</h2>
            <Link to="/dashboard/edit-financial" className="edit-link">
              {isManager ? 'Edit All' : 'Edit My Forecasts'}
            </Link>
          </div>
          <div className="financial-table">
            <table>
              <thead>
                <tr>
                  <th>Product Line</th>
                  {!isManager && <th>Budget</th>}
                  <th>Previous Year</th>
                  <th>YTD</th>
                  <th>Forecast</th>
                  <th>Full Year Forecast</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Learnerships</td>
                  {!isManager && <td>{formatCurrency(financialData.learnerships.budget)}</td>}
                  <td>{formatCurrency(financialData.learnerships.previousYear)}</td>
                  <td>{formatCurrency(financialData.learnerships.ytd)}</td>
                  <td>{formatCurrency(financialData.learnerships.forecast)}</td>
                  <td>{formatCurrency(financialData.learnerships.ytd + financialData.learnerships.forecast)}</td>
                </tr>
                <tr>
                  <td>TAP Business</td>
                  {!isManager && <td>{formatCurrency(financialData.tapBusiness.budget)}</td>}
                  <td>{formatCurrency(financialData.tapBusiness.previousYear)}</td>
                  <td>{formatCurrency(financialData.tapBusiness.ytd)}</td>
                  <td>{formatCurrency(financialData.tapBusiness.forecast)}</td>
                  <td>{formatCurrency(financialData.tapBusiness.ytd + financialData.tapBusiness.forecast)}</td>
                </tr>
                <tr>
                  <td>Compliance</td>
                  {!isManager && <td>{formatCurrency(financialData.compliance.budget)}</td>}
                  <td>{formatCurrency(financialData.compliance.previousYear)}</td>
                  <td>{formatCurrency(financialData.compliance.ytd)}</td>
                  <td>{formatCurrency(financialData.compliance.forecast)}</td>
                  <td>{formatCurrency(financialData.compliance.ytd + financialData.compliance.forecast)}</td>
                </tr>
                <tr>
                  <td>Other Courses</td>
                  {!isManager && <td>{formatCurrency(financialData.otherCourses.budget)}</td>}
                  <td>{formatCurrency(financialData.otherCourses.previousYear)}</td>
                  <td>{formatCurrency(financialData.otherCourses.ytd)}</td>
                  <td>{formatCurrency(financialData.otherCourses.forecast)}</td>
                  <td>{formatCurrency(financialData.otherCourses.ytd + financialData.otherCourses.forecast)}</td>
                </tr>
                {(financialData.other?.previousYear > 0 || financialData.other?.ytd > 0 || financialData.other?.forecast > 0 || financialData.other?.budget > 0) && (
                  <tr>
                    <td>Other</td>
                    {!isManager && <td>{formatCurrency(financialData.other?.budget || 0)}</td>}
                    <td>{formatCurrency(financialData.other?.previousYear || 0)}</td>
                    <td>{formatCurrency(financialData.other?.ytd || 0)}</td>
                    <td>{formatCurrency(financialData.other?.forecast || 0)}</td>
                    <td>{formatCurrency((financialData.other?.ytd || 0) + (financialData.other?.forecast || 0))}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td><strong>Total</strong></td>
                  {!isManager && <td><strong>{formatCurrency(
                    financialData.learnerships.budget +
                    financialData.tapBusiness.budget +
                    financialData.compliance.budget +
                    financialData.otherCourses.budget +
                    (financialData.other?.budget || 0)
                  )}</strong></td>}
                  <td><strong>{formatCurrency(
                    financialData.learnerships.previousYear +
                    financialData.tapBusiness.previousYear +
                    financialData.compliance.previousYear +
                    financialData.otherCourses.previousYear +
                    (financialData.other?.previousYear || 0)
                  )}</strong></td>
                  <td><strong>{formatCurrency(
                    financialData.learnerships.ytd +
                    financialData.tapBusiness.ytd +
                    financialData.compliance.ytd +
                    financialData.otherCourses.ytd +
                    (financialData.other?.ytd || 0)
                  )}</strong></td>
                  <td><strong>{formatCurrency(
                    financialData.learnerships.forecast +
                    financialData.tapBusiness.forecast +
                    financialData.compliance.forecast +
                    financialData.otherCourses.forecast +
                    (financialData.other?.forecast || 0)
                  )}</strong></td>
                  <td><strong>{formatCurrency(
                    (financialData.learnerships.ytd + financialData.learnerships.forecast) +
                    (financialData.tapBusiness.ytd + financialData.tapBusiness.forecast) +
                    (financialData.compliance.ytd + financialData.compliance.forecast) +
                    (financialData.otherCourses.ytd + financialData.otherCourses.forecast) +
                    ((financialData.other?.ytd || 0) + (financialData.other?.forecast || 0))
                  )}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sales Pipeline Widget - Bar Chart */}
        <div className="dashboard-widget pipeline-widget">
          <div className="widget-header">
            <h2>{isManager ? 'Sales Pipeline' : 'My Pipeline'}</h2>
            <Link to="/sales-pipeline" className="view-all-link">View All</Link>
          </div>
          <div className="pipeline-chart">
            {(() => {
              const pipelineData = [
                { name: 'Lead Gen', count: pipelineStats.leadGeneration, color: '#64B5F6' },
                { name: 'Contact', count: pipelineStats.initialContact, color: '#4FC3F7' },
                { name: 'Assessment', count: pipelineStats.needsAssessment, color: '#4DD0E1' },
                { name: 'Proposal', count: pipelineStats.proposalSent, color: '#FFA600' },
                { name: 'Negotiation', count: pipelineStats.negotiation, color: '#FFB74D' },
                { name: 'Closed', count: pipelineStats.dealClosed, color: '#81C784' }
              ]
              const maxCount = Math.max(...pipelineData.map(d => d.count), 1)
              const totalClients = pipelineData.reduce((sum, d) => sum + d.count, 0)

              return (
                <>
                  <div className="pipeline-total">
                    <span className="total-number">{totalClients}</span>
                    <span className="total-label">Total Clients in Pipeline</span>
                  </div>
                  <div className="pipeline-bars">
                    {pipelineData.map((stage, index) => (
                      <div key={index} className="pipeline-bar-item">
                        <div className="bar-label">{stage.name}</div>
                        <div className="bar-container">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(stage.count / maxCount) * 100}%`,
                              backgroundColor: stage.color
                            }}
                          />
                        </div>
                        <div className="bar-count">{stage.count}</div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Messages Widget */}
        <div className="dashboard-widget messages-widget">
          <div className="widget-header">
            <h2>{isManager ? 'Messages' : 'My Messages'}</h2>
            <Link to="/messages" className="view-all-link">View All</Link>
          </div>
          <div className="message-stats">
            <div className="stat-item">
              <span className="stat-label">Unread</span>
              <span className="stat-value">{messageStats.unread}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{messageStats.inProgress}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Assigned</span>
              <span className="stat-value">{messageStats.assigned}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{messageStats.resolved}</span>
            </div>
          </div>
        </div>

        {/* Feedback Widget */}
        <div className="dashboard-widget feedback-widget">
          <div className="widget-header">
            <h2>{isManager ? 'Recent Client Feedback' : 'My Client Feedback'}</h2>
          </div>
          <div className="feedback-list">
            {recentFeedback.length > 0 ? (
              recentFeedback.map((feedback) => (
                <div key={feedback.id} className="feedback-item">
                  <div className="feedback-header-row">
                    <div className="feedback-company">{feedback.companyName || feedback.clientName}</div>
                    <div className="feedback-rating">
                      {'★'.repeat(feedback.overallRating || 0)}
                    </div>
                  </div>
                  {feedback.content && (
                    <div className="feedback-content">{feedback.content}</div>
                  )}
                  <div className="feedback-meta">
                    <span className="feedback-user">
                      {feedback.userName || 'Unknown User'}
                    </span>
                    <span className="feedback-date">
                      {feedback.date
                        ? (feedback.date.toDate ? feedback.date.toDate() : new Date(feedback.date)).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'No date'}
                    </span>
                  </div>
                  {feedback.followUpRequired && (
                    <span className="follow-up-badge">Follow-Up Required</span>
                  )}
                </div>
              ))
            ) : (
              <p className="no-feedback">No recent feedback</p>
            )}
          </div>
        </div>
      </div>

      {/* Client Allocation Modal - Manager Only */}
      {showAllocationModal && isManager && (
        <div className="allocation-modal-backdrop" onClick={() => setShowAllocationModal(false)}>
          <div className="allocation-modal" onClick={e => e.stopPropagation()}>
            <div className="allocation-modal-header">
              <h3>Client Allocations</h3>
              <button className="close-btn" onClick={() => setShowAllocationModal(false)}>×</button>
            </div>

            <div className="allocation-filter-tabs">
              <button
                className={`filter-tab ${allocationFilter === 'all' ? 'active' : ''}`}
                onClick={() => setAllocationFilter('all')}
              >
                All Clients ({allocationStats.totalClients})
              </button>
              <button
                className={`filter-tab ${allocationFilter === 'sales' ? 'active' : ''}`}
                onClick={() => setAllocationFilter('sales')}
              >
                No Sales Person ({allocationStats.unallocatedSalesPerson})
              </button>
              <button
                className={`filter-tab ${allocationFilter === 'skills' ? 'active' : ''}`}
                onClick={() => setAllocationFilter('skills')}
              >
                No Skills Partner ({allocationStats.unallocatedSkillsPartner})
              </button>
            </div>

            <div className="allocation-modal-content">
              {savingAllocation && (
                <div className="saving-overlay">Saving...</div>
              )}
              <table className="allocation-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Sales Person</th>
                    <th>Skills Partner</th>
                  </tr>
                </thead>
                <tbody>
                  {clients
                    .filter(client => {
                      if (allocationFilter === 'sales') {
                        return !client.assignedSalesPerson
                      }
                      if (allocationFilter === 'skills') {
                        return !client.skillsPartnerId || client.skillsPartnerId === 'not-allocated'
                      }
                      return true
                    })
                    .map(client => {
                    const isSkillsPartnerUnallocated = !client.skillsPartnerId || client.skillsPartnerId === 'not-allocated'
                    const isSalesPersonUnallocated = !client.assignedSalesPerson

                    return (
                      <tr key={client.id} className={(isSalesPersonUnallocated || isSkillsPartnerUnallocated) ? 'unallocated-row' : ''}>
                        <td>
                          <Link to={`/clients/${client.id}`} className="client-link">
                            {client.name}
                          </Link>
                        </td>
                        <td>{client.type}</td>
                        <td>
                          <select
                            value={client.assignedSalesPerson || ''}
                            onChange={(e) => handleSalesPersonChange(client.id, e.target.value)}
                            className={isSalesPersonUnallocated ? 'unallocated-select' : ''}
                          >
                            <option value="">-- Select --</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.displayName || user.email}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={client.skillsPartnerId || 'not-allocated'}
                            onChange={(e) => handleSkillsPartnerChange(client.id, e.target.value)}
                            className={isSkillsPartnerUnallocated ? 'unallocated-select' : ''}
                          >
                            <option value="not-allocated">-- Not Allocated --</option>
                            <option value="none">No Skills Partner</option>
                            {skillsPartners.map(partner => (
                              <option key={partner.id} value={partner.id}>
                                {partner.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {skillsPartners.length === 0 && (
                <div className="no-partners-notice">
                  <p>No skills partners have been created yet.</p>
                  <Link to="/skills-partners" className="create-partner-link">
                    Create Skills Partners →
                  </Link>
                </div>
              )}
            </div>

            <div className="allocation-modal-footer">
              <button className="close-modal-btn" onClick={() => setShowAllocationModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Status Modal */}
      {showPipelineModal && (
        <div className="allocation-modal-backdrop" onClick={() => setShowPipelineModal(false)}>
          <div className="allocation-modal" onClick={e => e.stopPropagation()}>
            <div className="allocation-modal-header">
              <h3>Manage Pipeline Status</h3>
              <button className="close-btn" onClick={() => setShowPipelineModal(false)}>×</button>
            </div>

            <div className="pipeline-modal-info">
              <p>Assign pipeline stages to {isManager ? 'clients' : 'your clients'} that don't have a status set.</p>
            </div>

            <div className="allocation-modal-content">
              {savingPipeline && (
                <div className="saving-overlay">Saving...</div>
              )}
              <table className="allocation-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Current Status</th>
                    <th>Pipeline Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {getClientsWithoutPipeline().map(client => (
                    <tr key={client.id} className="unallocated-row">
                      <td>
                        <Link to={`/clients/${client.id}`} className="client-link">
                          {client.name}
                        </Link>
                      </td>
                      <td>{client.type}</td>
                      <td>
                        <span className={`status-badge status-${client.status?.toLowerCase()}`}>
                          {client.status || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <select
                          value={client.pipelineStatus || ''}
                          onChange={(e) => handlePipelineChange(client.id, e.target.value)}
                          className="pipeline-select unallocated-select"
                          style={{ backgroundColor: pipelineStages.find(s => s.id === client.pipelineStatus)?.color || '#f5f5f5' }}
                        >
                          {pipelineStages.map(stage => (
                            <option key={stage.id} value={stage.id}>{stage.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {getClientsWithoutPipeline().length === 0 && (
                <div className="no-partners-notice">
                  <p>All {isManager ? 'clients' : 'your clients'} have been assigned a pipeline status!</p>
                </div>
              )}
            </div>

            <div className="allocation-modal-footer">
              <button className="close-modal-btn" onClick={() => setShowPipelineModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Management Modal */}
      {showFollowUpModal && (
        <div className="allocation-modal-backdrop" onClick={() => { setShowFollowUpModal(false); setEditingFollowUp(null); }}>
          <div className="allocation-modal followup-modal" onClick={e => e.stopPropagation()}>
            <div className="allocation-modal-header">
              <h3>Manage Client Follow-Ups</h3>
              <button className="close-btn" onClick={() => { setShowFollowUpModal(false); setEditingFollowUp(null); }}>×</button>
            </div>

            <div className="followup-filter-tabs">
              <button
                className={`filter-tab ${followUpFilter === 'needs-attention' ? 'active' : ''}`}
                onClick={() => handleFollowUpFilterChange('needs-attention')}
              >
                Needs Attention ({followUpStats.noFollowUp + followUpStats.overdue})
              </button>
              <button
                className={`filter-tab ${followUpFilter === 'overdue' ? 'active' : ''}`}
                onClick={() => handleFollowUpFilterChange('overdue')}
              >
                Overdue ({followUpStats.overdue})
              </button>
              <button
                className={`filter-tab ${followUpFilter === 'no-followup' ? 'active' : ''}`}
                onClick={() => handleFollowUpFilterChange('no-followup')}
              >
                No Follow-Up ({followUpStats.noFollowUp})
              </button>
              <button
                className={`filter-tab ${followUpFilter === 'due-today' ? 'active' : ''}`}
                onClick={() => handleFollowUpFilterChange('due-today')}
              >
                Due Today ({followUpStats.dueToday})
              </button>
              <button
                className={`filter-tab ${followUpFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFollowUpFilterChange('all')}
              >
                All
              </button>
            </div>

            <div className="allocation-modal-content">
              {savingFollowUp && (
                <div className="saving-overlay">Saving...</div>
              )}

              {followUpClients.length > 0 ? (
                <div className="followup-clients-list">
                  {followUpClients.map(client => (
                    <div key={client.id} className={`followup-client-card ${client.followUpStatus}`}>
                      <div className="followup-client-header">
                        <Link to={`/clients/${client.id}`} className="client-link">
                          {client.name}
                        </Link>
                        {getFollowUpStatusBadge(client.followUpStatus, client.daysUntilFollowUp)}
                      </div>

                      {client.nextFollowUpDate && (
                        <div className="followup-current-info">
                          <span className="followup-date">
                            {formatFollowUpDate(client.nextFollowUpDate)}
                          </span>
                          {client.nextFollowUpType && (
                            <span className="followup-type">
                              {followUpTypes.find(t => t.value === client.nextFollowUpType)?.label || client.nextFollowUpType}
                            </span>
                          )}
                          {client.nextFollowUpReason && (
                            <span className="followup-reason">{client.nextFollowUpReason}</span>
                          )}
                        </div>
                      )}

                      {editingFollowUp === client.id ? (
                        <div className="followup-edit-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Follow-Up Date *</label>
                              <input
                                type="date"
                                id={`followup-date-${client.id}`}
                                defaultValue={(() => {
                                  const date = new Date()
                                  date.setDate(date.getDate() + 7)
                                  return date.toISOString().split('T')[0]
                                })()}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div className="form-group">
                              <label>Action Type *</label>
                              <select id={`followup-type-${client.id}`} defaultValue="call">
                                {followUpTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Reason *</label>
                            <input
                              type="text"
                              id={`followup-reason-${client.id}`}
                              placeholder="E.g., Follow up on proposal, Schedule demo..."
                            />
                          </div>
                          <div className="followup-edit-actions">
                            <button
                              className="cancel-btn"
                              onClick={() => setEditingFollowUp(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="save-btn"
                              onClick={() => {
                                const date = document.getElementById(`followup-date-${client.id}`).value
                                const type = document.getElementById(`followup-type-${client.id}`).value
                                const reason = document.getElementById(`followup-reason-${client.id}`).value
                                if (date && reason) {
                                  handleSaveFollowUp(client.id, { date, type, reason })
                                } else {
                                  alert('Please fill in all required fields')
                                }
                              }}
                            >
                              Save Follow-Up
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="followup-client-actions">
                          <button
                            className="set-followup-btn"
                            onClick={() => setEditingFollowUp(client.id)}
                          >
                            {client.nextFollowUpDate ? 'Update Follow-Up' : 'Set Follow-Up'}
                          </button>
                          <Link to={`/clients/${client.id}`} className="view-client-btn">
                            View Client
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-partners-notice">
                  <p>No clients match this filter. Great job staying on top of your follow-ups!</p>
                </div>
              )}
            </div>

            <div className="allocation-modal-footer">
              <button className="close-modal-btn" onClick={() => { setShowFollowUpModal(false); setEditingFollowUp(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
