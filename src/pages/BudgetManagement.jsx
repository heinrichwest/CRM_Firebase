import React, { useState, useEffect } from 'react'
import { auth } from '../config/firebase'
import { getUserData, getUsersByTenant } from '../services/userService'
import { getRole } from '../services/roleService'
import {
  getBudgets,
  saveBudget,
  getBudgetVsForecast,
  getFinancialYearSettings
} from '../services/firestoreService'
import { useTenant } from '../context/TenantContext'
import './BudgetManagement.css'

const BudgetManagement = () => {
  const { getTenantId, isSystemAdmin, accessibleUserIds } = useTenant()
  const tenantId = getTenantId()

  const [loading, setLoading] = useState(true)
  const [isGroupSalesManager, setIsGroupSalesManager] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [budgets, setBudgets] = useState([])
  const [comparison, setComparison] = useState([])
  const [financialYear, setFinancialYear] = useState('')
  const [isManager, setIsManager] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingTableData, setEditingTableData] = useState({})
  const [displayTableData, setDisplayTableData] = useState({})
  const [savingTable, setSavingTable] = useState(false)

  const productLines = [
    'Learnerships',
    'TAP Business',
    'Compliance Training',
    'Other Courses'
  ]

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        setCurrentUserId(currentUser.uid)
        const userData = await getUserData(currentUser.uid)
        if (userData) {
          const role = await getRole(userData.role || 'salesperson')

          // Check if user is a group-sales-manager, sales_head, or admin (sees all tenant users)
          const userRole = userData.role || ''
          const salesLevel = userData.salesLevel || ''
          const isGSM = userRole === 'group-sales-manager' ||
                        userRole === 'sales_head' ||
                        userRole === 'admin' ||
                        salesLevel === 'sales_head'
          setIsGroupSalesManager(isGSM)

          // Allow access if user has manage_users, manage_clients permissions,
          // OR is a group-sales-manager/sales_head
          const hasPermission = role && (role.permissions?.includes('manage_users') || role.permissions?.includes('manage_clients'))
          const manager = hasPermission || isGSM
          setIsManager(manager)

          if (manager) {
            await loadData(isGSM)
          } else {
            setError('You do not have permission to access this page.')
            setLoading(false)
          }
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error)
      setError('Failed to load user permissions.')
      setLoading(false)
    }
  }

  const loadData = async (isGSM = isGroupSalesManager) => {
    try {
      // Get financial year settings (tenant-specific)
      const fySettings = await getFinancialYearSettings(tenantId)
      const currentFY = fySettings.currentFinancialYear || '2024/2025'
      setFinancialYear(currentFY)

      // Filter users by tenant (unless system admin)
      const filterTenantId = isSystemAdmin ? null : tenantId

      // Load all required data
      const [usersData, budgetsData, comparisonData] = await Promise.all([
        getUsersByTenant(filterTenantId),
        getBudgets(currentFY),
        getBudgetVsForecast(currentFY)
      ])

      // Filter users based on role:
      // - System Admin: sees all users
      // - Group Sales Manager / Sales Head / Admin: sees all users in their tenant
      // - Regular Manager: sees only users in their team hierarchy
      let filteredUsers = usersData
      if (!isSystemAdmin && !isGSM && accessibleUserIds && accessibleUserIds.length > 0) {
        filteredUsers = usersData.filter(u => accessibleUserIds.includes(u.id))
      }

      // Filter budgets based on same criteria
      const accessibleIds = (isSystemAdmin || isGSM) ? usersData.map(u => u.id) : accessibleUserIds
      const filteredBudgets = budgetsData.filter(b => accessibleIds.includes(b.salespersonId))

      // Filter comparison data based on same criteria
      const filteredComparison = comparisonData.filter(c => accessibleIds.includes(c.userId))

      setUsers(filteredUsers)
      setBudgets(filteredBudgets)
      setComparison(filteredComparison)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load budget data.')
      setLoading(false)
    }
  }

  // Enter edit mode - initialize the editing data
  const enterEditMode = () => {
    const tableData = {}
    const displayData = {}
    users.forEach(user => {
      tableData[user.id] = {}
      displayData[user.id] = {}
      productLines.forEach(pl => {
        const budget = getBudgetForUser(user.id, pl)
        const amount = budget?.budgetAmount || 0
        tableData[user.id][pl] = amount
        displayData[user.id][pl] = amount > 0 ? new Intl.NumberFormat('en-ZA').format(amount) : ''
      })
    })
    setEditingTableData(tableData)
    setDisplayTableData(displayData)
    setIsEditMode(true)
  }

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false)
    setEditingTableData({})
    setDisplayTableData({})
    setError('')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  // Format number with thousand separators (no currency symbol)
  const formatNumber = (value) => {
    if (!value && value !== 0) return ''
    return new Intl.NumberFormat('en-ZA').format(value)
  }

  // Parse formatted number back to raw number
  const parseFormattedNumber = (value) => {
    if (!value) return 0
    // Remove spaces and other formatting, keep digits and decimal
    const cleaned = value.toString().replace(/[^\d.]/g, '')
    return parseFloat(cleaned) || 0
  }

  const getVarianceClass = (variance) => {
    if (variance > 0) return 'positive'
    if (variance < 0) return 'negative'
    return 'neutral'
  }

  const getBudgetForUser = (userId, productLine) => {
    return budgets.find(b =>
      b.salespersonId === userId &&
      b.productLine === productLine
    )
  }

  // Handle table cell change - keep raw value for display while typing
  const handleTableCellChange = (userId, productLine, value) => {
    // Update display value (what user sees while typing)
    setDisplayTableData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [productLine]: value
      }
    }))

    // Parse and update actual numeric value
    const numericValue = parseFormattedNumber(value)
    setEditingTableData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [productLine]: numericValue
      }
    }))
  }

  // Format on blur (when user leaves the field)
  const handleTableCellBlur = (userId, productLine) => {
    const numericValue = editingTableData[userId]?.[productLine] || 0
    setDisplayTableData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [productLine]: numericValue > 0 ? new Intl.NumberFormat('en-ZA').format(numericValue) : ''
      }
    }))
  }

  // Clear formatting on focus (when user clicks into the field)
  const handleTableCellFocus = (userId, productLine) => {
    const numericValue = editingTableData[userId]?.[productLine] || 0
    setDisplayTableData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [productLine]: numericValue > 0 ? numericValue.toString() : ''
      }
    }))
  }

  // Save all table data
  const saveFullTable = async () => {
    setSavingTable(true)
    setError('')

    try {
      // Collect all budget save promises
      const savePromises = []

      Object.entries(editingTableData).forEach(([userId, productData]) => {
        Object.entries(productData).forEach(([productLine, amount]) => {
          // Only save if amount > 0 or if there was an existing budget
          const existingBudget = getBudgetForUser(userId, productLine)
          if (amount > 0 || existingBudget) {
            savePromises.push(
              saveBudget(userId, productLine, financialYear, amount, currentUserId)
            )
          }
        })
      })

      await Promise.all(savePromises)

      setSuccess('All budgets saved successfully!')
      setIsEditMode(false)
      setEditingTableData({})
      setDisplayTableData({})
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving budgets:', error)
      setError('Failed to save some budgets. Please try again.')
    } finally {
      setSavingTable(false)
    }
  }

  // Calculate row total for edit modal
  const getRowTotal = (userId) => {
    if (!editingTableData[userId]) return 0
    return Object.values(editingTableData[userId]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  // Calculate column total for edit modal
  const getColumnTotal = (productLine) => {
    return Object.values(editingTableData).reduce((sum, userData) => {
      return sum + (parseFloat(userData[productLine]) || 0)
    }, 0)
  }

  // Calculate grand total for edit modal
  const getGrandTotal = () => {
    return Object.values(editingTableData).reduce((sum, userData) => {
      return sum + Object.values(userData).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    }, 0)
  }

  // Calculate totals
  const totals = comparison.reduce((acc, user) => {
    acc.budget += user.totalBudget
    acc.forecast += user.totalForecast
    return acc
  }, { budget: 0, forecast: 0 })

  if (loading) {
    return (
      <div className="budget-management">
        <h1>Budget Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="budget-management">
        <h1>Budget Management</h1>
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div className="budget-management">
      <div className="page-header">
        <h1>Budget Management</h1>
        <div className="header-actions">
          <span className="financial-year-badge">FY {financialYear}</span>
        </div>
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      <div className="budget-summary">
        <div className="summary-card">
          <div className="summary-label">Total Budget</div>
          <div className="summary-value">{formatCurrency(totals.budget)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Full Year Forecast</div>
          <div className="summary-value">{formatCurrency(totals.forecast)}</div>
        </div>
        <div className={`summary-card variance ${getVarianceClass(totals.forecast - totals.budget)}`}>
          <div className="summary-label">Variance</div>
          <div className="summary-value">
            {formatCurrency(totals.forecast - totals.budget)}
            {totals.budget > 0 && (
              <span className="variance-percent">
                ({((totals.forecast - totals.budget) / totals.budget * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Budget vs Forecast Table */}
      <div className="budget-table-container">
        <h2>Budget vs Full Year Forecast by Salesperson</h2>
        <table className="budget-table">
          <thead>
            <tr>
              <th></th>
              <th>Product Line</th>
              <th>Budget</th>
              <th>Full Year Forecast</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const userData = comparison.find(c => c.userId === user.id) || {
                productData: {},
                totalBudget: 0,
                totalForecast: 0
              }

              // Get all product lines for this user that have data
              // Include both predefined product lines AND any additional ones from the data
              const allProductLines = new Set([
                ...productLines,
                ...Object.keys(userData.productData)
              ])
              const activeProductLines = [...allProductLines].filter(pl => {
                const plData = userData.productData[pl] || {}
                const existingBudget = getBudgetForUser(user.id, pl)
                return plData.budget > 0 || plData.forecast > 0 || existingBudget
              })

              // Skip users with no data
              if (activeProductLines.length === 0 && userData.totalBudget === 0 && userData.totalForecast === 0) {
                return null
              }

              const totalVariance = userData.totalForecast - userData.totalBudget

              return (
                <React.Fragment key={user.id}>
                  {/* Salesperson Header Row */}
                  <tr className="salesperson-header-row">
                    <td colSpan="5" className="salesperson-header-cell">
                      <strong>{user.displayName || user.email || 'Unknown'}</strong>
                    </td>
                  </tr>
                  {/* Product Line Rows */}
                  {activeProductLines.map((pl) => {
                    const plData = userData.productData[pl] || { budget: 0, forecast: 0 }
                    const variance = plData.forecast - plData.budget

                    return (
                      <tr key={`${user.id}-${pl}`}>
                        <td></td>
                        <td>{pl}</td>
                        <td className="amount-cell">{formatCurrency(plData.budget)}</td>
                        <td className="amount-cell">{formatCurrency(plData.forecast)}</td>
                        <td className={`amount-cell variance ${getVarianceClass(variance)}`}>
                          {formatCurrency(variance)}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Salesperson Total Row */}
                  <tr className="salesperson-total-row">
                    <td></td>
                    <td className="total-label"><strong>Total</strong></td>
                    <td className="amount-cell total-cell">{formatCurrency(userData.totalBudget)}</td>
                    <td className="amount-cell total-cell">{formatCurrency(userData.totalForecast)}</td>
                    <td className={`amount-cell total-cell variance ${getVarianceClass(totalVariance)}`}>
                      {formatCurrency(totalVariance)}
                    </td>
                  </tr>
                </React.Fragment>
              )
            }).filter(Boolean)}
          </tbody>
        </table>

        {comparison.length === 0 && budgets.length === 0 && (
          <div className="empty-state">
            <p>No budgets have been set for {financialYear}.</p>
            <button className="primary-btn" onClick={enterEditMode}>
              Set Your First Budget
            </button>
          </div>
        )}
      </div>

      {/* Quick Budget Entry by Salesperson */}
      <div className="quick-budget-section">
        <div className="section-header">
          <div>
            <h2>Budget Entry by Salesperson</h2>
            <p className="section-description">
              {isEditMode
                ? 'Enter budget amounts for each salesperson and product line. Click Save when done.'
                : 'Click "Edit Budgets" to modify budget amounts.'}
            </p>
          </div>
          <div className="section-actions">
            {isEditMode ? (
              <>
                <button
                  className="cancel-btn"
                  onClick={cancelEditMode}
                  disabled={savingTable}
                >
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={saveFullTable}
                  disabled={savingTable}
                >
                  {savingTable ? 'Saving...' : 'Save All'}
                </button>
              </>
            ) : (
              <button className="edit-all-btn" onClick={enterEditMode}>
                Edit Budgets
              </button>
            )}
          </div>
        </div>
        <div className="quick-budget-grid">
          <table className="quick-budget-table">
            <thead>
              <tr>
                <th>Salesperson</th>
                {productLines.map(pl => (
                  <th key={pl}>{pl}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const userTotal = isEditMode
                  ? getRowTotal(user.id)
                  : productLines.reduce((sum, pl) => {
                      const budget = getBudgetForUser(user.id, pl)
                      return sum + (budget?.budgetAmount || 0)
                    }, 0)

                return (
                  <tr key={user.id}>
                    <td className="user-name">{user.displayName || user.email || 'Unknown'}</td>
                    {productLines.map(pl => {
                      if (isEditMode) {
                        return (
                          <td key={pl} className="budget-cell editing">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={displayTableData[user.id]?.[pl] || ''}
                              onChange={e => handleTableCellChange(user.id, pl, e.target.value)}
                              onBlur={() => handleTableCellBlur(user.id, pl)}
                              onFocus={() => handleTableCellFocus(user.id, pl)}
                              className="budget-input"
                              placeholder="0"
                            />
                          </td>
                        )
                      } else {
                        const budget = getBudgetForUser(user.id, pl)
                        const amount = budget?.budgetAmount || 0
                        return (
                          <td
                            key={pl}
                            className={`budget-cell ${budget ? 'has-budget' : 'no-budget'}`}
                          >
                            {amount > 0 ? formatCurrency(amount) : '-'}
                          </td>
                        )
                      }
                    })}
                    <td className="total-cell">{formatCurrency(userTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            {isEditMode && (
              <tfoot>
                <tr className="totals-row">
                  <td><strong>Total</strong></td>
                  {productLines.map(pl => (
                    <td key={pl} className="column-total">
                      {formatCurrency(getColumnTotal(pl))}
                    </td>
                  ))}
                  <td className="grand-total">
                    <strong>{formatCurrency(getGrandTotal())}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default BudgetManagement
