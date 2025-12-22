import { useState, useEffect, useMemo } from 'react'
import { getAuth } from 'firebase/auth'
import { useTenant } from '../context/TenantContext'
import {
  getClients,
  getFinancialYearSettings,
  calculateFinancialYearMonths,
  getClientFinancialsByYear,
  getSkillsPartners,
  saveClientFinancial
} from '../services/firestoreService'
import { getFinancialData, UPLOAD_TYPES, calculateFinancialYear } from '../services/financialUploadService'
import './EditFinancial.css'

const EditFinancial = () => {
  const auth = getAuth()
  const { getTenantId, userData } = useTenant()
  const tenantId = getTenantId()

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [skillsPartners, setSkillsPartners] = useState({})
  const [financialYear, setFinancialYear] = useState('')
  const [fySettings, setFySettings] = useState(null)
  const [fyMonths, setFyMonths] = useState([])
  const [ytdMonths, setYtdMonths] = useState([])
  const [clientFinancials, setClientFinancials] = useState([])
  const [uploadedFinancialData, setUploadedFinancialData] = useState({
    ytd1: [],
    ytd2: [],
    ytd3: [],
    budget: [],
    ytdActual: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [skillsPartnerFilter, setSkillsPartnerFilter] = useState('')
  const [editingData, setEditingData] = useState({}) // Track edited values
  const [hasChanges, setHasChanges] = useState(false)
  const [commentModal, setCommentModal] = useState(null) // { clientId, monthKey, monthName }

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

      const [fySettingsData, fyMonthsData, clientsData, partnersData] = await Promise.all([
        getFinancialYearSettings(tenantId),
        calculateFinancialYearMonths(tenantId),
        getClients({}, tenantId),
        getSkillsPartners(tenantId)
      ])

      setFySettings(fySettingsData)
      setFinancialYear(fySettingsData.currentFinancialYear)
      setFyMonths(fyMonthsData.months || [])
      // Store YTD months separately for easier access
      setYtdMonths(fyMonthsData.ytdMonths || [])
      setClients(clientsData)

      // Create skills partners lookup map
      const partnersMap = {}
      partnersData.forEach(partner => {
        partnersMap[partner.id] = partner.name
      })
      setSkillsPartners(partnersMap)

      // Load financial data for current year and historical years
      if (fySettingsData.currentFinancialYear) {
        const currentYear = fySettingsData.currentFinancialYear
        
        // Load current year financials from clientFinancials (forecasts)
        const currentYearFinancials = await getClientFinancialsByYear(currentYear)
        
        // Load uploaded financial data (prior years, budget, YTD actuals)
        const fy1 = calculateFinancialYear(currentYear, -1) // 2023/2024
        const fy2 = calculateFinancialYear(currentYear, -2) // 2022/2023
        const fy3 = calculateFinancialYear(currentYear, -3) // 2021/2022
        
        const [uploadedYtd1, uploadedYtd2, uploadedYtd3, uploadedBudget, uploadedYtdActual] = await Promise.all([
          getFinancialData(UPLOAD_TYPES.YTD_1, fy1, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_2, fy2, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_3, fy3, tenantId),
          getFinancialData(UPLOAD_TYPES.BUDGET, currentYear, tenantId),
          getFinancialData(UPLOAD_TYPES.YTD_ACTUAL, currentYear, tenantId)
        ])
        
        // Combine all financials
        const allFinancials = [...currentYearFinancials]
        
        // Convert uploaded data to clientFinancials format for compatibility
        // Store uploaded data separately for historical year calculations
        setClientFinancials(allFinancials)
        
        // Store uploaded data in state for use in calculations
        setUploadedFinancialData({
          ytd1: uploadedYtd1,
          ytd2: uploadedYtd2,
          ytd3: uploadedYtd3,
          budget: uploadedBudget,
          ytdActual: uploadedYtdActual
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'R 0'
    // Use non-breaking space between R and number to prevent wrapping
    return `R\u00A0${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Format number input value with thousand separators
  const formatNumberInput = (value) => {
    if (!value && value !== 0) return ''
    // If it's already a number, format it
    if (typeof value === 'number') {
      return value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    // If it's a string, parse and format
    const numericValue = value.toString().replace(/[^\d.]/g, '')
    if (!numericValue) return ''
    const num = parseFloat(numericValue)
    if (isNaN(num)) return ''
    return num.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  // Parse formatted number back to numeric value
  const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue) return 0
    // Remove all formatting and parse
    const numericValue = formattedValue.toString().replace(/[^\d.]/g, '')
    return parseFloat(numericValue) || 0
  }

  // Get skills partner name for a client
  const getSkillsPartnerName = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    if (!client || !client.skillsPartnerId) return ''
    return skillsPartners[client.skillsPartnerId] || ''
  }

  // Get historical year total for a client from uploaded data
  const getHistoricalYearTotal = (clientId, year) => {
    // Map year string to upload type
    // FY 2024 = YTD-1 (2023/2024), FY 2023 = YTD-2 (2022/2023), FY 2022 = YTD-3 (2021/2022)
    let uploadData = []
    if (year === '2022') {
      uploadData = uploadedFinancialData.ytd3 || [] // 2021/2022
    } else if (year === '2023') {
      uploadData = uploadedFinancialData.ytd2 || [] // 2022/2023
    } else if (year === '2024') {
      uploadData = uploadedFinancialData.ytd1 || [] // 2023/2024
    }
    
    // Sum all monthly data for this client across all product lines
    return uploadData
      .filter(d => d.clientId === clientId)
      .reduce((sum, d) => {
        // Sum all monthly values
        const monthlyTotal = d.monthlyData 
          ? Object.values(d.monthlyData).reduce((s, v) => s + (parseFloat(v) || 0), 0)
          : (d.total || 0)
        return sum + monthlyTotal
      }, 0)
  }

  // Get YTD Actual for current year from uploaded data
  const getYtdActual = (clientId) => {
    // Calculate YTD from uploaded monthly data
    // YTD = Sum of Month 1 through Month N (where N is the reporting month)
    const uploadedYtd = (uploadedFinancialData.ytdActual || [])
      .filter(d => d.clientId === clientId)
      .reduce((sum, d) => {
        if (d.monthlyData && ytdMonths.length > 0) {
          // Sum all YTD months (Month 1 to Month N where N is reporting month)
          return sum + ytdMonths.reduce((s, month) => {
            // Use fyMonthNumber to get "Month 1", "Month 2", etc.
            const monthKey = `Month ${month.fyMonthNumber}`
            const value = d.monthlyData[monthKey] || 0
            return s + (parseFloat(value) || 0)
          }, 0)
        }
        // Fallback to total if monthly data not available
        return sum + (d.total || 0)
      }, 0)
    
    // If no uploaded data, check clientFinancials
    if (uploadedYtd === 0) {
      const currentYearFinancials = clientFinancials.filter(
        cf => cf.clientId === clientId && cf.financialYear === financialYear
      )
      return currentYearFinancials.reduce((sum, cf) => {
        return sum + (cf.history?.currentYearYTD || 0)
      }, 0)
    }
    
    return uploadedYtd
  }

  // Get Budget for current year from uploaded data
  const getBudget = (clientId) => {
    const budgetData = (uploadedFinancialData.budget || [])
      .filter(d => d.clientId === clientId)
      .reduce((sum, d) => {
        // Sum all monthly values for full year budget
        const monthlyTotal = d.monthlyData 
          ? Object.values(d.monthlyData).reduce((s, v) => s + (parseFloat(v) || 0), 0)
          : (d.total || 0)
        return sum + monthlyTotal
      }, 0)
    
    return budgetData
  }

  // Get month forecast value
  const getMonthForecast = (clientId, monthKey) => {
    const currentYearFinancials = clientFinancials.filter(
      cf => cf.clientId === clientId && cf.financialYear === financialYear
    )
    return currentYearFinancials.reduce((sum, cf) => {
      return sum + (parseFloat(cf.months?.[monthKey] || 0) || 0)
    }, 0)
  }

  // Get month comment
  const getMonthComment = (clientId, monthKey) => {
    const commentKey = `${clientId}_comment_${monthKey}`
    // Check editing data first, then check saved data
    if (editingData[commentKey] !== undefined) {
      return editingData[commentKey]
    }
    
    // Check saved month comments
    const currentYearFinancials = clientFinancials.filter(
      cf => cf.clientId === clientId && cf.financialYear === financialYear
    )
    for (const cf of currentYearFinancials) {
      if (cf.monthComments && cf.monthComments[monthKey]) {
        return cf.monthComments[monthKey]
      }
    }
    return ''
  }

  // Get full year forecast
  const getFullYearForecast = (clientId) => {
    const ytd = getYtdActual(clientId)
    const remainingMonths = getRemainingMonths()
    let monthsTotal = 0
    
    remainingMonths.slice(0, 4).forEach(month => {
      const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
      const editKey = `${clientId}_month_${monthKey}`
      if (editingData[editKey] !== undefined) {
        monthsTotal += parseFloat(editingData[editKey]) || 0
      } else {
        monthsTotal += getMonthForecast(clientId, monthKey)
      }
    })
    
    return ytd + monthsTotal
  }

  // Get comments (aggregate from all product lines)
  const getComments = (clientId) => {
    const currentYearFinancials = clientFinancials.filter(
      cf => cf.clientId === clientId && cf.financialYear === financialYear
    )
    // Return first non-empty comment, or empty string
    for (const cf of currentYearFinancials) {
      if (cf.comments && cf.comments.trim()) {
        return cf.comments
      }
    }
    return ''
  }

  // Get remaining months (November, December, January, February)
  const getRemainingMonths = () => {
    return fyMonths.filter(m => m.isRemaining).slice(0, 4) // Get first 4 remaining months
  }

  // Handle month value change
  const handleMonthChange = (clientId, monthKey, value) => {
    const key = `${clientId}_month_${monthKey}`
    // Parse the formatted value to get numeric value
    const numericValue = parseFormattedNumber(value)
    setEditingData(prev => ({
      ...prev,
      [key]: numericValue
    }))
    setHasChanges(true)
  }

  // Handle opening comment modal manually
  const handleOpenCommentModal = (clientId, monthKey, monthName) => {
    setCommentModal({
      clientId,
      monthKey,
      monthName,
      currentComment: getMonthComment(clientId, monthKey)
    })
  }

  // Handle month comment save
  const handleMonthCommentSave = (comment) => {
    if (!commentModal) return
    
    const commentKey = `${commentModal.clientId}_comment_${commentModal.monthKey}`
    setEditingData(prev => ({
      ...prev,
      [commentKey]: comment || '' // Allow empty comments
    }))
    setCommentModal(null)
    setHasChanges(true)
  }

  // Handle comments change
  const handleCommentsChange = (clientId, value) => {
    const key = `${clientId}_comments`
    setEditingData(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  // Save all changes
  const handleSaveAll = async () => {
    try {
      const userId = auth.currentUser?.uid || 'system'
      const remainingMonths = getRemainingMonths()
      
      // Group edits by client
      const clientEdits = {}
      
      Object.keys(editingData).forEach(key => {
        const parts = key.split('_')
        const clientId = parts[0]
        const type = parts[1]
        
        if (!clientEdits[clientId]) {
          clientEdits[clientId] = { months: {}, monthComments: {}, comments: null }
        }
        
        if (type === 'month') {
          const monthKey = parts.slice(2).join('_')
          clientEdits[clientId].months[monthKey] = editingData[key]
        } else if (type === 'comment' && parts.length > 2) {
          const monthKey = parts.slice(2).join('_')
          clientEdits[clientId].monthComments[monthKey] = editingData[key]
        } else if (type === 'comments') {
          clientEdits[clientId].comments = editingData[key]
        }
      })

      // Get all product lines for each client
      const currentYearFinancials = clientFinancials.filter(
        cf => cf.financialYear === financialYear
      )
      
      const clientProductLines = {}
      currentYearFinancials.forEach(cf => {
        if (!clientProductLines[cf.clientId]) {
          clientProductLines[cf.clientId] = []
        }
        if (!clientProductLines[cf.clientId].includes(cf.productLine)) {
          clientProductLines[cf.clientId].push(cf.productLine)
        }
      })

      // Save changes for each client
      for (const [clientId, edits] of Object.entries(clientEdits)) {
        const client = clients.find(c => c.id === clientId)
        if (!client) continue

        // If client has no product lines, create a default one
        let productLines = clientProductLines[clientId]
        if (!productLines || productLines.length === 0) {
          productLines = ['Learnerships']
        }
        
        for (const productLine of productLines) {
          const existingFinancial = currentYearFinancials.find(
            cf => cf.clientId === clientId && cf.productLine === productLine
          )
          
          // Merge edited months with existing months
          const existingMonths = existingFinancial?.months || {}
          const updatedMonths = { ...existingMonths }
          
          // Apply month edits: distribute total across product lines
          Object.keys(edits.months).forEach(monthKey => {
            const newTotal = edits.months[monthKey]
            
            if (productLines.length === 1) {
              // Single product line: use the new value directly
              updatedMonths[monthKey] = newTotal
            } else {
              // Multiple product lines: distribute proportionally
              const currentTotal = getMonthForecast(clientId, monthKey)
              const currentValue = existingFinancial?.months?.[monthKey] || 0
              
              if (currentTotal > 0 && currentValue > 0) {
                // Maintain proportion
                updatedMonths[monthKey] = (currentValue / currentTotal) * newTotal
              } else {
                // Distribute evenly
                updatedMonths[monthKey] = newTotal / productLines.length
              }
            }
          })
          
          // Comments: apply to all product lines (or just first one)
          const commentsToSave = edits.comments !== null 
            ? (productLine === productLines[0] ? edits.comments : existingFinancial?.comments || '')
            : (existingFinancial?.comments || '')
          
          // Get month comments for this product line (merge with existing)
          const existingMonthComments = existingFinancial?.monthComments || {}
          const monthComments = { ...existingMonthComments }
          Object.keys(edits.monthComments).forEach(monthKey => {
            monthComments[monthKey] = edits.monthComments[monthKey]
          })

          await saveClientFinancial(
            clientId,
            client.name,
            financialYear,
            productLine,
            {
              history: existingFinancial?.history || {
                yearMinus1: 0,
                yearMinus2: 0,
                yearMinus3: 0,
                currentYearYTD: existingFinancial?.history?.currentYearYTD || 0
              },
              months: updatedMonths,
              monthComments: monthComments,
              comments: commentsToSave,
              fullYearForecast: undefined // Will be calculated
            },
            userId
          )
        }
      }

      // Reload data
      await loadData()
      setEditingData({})
      setHasChanges(false)
      alert('All changes saved successfully!')
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Error saving changes. Please try again.')
    }
  }

  // Filter clients based on user role
  const visibleClients = useMemo(() => {
    if (canViewAll) {
      return clients
    } else if (isSalesperson && userData?.id) {
      return clients.filter(client => client.assignedSalesPerson === userData.id)
    }
    return []
  }, [clients, canViewAll, isSalesperson, userData])

  const filteredClients = useMemo(() => {
    return visibleClients.filter(client => {
      const matchesClient = !searchTerm || client.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSkillsPartner = !skillsPartnerFilter || 
        (client.skillsPartnerId && skillsPartners[client.skillsPartnerId]?.toLowerCase().includes(skillsPartnerFilter.toLowerCase()))
      return matchesClient && matchesSkillsPartner
    })
  }, [visibleClients, searchTerm, skillsPartnerFilter, skillsPartners])

  const remainingMonths = getRemainingMonths()
  const reportingMonth = fySettings?.reportingMonth || 'October'

  // Calculate totals
  const calculateTotals = () => {
    const totals = {
      fy2022: 0,
      fy2023: 0,
      fy2024: 0,
      ytd: 0,
      months: {},
      fullYear: 0,
      budget: 0
    }

    filteredClients.forEach(client => {
      totals.fy2022 += getHistoricalYearTotal(client.id, '2022')
      totals.fy2023 += getHistoricalYearTotal(client.id, '2023')
      totals.fy2024 += getHistoricalYearTotal(client.id, '2024')
      totals.ytd += getYtdActual(client.id)
      totals.budget += getBudget(client.id)
      
      remainingMonths.forEach(month => {
        const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
        if (!totals.months[monthKey]) totals.months[monthKey] = 0
        const editedValue = editingData[`${client.id}_month_${monthKey}`]
        if (editedValue !== undefined) {
          totals.months[monthKey] += parseFloat(editedValue) || 0
        } else {
          totals.months[monthKey] += getMonthForecast(client.id, monthKey)
        }
      })
      
      // Calculate full year with edited values
      const clientYtd = getYtdActual(client.id)
      let clientMonthsTotal = 0
      remainingMonths.slice(0, 4).forEach(month => {
        const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
        const editedValue = editingData[`${client.id}_month_${monthKey}`]
        if (editedValue !== undefined) {
          clientMonthsTotal += parseFloat(editedValue) || 0
        } else {
          clientMonthsTotal += getMonthForecast(client.id, monthKey)
        }
      })
      totals.fullYear += clientYtd + clientMonthsTotal
    })

    return totals
  }

  const totals = useMemo(() => calculateTotals(), [filteredClients, editingData, remainingMonths, fySettings, fyMonths])

  if (loading) {
    return <div className="edit-financial"><h1>Loading...</h1></div>
  }

  return (
    <div className="edit-financial">
      <div className="edit-financial-header">
        <div className="header-title-section">
          <h1>Client Financial Forecasting</h1>
          <span className="header-subtitle">Edit detailed forecasts per client and product line, using current year YTD and remaining months.</span>
        </div>
        <div className="header-filters">
          <div className="filter-block">
            <input
              type="text"
              placeholder="Client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-block">
            <input
              type="text"
              placeholder="Skills Partner"
              value={skillsPartnerFilter}
              onChange={(e) => setSkillsPartnerFilter(e.target.value)}
              className="filter-input"
            />
          </div>
          <button
            className="save-all-btn"
            onClick={handleSaveAll}
            disabled={!hasChanges}
          >
            Save All Changes
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="financial-table">
          <thead>
            {/* Top header row for grouping */}
            <tr className="header-group-row">
              <th rowSpan="2" className="client-column">Skills Partner</th>
              <th rowSpan="2" className="client-column">Client / Product Line</th>
              <th colSpan="3" className="header-group">Prior Year Actuals</th>
              <th rowSpan="2">YTD Actual (Oct)</th>
              <th colSpan={remainingMonths.slice(0, 4).length} className="header-group">Forecasting Months</th>
              <th rowSpan="2" className="full-year-header">Full Year<br />Forecast ({financialYear})</th>
              <th rowSpan="2" className="budget-header">Budget<br />({financialYear})</th>
              <th rowSpan="2" className="comments-column">Comments</th>
            </tr>
            {/* Second header row with actual column names */}
            <tr>
              <th>FY 2022</th>
              <th>FY 2023</th>
              <th>FY 2024</th>
              {remainingMonths.slice(0, 4).map((month, idx) => (
                <th key={idx}>{month.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, idx) => {
              const monthKeys = remainingMonths.slice(0, 4).map(m => 
                `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
              )
              const commentsKey = `${client.id}_comments`
              const currentComments = editingData[commentsKey] !== undefined 
                ? editingData[commentsKey] 
                : getComments(client.id)

              return (
                <tr key={client.id} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="skills-partner-cell">{getSkillsPartnerName(client.id) || '-'}</td>
                  <td className="client-cell">{client.name}</td>
                  <td>{formatCurrency(getHistoricalYearTotal(client.id, '2022'))}</td>
                  <td>{formatCurrency(getHistoricalYearTotal(client.id, '2023'))}</td>
                  <td>{formatCurrency(getHistoricalYearTotal(client.id, '2024'))}</td>
                  <td>{formatCurrency(getYtdActual(client.id))}</td>
                  {monthKeys.map((monthKey, monthIdx) => {
                    const monthName = remainingMonths[monthIdx].name
                    const editKey = `${client.id}_month_${monthKey}`
                    const numericValue = editingData[editKey] !== undefined
                      ? editingData[editKey]
                      : getMonthForecast(client.id, monthKey)
                    const displayKey = `${client.id}_month_${monthKey}_display`
                    const isEditing = editingData[displayKey] !== undefined
                    const displayValue = isEditing 
                      ? editingData[displayKey]
                      : (numericValue ? formatNumberInput(numericValue) : '')
                    const hasComment = getMonthComment(client.id, monthKey)
                    
                    return (
                      <td key={monthKey} className="month-cell">
                        <div className="month-input-wrapper">
                          <div className="month-input-container">
                            <span className="currency-prefix">R</span>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                // Store raw input for display
                                setEditingData(prev => ({
                                  ...prev,
                                  [displayKey]: inputValue
                                }))
                                // Parse and store numeric value
                                const numValue = parseFormattedNumber(inputValue)
                                handleMonthChange(client.id, monthKey, numValue.toString())
                              }}
                              onFocus={(e) => {
                                // Show raw number when focusing
                                const numValue = editingData[editKey] !== undefined
                                  ? editingData[editKey]
                                  : getMonthForecast(client.id, monthKey)
                                setEditingData(prev => ({
                                  ...prev,
                                  [displayKey]: numValue ? numValue.toString() : ''
                                }))
                              }}
                              onBlur={(e) => {
                                const numValue = parseFormattedNumber(e.target.value)
                                // Format on blur
                                setEditingData(prev => {
                                  const newData = { ...prev }
                                  delete newData[displayKey]
                                  return newData
                                })
                                handleMonthChange(client.id, monthKey, numValue.toString())
                              }}
                              className="month-input"
                              placeholder="0"
                            />
                          </div>
                          <button
                            type="button"
                            className="comment-button"
                            onClick={() => handleOpenCommentModal(client.id, monthKey, monthName)}
                            title={hasComment ? `Comment: ${hasComment}` : 'Add comment'}
                          >
                            {hasComment ? '💬' : '✏️'}
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  <td className="full-year-cell">{formatCurrency(getFullYearForecast(client.id))}</td>
                  <td className="budget-cell">{formatCurrency(getBudget(client.id))}</td>
                  <td className="comments-cell">
                    <div className="comments-wrapper">
                      <textarea
                        value={currentComments}
                        onChange={(e) => handleCommentsChange(client.id, e.target.value)}
                        placeholder="Add comments..."
                        className="comments-textarea"
                        rows="2"
                      />
                      <span className="edit-icon">✏️</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            <tr className="totals-row">
              <td></td>
              <td><strong>TOTALS</strong></td>
              <td><strong>{formatCurrency(totals.fy2022)}</strong></td>
              <td><strong>{formatCurrency(totals.fy2023)}</strong></td>
              <td><strong>{formatCurrency(totals.fy2024)}</strong></td>
              <td><strong>{formatCurrency(totals.ytd)}</strong></td>
              {remainingMonths.slice(0, 4).map((month, idx) => {
                const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
                return (
                  <td key={idx}><strong>{formatCurrency(totals.months[monthKey] || 0)}</strong></td>
                )
              })}
              <td><strong>{formatCurrency(totals.fullYear)}</strong></td>
              <td><strong>{formatCurrency(totals.budget)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div className="comment-modal-backdrop" onClick={() => setCommentModal(null)}>
          <div className="comment-modal" onClick={e => e.stopPropagation()}>
            <div className="comment-modal-header">
              <h3>Add Comment for {commentModal.monthName}</h3>
              <button className="comment-modal-close" onClick={() => setCommentModal(null)}>×</button>
            </div>
            <div className="comment-modal-body">
              <p className="comment-modal-prompt">
                How did you arrive at this forecast amount for {commentModal.monthName}? (Optional)
              </p>
              <textarea
                className="comment-modal-textarea"
                value={commentModal.currentComment}
                onChange={(e) => setCommentModal({ ...commentModal, currentComment: e.target.value })}
                placeholder="Enter your reasoning or notes (optional)..."
                rows="5"
              />
            </div>
            <div className="comment-modal-footer">
              <button className="comment-modal-cancel" onClick={() => setCommentModal(null)}>
                Cancel
              </button>
              <button 
                className="comment-modal-save" 
                onClick={() => {
                  handleMonthCommentSave(commentModal.currentComment)
                }}
              >
                {commentModal.currentComment ? 'Save Comment' : 'Save (No Comment)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditFinancial
