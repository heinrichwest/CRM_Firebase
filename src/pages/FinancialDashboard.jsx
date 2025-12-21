import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'
import {
  getClients,
  getFinancialYearSettings,
  calculateFinancialYearMonths
} from '../services/firestoreService'
import { getUsersByTenant } from '../services/userService'
import {
  UPLOAD_TYPES,
  getFinancialData,
  calculateFinancialYear
} from '../services/financialUploadService'
import './FinancialDashboard.css'

const FinancialDashboard = () => {
  const navigate = useNavigate()
  const {
    getTenantId,
    isSystemAdmin,
    isSalesHead,
    accessibleUserIds,
    userData,
    currentTenant,
    hierarchyLoading
  } = useTenant()
  const tenantId = getTenantId()

  console.log('Financial Dashboard - TenantId:', tenantId)
  console.log('Financial Dashboard - UserData:', {
    email: userData?.email,
    tenantId: userData?.tenantId,
    role: userData?.role,
    salesLevel: userData?.salesLevel,
    hierarchyLoading,
    accessibleUserIdsLength: accessibleUserIds?.length
  })

  // State
  const [loading, setLoading] = useState(true)
  const [financialYear, setFinancialYear] = useState('')
  const [fyMonths, setFyMonths] = useState([])
  const [reportingMonth, setReportingMonth] = useState('')
  const [ytdMonths, setYtdMonths] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  // Uploaded financial data (from accountant)
  const [ytdActualData, setYtdActualData] = useState([])  // Current year actuals
  const [budgetData, setBudgetData] = useState([])
  const [ytd1Data, setYtd1Data] = useState([])
  const [ytd2Data, setYtd2Data] = useState([])
  const [ytd3Data, setYtd3Data] = useState([])

  // View filters
  const [selectedView, setSelectedView] = useState('overview')
  const [selectedSalesperson, setSelectedSalesperson] = useState('all')

  // Determine user capabilities
  const isGroupSalesManager = isSalesHead ? isSalesHead() : false
  // Check if isSystemAdmin is a function or boolean
  const isAdmin = typeof isSystemAdmin === 'function' ? isSystemAdmin() : isSystemAdmin
  // Check if user is an accountant (accountants should see all financial data)
  const isAccountant = userData?.role === 'accountant' || userData?.role === 'Accountant'
  // Check for group sales manager role variations (normalize to lowercase for comparison)
  const userRoleLower = (userData?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isGroupSalesManagerByRole = userRoleLower === 'groupsalesmanager' ||
                                     userRoleLower === 'groupsalesmanagers' ||  // plural variant
                                     userRoleLower === 'saleshead' ||
                                     userData?.salesLevel === 'sales_head'
  // Check if user is a regular manager (can see their team's data)
  const isManager = userRoleLower === 'manager' ||
                    userRoleLower === 'managers' ||  // plural variant
                    userRoleLower === 'salesmanager' ||
                    userRoleLower === 'salesmanagers' ||  // plural variant
                    userData?.salesLevel === 'sales_manager'
  // Accountants, admins, sales heads, and managers can view data (managers filtered to their team)
  const canViewAllData = isAdmin || isGroupSalesManager || isGroupSalesManagerByRole || isAccountant || isManager

  // Debug permissions
  console.log('Financial Dashboard - Permissions:', {
    isSystemAdmin,
    isAdmin,
    isGroupSalesManager,
    isGroupSalesManagerByRole,
    isAccountant,
    isManager,
    userRole: userData?.role,
    userRoleLower,
    salesLevel: userData?.salesLevel,
    canViewAllData,
    accessibleUserIds
  })

  useEffect(() => {
    loadInitialData()
  }, [tenantId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      const [fySettingsData, fyMonthsData, clientsData, usersData] = await Promise.all([
        getFinancialYearSettings(tenantId),
        calculateFinancialYearMonths(tenantId),
        getClients({}, tenantId),
        tenantId ? getUsersByTenant(tenantId) : Promise.resolve([])
      ])

      const currentFY = fySettingsData.currentFinancialYear
      setFinancialYear(currentFY)
      setFyMonths(fyMonthsData.months || [])
      setReportingMonth(fySettingsData.reportingMonth || '')
      setYtdMonths(fyMonthsData.ytdMonths || [])
      setClients(clientsData)
      setUsers(usersData)

      // Debug: Log the financial year settings and YTD months
      console.log('Financial Dashboard - FY Settings:', {
        currentFY,
        reportingMonth: fySettingsData.reportingMonth,
        fyStartMonth: fySettingsData.financialYearStart,
        fyEndMonth: fySettingsData.financialYearEnd,
        ytdMonthsCount: fyMonthsData.ytdMonths?.length,
        ytdMonthNames: fyMonthsData.ytdMonths?.map(m => m.name),
        allMonths: fyMonthsData.months?.map(m => m.name)
      })

      // Load uploaded financial data (accountant uploads)
      if (tenantId) {
        const fy1 = calculateFinancialYear(currentFY, -1)
        const fy2 = calculateFinancialYear(currentFY, -2)
        const fy3 = calculateFinancialYear(currentFY, -3)

        console.log('Financial Dashboard - Loading data:', {
          tenantId,
          currentFY,
          fy1,
          fy2,
          fy3,
          uploadTypes: UPLOAD_TYPES
        })

        const [ytdActual, budget, ytd1, ytd2, ytd3] = await Promise.all([
          getFinancialData(UPLOAD_TYPES.YTD_ACTUAL, currentFY, tenantId),
          getFinancialData(UPLOAD_TYPES.BUDGET, currentFY, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_1, fy1, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_2, fy2, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_3, fy3, tenantId)
        ])

        console.log('Financial Dashboard - Data loaded:', {
          ytdActualCount: ytdActual.length,
          budgetCount: budget.length,
          ytd1Count: ytd1.length,
          ytd2Count: ytd2.length,
          ytd3Count: ytd3.length,
          sampleYtdActual: ytdActual[0],
          sampleBudget: budget[0]
        })

        setYtdActualData(ytdActual)
        setBudgetData(budget)
        setYtd1Data(ytd1)
        setYtd2Data(ytd2)
        setYtd3Data(ytd3)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  // Filter clients by salesperson selection and user permissions
  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (selectedSalesperson === 'all') {
      if (canViewAllData) return clients
      // Filter by assignedSalesPerson or createdBy (fallback)
      return clients.filter(c =>
        accessibleUserIds?.includes(c.assignedSalesPerson) ||
        accessibleUserIds?.includes(c.createdBy)
      )
    }
    return clients.filter(c => c.assignedSalesPerson === selectedSalesperson)
  }, [clients, selectedSalesperson, canViewAllData, accessibleUserIds])

  const filteredClientIds = useMemo(() => filteredClients.map(c => c.id), [filteredClients])

  // Debug: Log filtered clients info
  console.log('FinancialDashboard - Client filtering:', {
    totalClients: clients?.length,
    filteredClientsCount: filteredClients.length,
    filteredClientIds: filteredClientIds.slice(0, 5),
    accessibleUserIds,
    selectedSalesperson,
    canViewAllData,
    sampleClient: clients?.[0] ? {
      id: clients[0].id,
      assignedSalesPerson: clients[0].assignedSalesPerson,
      createdBy: clients[0].createdBy
    } : null
  })

  // Build a lookup map for client names (for fallback matching when clientId doesn't match)
  const filteredClientNames = useMemo(() => {
    return new Set(filteredClients.map(c => (c.name || '').toLowerCase().trim()))
  }, [filteredClients])

  // Filter uploaded data by accessible clients (supports matching by ID or name)
  const filterByClients = (data) => {
    if (!data || !data.length) return []
    // For financial dashboard, if user can view all data OR is viewing all salespeople, show all
    if (canViewAllData && selectedSalesperson === 'all') {
      return data
    }
    // Filter by clientId OR clientName (case-insensitive name match for fallback)
    const filtered = data.filter(d => {
      // First try matching by clientId
      if (filteredClientIds.includes(d.clientId)) return true
      // Fallback: match by clientName
      if (d.clientName && filteredClientNames.has(d.clientName.toLowerCase().trim())) return true
      return false
    })
    return filtered
  }

  const filteredYtdActual = useMemo(() => filterByClients(ytdActualData), [ytdActualData, filteredClientIds, filteredClientNames, canViewAllData, selectedSalesperson])
  const filteredBudget = useMemo(() => filterByClients(budgetData), [budgetData, filteredClientIds, filteredClientNames, canViewAllData, selectedSalesperson])
  const filteredYtd1 = useMemo(() => filterByClients(ytd1Data), [ytd1Data, filteredClientIds, filteredClientNames, canViewAllData, selectedSalesperson])
  const filteredYtd2 = useMemo(() => filterByClients(ytd2Data), [ytd2Data, filteredClientIds, filteredClientNames, canViewAllData, selectedSalesperson])
  const filteredYtd3 = useMemo(() => filterByClients(ytd3Data), [ytd3Data, filteredClientIds, filteredClientNames, canViewAllData, selectedSalesperson])

  // Calculate totals for uploaded data (Full Year)
  const calculateTotal = (data) => data.reduce((sum, d) => sum + (d.total || 0), 0)

  const ytdActualTotal = useMemo(() => calculateTotal(filteredYtdActual), [filteredYtdActual])
  const budgetTotal = useMemo(() => calculateTotal(filteredBudget), [filteredBudget])
  const ytd1Total = useMemo(() => calculateTotal(filteredYtd1), [filteredYtd1])
  const ytd2Total = useMemo(() => calculateTotal(filteredYtd2), [filteredYtd2])
  const ytd3Total = useMemo(() => calculateTotal(filteredYtd3), [filteredYtd3])

  // Calculate YTD totals (only months up to and including reporting month)
  const calculateYtdTotal = (data, ytdMonthsList, debugLabel = '') => {
    if (!data || !ytdMonthsList || ytdMonthsList.length === 0) {
      console.log(`calculateYtdTotal [${debugLabel}]: No data or ytdMonths`, { dataLength: data?.length, ytdMonthsLength: ytdMonthsList?.length })
      return 0
    }
    const ytdMonthNames = ytdMonthsList.map(m => m.name)

    // Debug log for first calculation
    if (debugLabel && data.length > 0) {
      const sampleRecord = data[0]
      const sampleMonthData = sampleRecord.monthlyData || sampleRecord.monthlyValues || {}
      console.log(`calculateYtdTotal [${debugLabel}]:`, {
        ytdMonthNames,
        recordCount: data.length,
        sampleMonthDataKeys: Object.keys(sampleMonthData),
        sampleMonthDataValues: sampleMonthData,
        sampleRecordTotal: sampleRecord.total
      })
    }

    const total = data.reduce((sum, record) => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      let recordYtdTotal = 0
      ytdMonthNames.forEach(month => {
        recordYtdTotal += monthData[month] || 0
      })
      return sum + recordYtdTotal
    }, 0)

    if (debugLabel) {
      console.log(`calculateYtdTotal [${debugLabel}]: YTD Total = ${total}`)
    }

    return total
  }

  const ytdActualYtdTotal = useMemo(() => calculateYtdTotal(filteredYtdActual, ytdMonths, 'YTD-Actual'), [filteredYtdActual, ytdMonths])
  const budgetYtdTotal = useMemo(() => calculateYtdTotal(filteredBudget, ytdMonths, 'Budget'), [filteredBudget, ytdMonths])
  const ytd1YtdTotal = useMemo(() => calculateYtdTotal(filteredYtd1, ytdMonths, 'YTD-1'), [filteredYtd1, ytdMonths])
  const ytd2YtdTotal = useMemo(() => calculateYtdTotal(filteredYtd2, ytdMonths, 'YTD-2'), [filteredYtd2, ytdMonths])
  const ytd3YtdTotal = useMemo(() => calculateYtdTotal(filteredYtd3, ytdMonths, 'YTD-3'), [filteredYtd3, ytdMonths])

  // Group by product line (Full Year totals)
  const groupByProductLine = (data) => {
    const grouped = {}
    data.forEach(d => {
      const productLine = d.productLine || 'Unknown'
      if (!grouped[productLine]) {
        grouped[productLine] = { productLine, total: 0, count: 0 }
      }
      grouped[productLine].total += d.total || 0
      grouped[productLine].count += 1
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }

  // Group by product line with YTD totals
  const groupByProductLineYtd = (data, ytdMonthsList) => {
    if (!ytdMonthsList || ytdMonthsList.length === 0) {
      return groupByProductLine(data) // Fall back to full year if no YTD months
    }
    const ytdMonthNames = ytdMonthsList.map(m => m.name)
    const grouped = {}
    data.forEach(d => {
      const productLine = d.productLine || 'Unknown'
      if (!grouped[productLine]) {
        grouped[productLine] = { productLine, total: 0, count: 0 }
      }
      // Calculate YTD total from monthly data
      const monthData = d.monthlyData || d.monthlyValues || {}
      let ytdTotal = 0
      ytdMonthNames.forEach(month => {
        ytdTotal += monthData[month] || 0
      })
      grouped[productLine].total += ytdTotal
      grouped[productLine].count += 1
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }

  const ytdActualByProduct = useMemo(() => groupByProductLineYtd(filteredYtdActual, ytdMonths), [filteredYtdActual, ytdMonths])
  const budgetByProduct = useMemo(() => groupByProductLineYtd(filteredBudget, ytdMonths), [filteredBudget, ytdMonths])
  const ytd1ByProduct = useMemo(() => groupByProductLineYtd(filteredYtd1, ytdMonths), [filteredYtd1, ytdMonths])
  const ytd2ByProduct = useMemo(() => groupByProductLineYtd(filteredYtd2, ytdMonths), [filteredYtd2, ytdMonths])
  const ytd3ByProduct = useMemo(() => groupByProductLineYtd(filteredYtd3, ytdMonths), [filteredYtd3, ytdMonths])

  // Get unique product lines across all data
  const allProductLines = useMemo(() => {
    const lines = new Set()
    ;[...filteredYtdActual, ...filteredBudget, ...filteredYtd1, ...filteredYtd2, ...filteredYtd3].forEach(d => {
      if (d.productLine) lines.add(d.productLine)
    })
    return Array.from(lines).sort()
  }, [filteredYtdActual, filteredBudget, filteredYtd1, filteredYtd2, filteredYtd3])

  // Group by client (Full Year totals)
  const groupByClient = (data) => {
    const grouped = {}
    data.forEach(d => {
      const clientId = d.clientId
      if (!grouped[clientId]) {
        grouped[clientId] = { clientId, clientName: d.clientName || 'Unknown', total: 0 }
      }
      grouped[clientId].total += d.total || 0
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }

  // Group by client with YTD totals (only months up to and including reporting month)
  const groupByClientYtd = (data, ytdMonthsList) => {
    if (!ytdMonthsList || ytdMonthsList.length === 0) {
      return groupByClient(data) // Fall back to full year if no YTD months
    }
    const ytdMonthNames = ytdMonthsList.map(m => m.name)
    const grouped = {}
    data.forEach(d => {
      const clientId = d.clientId
      if (!grouped[clientId]) {
        grouped[clientId] = { clientId, clientName: d.clientName || 'Unknown', total: 0 }
      }
      // Calculate YTD total from monthly data
      const monthData = d.monthlyData || d.monthlyValues || {}
      let ytdTotal = 0
      ytdMonthNames.forEach(month => {
        ytdTotal += monthData[month] || 0
      })
      grouped[clientId].total += ytdTotal
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }

  const ytdActualByClient = useMemo(() => groupByClientYtd(filteredYtdActual, ytdMonths), [filteredYtdActual, ytdMonths])
  const budgetByClient = useMemo(() => groupByClientYtd(filteredBudget, ytdMonths), [filteredBudget, ytdMonths])
  const ytd1ByClient = useMemo(() => groupByClientYtd(filteredYtd1, ytdMonths), [filteredYtd1, ytdMonths])

  // Get unique clients across all data
  const allClients = useMemo(() => {
    const clientMap = {}
    ;[...filteredYtdActual, ...filteredBudget, ...filteredYtd1, ...filteredYtd2, ...filteredYtd3].forEach(d => {
      if (d.clientId && !clientMap[d.clientId]) {
        clientMap[d.clientId] = { clientId: d.clientId, clientName: d.clientName || 'Unknown' }
      }
    })
    return Object.values(clientMap).sort((a, b) => a.clientName.localeCompare(b.clientName))
  }, [filteredYtdActual, filteredBudget, filteredYtd1, filteredYtd2, filteredYtd3])

  // Group by month
  const groupByMonth = (data) => {
    const monthly = {}
    data.forEach(d => {
      // Handle both field names: monthlyData (from uploads) and monthlyValues (legacy)
      const monthData = d.monthlyData || d.monthlyValues
      if (monthData) {
        Object.entries(monthData).forEach(([month, value]) => {
          if (!monthly[month]) monthly[month] = 0
          monthly[month] += value || 0
        })
      }
    })
    return monthly
  }

  const ytdActualByMonth = useMemo(() => groupByMonth(filteredYtdActual), [filteredYtdActual])
  const budgetByMonth = useMemo(() => groupByMonth(filteredBudget), [filteredBudget])
  const ytd1ByMonth = useMemo(() => groupByMonth(filteredYtd1), [filteredYtd1])
  const ytd2ByMonth = useMemo(() => groupByMonth(filteredYtd2), [filteredYtd2])
  const ytd3ByMonth = useMemo(() => groupByMonth(filteredYtd3), [filteredYtd3])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount || 0))
  }

  const formatVariance = (current, prior) => {
    if (!prior) return '-'
    const variance = ((current - prior) / Math.abs(prior)) * 100
    const sign = variance >= 0 ? '+' : ''
    return `${sign}${variance.toFixed(1)}%`
  }

  const getVarianceClass = (current, prior) => {
    if (!prior) return ''
    return current >= prior ? 'positive' : 'negative'
  }

  const handleClientClick = (clientId) => {
    navigate(`/financial-editor/${clientId}`)
  }

  // Check if we have any uploaded data
  const hasUploadedData = ytdActualData.length > 0 || budgetData.length > 0 || ytd1Data.length > 0 || ytd2Data.length > 0 || ytd3Data.length > 0

  if (loading) {
    return (
      <div className="financial-dashboard">
        <h1>Financial Dashboard</h1>
        <div className="loading">Loading financial data...</div>
      </div>
    )
  }

  return (
    <div className="financial-dashboard">
      <div className="page-header">
        <div className="header-left">
          <h1>Financial Dashboard</h1>
          <span className="financial-year-badge">FY {financialYear}</span>
          {currentTenant && (
            <span className="tenant-badge" style={{ marginLeft: '8px', background: '#e3f2fd', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem' }}>
              {currentTenant.name || tenantId}
            </span>
          )}
        </div>
        <div className="header-controls">
          {/* Salesperson Filter (for managers) */}
          {canViewAllData && users.length > 0 && (
            <div className="filter-group">
              <label>Salesperson:</label>
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
              >
                <option value="all">All Salespeople</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Selector */}
          <div className="view-tabs">
            <button
              className={selectedView === 'overview' ? 'active' : ''}
              onClick={() => setSelectedView('overview')}
            >
              Overview
            </button>
            <button
              className={selectedView === 'byClient' ? 'active' : ''}
              onClick={() => setSelectedView('byClient')}
            >
              By Client
            </button>
            <button
              className={selectedView === 'byProduct' ? 'active' : ''}
              onClick={() => setSelectedView('byProduct')}
            >
              By Product
            </button>
            <button
              className={selectedView === 'byMonth' ? 'active' : ''}
              onClick={() => setSelectedView('byMonth')}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Overview Section */}
      {selectedView === 'overview' && (
        <>
          {/* YTD Section - Shows first */}
          <div className="section">
            <h2>Year-to-Date (YTD) - {reportingMonth}</h2>
            <div className="summary-cards">
              <div className="summary-card actual">
                <div className="card-header">
                  <h3>Actual YTD</h3>
                  <span className="year-label">{financialYear}</span>
                </div>
                <div className="card-value">{formatCurrency(ytdActualYtdTotal)}</div>
              </div>

              <div className="summary-card budget">
                <div className="card-header">
                  <h3>Budget YTD</h3>
                  <span className="year-label">{financialYear}</span>
                </div>
                <div className="card-value">{formatCurrency(budgetYtdTotal)}</div>
              </div>

              <div className="summary-card ytd1">
                <div className="card-header">
                  <h3>Prior Year YTD</h3>
                  <span className="year-label">{calculateFinancialYear(financialYear, -1)}</span>
                </div>
                <div className="card-value">{formatCurrency(ytd1YtdTotal)}</div>
              </div>

              <div className="summary-card ytd2">
                <div className="card-header">
                  <h3>2 Years Ago YTD</h3>
                  <span className="year-label">{calculateFinancialYear(financialYear, -2)}</span>
                </div>
                <div className="card-value">{formatCurrency(ytd2YtdTotal)}</div>
              </div>
            </div>
          </div>

          {/* YTD Comparison */}
          {hasUploadedData && (
            <div className="section">
              <h2>YTD Comparison</h2>
              <div className="comparison-grid">
                <div className={`comparison-item ${getVarianceClass(ytdActualYtdTotal, budgetYtdTotal)}`}>
                  <span className="comparison-label">Actual YTD vs Budget YTD</span>
                  <span className="comparison-value">{formatVariance(ytdActualYtdTotal, budgetYtdTotal)}</span>
                  <span className="comparison-detail">{formatCurrency(ytdActualYtdTotal - budgetYtdTotal)}</span>
                </div>
                <div className={`comparison-item ${getVarianceClass(ytdActualYtdTotal, ytd1YtdTotal)}`}>
                  <span className="comparison-label">Actual YTD vs Prior Year YTD</span>
                  <span className="comparison-value">{formatVariance(ytdActualYtdTotal, ytd1YtdTotal)}</span>
                  <span className="comparison-detail">{formatCurrency(ytdActualYtdTotal - ytd1YtdTotal)}</span>
                </div>
                <div className={`comparison-item ${getVarianceClass(budgetYtdTotal, ytd1YtdTotal)}`}>
                  <span className="comparison-label">Budget YTD vs Prior Year YTD</span>
                  <span className="comparison-value">{formatVariance(budgetYtdTotal, ytd1YtdTotal)}</span>
                  <span className="comparison-detail">{formatCurrency(budgetYtdTotal - ytd1YtdTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Year Section */}
          <div className="section">
            <h2>Full Year Totals</h2>
            <div className="summary-cards">
              <div className="summary-card actual">
                <div className="card-header">
                  <h3>Actual Full Year</h3>
                  <span className="year-label">{financialYear}</span>
                </div>
                <div className="card-value">{formatCurrency(ytdActualTotal)}</div>
                <div className="card-label">{filteredYtdActual.length} records</div>
              </div>

              <div className="summary-card budget">
                <div className="card-header">
                  <h3>Budget Full Year</h3>
                  <span className="year-label">{financialYear}</span>
                </div>
                <div className="card-value">{formatCurrency(budgetTotal)}</div>
                <div className="card-label">{filteredBudget.length} records</div>
              </div>

              <div className="summary-card ytd1">
                <div className="card-header">
                  <h3>Prior Year Full</h3>
                  <span className="year-label">{calculateFinancialYear(financialYear, -1)}</span>
                </div>
                <div className="card-value">{formatCurrency(ytd1Total)}</div>
                <div className="card-label">{filteredYtd1.length} records</div>
              </div>

              <div className="summary-card ytd2">
                <div className="card-header">
                  <h3>2 Years Ago Full</h3>
                  <span className="year-label">{calculateFinancialYear(financialYear, -2)}</span>
                </div>
                <div className="card-value">{formatCurrency(ytd2Total)}</div>
                <div className="card-label">{filteredYtd2.length} records</div>
              </div>
            </div>
          </div>

          {/* Full Year Comparison */}
          {hasUploadedData && (
            <div className="section">
              <h2>Full Year Comparison</h2>
              <div className="comparison-grid">
                <div className={`comparison-item ${getVarianceClass(ytdActualTotal, budgetTotal)}`}>
                  <span className="comparison-label">Actual vs Budget</span>
                  <span className="comparison-value">{formatVariance(ytdActualTotal, budgetTotal)}</span>
                  <span className="comparison-detail">{formatCurrency(ytdActualTotal - budgetTotal)}</span>
                </div>
                <div className={`comparison-item ${getVarianceClass(ytdActualTotal, ytd1Total)}`}>
                  <span className="comparison-label">Actual vs Prior Year</span>
                  <span className="comparison-value">{formatVariance(ytdActualTotal, ytd1Total)}</span>
                  <span className="comparison-detail">{formatCurrency(ytdActualTotal - ytd1Total)}</span>
                </div>
                <div className={`comparison-item ${getVarianceClass(budgetTotal, ytd1Total)}`}>
                  <span className="comparison-label">Budget vs Prior Year</span>
                  <span className="comparison-value">{formatVariance(budgetTotal, ytd1Total)}</span>
                  <span className="comparison-detail">{formatCurrency(budgetTotal - ytd1Total)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* By Client View */}
      {selectedView === 'byClient' && (
        <div className="section">
          <h2>Financial Data by Client (YTD to {reportingMonth})</h2>
          {allClients.length === 0 ? (
            <div className="no-data">No financial data available. Upload data in the Accountant Portal.</div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="amount">YTD Actual {financialYear}</th>
                    <th className="amount">YTD Budget {financialYear}</th>
                    <th className="amount">Actual vs Budget</th>
                    <th className="amount">YTD Prior Year</th>
                    <th className="amount">Actual vs PY</th>
                  </tr>
                </thead>
                <tbody>
                  {allClients.map(client => {
                    const actual = ytdActualByClient.find(c => c.clientId === client.clientId)?.total || 0
                    const budget = budgetByClient.find(c => c.clientId === client.clientId)?.total || 0
                    const ytd1 = ytd1ByClient.find(c => c.clientId === client.clientId)?.total || 0
                    return (
                      <tr
                        key={client.clientId}
                        onClick={() => handleClientClick(client.clientId)}
                        className="clickable-row"
                      >
                        <td>{client.clientName}</td>
                        <td className="amount">{formatCurrency(actual)}</td>
                        <td className="amount">{formatCurrency(budget)}</td>
                        <td className={`amount ${getVarianceClass(actual, budget)}`}>
                          {formatVariance(actual, budget)}
                        </td>
                        <td className="amount">{formatCurrency(ytd1)}</td>
                        <td className={`amount ${getVarianceClass(actual, ytd1)}`}>
                          {formatVariance(actual, ytd1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total ({allClients.length} clients)</th>
                    <th className="amount">{formatCurrency(ytdActualYtdTotal)}</th>
                    <th className="amount">{formatCurrency(budgetYtdTotal)}</th>
                    <th className={`amount ${getVarianceClass(ytdActualYtdTotal, budgetYtdTotal)}`}>
                      {formatVariance(ytdActualYtdTotal, budgetYtdTotal)}
                    </th>
                    <th className="amount">{formatCurrency(ytd1YtdTotal)}</th>
                    <th className={`amount ${getVarianceClass(ytdActualYtdTotal, ytd1YtdTotal)}`}>
                      {formatVariance(ytdActualYtdTotal, ytd1YtdTotal)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* By Product View */}
      {selectedView === 'byProduct' && (
        <div className="section">
          <h2>Financial Data by Product Line (YTD to {reportingMonth})</h2>
          {allProductLines.length === 0 ? (
            <div className="no-data">No financial data available. Upload data in the Accountant Portal.</div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Line</th>
                    <th className="amount">YTD Actual {financialYear}</th>
                    <th className="amount">YTD Budget {financialYear}</th>
                    <th className="amount">Actual vs Budget</th>
                    <th className="amount">YTD Prior Year</th>
                    <th className="amount">Actual vs PY</th>
                  </tr>
                </thead>
                <tbody>
                  {allProductLines.map(productLine => {
                    const actual = ytdActualByProduct.find(p => p.productLine === productLine)?.total || 0
                    const budget = budgetByProduct.find(p => p.productLine === productLine)?.total || 0
                    const ytd1 = ytd1ByProduct.find(p => p.productLine === productLine)?.total || 0
                    return (
                      <tr key={productLine}>
                        <td>{productLine}</td>
                        <td className="amount">{formatCurrency(actual)}</td>
                        <td className="amount">{formatCurrency(budget)}</td>
                        <td className={`amount ${getVarianceClass(actual, budget)}`}>
                          {formatVariance(actual, budget)}
                        </td>
                        <td className="amount">{formatCurrency(ytd1)}</td>
                        <td className={`amount ${getVarianceClass(actual, ytd1)}`}>
                          {formatVariance(actual, ytd1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th className="amount">{formatCurrency(ytdActualYtdTotal)}</th>
                    <th className="amount">{formatCurrency(budgetYtdTotal)}</th>
                    <th className={`amount ${getVarianceClass(ytdActualYtdTotal, budgetYtdTotal)}`}>
                      {formatVariance(ytdActualYtdTotal, budgetYtdTotal)}
                    </th>
                    <th className="amount">{formatCurrency(ytd1YtdTotal)}</th>
                    <th className={`amount ${getVarianceClass(ytdActualYtdTotal, ytd1YtdTotal)}`}>
                      {formatVariance(ytdActualYtdTotal, ytd1YtdTotal)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Monthly View */}
      {selectedView === 'byMonth' && (
        <div className="section">
          <h2>Monthly Comparison</h2>
          <p className="section-subtitle">Month 1 = {fyMonths[0]?.calendarMonthName || 'First month of FY'}, Month 12 = {fyMonths[11]?.calendarMonthName || 'Last month of FY'}</p>
          {fyMonths.length === 0 ? (
            <div className="no-data">No monthly data available.</div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Calendar</th>
                    <th className="amount">Actual {financialYear}</th>
                    <th className="amount">Budget {financialYear}</th>
                    <th className="amount">Prior Year</th>
                  </tr>
                </thead>
                <tbody>
                  {fyMonths.map(month => {
                    const monthKey = month.name  // "Month 1", "Month 2", etc.
                    const isYtdMonth = month.isYTD
                    return (
                      <tr key={monthKey} className={isYtdMonth ? 'ytd-row' : 'remaining-row'}>
                        <td>{monthKey}{isYtdMonth && <span className="ytd-badge">YTD</span>}</td>
                        <td className="calendar-month">{month.calendarMonthName}</td>
                        <td className="amount">{formatCurrency(ytdActualByMonth[monthKey] || 0)}</td>
                        <td className="amount">{formatCurrency(budgetByMonth[monthKey] || 0)}</td>
                        <td className="amount">{formatCurrency(ytd1ByMonth[monthKey] || 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="ytd-total-row">
                    <th colSpan="2">YTD Total</th>
                    <th className="amount">{formatCurrency(ytdActualYtdTotal)}</th>
                    <th className="amount">{formatCurrency(budgetYtdTotal)}</th>
                    <th className="amount">{formatCurrency(ytd1YtdTotal)}</th>
                  </tr>
                  <tr>
                    <th colSpan="2">Full Year Total</th>
                    <th className="amount">{formatCurrency(ytdActualTotal)}</th>
                    <th className="amount">{formatCurrency(budgetTotal)}</th>
                    <th className="amount">{formatCurrency(ytd1Total)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* No Tenant State */}
      {!tenantId && !loading && (
        <div className="no-data-container">
          <h2>No Tenant Assigned</h2>
          <p>Your account is not assigned to a tenant. Please contact your administrator.</p>
          <p className="debug-info" style={{ fontSize: '0.85rem', color: '#888', marginTop: '16px' }}>
            Debug: User email: {userData?.email}, TenantId from user: {userData?.tenantId || 'none'}
          </p>
        </div>
      )}

      {/* No Data State */}
      {tenantId && !hasUploadedData && !loading && (
        <div className="no-data-container">
          <h2>No Financial Data Uploaded</h2>
          <p>No budget or historical data has been uploaded yet for tenant: <strong>{currentTenant?.name || tenantId}</strong></p>
          {(isAdmin || isAccountant) && (
            <>
              <p>Use the Accountant Portal to upload YTD Actual, Budget, and prior year data.</p>
              <button
                className="primary-btn"
                onClick={() => navigate('/accountant-upload')}
              >
                Go to Accountant Portal
              </button>
            </>
          )}
          {!isAdmin && !isAccountant && (
            <p style={{ marginTop: '16px', color: '#666' }}>
              Please contact your accountant to upload financial data for your tenant.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default FinancialDashboard
