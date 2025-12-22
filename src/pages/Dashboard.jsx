import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
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
    fy2022: 0,
    fy2023: 0,
    fy2024: 0,
    ytd: 0,
    forecast: 0,
    fullYear: 0,
    budget: 0
  })
  const [ytdFinancialData, setYtdFinancialData] = useState({
    fy2022: 0,
    fy2023: 0,
    fy2024: 0,
    ytd: 0,
    budget: 0
  })
  const [remainingMonths, setRemainingMonths] = useState([])
  const [reportingMonth, setReportingMonth] = useState('')
  const [monthForecasts, setMonthForecasts] = useState({})
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
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Manager-specific state
  const [clients, setClients] = useState([])
  const [filteredClientsForDashboard, setFilteredClientsForDashboard] = useState([])
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
      // Use the same filtered clients from dashboard to ensure consistency
      let clientsData = filteredClientsForDashboard || []
      
      // If we don't have filtered clients yet, fetch them
      if (clientsData.length === 0) {
        const salespersonId = isManager ? null : currentUserId
        clientsData = await getClientsForFollowUpManagement(salespersonId, filter)
        // For team managers, filter to accessible users
        if (isTeamManager() && !isSalesHead() && !isSystemAdmin) {
          clientsData = clientsData.filter(c =>
            accessibleUserIds.includes(c.assignedSalesPerson) ||
            accessibleUserIds.includes(c.createdBy)
          )
        }
      } else {
        // Filter the already-filtered clients by follow-up status
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)

        clientsData = clientsData.map(client => {
          // Calculate follow-up status
          let followUpStatus = 'none'
          let daysUntilFollowUp = null

          if (client.nextFollowUpDate) {
            const followUpDate = client.nextFollowUpDate.toDate
              ? client.nextFollowUpDate.toDate()
              : new Date(client.nextFollowUpDate)
            followUpDate.setHours(0, 0, 0, 0)

            const diffTime = followUpDate - now
            daysUntilFollowUp = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (followUpDate < now) {
              followUpStatus = 'overdue'
            } else if (followUpDate.getTime() === now.getTime()) {
              followUpStatus = 'due-today'
            } else if (followUpDate < nextWeek) {
              followUpStatus = 'due-this-week'
            } else {
              followUpStatus = 'scheduled'
            }
          }

          return {
            ...client,
            followUpStatus,
            daysUntilFollowUp
          }
        })

        // Exclude won/lost clients
        clientsData = clientsData.filter(client => {
          const status = (client.pipelineStatus || '').toLowerCase()
          return status !== 'won' && status !== 'lost'
        })

        // Apply filter
        if (filter === 'no-followup') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'none')
        } else if (filter === 'overdue') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'overdue')
        } else if (filter === 'due-today') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'due-today')
        } else if (filter === 'due-this-week') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'due-this-week')
        } else if (filter === 'needs-attention') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'none' || c.followUpStatus === 'overdue')
        }

        // Sort: overdue first, then no follow-up, then by date
        clientsData.sort((a, b) => {
          const statusOrder = { 'overdue': 0, 'none': 1, 'due-today': 2, 'due-this-week': 3, 'scheduled': 4 }
          const orderDiff = statusOrder[a.followUpStatus] - statusOrder[b.followUpStatus]
          if (orderDiff !== 0) return orderDiff

          // Within same status, sort by days until follow-up (or name if no date)
          if (a.daysUntilFollowUp !== null && b.daysUntilFollowUp !== null) {
            return a.daysUntilFollowUp - b.daysUntilFollowUp
          }
          return (a.name || '').localeCompare(b.name || '')
        })
      }
      
      setFollowUpClients(clientsData)
    } catch (error) {
      console.error('Error loading follow-up clients:', error)
    }
  }

  const handleFollowUpFilterChange = async (newFilter) => {
    setFollowUpFilter(newFilter)
    try {
      // Use the same filtered clients from dashboard to ensure consistency
      let clientsData = filteredClientsForDashboard || []
      
      // If we don't have filtered clients yet, fetch them
      if (clientsData.length === 0) {
        const salespersonId = isManager ? null : currentUserId
        clientsData = await getClientsForFollowUpManagement(salespersonId, newFilter)
        // For team managers, filter to accessible users
        if (isTeamManager() && !isSalesHead() && !isSystemAdmin) {
          clientsData = clientsData.filter(c =>
            accessibleUserIds.includes(c.assignedSalesPerson) ||
            accessibleUserIds.includes(c.createdBy)
          )
        }
      } else {
        // Filter the already-filtered clients by follow-up status
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)

        clientsData = clientsData.map(client => {
          // Calculate follow-up status
          let followUpStatus = 'none'
          let daysUntilFollowUp = null

          if (client.nextFollowUpDate) {
            const followUpDate = client.nextFollowUpDate.toDate
              ? client.nextFollowUpDate.toDate()
              : new Date(client.nextFollowUpDate)
            followUpDate.setHours(0, 0, 0, 0)

            const diffTime = followUpDate - now
            daysUntilFollowUp = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (followUpDate < now) {
              followUpStatus = 'overdue'
            } else if (followUpDate.getTime() === now.getTime()) {
              followUpStatus = 'due-today'
            } else if (followUpDate < nextWeek) {
              followUpStatus = 'due-this-week'
            } else {
              followUpStatus = 'scheduled'
            }
          }

          return {
            ...client,
            followUpStatus,
            daysUntilFollowUp
          }
        })

        // Exclude won/lost clients
        clientsData = clientsData.filter(client => {
          const status = (client.pipelineStatus || '').toLowerCase()
          return status !== 'won' && status !== 'lost'
        })

        // Apply filter
        if (newFilter === 'no-followup') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'none')
        } else if (newFilter === 'overdue') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'overdue')
        } else if (newFilter === 'due-today') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'due-today')
        } else if (newFilter === 'due-this-week') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'due-this-week')
        } else if (newFilter === 'needs-attention') {
          clientsData = clientsData.filter(c => c.followUpStatus === 'none' || c.followUpStatus === 'overdue')
        }

        // Sort: overdue first, then no follow-up, then by date
        clientsData.sort((a, b) => {
          const statusOrder = { 'overdue': 0, 'none': 1, 'due-today': 2, 'due-this-week': 3, 'scheduled': 4 }
          const orderDiff = statusOrder[a.followUpStatus] - statusOrder[b.followUpStatus]
          if (orderDiff !== 0) return orderDiff

          // Within same status, sort by days until follow-up (or name if no date)
          if (a.daysUntilFollowUp !== null && b.daysUntilFollowUp !== null) {
            return a.daysUntilFollowUp - b.daysUntilFollowUp
          }
          return (a.name || '').localeCompare(b.name || '')
        })
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

      // Load users for task display
      const filterTenantId = isSystemAdmin ? null : tenantId
      const usersData = await getUsersByTenant(filterTenantId)
      setUsers(usersData)

      // Determine which clients to include based on user's role
      // First filter by tenant
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
      const ytdMonths = financialYearInfo?.ytdMonths || []
      const ytdMonthNames = ytdMonths.map(m => m.name)
      const remainingMonthsData = financialYearInfo?.remainingMonths || []
      setRemainingMonths(remainingMonthsData.slice(0, 4)) // Show first 4 remaining months
      setReportingMonth(fySettings.reportingMonth || '')

      // Calculate historical years
      const fy2 = calculateFinancialYear(currentFY, -2) // e.g., 2022/2023
      const fy3 = calculateFinancialYear(currentFY, -3) // e.g., 2021/2022

      // Load uploaded financial data from accountant uploads
      const [uploadedYtdActual, uploadedYtd1, uploadedYtd2, uploadedYtd3, uploadedBudget] = await Promise.all([
        getFinancialData(UPLOAD_TYPES.YTD_ACTUAL, currentFY, tenantId),
        getFinancialData(UPLOAD_TYPES.YTD_1, fy1, tenantId),
        getFinancialData(UPLOAD_TYPES.YTD_2, fy2, tenantId),
        getFinancialData(UPLOAD_TYPES.YTD_3, fy3, tenantId),
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
      const myYtd2 = filterUploadedByClients(uploadedYtd2)
      const myYtd3 = filterUploadedByClients(uploadedYtd3)
      const myBudget = filterUploadedByClients(uploadedBudget)

      // Helper to calculate YTD from monthly data (using Month 1, Month 2, etc. format)
      const calculateYtdFromMonthly = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          if (ytdMonths.length > 0) {
            // Use fyMonthNumber to get "Month 1", "Month 2", etc.
            ytdMonths.forEach(month => {
              const monthKey = `Month ${month.fyMonthNumber}`
              const value = monthData[monthKey] || 0
              total += parseFloat(value) || 0
            })
          } else {
            // Fallback to month names if fyMonthNumber not available
            ytdMonthNames.forEach(monthName => {
              total += parseFloat(monthData[monthName] || 0) || 0
            })
          }
        })
        return total
      }

      // Helper to calculate full year from monthly data (for budget - sum all monthly values)
      const calculateFullYearFromMonthly = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          // Sum all monthly values (budget uses "Month 1", "Month 2", etc. format)
          if (monthData && typeof monthData === 'object') {
            const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
              return sum + (parseFloat(value) || 0)
            }, 0)
            total += monthlyTotal || (record.total || 0)
          } else {
            total += (record.total || 0)
          }
        })
        return total
      }

      // Helper to calculate historical year total from monthly data
      const calculateHistoricalYearTotal = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          // Sum all monthly values
          const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
            return sum + (parseFloat(value) || 0)
          }, 0)
          total += monthlyTotal || (record.total || 0)
        })
        return total
      }

      // Helper to calculate YTD from historical data (only up to reporting month)
      const calculateYtdFromHistorical = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          if (ytdMonths.length > 0) {
            // Sum only YTD months (Month 1 through Month N where N is reporting month)
            ytdMonths.forEach(month => {
              const monthKey = `Month ${month.fyMonthNumber}`
              const value = monthData[monthKey] || 0
              total += parseFloat(value) || 0
            })
          } else {
            // Fallback: sum all if no YTD months available
            const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
              return sum + (parseFloat(value) || 0)
            }, 0)
            total += monthlyTotal || (record.total || 0)
          }
        })
        return total
      }

      // Helper to calculate YTD budget (only months up to reporting month)
      const calculateYtdBudget = (records) => {
        let total = 0
        records.forEach(record => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          if (ytdMonths.length > 0) {
            // Sum only YTD months for budget
            ytdMonths.forEach(month => {
              const monthKey = `Month ${month.fyMonthNumber}`
              const value = monthData[monthKey] || 0
              total += parseFloat(value) || 0
            })
          } else {
            // Fallback: use total if no monthly data
            total += (record.total || 0)
          }
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

        // Calculate totals from uploaded data (all product lines combined)
        const totalYtd = calculateYtdFromMonthly(myYtdActual)
        const totalFy2024 = calculateHistoricalYearTotal(myYtd1) // YTD-1 = FY 2024
        const totalFy2023 = calculateHistoricalYearTotal(myYtd2) // YTD-2 = FY 2023
        const totalFy2022 = calculateHistoricalYearTotal(myYtd3) // YTD-3 = FY 2022
        const totalBudget = calculateFullYearFromMonthly(myBudget)

        // Calculate forecast from saved financials and monthly forecasts
        let totalForecast = 0
        let totalFullYear = 0
        const monthForecastTotals = {}
        
        // Initialize month forecasts
        remainingMonthsData.slice(0, 4).forEach(month => {
          const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
          monthForecastTotals[monthKey] = 0
        })

        currentYearFinancials.forEach(cf => {
          const productLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return

          const fullYearForecast = cf.fullYearForecast || 0
          totalFullYear += fullYearForecast
          
          // Get monthly forecasts
          const months = cf.months || {}
          remainingMonthsData.slice(0, 4).forEach(month => {
            const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
            const monthValue = months[monthKey] || 0
            monthForecastTotals[monthKey] = (monthForecastTotals[monthKey] || 0) + (parseFloat(monthValue) || 0)
          })
          
          // Forecast is remaining after YTD
          const forecast = Math.max(0, fullYearForecast - (cf.history?.currentYearYTD || 0))
          totalForecast += forecast
        })

        setMonthForecasts(monthForecastTotals)
        
        // Calculate full year forecast as YTD + sum of forecasting months
        const totalForecastingMonths = Object.values(monthForecastTotals).reduce((sum, value) => sum + (parseFloat(value) || 0), 0)
        const calculatedFullYear = totalYtd + totalForecastingMonths
        
        console.log('Dashboard Full Year Calculation:', {
          ytd: totalYtd,
          forecastingMonths: monthForecastTotals,
          totalForecastingMonths,
          calculatedFullYear
        })
        
        setFinancialData({
          fy2022: totalFy2022,
          fy2023: totalFy2023,
          fy2024: totalFy2024,
          ytd: totalYtd,
          forecast: totalForecast,
          fullYear: calculatedFullYear,
          budget: totalBudget
        })

        // Calculate YTD values for the YTD-only block
        const ytdFy2024 = calculateYtdFromHistorical(myYtd1) // YTD-1 = FY 2024 YTD
        const ytdFy2023 = calculateYtdFromHistorical(myYtd2) // YTD-2 = FY 2023 YTD
        const ytdFy2022 = calculateYtdFromHistorical(myYtd3) // YTD-3 = FY 2022 YTD
        const ytdBudget = calculateYtdBudget(myBudget)

        setYtdFinancialData({
          fy2022: ytdFy2022,
          fy2023: ytdFy2023,
          fy2024: ytdFy2024,
          ytd: totalYtd, // Current year YTD is the same
          budget: ytdBudget
        })
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

        // Calculate totals from uploaded data (all product lines combined)
        const totalYtd = calculateYtdFromMonthly(myYtdActual)
        const totalFy2024 = calculateHistoricalYearTotal(myYtd1) // YTD-1 = FY 2024
        const totalFy2023 = calculateHistoricalYearTotal(myYtd2) // YTD-2 = FY 2023
        const totalFy2022 = calculateHistoricalYearTotal(myYtd3) // YTD-3 = FY 2022
        const totalBudget = calculateFullYearFromMonthly(myBudget)

        // Calculate forecast from saved financials and monthly forecasts
        let totalForecast = 0
        let totalFullYear = 0
        const monthForecastTotals = {}
        
        // Initialize month forecasts
        remainingMonthsData.slice(0, 4).forEach(month => {
          const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
          monthForecastTotals[monthKey] = 0
        })

        managerCurrentYearFinancials.forEach(cf => {
          const productLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
          if (legacyProductLines.includes(productLine)) return

          const fullYearForecast = cf.fullYearForecast || 0
          totalFullYear += fullYearForecast
          
          // Get monthly forecasts from the months object
          const months = cf.months || {}
          remainingMonthsData.slice(0, 4).forEach(month => {
            const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
            // Try different key formats
            const monthValue = months[monthKey] || months[`${month.year}-${month.calendarMonth + 1}`] || 0
            const numericValue = parseFloat(monthValue) || 0
            monthForecastTotals[monthKey] = (monthForecastTotals[monthKey] || 0) + numericValue
          })
          
          // Forecast is remaining after YTD
          const forecast = Math.max(0, fullYearForecast - (cf.history?.currentYearYTD || 0))
          totalForecast += forecast
        })

        console.log('Manager month forecasts calculated:', monthForecastTotals)
        setMonthForecasts(monthForecastTotals)
        
        // Calculate full year forecast as YTD + sum of forecasting months
        const totalForecastingMonths = Object.values(monthForecastTotals).reduce((sum, value) => sum + (parseFloat(value) || 0), 0)
        const calculatedFullYear = totalYtd + totalForecastingMonths
        
        console.log('Manager Full Year Calculation:', {
          ytd: totalYtd,
          forecastingMonths: monthForecastTotals,
          totalForecastingMonths,
          calculatedFullYear
        })
        
        setFinancialData({
          fy2022: totalFy2022,
          fy2023: totalFy2023,
          fy2024: totalFy2024,
          ytd: totalYtd,
          forecast: totalForecast,
          fullYear: calculatedFullYear,
          budget: totalBudget
        })

        // Calculate YTD values for the YTD-only block
        const ytdFy2024 = calculateYtdFromHistorical(myYtd1) // YTD-1 = FY 2024 YTD
        const ytdFy2023 = calculateYtdFromHistorical(myYtd2) // YTD-2 = FY 2023 YTD
        const ytdFy2022 = calculateYtdFromHistorical(myYtd3) // YTD-3 = FY 2022 YTD
        const ytdBudget = calculateYtdBudget(myBudget)

        setYtdFinancialData({
          fy2022: ytdFy2022,
          fy2023: ytdFy2023,
          fy2024: ytdFy2024,
          ytd: totalYtd, // Current year YTD is the same
          budget: ytdBudget
        })
      }

      // Store filtered clients for use in follow-up modal
      setFilteredClientsForDashboard(filteredClientsData)

      // Load pipeline stats from client pipelineStatus field - use filtered clients from above
      // Only count clients that have a pipelineStatus set (not null/undefined)
      const clientsWithPipelineStatus = filteredClientsData.filter(c => c.pipelineStatus)
      const stats = {
        leadGeneration: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'new-lead').length,
        initialContact: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'qualifying').length,
        needsAssessment: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'needs-assessment').length,
        proposalSent: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'proposal-sent').length,
        negotiation: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'negotiation' || c.pipelineStatus === 'awaiting-decision').length,
        dealClosed: clientsWithPipelineStatus.filter(c => c.pipelineStatus === 'won').length
      }
      setPipelineStats(stats)


      // Load upcoming tasks (clients with nextFollowUpDate) - filter by accessible users
      // Use the same filteredClientsData that we already have
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      
      let tasks = filteredClientsData
        .filter(c => {
          // Only include clients that have a nextFollowUpDate and are not won/lost
          const status = (c.pipelineStatus || '').toLowerCase()
          return c.nextFollowUpDate && status !== 'won' && status !== 'lost'
        })
        .map(client => {
          // Calculate follow-up status and days until
          let followUpStatus = 'scheduled'
          let daysUntilFollowUp = null
          
          if (client.nextFollowUpDate) {
            const followUpDate = client.nextFollowUpDate.toDate
              ? client.nextFollowUpDate.toDate()
              : new Date(client.nextFollowUpDate)
            followUpDate.setHours(0, 0, 0, 0)
            
            const diffTime = followUpDate - now
            daysUntilFollowUp = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (followUpDate < now) {
              followUpStatus = 'overdue'
            } else if (followUpDate.getTime() === now.getTime()) {
              followUpStatus = 'due-today'
            } else if (followUpDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
              followUpStatus = 'due-this-week'
            }
          }
          
          return {
            ...client,
            followUpStatus,
            daysUntilFollowUp
          }
        })
        .sort((a, b) => {
          // Sort by: overdue first, then due today, then by date
          const statusOrder = { 'overdue': 0, 'due-today': 1, 'due-this-week': 2, 'scheduled': 3 }
          const orderDiff = statusOrder[a.followUpStatus] - statusOrder[b.followUpStatus]
          if (orderDiff !== 0) return orderDiff
          
          // Within same status, sort by days until follow-up
          if (a.daysUntilFollowUp !== null && b.daysUntilFollowUp !== null) {
            return a.daysUntilFollowUp - b.daysUntilFollowUp
          }
          return (a.name || '').localeCompare(b.name || '')
        })
        .slice(0, 10) // Show top 10 upcoming tasks
      
      setUpcomingTasks(tasks)

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
              Edit
            </Link>
          </div>
          <div className="financial-summary">
            <div className="financial-section">
              <div className="financial-section-header">Prior Year Actuals</div>
              <div className="financial-item">
                <span className="financial-label">FY 2022</span>
                <span className="financial-value">{formatCurrency(financialData.fy2022)}</span>
              </div>
              <div className="financial-item">
                <span className="financial-label">FY 2023</span>
                <span className="financial-value">{formatCurrency(financialData.fy2023)}</span>
              </div>
              <div className="financial-item">
                <span className="financial-label">FY 2024</span>
                <span className="financial-value">{formatCurrency(financialData.fy2024)}</span>
              </div>
            </div>

            <div className="financial-section">
              <div className="financial-section-header-with-value">
                <span className="financial-section-header-text">YTD Actual ({reportingMonth})</span>
                <span className="financial-value">{formatCurrency(financialData.ytd)}</span>
              </div>
            </div>

            <div className="financial-section">
              <div className="financial-section-header">Forecasting Months</div>
              {remainingMonths.length > 0 ? (
                <div 
                  className="forecasting-months-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    marginTop: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {remainingMonths.map((month, idx) => {
                    const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
                    const monthValue = monthForecasts[monthKey] || 0
                    return (
                      <div 
                        key={idx} 
                        className="forecasting-month-item"
                        style={{
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <span className="forecasting-month-label">{month.name}</span>
                        <span className="forecasting-month-value">{formatCurrency(monthValue)}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '8px 0', color: '#666' }}>No forecasting months available</div>
              )}
            </div>

            <div className="financial-section">
              <div className="financial-section-header-with-value">
                <span className="financial-section-header-text">Full Year Forecast</span>
                <span className="financial-value">{formatCurrency(financialData.fullYear)}</span>
              </div>
            </div>

            {!isManager && (
              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">Budget</span>
                  <span className="financial-value">{formatCurrency(financialData.budget)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YTD Financial Dashboard */}
        <div className="dashboard-widget financial-dashboard">
          <div className="widget-header">
            <h2>{isManager ? 'YTD Financial Dashboard' : 'My YTD Financial Performance'}</h2>
          </div>
          <div className="financial-summary">
            <div className="financial-section">
              <div className="financial-section-header">Prior Year YTD Actuals</div>
              <div className="financial-item">
                <span className="financial-label">FY 2022 YTD</span>
                <span className="financial-value">{formatCurrency(ytdFinancialData.fy2022)}</span>
              </div>
              <div className="financial-item">
                <span className="financial-label">FY 2023 YTD</span>
                <span className="financial-value">{formatCurrency(ytdFinancialData.fy2023)}</span>
              </div>
              <div className="financial-item">
                <span className="financial-label">FY 2024 YTD</span>
                <span className="financial-value">{formatCurrency(ytdFinancialData.fy2024)}</span>
              </div>
            </div>

            <div className="financial-section">
              <div className="financial-section-header-with-value">
                <span className="financial-section-header-text">YTD Actual ({reportingMonth})</span>
                <span className="financial-value">{formatCurrency(ytdFinancialData.ytd)}</span>
              </div>
            </div>

            {!isManager && (
              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">YTD Budget</span>
                  <span className="financial-value">{formatCurrency(ytdFinancialData.budget)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Column: Pipeline and Tasks */}
        <div className="dashboard-right-column">
          {/* Sales Pipeline Widget - Bar Chart */}
          <div className="dashboard-widget pipeline-widget pipeline-widget-compact">
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

          {/* Upcoming Tasks Widget */}
          <div className="dashboard-widget upcoming-tasks-widget">
            <div className="widget-header">
              <h2>{isManager ? 'Upcoming Client Tasks' : 'My Upcoming Tasks'}</h2>
              <Link to="/clients" className="view-all-link">View All</Link>
            </div>
            <div className="tasks-list">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => {
                  const followUpDate = task.nextFollowUpDate?.toDate
                    ? task.nextFollowUpDate.toDate()
                    : new Date(task.nextFollowUpDate)
                  const dateStr = followUpDate.toLocaleDateString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                  
                  return (
                    <div key={task.id} className="task-item">
                      <div className="task-header-row">
                        <div className="task-client-name">{task.name}</div>
                        <div className={`task-status-badge ${task.followUpStatus}`}>
                          {task.followUpStatus === 'overdue' && '⚠️ Overdue'}
                          {task.followUpStatus === 'due-today' && '📅 Due Today'}
                          {task.followUpStatus === 'due-this-week' && `📅 In ${task.daysUntilFollowUp} days`}
                          {task.followUpStatus === 'scheduled' && `📅 ${task.daysUntilFollowUp} days`}
                        </div>
                      </div>
                      {task.nextFollowUpType && (
                        <div className="task-type">
                          Type: {task.nextFollowUpType}
                        </div>
                      )}
                      {task.nextFollowUpNotes && (
                        <div className="task-notes">{task.nextFollowUpNotes}</div>
                      )}
                      <div className="task-meta">
                        <span className="task-date">
                          Due: {dateStr}
                        </span>
                        {task.assignedSalesPerson && (
                          <span className="task-assigned">
                            Assigned to: {users.find(u => u.id === task.assignedSalesPerson)?.displayName || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="no-tasks">No upcoming tasks</p>
              )}
            </div>
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
