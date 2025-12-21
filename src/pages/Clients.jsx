import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getClients,
  getSkillsPartners,
  getFinancialYearSettings,
  calculateFinancialYearMonths
} from '../services/firestoreService'
import { getUsers } from '../services/userService'
import { getFinancialData, UPLOAD_TYPES } from '../services/financialUploadService'
import { useTenant } from '../context/TenantContext'
import './Clients.css'

const Clients = () => {
  const [clients, setClients] = useState([])
  const [filteredClients, setFilteredClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [followUpFilter, setFollowUpFilter] = useState('all')
  
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    pending: 0,
    prospects: 0,
    ytdRevenue: 0,
    pipelineValue: 0
  })

  const [pipelineSummary, setPipelineSummary] = useState({
    leadGeneration: 0,
    contactMade: 0,
    needsAssessment: 0,
    dealClosed: 0
  })

  const [users, setUsers] = useState([])
  const [skillsPartners, setSkillsPartners] = useState([])
  const [ytdActualData, setYtdActualData] = useState([])
  const [ytdMonths, setYtdMonths] = useState([])
  const [financialYear, setFinancialYear] = useState('')
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
  const hasManagerView = isSystemAdmin || isTeamManager() || isSalesHead()

  // Load clients when hierarchy data is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadClients()
      loadSupportingData()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm, statusFilter, typeFilter, followUpFilter])

  const loadSupportingData = async () => {
    try {
      // Load users and skills partners for manager view
      if (hasManagerView) {
        const [usersData, partnersData] = await Promise.all([
          getUsers(),
          getSkillsPartners()
        ])
        setUsers(usersData)
        setSkillsPartners(partnersData)
      }
    } catch (error) {
      console.error('Error loading supporting data:', error)
    }
  }

  const loadClients = async () => {
    try {
      const tenantId = getTenantId()

      // Load clients, financial settings, and financial data in parallel
      const [clientsData, fySettings, fyMonthsData] = await Promise.all([
        getClients({}, tenantId),
        getFinancialYearSettings(tenantId),
        calculateFinancialYearMonths(tenantId)
      ])

      setFinancialYear(fySettings.currentFinancialYear || '')
      setYtdMonths(fyMonthsData.ytdMonths || [])

      // Load YTD actual data if we have a financial year
      let ytdData = []
      if (fySettings.currentFinancialYear && tenantId) {
        ytdData = await getFinancialData(UPLOAD_TYPES.YTD_ACTUAL, fySettings.currentFinancialYear, tenantId)
        setYtdActualData(ytdData)
      }

      // Filter clients based on user's accessible user IDs
      // System admins and sales heads see all clients in the tenant
      // Sales managers see clients assigned to themselves or their team
      // Regular salespeople see only their own clients
      let filteredClientData = clientsData
      if (!isSystemAdmin && !isSalesHead() && currentUser) {
        filteredClientData = clientsData.filter(c => {
          // Include if client is assigned to an accessible user
          if (c.assignedSalesPerson && accessibleUserIds.includes(c.assignedSalesPerson)) {
            return true
          }
          // Include if client was created by an accessible user (fallback for unassigned)
          if (c.createdBy && accessibleUserIds.includes(c.createdBy)) {
            return true
          }
          return false
        })
      }

      setClients(filteredClientData)

      // Calculate YTD revenue from uploaded financial data (supports matching by clientId OR clientName)
      const calculateClientYtdRevenue = (clientId, clientName) => {
        // First try matching by clientId
        let clientFinancials = ytdData.filter(d => d.clientId === clientId)

        // If no match by ID, try matching by clientName (case-insensitive)
        if (clientFinancials.length === 0 && clientName) {
          const normalizedName = clientName.toLowerCase().trim()
          clientFinancials = ytdData.filter(d =>
            d.clientName && d.clientName.toLowerCase().trim() === normalizedName
          )
        }

        if (clientFinancials.length === 0) return 0

        const ytdMonthNames = (fyMonthsData.ytdMonths || []).map(m => m.name)
        if (ytdMonthNames.length === 0) return 0

        return clientFinancials.reduce((total, record) => {
          const monthData = record.monthlyData || record.monthlyValues || {}
          let recordTotal = 0
          ytdMonthNames.forEach(monthName => {
            recordTotal += monthData[monthName] || 0
          })
          return total + recordTotal
        }, 0)
      }

      // Calculate total YTD revenue across all clients
      const totalYtdRevenue = filteredClientData.reduce((sum, c) => sum + calculateClientYtdRevenue(c.id, c.name), 0)

      // Calculate summary
      const stats = {
        total: filteredClientData.length,
        active: filteredClientData.filter(c => c.status === 'Active').length,
        pending: filteredClientData.filter(c => c.status === 'Pending').length,
        prospects: filteredClientData.filter(c => c.status === 'Prospect').length,
        ytdRevenue: totalYtdRevenue,
        pipelineValue: filteredClientData.reduce((sum, c) => sum + (c.pipelineValue || 0), 0)
      }
      setSummary(stats)

      setLoading(false)
    } catch (error) {
      console.error('Error loading clients:', error)
      setLoading(false)
    }
  }

  // Calculate YTD revenue for a single client from uploaded financial data
  // Supports matching by clientId OR clientName (case-insensitive name match for fallback)
  const getClientYtdRevenue = useMemo(() => {
    const ytdMonthNames = ytdMonths.map(m => m.name)

    return (clientId, clientName) => {
      if (ytdActualData.length === 0 || ytdMonthNames.length === 0) {
        return 0
      }

      // First try matching by clientId
      let clientFinancials = ytdActualData.filter(d => d.clientId === clientId)

      // If no match by ID, try matching by clientName (case-insensitive)
      if (clientFinancials.length === 0 && clientName) {
        const normalizedName = clientName.toLowerCase().trim()
        clientFinancials = ytdActualData.filter(d =>
          d.clientName && d.clientName.toLowerCase().trim() === normalizedName
        )
      }

      if (clientFinancials.length === 0) return 0

      return clientFinancials.reduce((total, record) => {
        const monthData = record.monthlyData || record.monthlyValues || {}
        let recordTotal = 0
        ytdMonthNames.forEach(monthName => {
          recordTotal += monthData[monthName] || 0
        })
        return total + recordTotal
      }, 0)
    }
  }, [ytdActualData, ytdMonths])

  const getSalesPersonName = (salesPersonId) => {
    if (!salesPersonId) return 'Unassigned'
    const user = users.find(u => u.id === salesPersonId)
    return user?.displayName || user?.email || 'Unknown'
  }

  const getSkillsPartnerName = (partnerId) => {
    if (!partnerId || partnerId === 'not-allocated') return 'Not Allocated'
    if (partnerId === 'none') return 'No Skills Partner'
    const partner = skillsPartners.find(p => p.id === partnerId)
    return partner?.name || 'Unknown'
  }

  const getFollowUpStatus = (client) => {
    // Exclude won/lost clients from follow-up tracking
    if (client.pipelineStatus === 'Won' || client.pipelineStatus === 'Lost') {
      return 'not-applicable'
    }

    if (!client.nextFollowUpDate) {
      return 'none'
    }

    const followUpDate = client.nextFollowUpDate?.toDate ? client.nextFollowUpDate.toDate() : new Date(client.nextFollowUpDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    followUpDate.setHours(0, 0, 0, 0)

    const diffTime = followUpDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'due-today'
    if (diffDays <= 3) return 'due-soon'
    return 'scheduled'
  }

  const formatFollowUpDate = (timestamp) => {
    if (!timestamp) return null
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const filterClients = () => {
    let filtered = [...clients]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.legalName?.toLowerCase().includes(searchLower) ||
        client.tradingName?.toLowerCase().includes(searchLower) ||
        client.vatNumber?.toLowerCase().includes(searchLower) ||
        client.primaryContact?.toLowerCase().includes(searchLower) ||
        client.contactEmail?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        client.hrContactPerson?.toLowerCase().includes(searchLower) ||
        client.hrContactEmail?.toLowerCase().includes(searchLower) ||
        client.sdfName?.toLowerCase().includes(searchLower) ||
        client.trainingManagerName?.toLowerCase().includes(searchLower) ||
        client.decisionMakerName?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(client => client.type === typeFilter)
    }

    if (followUpFilter !== 'all') {
      filtered = filtered.filter(client => {
        const status = getFollowUpStatus(client)
        if (followUpFilter === 'needs-attention') {
          return status === 'overdue' || status === 'due-today' || status === 'none'
        }
        return status === followUpFilter
      })
    }

    setFilteredClients(filtered)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA')
  }

  if (loading) {
    return (
      <div className="clients">
        <h1>Clients</h1>
        <div className="clients-content">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="clients">
      <div className="clients-header">
        <h1>Clients</h1>
        <Link to="/clients/new" className="add-client-btn">+ Add Client</Link>
      </div>

      {/* Pipeline Summary */}
      <div className="pipeline-summary">
        <h3>Sales Pipeline Summary</h3>
        <div className="pipeline-stats">
          <div className="pipeline-stat">
            <span className="stat-label">Lead Generation</span>
            <span className="stat-value">{pipelineSummary.leadGeneration}</span>
          </div>
          <div className="pipeline-stat">
            <span className="stat-label">Contact Made</span>
            <span className="stat-value">{pipelineSummary.contactMade}</span>
          </div>
          <div className="pipeline-stat">
            <span className="stat-label">Needs Assessment</span>
            <span className="stat-value">{pipelineSummary.needsAssessment}</span>
          </div>
          <div className="pipeline-stat">
            <span className="stat-label">Deal Closed</span>
            <span className="stat-value">{pipelineSummary.dealClosed}</span>
          </div>
        </div>
      </div>

      {/* Client Overview */}
      <div className="client-overview">
        <h3>Client Overview</h3>
        <div className="overview-stats">
          <div className="overview-stat">
            <span className="stat-label">Total Clients</span>
            <span className="stat-value">{summary.total}</span>
          </div>
          <div className="overview-stat">
            <span className="stat-label">Active</span>
            <span className="stat-value">{summary.active}</span>
          </div>
          <div className="overview-stat">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{summary.pending}</span>
          </div>
          <div className="overview-stat">
            <span className="stat-label">Prospects</span>
            <span className="stat-value">{summary.prospects}</span>
          </div>
          <div className="overview-stat">
            <span className="stat-label">YTD Actual</span>
            <span className="stat-value">{formatCurrency(summary.ytdRevenue)}</span>
          </div>
          <div className="overview-stat">
            <span className="stat-label">Pipeline Value</span>
            <span className="stat-value">{formatCurrency(summary.pipelineValue)}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="clients-filters">
        <input
          type="text"
          placeholder="Search clients..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Prospect">Prospect</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="Corporate">Corporate</option>
          <option value="School">School</option>
          <option value="Program">Program</option>
        </select>
        <select
          className="filter-select followup-filter"
          value={followUpFilter}
          onChange={(e) => setFollowUpFilter(e.target.value)}
        >
          <option value="all">All Follow-ups</option>
          <option value="needs-attention">Needs Attention</option>
          <option value="overdue">Overdue</option>
          <option value="due-today">Due Today</option>
          <option value="due-soon">Due Soon</option>
          <option value="none">No Follow-up</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <button className="export-btn">Export Data</button>
      </div>

      {/* Clients Table */}
      <div className="clients-content">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-Up</th>
              {hasManagerView && <th>Sales Person</th>}
              {hasManagerView && <th>Skills Partner</th>}
              <th>Last Contact</th>
              <th>YTD Actual</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link to={`/clients/${client.id}`} className="client-name-link">
                      {client.name || client.legalName || 'Unnamed Client'}
                    </Link>
                  </td>
                  <td>{client.type || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${client.status?.toLowerCase()}`}>
                      {client.status || 'N/A'}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const followUpStatus = getFollowUpStatus(client)
                      const followUpDate = formatFollowUpDate(client.nextFollowUpDate)

                      if (followUpStatus === 'not-applicable') {
                        return <span className="followup-badge na">N/A</span>
                      }
                      if (followUpStatus === 'none') {
                        return <span className="followup-badge none">No Follow-up</span>
                      }
                      return (
                        <div className="followup-cell">
                          <span className={`followup-badge ${followUpStatus}`}>
                            {followUpStatus === 'overdue' && 'Overdue'}
                            {followUpStatus === 'due-today' && 'Today'}
                            {followUpStatus === 'due-soon' && 'Soon'}
                            {followUpStatus === 'scheduled' && 'Scheduled'}
                          </span>
                          <span className="followup-date">{followUpDate}</span>
                        </div>
                      )
                    })()}
                  </td>
                  {hasManagerView && (
                    <td>
                      <span className={!client.assignedSalesPerson ? 'unassigned-text' : ''}>
                        {getSalesPersonName(client.assignedSalesPerson)}
                      </span>
                    </td>
                  )}
                  {hasManagerView && (
                    <td>
                      <span className={!client.skillsPartnerId || client.skillsPartnerId === 'not-allocated' ? 'unassigned-text' : ''}>
                        {getSkillsPartnerName(client.skillsPartnerId)}
                      </span>
                    </td>
                  )}
                  <td>{formatDate(client.lastContact)}</td>
                  <td>{formatCurrency(getClientYtdRevenue(client.id, client.name))}</td>
                  <td>
                    <Link to={`/clients/${client.id}`} className="action-link">View</Link>
                    <Link to={`/clients/${client.id}/edit`} className="action-link">Edit</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={hasManagerView ? 9 : 7} className="no-clients">
                  No clients found. <Link to="/clients/new">Add your first client</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Clients
