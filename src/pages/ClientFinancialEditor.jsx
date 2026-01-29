import { useState, useEffect, useMemo } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  getClients,
  getProductLines,
  getProducts,
  getFinancialYearSettings,
  calculateFinancialYearMonths,
  getClientFinancialsByYear,
  saveClientFinancial
} from '../services/firestoreService'
import { getUserData, getUsersByTenant } from '../services/userService'
import { getSkillsPartners } from '../services/skillsPartnerService'
import { getFinancialData, UPLOAD_TYPES, calculateFinancialYear } from '../services/financialUploadService'
import { getTenantProductConfig } from '../services/tenantProductConfigService'
import './ClientFinancialEditor.css'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Currency formatter (as)
const as = (value) => {
  if (value === null || value === undefined || value === '' || value === 0) return ''
  return `R ${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Thousands formatter (Ks)
const Ks = (value) => {
  if (value === null || value === undefined || value === '' || value === 0) return ''
  const thousands = parseFloat(value) / 1000
  return `${thousands.toFixed(0)}K`
}

// Parse integer (qs)
const qs = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? 0 : parsed
}

// Date handling (_r)
const _r = (dateStr) => {
  if (!dateStr) return null
  return new Date(dateStr)
}

// Date formatting (Tr)
const Tr = (date) => {
  if (!date) return ''
  if (typeof date === 'string') date = new Date(date)
  return date.toISOString().split('T')[0]
}

// Financial year start boundary (yn)
const yn = (fySettings) => {
  if (!fySettings || !fySettings.financialYearStart) return new Date(new Date().getFullYear(), 2, 1) // Default March 1
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  }
  const month = monthMap[fySettings.financialYearStart] ?? 2
  const year = fySettings.currentFinancialYear ? parseInt(fySettings.currentFinancialYear) - 1 : new Date().getFullYear()
  return new Date(year, month, 1)
}

// Financial year end boundary (jn)
const jn = (fySettings) => {
  if (!fySettings || !fySettings.financialYearEnd) return new Date(new Date().getFullYear() + 1, 1, 28) // Default Feb 28
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  }
  const month = monthMap[fySettings.financialYearEnd] ?? 1
  const year = fySettings.currentFinancialYear ? parseInt(fySettings.currentFinancialYear) : new Date().getFullYear()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, lastDay)
}

// Current reporting month boundary (Mn)
const Mn = (fySettings) => {
  if (!fySettings || !fySettings.reportingMonth) return new Date()
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  }
  const month = monthMap[fySettings.reportingMonth] ?? new Date().getMonth()
  const year = new Date().getFullYear()
  return new Date(year, month, 1)
}

// Calculate total from months object (or)
const or = (months) => {
  if (!months || typeof months !== 'object') return 0
  return Object.values(months).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
}

// Calculate Skills Partner commission (bs)
const bs = (income, rate) => {
  const incomeVal = parseFloat(income) || 0
  const rateVal = parseFloat(rate) || 0
  return incomeVal * (rateVal / 100)
}

// Calculate Gross Profit (Ys)
const Ys = (income, costs) => {
  const incomeVal = parseFloat(income) || 0
  const costsVal = parseFloat(costs) || 0
  return incomeVal - costsVal
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClientFinancialEditor = () => {
  const { getTenantId, userData, currentUser } = useTenant()
  const tenantId = getTenantId()

  // Core state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Data state
  const [clients, setClients] = useState([])
  const [productLines, setProductLines] = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [skillsPartners, setSkillsPartners] = useState([])
  const [financialYear, setFinancialYear] = useState('')
  const [fySettings, setFySettings] = useState(null)
  const [fyMonths, setFyMonths] = useState([])
  const [clientFinancials, setClientFinancials] = useState([])
  const [financialData, setFinancialData] = useState({})
  const [tenantConfig, setTenantConfig] = useState(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSalesperson, setSelectedSalesperson] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'clientName', direction: 'asc' })

  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailClient, setDetailClient] = useState(null)
  const [detailRows, setDetailRows] = useState([])

  // Learnership Deal Modal state
  const [showLearnershipModal, setShowLearnershipModal] = useState(false)
  const [learnershipModalType, setLearnershipModalType] = useState('Learnerships') // 'Learnerships', 'TAP Business', 'Compliance Training', 'Other Courses'
  const [learnershipClientId, setLearnershipClientId] = useState(null)
  const [learnershipProductLine, setLearnershipProductLine] = useState('')
  const [learnershipDeals, setLearnershipDeals] = useState([])
  const [activeTab, setActiveTab] = useState(0)

  // Permissions
  const userRole = (userData?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isAdmin = userRole === 'admin' || userRole === 'systemadmin'
  const isAccountant = userRole === 'accountant'
  const isManager = userRole === 'manager' || userRole === 'groupsalesmanager'
  const isSalesperson = userRole === 'salesperson'
  const canEdit = isAdmin || isAccountant || isManager
  const canViewAll = isAdmin || isAccountant || isManager

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadInitialData()
  }, [tenantId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      const [
        fySettingsData,
        fyMonthsData,
        clientsData,
        productLinesData,
        productsData,
        usersData,
        skillsPartnersData,
        configData
      ] = await Promise.all([
        getFinancialYearSettings(tenantId),
        calculateFinancialYearMonths(tenantId),
        getClients({}, tenantId),
        getProductLines(tenantId),
        getProducts(tenantId),
        getUsersByTenant(tenantId),
        getSkillsPartners(tenantId),
        getTenantProductConfig(tenantId)
      ])

      setFySettings(fySettingsData)
      setFinancialYear(fySettingsData.currentFinancialYear)
      setFyMonths(fyMonthsData.months || [])
      setClients(clientsData)
      setProductLines(productLinesData)
      setProducts(productsData)
      setUsers(usersData)
      setSkillsPartners(skillsPartnersData)
      setTenantConfig(configData)

      // Load client financials for current year
      if (fySettingsData.currentFinancialYear) {
        const financialsData = await getClientFinancialsByYear(fySettingsData.currentFinancialYear)
        setClientFinancials(financialsData)
      }

      // Load uploaded financial data
      // Note: This component uses clientFinancials, not uploaded financialData
      // const uploadedData = await getFinancialData(tenantId, fySettingsData.currentFinancialYear)
      // setFinancialData(uploadedData)

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // TABLE DATA PROCESSING
  // ============================================================================

  const tableData = useMemo(() => {
    const dataMap = new Map()

    clients.forEach(client => {
      const clientKey = client.id

      if (!dataMap.has(clientKey)) {
        dataMap.set(clientKey, {
          clientId: client.id,
          clientName: client.name,
          salesperson: client.assignedSalesPerson,
          productLines: new Map()
        })
      }

      // Get client financials
      const clientFinancialsForClient = clientFinancials.filter(cf => cf.clientId === client.id)

      clientFinancialsForClient.forEach(cf => {
        const plKey = cf.productLine || 'Other'
        const clientData = dataMap.get(clientKey)

        if (!clientData.productLines.has(plKey)) {
          clientData.productLines.set(plKey, {
            productLine: plKey,
            history: cf.history || {},
            months: cf.months || {},
            dealDetails: cf.dealDetails || null
          })
        }
      })
    })

    return Array.from(dataMap.values())
  }, [clients, clientFinancials])

  const filteredAndSortedData = useMemo(() => {
    let filtered = tableData

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by salesperson
    if (selectedSalesperson !== 'all') {
      filtered = filtered.filter(row => row.salesperson === selectedSalesperson)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (sortConfig.key === 'clientName') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      } else {
        aVal = parseFloat(aVal) || 0
        bVal = parseFloat(bVal) || 0
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [tableData, searchTerm, selectedSalesperson, sortConfig])

  // Calculate totals
  const totals = useMemo(() => {
    const result = {
      ytd: 0,
      forecast: 0,
      total: 0
    }

    filteredAndSortedData.forEach(row => {
      row.productLines.forEach(pl => {
        // YTD from history
        result.ytd += parseFloat(pl.history?.currentYearYTD) || 0

        // Forecast from remaining months
        const forecastMonths = fyMonths.filter(m => m.isRemaining)
        forecastMonths.forEach(m => {
          const key = `${m.year}-${m.calendarMonth}`
          result.forecast += parseFloat(pl.months?.[key]) || 0
        })
      })
    })

    result.total = result.ytd + result.forecast

    return result
  }, [filteredAndSortedData, fyMonths])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleOpenDetailModal = async (clientId) => {
    try {
      const client = clients.find(c => c.id === clientId)
      if (!client) return

      setDetailClient(client)
      setShowDetailModal(true)

      // Load existing financial data for this client
      const existingData = clientFinancials.filter(cf => cf.clientId === clientId)

      if (existingData && existingData.length > 0) {
        const rows = existingData.map(fd => ({
          id: fd.id,
          productLine: fd.productLine || '',
          months: fd.months || {},
          history: fd.history || {},
          dealDetails: fd.dealDetails || null
        }))
        setDetailRows(rows)
      } else {
        // Create initial empty rows
        setDetailRows([
          { productLine: '', months: {}, history: {}, dealDetails: null }
        ])
      }
    } catch (err) {
      console.error('Error opening detail modal:', err)
      setError('Failed to load client financial data')
    }
  }

  const handleDetailSave = async () => {
    if (!detailClient) return

    setSaving(true)
    const rowsToSave = detailRows.filter(row => (row.productLine || '').trim() !== '')

    try {
      const userId = currentUser?.uid || 'system'

      // Save each product line row
      for (const row of rowsToSave) {
        const financialData = {
          months: row.months || {},
          history: row.history || {},
          dealDetails: row.dealDetails || null
        }

        await saveClientFinancial(
          detailClient.id,
          detailClient.name,
          financialYear,
          row.productLine,
          financialData,
          userId
        )
      }

      // Reload data
      await loadInitialData()

      setShowDetailModal(false)
      setDetailClient(null)
      setDetailRows([])
    } catch (err) {
      console.error('Error saving client detail financial data:', err)
      setError('Failed to save client financial data')
    } finally {
      setSaving(false)
    }
  }

  const handleDetailCancel = () => {
    setShowDetailModal(false)
    setDetailClient(null)
    setDetailRows([])
  }

  const handleAddRow = () => {
    setDetailRows([...detailRows, { productLine: '', months: {}, history: {}, dealDetails: null }])
  }

  const handleRemoveRow = (index) => {
    setDetailRows(detailRows.filter((_, i) => i !== index))
  }

  const handleProductLineChange = (index, value) => {
    const newRows = [...detailRows]
    newRows[index].productLine = value
    setDetailRows(newRows)
  }

  const handleMonthValueChange = (rowIndex, monthKey, value) => {
    const newRows = [...detailRows]
    const rawValue = String(value).replace(/[^\d.]/g, '')
    const numericValue = rawValue === '' ? 0 : parseFloat(rawValue)

    if (!newRows[rowIndex].months) {
      newRows[rowIndex].months = {}
    }

    newRows[rowIndex].months[monthKey] = isNaN(numericValue) ? 0 : numericValue
    setDetailRows(newRows)
  }

  // ============================================================================
  // LEARNERSHIP DEAL MODAL
  // ============================================================================

  const handleOpenLearnershipModal = (clientId, productLine, type = 'Learnerships') => {
    setLearnershipClientId(clientId)
    setLearnershipProductLine(productLine)
    setLearnershipModalType(type)

    // Load existing deal data
    const clientData = clientFinancials.find(
      cf => cf.clientId === clientId && cf.productLine === productLine
    )

    if (clientData?.dealDetails?.deals && Array.isArray(clientData.dealDetails.deals)) {
      setLearnershipDeals(clientData.dealDetails.deals)
      setActiveTab(0)
    } else {
      setLearnershipDeals([createEmptyDeal(type)])
      setActiveTab(0)
    }

    setShowLearnershipModal(true)
  }

  const createEmptyDeal = (type) => {
    const baseDeal = {
      dealName: '',
      income: 0,
      startDate: '',
      endDate: '',
      paymentSchedule: 'upfront',
      certainty: 100,
      costs: {
        skillsPartnerCommission: 0,
        skillsPartnerRate: 0,
        moderatorCosts: 0,
        moderatorFrequency: 'once',
        customCosts: []
      },
      notes: ''
    }

    if (type === 'Learnerships') {
      return {
        ...baseDeal,
        learners: 0,
        pricePerLearner: 0,
        skillsPartner: '',
        product: ''
      }
    }

    return baseDeal
  }

  const handleAddLearnershipDeal = () => {
    const newDeal = createEmptyDeal(learnershipModalType)
    setLearnershipDeals([...learnershipDeals, newDeal])
    setActiveTab(learnershipDeals.length)
  }

  const handleRemoveLearnershipDeal = (index) => {
    const newDeals = learnershipDeals.filter((_, i) => i !== index)
    setLearnershipDeals(newDeals)
    if (activeTab >= newDeals.length) {
      setActiveTab(Math.max(0, newDeals.length - 1))
    }
  }

  const handleLearnershipDealChange = (index, field, value) => {
    const newDeals = [...learnershipDeals]

    // Handle nested fields
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      if (!newDeals[index][parent]) newDeals[index][parent] = {}
      newDeals[index][parent][child] = value
    } else {
      newDeals[index][field] = value
    }

    // Auto-calculate income for Learnerships
    if (learnershipModalType === 'Learnerships' && (field === 'learners' || field === 'pricePerLearner')) {
      const learners = field === 'learners' ? parseFloat(value) || 0 : parseFloat(newDeals[index].learners) || 0
      const price = field === 'pricePerLearner' ? parseFloat(value) || 0 : parseFloat(newDeals[index].pricePerLearner) || 0
      newDeals[index].income = learners * price
    }

    // Auto-calculate Skills Partner commission
    if (field === 'skillsPartner') {
      const partner = skillsPartners.find(sp => sp.id === value)
      if (partner) {
        const rate = parseFloat(partner.commissionRate) || 0
        newDeals[index].costs.skillsPartnerRate = rate
        newDeals[index].costs.skillsPartnerCommission = bs(newDeals[index].income, rate)
      }
    }

    if (field === 'income' || field === 'costs.skillsPartnerRate') {
      const income = field === 'income' ? parseFloat(value) || 0 : parseFloat(newDeals[index].income) || 0
      const rate = field === 'costs.skillsPartnerRate' ? parseFloat(value) || 0 : parseFloat(newDeals[index].costs?.skillsPartnerRate) || 0
      if (!newDeals[index].costs) newDeals[index].costs = {}
      newDeals[index].costs.skillsPartnerCommission = bs(income, rate)
    }

    setLearnershipDeals(newDeals)
  }

  const handleAddCustomCost = (dealIndex) => {
    const newDeals = [...learnershipDeals]
    if (!newDeals[dealIndex].costs.customCosts) {
      newDeals[dealIndex].costs.customCosts = []
    }
    newDeals[dealIndex].costs.customCosts.push({
      label: '',
      amount: 0,
      frequency: 'once'
    })
    setLearnershipDeals(newDeals)
  }

  const handleRemoveCustomCost = (dealIndex, costIndex) => {
    const newDeals = [...learnershipDeals]
    newDeals[dealIndex].costs.customCosts = newDeals[dealIndex].costs.customCosts.filter((_, i) => i !== costIndex)
    setLearnershipDeals(newDeals)
  }

  const handleCustomCostChange = (dealIndex, costIndex, field, value) => {
    const newDeals = [...learnershipDeals]
    newDeals[dealIndex].costs.customCosts[costIndex][field] = value
    setLearnershipDeals(newDeals)
  }

  const handleApplyForecast = () => {
    if (!learnershipClientId || !learnershipProductLine) return

    // Calculate monthly distribution from deals
    const monthlyDistribution = {}

    learnershipDeals.forEach(deal => {
      const income = parseFloat(deal.income) || 0
      const costs = calculateDealCosts(deal)
      const gp = Ys(income, costs)
      const certainty = parseFloat(deal.certainty) || 100
      const adjustedGP = gp * (certainty / 100)

      // Distribute GP across months based on payment schedule
      const months = distributeGPAcrossMonths(
        adjustedGP,
        deal.startDate,
        deal.endDate,
        deal.paymentSchedule,
        fyMonths,
        fySettings
      )

      // Add to monthly distribution
      Object.entries(months).forEach(([key, value]) => {
        monthlyDistribution[key] = (monthlyDistribution[key] || 0) + value
      })
    })

    // Update the detail row with this distribution
    const rowIndex = detailRows.findIndex(row => row.productLine === learnershipProductLine)
    if (rowIndex !== -1) {
      const newRows = [...detailRows]
      newRows[rowIndex].months = monthlyDistribution
      newRows[rowIndex].dealDetails = {
        deals: learnershipDeals,
        type: learnershipModalType
      }
      setDetailRows(newRows)
    }

    setShowLearnershipModal(false)
  }

  const calculateDealCosts = (deal) => {
    let totalCosts = 0

    // Skills Partner commission
    totalCosts += parseFloat(deal.costs?.skillsPartnerCommission) || 0

    // Moderator costs
    const moderatorCost = parseFloat(deal.costs?.moderatorCosts) || 0
    const moderatorFreq = deal.costs?.moderatorFrequency || 'once'
    if (moderatorFreq === 'monthly') {
      const months = getMonthsBetween(deal.startDate, deal.endDate)
      totalCosts += moderatorCost * months
    } else {
      totalCosts += moderatorCost
    }

    // Custom costs
    if (deal.costs?.customCosts && Array.isArray(deal.costs.customCosts)) {
      deal.costs.customCosts.forEach(cc => {
        const amount = parseFloat(cc.amount) || 0
        const freq = cc.frequency || 'once'
        if (freq === 'monthly') {
          const months = getMonthsBetween(deal.startDate, deal.endDate)
          totalCosts += amount * months
        } else {
          totalCosts += amount
        }
      })
    }

    return totalCosts
  }

  const getMonthsBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 1
    const start = new Date(startDate)
    const end = new Date(endDate)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    return Math.max(1, months)
  }

  const distributeGPAcrossMonths = (totalGP, startDate, endDate, paymentSchedule, fyMonths, fySettings) => {
    const distribution = {}

    if (!startDate || !endDate || totalGP === 0) return distribution

    const start = new Date(startDate)
    const end = new Date(endDate)
    const fyStart = yn(fySettings)
    const fyEnd = jn(fySettings)

    if (paymentSchedule === 'upfront') {
      // All GP in first month
      const firstMonthKey = getMonthKey(start)
      distribution[firstMonthKey] = totalGP
    } else if (paymentSchedule === 'monthly') {
      // Distribute evenly across months
      const monthCount = getMonthsBetween(startDate, endDate)
      const perMonth = totalGP / monthCount

      let current = new Date(start)
      while (current <= end) {
        const monthKey = getMonthKey(current)
        distribution[monthKey] = perMonth
        current.setMonth(current.getMonth() + 1)
      }
    } else if (paymentSchedule === 'milestone') {
      // Split across milestones (simplified: start, mid, end)
      const monthCount = getMonthsBetween(startDate, endDate)
      const firstMonthKey = getMonthKey(start)
      const midDate = new Date(start)
      midDate.setMonth(start.getMonth() + Math.floor(monthCount / 2))
      const midMonthKey = getMonthKey(midDate)
      const endMonthKey = getMonthKey(end)

      distribution[firstMonthKey] = totalGP * 0.4
      distribution[midMonthKey] = (distribution[midMonthKey] || 0) + totalGP * 0.3
      distribution[endMonthKey] = (distribution[endMonthKey] || 0) + totalGP * 0.3
    }

    return distribution
  }

  const getMonthKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  const handleLearnershipModalClose = () => {
    setShowLearnershipModal(false)
    setLearnershipClientId(null)
    setLearnershipProductLine('')
    setLearnershipDeals([])
    setActiveTab(0)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="client-financial-editor">
        <h1>Client Financial Editor</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="client-financial-editor">
      {/* Header */}
      <div className="editor-header">
        <div>
          <h1>Client Financial Editor</h1>
          <div className="editor-subtitle">
            Financial Year: {financialYear} | {fyMonths.length} months
          </div>
        </div>
        <div className="editor-actions">
          <button
            className="save-btn"
            onClick={() => loadInitialData()}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="editor-error">
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="editor-filters">
        <div className="filter-group">
          <label>Search Client:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="client-search-input"
          />
        </div>

        <div className="filter-group">
          <label>Salesperson:</label>
          <select
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            className="salesperson-filter-select"
          >
            <option value="all">All Salespeople</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Financial Year:</label>
          <input
            type="text"
            value={financialYear}
            readOnly
            className="readonly-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="client-financial-table-wrapper">
        <table className="client-financial-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('clientName')}>
                <div className="header-main">Client Name</div>
              </th>
              <th>
                <div className="header-main">YTD</div>
                <div className="header-sub">(Actual)</div>
              </th>
              <th>
                <div className="header-main">Forecast</div>
                <div className="header-sub">(Remaining)</div>
              </th>
              <th>
                <div className="header-main">FY Total</div>
                <div className="header-sub">(YTD + Forecast)</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  No clients found. Try adjusting your filters.
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map(row => {
                let ytdTotal = 0
                let forecastTotal = 0

                row.productLines.forEach(pl => {
                  ytdTotal += parseFloat(pl.history?.currentYearYTD) || 0

                  const forecastMonths = fyMonths.filter(m => m.isRemaining)
                  forecastMonths.forEach(m => {
                    const key = `${m.year}-${m.calendarMonth}`
                    forecastTotal += parseFloat(pl.months?.[key]) || 0
                  })
                })

                const fyTotal = ytdTotal + forecastTotal

                return (
                  <tr key={row.clientId}>
                    <td>
                      <button
                        className="client-name-link"
                        onClick={() => handleOpenDetailModal(row.clientId)}
                      >
                        {row.clientName}
                      </button>
                    </td>
                    <td>{as(ytdTotal)}</td>
                    <td>{as(forecastTotal)}</td>
                    <td><strong>{as(fyTotal)}</strong></td>
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td><strong>{as(totals.ytd)}</strong></td>
              <td><strong>{as(totals.forecast)}</strong></td>
              <td><strong>{as(totals.total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Client Detail Modal */}
      {showDetailModal && detailClient && (
        <div className="client-detail-modal-backdrop" onClick={handleDetailCancel}>
          <div className="client-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{detailClient.name}</h2>
                <div className="modal-subtitle">
                  Financial Year: {financialYear}
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={handleDetailCancel}>
                  Cancel
                </button>
                <button className="primary-btn" onClick={handleDetailSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="modal-body">
              <button className="add-product-btn" onClick={handleAddRow}>
                + Add Product Line
              </button>

              <div className="client-detail-table-wrapper">
                <table className="client-detail-table">
                  <thead>
                    <tr>
                      <th>Product Line</th>
                      <th>Y-1</th>
                      <th>Y-2</th>
                      <th>Y-3</th>
                      <th>YTD</th>
                      {fyMonths.filter(m => m.isRemaining).map(m => (
                        <th key={`${m.year}-${m.calendarMonth}`}>
                          <div className="header-main">{m.name}</div>
                          <div className="header-sub">{m.year}</div>
                        </th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row, rowIndex) => {
                      const forecastMonths = fyMonths.filter(m => m.isRemaining)
                      const rowTotal = or(row.months)

                      return (
                        <tr key={rowIndex}>
                          <td>
                            <div className="product-line-cell">
                              <select
                                value={row.productLine || ''}
                                onChange={(e) => handleProductLineChange(rowIndex, e.target.value)}
                                className="product-line-input"
                              >
                                <option value="">Select...</option>
                                {productLines.map(pl => (
                                  <option key={pl.id} value={pl.name}>
                                    {pl.name}
                                  </option>
                                ))}
                              </select>

                              {row.productLine === 'Learnerships' && (
                                <button
                                  className="learnership-edit-btn"
                                  onClick={() => handleOpenLearnershipModal(detailClient.id, row.productLine, 'Learnerships')}
                                >
                                  📊 Deals
                                </button>
                              )}

                              {row.productLine === 'TAP Business' && (
                                <button
                                  className="learnership-edit-btn tap-business-edit-btn"
                                  onClick={() => handleOpenLearnershipModal(detailClient.id, row.productLine, 'TAP Business')}
                                >
                                  📊 Deals
                                </button>
                              )}

                              {row.productLine === 'Compliance Training' && (
                                <button
                                  className="learnership-edit-btn compliance-edit-btn"
                                  onClick={() => handleOpenLearnershipModal(detailClient.id, row.productLine, 'Compliance Training')}
                                >
                                  📊 Deals
                                </button>
                              )}

                              {row.productLine === 'Other Courses' && (
                                <button
                                  className="learnership-edit-btn other-courses-edit-btn"
                                  onClick={() => handleOpenLearnershipModal(detailClient.id, row.productLine, 'Other Courses')}
                                >
                                  📊 Deals
                                </button>
                              )}
                            </div>
                          </td>
                          <td><div className="readonly-ytd">{as(row.history?.yearMinus1)}</div></td>
                          <td><div className="readonly-ytd">{as(row.history?.yearMinus2)}</div></td>
                          <td><div className="readonly-ytd">{as(row.history?.yearMinus3)}</div></td>
                          <td><div className="readonly-ytd">{as(row.history?.currentYearYTD)}</div></td>
                          {forecastMonths.map(m => {
                            const key = `${m.year}-${m.calendarMonth}`
                            const value = row.months?.[key] || 0
                            return (
                              <td key={key}>
                                <input
                                  type="text"
                                  value={value === 0 ? '' : value}
                                  onChange={(e) => handleMonthValueChange(rowIndex, key, e.target.value)}
                                  placeholder="0"
                                  className="month-input"
                                  disabled={!canEdit}
                                />
                              </td>
                            )
                          })}
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => handleRemoveRow(rowIndex)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {detailRows.length > 0 && (
                      <tr className="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td><strong>{as(detailRows.reduce((sum, r) => sum + (parseFloat(r.history?.yearMinus1) || 0), 0))}</strong></td>
                        <td><strong>{as(detailRows.reduce((sum, r) => sum + (parseFloat(r.history?.yearMinus2) || 0), 0))}</strong></td>
                        <td><strong>{as(detailRows.reduce((sum, r) => sum + (parseFloat(r.history?.yearMinus3) || 0), 0))}</strong></td>
                        <td><strong>{as(detailRows.reduce((sum, r) => sum + (parseFloat(r.history?.currentYearYTD) || 0), 0))}</strong></td>
                        {fyMonths.filter(m => m.isRemaining).map(m => {
                          const key = `${m.year}-${m.calendarMonth}`
                          const total = detailRows.reduce((sum, r) => sum + (parseFloat(r.months?.[key]) || 0), 0)
                          return <td key={key}><strong>{as(total)}</strong></td>
                        })}
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learnership Deal Modal */}
      {showLearnershipModal && (
        <div className="learnership-modal-backdrop" onClick={handleLearnershipModalClose}>
          <div className={`learnership-modal ${learnershipModalType === 'TAP Business' ? 'tap-business-modal' : ''} ${learnershipModalType === 'Compliance Training' ? 'compliance-modal' : ''} ${learnershipModalType === 'Other Courses' ? 'other-courses-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="learnership-modal-header">
              <h3>{learnershipModalType} Deals</h3>
              <button className="close-btn" onClick={handleLearnershipModalClose}>×</button>
            </div>

            <div className="learnership-modal-body">
              {/* Tabs */}
              <div className="learnership-tabs-header">
                <div className="learnership-tabs">
                  {learnershipDeals.map((deal, index) => (
                    <button
                      key={index}
                      className={`learnership-tab ${activeTab === index ? 'active' : ''}`}
                      onClick={() => setActiveTab(index)}
                    >
                      {deal.dealName || `Deal ${index + 1}`}
                    </button>
                  ))}
                  <button
                    className="learnership-tab add-tab"
                    onClick={handleAddLearnershipDeal}
                  >
                    + Add Deal
                  </button>
                </div>
                <button
                  className="apply-forecast-btn"
                  onClick={handleApplyForecast}
                >
                  Apply to Forecast
                </button>
              </div>

              {/* Tab Content */}
              {learnershipDeals.length > 0 && learnershipDeals[activeTab] && (
                <div className="learnership-tabs-content">
                  <div className="learnership-line-card">
                    <div className="learnership-line-header">
                      <h4>{learnershipDeals[activeTab].dealName || `Deal ${activeTab + 1}`}</h4>
                      <button
                        className="delete-btn-small"
                        onClick={() => handleRemoveLearnershipDeal(activeTab)}
                      >
                        Delete Deal
                      </button>
                    </div>

                    <div className="learnership-vertical-grid">
                      {/* Deal Name */}
                      <div className="learnership-field full-width">
                        <label>Deal Name</label>
                        <input
                          type="text"
                          value={learnershipDeals[activeTab].dealName || ''}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'dealName', e.target.value)}
                          className="learnership-input-compact"
                          placeholder="Enter deal name..."
                        />
                      </div>

                      {/* Learnership-specific fields */}
                      {learnershipModalType === 'Learnerships' && (
                        <>
                          <div className="learnership-field">
                            <label>Number of Learners</label>
                            <input
                              type="number"
                              value={learnershipDeals[activeTab].learners || ''}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'learners', e.target.value)}
                              className="learnership-input-compact"
                            />
                          </div>

                          <div className="learnership-field">
                            <label>Price per Learner</label>
                            <input
                              type="number"
                              value={learnershipDeals[activeTab].pricePerLearner || ''}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'pricePerLearner', e.target.value)}
                              className="learnership-input-compact"
                            />
                          </div>

                          <div className="learnership-field">
                            <label>Skills Partner</label>
                            <select
                              value={learnershipDeals[activeTab].skillsPartner || ''}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'skillsPartner', e.target.value)}
                              className="learnership-input-compact"
                            >
                              <option value="">Select...</option>
                              {skillsPartners.map(sp => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name} ({sp.commissionRate}%)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="learnership-field">
                            <label>Product</label>
                            <select
                              value={learnershipDeals[activeTab].product || ''}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'product', e.target.value)}
                              className="learnership-input-compact"
                            >
                              <option value="">Select...</option>
                              {products.filter(p => p.productLine === 'Learnerships').map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {/* Income */}
                      <div className="learnership-field">
                        <label>Total Income</label>
                        <div className="learnership-value">
                          {as(learnershipDeals[activeTab].income)}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="learnership-field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={learnershipDeals[activeTab].startDate || ''}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'startDate', e.target.value)}
                          className="learnership-input-compact"
                        />
                      </div>

                      <div className="learnership-field">
                        <label>End Date</label>
                        <input
                          type="date"
                          value={learnershipDeals[activeTab].endDate || ''}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'endDate', e.target.value)}
                          className="learnership-input-compact"
                        />
                      </div>

                      {/* Payment Schedule */}
                      <div className="learnership-field">
                        <label>Payment Schedule</label>
                        <select
                          value={learnershipDeals[activeTab].paymentSchedule || 'upfront'}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'paymentSchedule', e.target.value)}
                          className="learnership-input-compact"
                        >
                          <option value="upfront">Upfront</option>
                          <option value="monthly">Monthly</option>
                          <option value="milestone">Milestone</option>
                        </select>
                      </div>

                      {/* Certainty */}
                      <div className="learnership-field">
                        <label>Certainty (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={learnershipDeals[activeTab].certainty || 100}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'certainty', e.target.value)}
                          className="learnership-input-compact"
                        />
                      </div>

                      {/* Cost of Sales Section */}
                      <div className="learnership-costs-section">
                        <h5>Cost of Sales</h5>
                        <p className="costs-section-hint">Enter the costs associated with this deal</p>

                        {/* Skills Partner Commission (read-only) */}
                        <div className="cost-item-row">
                          <div className="cost-amount-field commission-field">
                            <label>Skills Partner Commission</label>
                            <input
                              type="text"
                              value={as(learnershipDeals[activeTab].costs?.skillsPartnerCommission || 0)}
                              readOnly
                              className="learnership-input-compact commission-readonly"
                            />
                            <div className="commission-amount">
                              Auto-calculated: {learnershipDeals[activeTab].costs?.skillsPartnerRate || 0}% of income
                            </div>
                          </div>
                        </div>

                        {/* Moderator Costs */}
                        <div className="cost-item-row">
                          <div className="cost-amount-field">
                            <label>Moderator Costs</label>
                            <input
                              type="number"
                              value={learnershipDeals[activeTab].costs?.moderatorCosts || ''}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'costs.moderatorCosts', e.target.value)}
                              className="learnership-input-compact"
                            />
                          </div>
                          <div className="cost-frequency-field">
                            <label>Frequency</label>
                            <select
                              value={learnershipDeals[activeTab].costs?.moderatorFrequency || 'once'}
                              onChange={(e) => handleLearnershipDealChange(activeTab, 'costs.moderatorFrequency', e.target.value)}
                              className="learnership-input-compact"
                            >
                              <option value="once">Once-off</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom Costs */}
                        {learnershipDeals[activeTab].costs?.customCosts?.map((cc, ccIndex) => (
                          <div key={ccIndex} className="cost-item-row custom-cost-row">
                            <div className="cost-label-field">
                              <label>Cost Label</label>
                              <input
                                type="text"
                                value={cc.label || ''}
                                onChange={(e) => handleCustomCostChange(activeTab, ccIndex, 'label', e.target.value)}
                                className="learnership-input-compact"
                                placeholder="e.g., Training Materials"
                              />
                            </div>
                            <div className="cost-amount-field">
                              <label>Amount</label>
                              <input
                                type="number"
                                value={cc.amount || ''}
                                onChange={(e) => handleCustomCostChange(activeTab, ccIndex, 'amount', e.target.value)}
                                className="learnership-input-compact"
                              />
                            </div>
                            <div className="cost-frequency-field">
                              <label>Frequency</label>
                              <select
                                value={cc.frequency || 'once'}
                                onChange={(e) => handleCustomCostChange(activeTab, ccIndex, 'frequency', e.target.value)}
                                className="learnership-input-compact"
                              >
                                <option value="once">Once-off</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                            <button
                              className="delete-btn-small"
                              onClick={() => handleRemoveCustomCost(activeTab, ccIndex)}
                              style={{ alignSelf: 'flex-end' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        <button
                          className="add-product-btn"
                          onClick={() => handleAddCustomCost(activeTab)}
                        >
                          + Add Custom Cost
                        </button>
                      </div>

                      {/* GP Calculation */}
                      <div className="gp-field">
                        <label>Gross Profit (GP)</label>
                        <div className="gp-value learnership-value">
                          {as(Ys(
                            learnershipDeals[activeTab].income,
                            calculateDealCosts(learnershipDeals[activeTab])
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="learnership-field full-width">
                        <label>Notes</label>
                        <textarea
                          value={learnershipDeals[activeTab].notes || ''}
                          onChange={(e) => handleLearnershipDealChange(activeTab, 'notes', e.target.value)}
                          className="learnership-input-compact learnership-textarea"
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>

                    {/* Deal Summary */}
                    <div className="learnership-summary">
                      <h4>Deal Summary</h4>
                      <div className="summary-content">
                        <div className="summary-row">
                          <div className="summary-item">
                            <label>Total Income</label>
                            <div className="summary-value">{as(learnershipDeals[activeTab].income)}</div>
                          </div>
                          <div className="summary-item">
                            <label>Total Costs</label>
                            <div className="summary-value">{as(calculateDealCosts(learnershipDeals[activeTab]))}</div>
                          </div>
                          <div className="summary-item">
                            <label>Gross Profit</label>
                            <div className="summary-value gp-value">{as(Ys(learnershipDeals[activeTab].income, calculateDealCosts(learnershipDeals[activeTab])))}</div>
                          </div>
                          <div className="summary-item">
                            <label>Certainty</label>
                            <div className="summary-value">{learnershipDeals[activeTab].certainty}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientFinancialEditor
