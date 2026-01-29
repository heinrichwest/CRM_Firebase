import { useState, useEffect } from 'react'
import { getClients, getDeals, getFollowUpTasks } from '../services/firestoreService'
import { getUsers } from '../services/userService'
import { useTenant } from '../context/TenantContext'
import { Link } from 'react-router-dom'
import './Reports.css'

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [filters, setFilters] = useState({
    salesperson: 'all',
    dealAge: 'all',
    sector: 'all',
    seta: 'all'
  })
  const [users, setUsers] = useState([])

  // Team hierarchy from context
  const {
    currentUser,
    isSystemAdmin,
    accessibleUserIds,
    isTeamManager,
    isSalesHead,
    hierarchyLoading
  } = useTenant()

  const isManager = isSystemAdmin || isTeamManager() || isSalesHead()
  const currentUserId = currentUser?.uid

  // Load data when hierarchy is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadReportData()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

  useEffect(() => {
    filterReportData()
  }, [reportData, filters])

  const loadReportData = async () => {
    try {
      const [clients, deals, tasks, usersData] = await Promise.all([
        getClients(),
        getDeals(),
        getFollowUpTasks(),
        getUsers()
      ])

      setUsers(usersData)

      // Filter data based on accessible user IDs
      let filteredClients = clients
      let filteredDeals = deals
      let filteredTasks = tasks

      if (!isSystemAdmin && !isSalesHead()) {
        filteredClients = clients.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) || accessibleUserIds.includes(c.createdBy)
        )
        filteredDeals = deals.filter(d =>
          accessibleUserIds.includes(d.assignedTo) || accessibleUserIds.includes(d.createdBy)
        )
        filteredTasks = tasks.filter(t =>
          accessibleUserIds.includes(t.assignedTo) || accessibleUserIds.includes(t.createdBy)
        )
      }

      // Get active deals (not won/lost)
      const activeDeals = filteredDeals.filter(d =>
        d.stage !== 'won' && d.stage !== 'lost'
      )

      // Get clients with active deals
      const clientsWithActiveDeals = filteredClients.filter(client => {
        return activeDeals.some(deal => deal.clientId === client.id)
      })

      // For each client with active deals, check if they have follow-up tasks
      const reportItems = clientsWithActiveDeals.map(client => {
        const clientDeals = activeDeals.filter(d => d.clientId === client.id)
        const clientTasks = filteredTasks.filter(t =>
          t.clientId === client.id && t.status === 'pending'
        )

        // Get the most recent task due date
        const upcomingTasks = clientTasks.filter(t => {
          if (!t.dueDate) return false
          const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)
          return dueDate >= new Date()
        })

        const lastTask = clientTasks.length > 0
          ? clientTasks.sort((a, b) => {
            const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate || 0)
            const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate || 0)
            return dateB - dateA
          })[0]
          : null

        const lastTaskDate = lastTask?.dueDate
          ? (lastTask.dueDate.toDate ? lastTask.dueDate.toDate() : new Date(lastTask.dueDate))
          : null

        const daysSinceLastFollowUp = lastTaskDate
          ? Math.floor((new Date() - lastTaskDate) / (1000 * 60 * 60 * 24))
          : null

        const hasUpcomingFollowUp = upcomingTasks.length > 0
        const hasOverdueFollowUp = clientTasks.some(t => {
          if (!t.dueDate) return false
          const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)
          return dueDate < new Date()
        })

        const totalDealValue = clientDeals.reduce((sum, d) => sum + (d.value || d.budgetEstimate || 0), 0)

        return {
          client,
          deals: clientDeals,
          totalDealValue,
          lastFollowUpDate: lastTaskDate,
          daysSinceLastFollowUp,
          hasUpcomingFollowUp,
          hasOverdueFollowUp,
          upcomingTasksCount: upcomingTasks.length,
          overdueTasksCount: clientTasks.filter(t => {
            if (!t.dueDate) return false
            const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)
            return dueDate < new Date()
          }).length
        }
      })

      // Filter to only show clients with no follow-ups or overdue follow-ups
      const filtered = reportItems.filter(item =>
        !item.hasUpcomingFollowUp || item.hasOverdueFollowUp
      )

      setReportData(filtered)
      setLoading(false)
    } catch (error) {
      console.error('Error loading report data:', error)
      setLoading(false)
    }
  }

  const filterReportData = () => {
    let filtered = [...reportData]

    if (filters.salesperson !== 'all') {
      filtered = filtered.filter(item =>
        item.client.assignedSalesPerson === filters.salesperson
      )
    }

    if (filters.dealAge !== 'all') {
      const now = new Date()
      filtered = filtered.filter(item => {
        const oldestDeal = item.deals.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
          return dateA - dateB
        })[0]

        if (!oldestDeal) return false
        const dealDate = oldestDeal.createdAt?.toDate
          ? oldestDeal.createdAt.toDate()
          : new Date(oldestDeal.createdAt || 0)
        const daysOld = Math.floor((now - dealDate) / (1000 * 60 * 60 * 24))

        switch (filters.dealAge) {
          case '0-30':
            return daysOld <= 30
          case '31-60':
            return daysOld > 30 && daysOld <= 60
          case '61-90':
            return daysOld > 60 && daysOld <= 90
          case '90+':
            return daysOld > 90
          default:
            return true
        }
      })
    }

    if (filters.sector !== 'all') {
      filtered = filtered.filter(item =>
        item.client.sector?.toLowerCase().includes(filters.sector.toLowerCase())
      )
    }

    if (filters.seta !== 'all') {
      filtered = filtered.filter(item =>
        item.client.seta === filters.seta ||
        item.deals.some(d => d.seta === filters.seta)
      )
    }

    // Sort by days since last follow-up (most urgent first)
    filtered.sort((a, b) => {
      const daysA = a.daysSinceLastFollowUp ?? 999
      const daysB = b.daysSinceLastFollowUp ?? 999
      return daysB - daysA
    })

    setFilteredData(filtered)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date))
    return d.toLocaleDateString('en-ZA')
  }

  const getStatusColor = (item) => {
    if (item.hasOverdueFollowUp) return 'red'
    if (!item.hasUpcomingFollowUp && item.daysSinceLastFollowUp !== null) {
      if (item.daysSinceLastFollowUp > 30) return 'red'
      if (item.daysSinceLastFollowUp > 14) return 'amber'
      return 'green'
    }
    if (!item.hasUpcomingFollowUp) return 'red'
    return 'green'
  }

  const getStatusLabel = (item) => {
    if (item.hasOverdueFollowUp) return 'Overdue Follow-Ups'
    if (!item.hasUpcomingFollowUp && item.daysSinceLastFollowUp !== null) {
      if (item.daysSinceLastFollowUp > 30) return 'No Follow-Up > 30 Days'
      if (item.daysSinceLastFollowUp > 14) return 'No Follow-Up > 14 Days'
      return 'Recent Follow-Up'
    }
    if (!item.hasUpcomingFollowUp) return 'No Follow-Ups'
    return 'Has Upcoming Follow-Ups'
  }

  const getUserName = (userId) => {
    if (!userId) return 'Unassigned'
    const user = users.find(u => u.id === userId)
    return user ? (user.displayName || user.email || 'Unknown') : 'Unknown'
  }

  const exportToCSV = () => {
    const headers = [
      'Client Name',
      'Salesperson',
      'Deal Value',
      'Number of Deals',
      'Last Follow-Up',
      'Days Since Last Follow-Up',
      'Status',
      'Sector',
      'SETA'
    ]

    const rows = filteredData.map(item => [
      item.client.name || item.client.legalName || 'Unknown',
      getUserName(item.client.assignedSalesPerson),
      formatCurrency(item.totalDealValue),
      item.deals.length,
      formatDate(item.lastFollowUpDate),
      item.daysSinceLastFollowUp ?? 'N/A',
      getStatusLabel(item),
      item.client.sector || 'N/A',
      item.client.seta || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-active-deals-no-followups-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="reports">
        <h1>Reports</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <h1>
          {isManager ? 'Clients With Active Deals & No Follow-Ups' : 'My Clients With Active Deals & No Follow-Ups'}
          {!isManager && <span className="page-subtitle">(My Report)</span>}
        </h1>
        <button className="export-btn" onClick={exportToCSV}>
          Export to CSV
        </button>
      </div>

      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">Total Clients at Risk:</span>
          <span className="summary-value">{filteredData.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Pipeline Value:</span>
          <span className="summary-value">
            {formatCurrency(filteredData.reduce((sum, item) => sum + item.totalDealValue, 0))}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Clients with Overdue Follow-Ups:</span>
          <span className="summary-value">
            {filteredData.filter(item => item.hasOverdueFollowUp).length}
          </span>
        </div>
      </div>

      <div className="report-filters">
        {isManager && (
          <select
            value={filters.salesperson}
            onChange={(e) => setFilters({ ...filters, salesperson: e.target.value })}
          >
            <option value="all">All Salespeople</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email || user.id}
              </option>
            ))}
          </select>
        )}

        <select
          value={filters.dealAge}
          onChange={(e) => setFilters({ ...filters, dealAge: e.target.value })}
        >
          <option value="all">All Deal Ages</option>
          <option value="0-30">0-30 Days</option>
          <option value="31-60">31-60 Days</option>
          <option value="61-90">61-90 Days</option>
          <option value="90+">90+ Days</option>
        </select>

        <input
          type="text"
          placeholder="Filter by Sector"
          value={filters.sector === 'all' ? '' : filters.sector}
          onChange={(e) => setFilters({ ...filters, sector: e.target.value || 'all' })}
        />

        <select
          value={filters.seta}
          onChange={(e) => setFilters({ ...filters, seta: e.target.value })}
        >
          <option value="all">All SETAs</option>
          <option value="MERSETA">MERSETA</option>
          <option value="W&RSETA">W&RSETA</option>
          <option value="FASSET">FASSET</option>
          <option value="BANKSETA">BANKSETA</option>
          <option value="INSETA">INSETA</option>
          <option value="ETDP SETA">ETDP SETA</option>
        </select>
      </div>

      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Client</th>
              {isManager && <th>Salesperson</th>}
              <th>Deal Value</th>
              <th># Deals</th>
              <th>Last Follow-Up</th>
              <th>Days Since</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => {
                const statusColor = getStatusColor(item)
                return (
                  <tr key={item.client.id} className={`status-${statusColor}`}>
                    <td>
                      <Link to={`/clients/${item.client.id}`}>
                        {item.client.name || item.client.legalName || 'Unknown'}
                      </Link>
                    </td>
                    {isManager && <td>{getUserName(item.client.assignedSalesPerson)}</td>}
                    <td>{formatCurrency(item.totalDealValue)}</td>
                    <td>{item.deals.length}</td>
                    <td>{formatDate(item.lastFollowUpDate)}</td>
                    <td>
                      {item.daysSinceLastFollowUp !== null
                        ? `${item.daysSinceLastFollowUp} days`
                        : 'Never'
                      }
                    </td>
                    <td>
                      <span className={`status-badge status-${statusColor}`}>
                        {getStatusLabel(item)}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/clients/${item.client.id}`}
                        className="action-link"
                      >
                        View Client
                      </Link>
                      {' | '}
                      <Link
                        to={`/follow-up-tasks?clientId=${item.client.id}`}
                        className="action-link"
                      >
                        View Tasks
                      </Link>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={isManager ? 8 : 7} className="no-data">
                  No clients found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Reports



