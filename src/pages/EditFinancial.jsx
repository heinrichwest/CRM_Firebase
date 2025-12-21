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
import './EditFinancial.css'

const EditFinancial = () => {
  const auth = getAuth()
  const { getTenantId, userData } = useTenant()
  const tenantId = getTenantId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [financialYear, setFinancialYear] = useState('')
  const [fySettings, setFySettings] = useState(null)
  const [fyMonths, setFyMonths] = useState([])
  const [clientFinancials, setClientFinancials] = useState([])
  const [editedData, setEditedData] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleSaveAll = async () => {
    try {
      setSaving(true)

      for (const [key, value] of Object.entries(editedData)) {
        const [clientId, productLine, field] = key.split('|')

        // Find or create client financial record
        let clientFinancial = clientFinancials.find(
          cf => cf.clientId === clientId && cf.productLine === productLine
        )

        if (!clientFinancial) {
          const client = clients.find(c => c.id === clientId)
          clientFinancial = {
            clientId,
            clientName: client?.name || '',
            productLine,
            months: {},
            comments: ''
          }
        }

        // Update the field
        if (field === 'comments') {
          clientFinancial.comments = value
        } else {
          // It's a month field
          if (!clientFinancial.months) clientFinancial.months = {}
          clientFinancial.months[field] = parseFloat(value) || 0
        }

        // Save to Firestore
        const client = clients.find(c => c.id === clientId)
        await saveClientFinancial(
          clientId,
          client?.name || '',
          financialYear,
          productLine,
          {
            months: clientFinancial.months || {},
            comments: clientFinancial.comments || '',
            history: clientFinancial.history || {}
          },
          'system'
        )
      }

      // Reload data
      await loadData()
      setEditedData({})
      alert('Changes saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCellChange = (clientId, productLine, field, value) => {
    const key = `${clientId}|${productLine}|${field}`
    setEditedData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getCellValue = (clientId, productLine, field) => {
    const key = `${clientId}|${productLine}|${field}`
    if (editedData[key] !== undefined) return editedData[key]

    const cf = clientFinancials.find(
      c => c.clientId === clientId && c.productLine === productLine
    )

    if (field === 'comments') return cf?.comments || ''
    return cf?.months?.[field] || ''
  }

  const getHistoryValue = (clientId, productLine, historyField) => {
    const cf = clientFinancials.find(
      c => c.clientId === clientId && c.productLine === productLine
    )
    return cf?.history?.[historyField] || 0
  }

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'R 0'
    return `R ${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const calculateFullYearForecast = (clientId, productLine) => {
    const ytd = getHistoryValue(clientId, productLine, 'currentYearYTD')
    let forecastTotal = 0

    fyMonths.filter(m => m.isRemaining).forEach(m => {
      const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
      const value = getCellValue(clientId, productLine, monthKey)
      forecastTotal += parseFloat(value) || 0
    })

    return ytd + forecastTotal
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

  // Group data by client
  const tableData = []
  visibleClients.forEach(client => {
    // Get all product lines for this client
    const productLines = [...new Set(
      clientFinancials
        .filter(cf => cf.clientId === client.id)
        .map(cf => cf.productLine || 'Other')
    )]

    if (productLines.length === 0) {
      productLines.push('Other') // At least one row per client
    }

    productLines.forEach(pl => {
      tableData.push({
        clientId: client.id,
        clientName: client.name,
        productLine: pl
      })
    })
  })

  const filteredData = tableData.filter(row =>
    row.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.productLine.toLowerCase().includes(searchTerm.toLowerCase())
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
            Edit detailed forecasts per client and product line, using current year YTD and remaining months
          </p>
        </div>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search clients or product lines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button
            onClick={handleSaveAll}
            disabled={saving || Object.keys(editedData).length === 0}
            className="save-all-btn"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="financial-table">
          <thead>
            <tr>
              <th className="client-column">Client / Product Line</th>
              <th className="history-year">FY {parseInt(financialYear) - 3}</th>
              <th className="history-year">FY {parseInt(financialYear) - 2}</th>
              <th className="history-year">FY {parseInt(financialYear) - 1}</th>
              <th className="ytd-column">
                YTD Actual<br />
                <span className="header-subtext">{reportingMonth}</span>
              </th>
              {remainingMonths.map(m => (
                <th key={`${m.year}-${m.calendarMonth}`} className="month-header">
                  {m.name}
                </th>
              ))}
              <th className="total-column">
                Full Year Forecast<br />
                <span className="header-subtext">{financialYear}</span>
              </th>
              <th className="comments-column">Comments</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => {
              const fy2022 = getHistoryValue(row.clientId, row.productLine, 'yearMinus3')
              const fy2023 = getHistoryValue(row.clientId, row.productLine, 'yearMinus2')
              const fy2024 = getHistoryValue(row.clientId, row.productLine, 'yearMinus1')
              const ytd = getHistoryValue(row.clientId, row.productLine, 'currentYearYTD')
              const fullYearForecast = calculateFullYearForecast(row.clientId, row.productLine)

              return (
                <tr key={`${row.clientId}-${row.productLine}`}>
                  <td className="client-cell">{row.clientName}</td>
                  <td className="history-cell">{formatCurrency(fy2022)}</td>
                  <td className="history-cell">{formatCurrency(fy2023)}</td>
                  <td className="history-cell">{formatCurrency(fy2024)}</td>
                  <td className="ytd-cell">{formatCurrency(ytd)}</td>
                  {remainingMonths.map(m => {
                    const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
                    const value = getCellValue(row.clientId, row.productLine, monthKey)
                    return (
                      <td key={monthKey} className="month-cell">{formatCurrency(value)}</td>
                    )
                  })}
                  <td className="total-cell">{formatCurrency(fullYearForecast)}</td>
                  <td className="comments-cell"></td>
                </tr>
              )
            })}
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td><strong>{formatCurrency(filteredData.reduce((sum, row) => sum + (getHistoryValue(row.clientId, row.productLine, 'yearMinus3') || 0), 0))}</strong></td>
              <td><strong>{formatCurrency(filteredData.reduce((sum, row) => sum + (getHistoryValue(row.clientId, row.productLine, 'yearMinus2') || 0), 0))}</strong></td>
              <td><strong>{formatCurrency(filteredData.reduce((sum, row) => sum + (getHistoryValue(row.clientId, row.productLine, 'yearMinus1') || 0), 0))}</strong></td>
              <td><strong>{formatCurrency(filteredData.reduce((sum, row) => sum + (getHistoryValue(row.clientId, row.productLine, 'currentYearYTD') || 0), 0))}</strong></td>
              {remainingMonths.map(m => {
                const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
                const total = filteredData.reduce((sum, row) => sum + (parseFloat(getCellValue(row.clientId, row.productLine, monthKey)) || 0), 0)
                return <td key={monthKey}><strong>{formatCurrency(total)}</strong></td>
              })}
              <td><strong>{formatCurrency(filteredData.reduce((sum, row) => sum + calculateFullYearForecast(row.clientId, row.productLine), 0))}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {Object.keys(editedData).length > 0 && (
        <div className="unsaved-changes-banner">
          You have {Object.keys(editedData).length} unsaved change(s). Click "Save All Changes" to save.
        </div>
      )}
    </div>
  )
}

export default EditFinancial
