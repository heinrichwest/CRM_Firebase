import { useState, useEffect, useMemo } from 'react'
import { getAuth } from 'firebase/auth'
import { useTenant } from '../context/TenantContext'
import {
  getClients,
  getFinancialYearSettings,
  calculateFinancialYearMonths,
  getClientFinancialsByYear,
  saveClientFinancial
} from '../services/firestoreService'
import ClientDealsModal from '../components/ClientDealsModal'
import './EditFinancial.css'

const EditFinancial = () => {
  const auth = getAuth()
  const { getTenantId, userData } = useTenant()
  const tenantId = getTenantId()

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [financialYear, setFinancialYear] = useState('')
  const [fySettings, setFySettings] = useState(null)
  const [fyMonths, setFyMonths] = useState([])
  const [clientFinancials, setClientFinancials] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showDealsModal, setShowDealsModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)

  // Permissions
  const userRole = (userData?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isAdmin = userRole === 'admin' || userRole === 'systemadmin'
  const isAccountant = userRole === 'accountant'
  const isManager = userRole === 'manager' || userRole === 'groupsalesmanager'
  const isSalesperson = userRole === 'salesperson'
  const canViewAll = isAdmin || isAccountant || isManager

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [fySettingsData, fyMonthsData, clientsData] = await Promise.all([
        getFinancialYearSettings(tenantId),
        calculateFinancialYearMonths(tenantId),
        getClients({}, tenantId)
      ])

      setFySettings(fySettingsData)
      setFinancialYear(fySettingsData.currentFinancialYear)
      setFyMonths(fyMonthsData.months || [])
      setClients(clientsData)

      if (fySettingsData.currentFinancialYear) {
        const financialsData = await getClientFinancialsByYear(fySettingsData.currentFinancialYear)
        setClientFinancials(financialsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'R 0'
    return `R ${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const handleEditDeals = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    const clientFinancialsData = clientFinancials.filter(cf => cf.clientId === clientId)

    setSelectedClient({
      id: clientId,
      name: client?.name || 'Unknown Client',
      financials: clientFinancialsData
    })
    setShowDealsModal(true)
  }

  const handleSaveDeals = async (updatedFinancials) => {
    try {
      // Save each product line's deals and monthly data
      for (const [productLine, data] of Object.entries(updatedFinancials)) {
        await saveClientFinancial(
          selectedClient.id,
          selectedClient.name,
          financialYear,
          productLine,
          {
            dealDetails: data.dealDetails || [],
            months: data.months || {},
            comments: data.comments || '',
            history: {}
          },
          'system'
        )
      }

      // Reload data
      await loadData()
      alert('Deals saved successfully!')
    } catch (error) {
      console.error('Error saving deals:', error)
      alert('Error saving deals')
    }
  }

  // Filter clients based on user role
  const visibleClients = useMemo(() => {
    console.log('EditFinancial - User Role:', userRole)
    console.log('EditFinancial - userData:', userData)
    console.log('EditFinancial - userData.id:', userData?.id)
    console.log('EditFinancial - canViewAll:', canViewAll)
    console.log('EditFinancial - isSalesperson:', isSalesperson)
    console.log('EditFinancial - Total clients:', clients.length)

    // Log first few clients to see structure
    if (clients.length > 0) {
      console.log('EditFinancial - First 3 clients:', clients.slice(0, 3).map(c => ({
        name: c.name,
        assignedSalesPerson: c.assignedSalesPerson
      })))
    }

    if (canViewAll) {
      // Admins, accountants, and managers can see all clients
      console.log('EditFinancial - Showing all clients (canViewAll)')
      return clients
    } else if (isSalesperson && userData?.id) {
      // Salespeople can only see their assigned clients
      console.log('EditFinancial - Filtering by userData.id:', userData.id)
      const filtered = clients.filter(client => {
        const match = client.assignedSalesPerson === userData.id
        console.log(`EditFinancial - Client: ${client.name}, assignedSalesPerson: ${client.assignedSalesPerson}, match: ${match}`)
        return match
      })
      console.log('EditFinancial - Filtered clients for salesperson:', filtered.length)
      return filtered
    }
    // Default: no clients visible
    console.log('EditFinancial - No clients visible (default)')
    return []
  }, [clients, canViewAll, isSalesperson, userData, userRole])


  // Aggregate all product lines per client into a single row
  const aggregateClientTotals = (clientId) => {
    const clientFinancialsForClient = clientFinancials.filter(cf => cf.clientId === clientId)

    let ytdTotal = 0
    let forecastTotal = 0
    let fullYearTotal = 0

    clientFinancialsForClient.forEach(cf => {
      // Sum YTD actuals
      ytdTotal += cf.history?.currentYearYTD || 0

      // Sum forecast months
      fyMonths.filter(m => m.isRemaining).forEach(m => {
        const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
        forecastTotal += cf.months?.[monthKey] || 0
      })
    })

    fullYearTotal = ytdTotal + forecastTotal

    return { ytdTotal, forecastTotal, fullYearTotal }
  }

  // Create client-level data (one row per client, aggregated)
  const clientTableData = visibleClients.map(client => {
    const totals = aggregateClientTotals(client.id)
    return {
      clientId: client.id,
      clientName: client.name,
      ...totals
    }
  })

  const filteredClientData = clientTableData.filter(row =>
    row.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const remainingMonths = fyMonths.filter(m => m.isRemaining)
  const reportingMonth = fySettings?.reportingMonth || 'October'

  if (loading) {
    return <div className="edit-financial"><h1>Loading...</h1></div>
  }

  return (
    <div className="edit-financial">
      <div className="edit-financial-header">
        <div>
          <h1>Client Financial Forecasting</h1>
          <p className="subtitle">
            Manage client deals and forecasts by clicking Edit Deals for each client
          </p>
        </div>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="financial-table">
          <thead>
            <tr>
              <th className="client-column">Client Name</th>
              <th className="ytd-column">
                YTD Actual<br />
                <span className="header-subtext">{reportingMonth}</span>
              </th>
              <th className="forecast-column">
                Forecast Total<br />
                <span className="header-subtext">Remaining Months</span>
              </th>
              <th className="total-column">
                Full Year Forecast<br />
                <span className="header-subtext">{financialYear}</span>
              </th>
              <th className="action-column">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientData.map((row) => {
              return (
                <tr key={row.clientId}>
                  <td className="client-cell">{row.clientName}</td>
                  <td className="ytd-cell">{formatCurrency(row.ytdTotal)}</td>
                  <td className="forecast-cell">{formatCurrency(row.forecastTotal)}</td>
                  <td className="total-cell">{formatCurrency(row.fullYearTotal)}</td>
                  <td className="action-cell">
                    <button
                      className="edit-deals-btn"
                      onClick={() => handleEditDeals(row.clientId)}
                    >
                      Edit Deals
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td><strong>{formatCurrency(filteredClientData.reduce((sum, row) => sum + row.ytdTotal, 0))}</strong></td>
              <td><strong>{formatCurrency(filteredClientData.reduce((sum, row) => sum + row.forecastTotal, 0))}</strong></td>
              <td><strong>{formatCurrency(filteredClientData.reduce((sum, row) => sum + row.fullYearTotal, 0))}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Client Deals Modal */}
      {showDealsModal && selectedClient && (
        <ClientDealsModal
          isOpen={showDealsModal}
          onClose={() => {
            setShowDealsModal(false)
            setSelectedClient(null)
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          clientFinancials={selectedClient.financials}
          fyMonths={fyMonths}
          financialYear={financialYear}
          onSave={handleSaveDeals}
        />
      )}
    </div>
  )
}

export default EditFinancial
