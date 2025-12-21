import { useState, useEffect } from 'react'
import DealEditorForm from './DealEditorForm'
import { distributeDealToMonths, aggregateDealsToMonths } from '../utils/dealDistribution'
import './ClientDealsModal.css'

// Product configuration matching ProductManagement.jsx
const PRODUCT_TABS = [
  { id: 'learnerships', name: 'Learnerships', icon: '📚' },
  { id: 'compliance', name: 'Compliance', icon: '✓' },
  { id: 'otherCourses', name: 'Other Courses', icon: '🎓' },
  { id: 'tapBusiness', name: 'TAP Business', icon: '💼' }
]

const ClientDealsModal = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientFinancials,
  fyMonths,
  financialYear,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('learnerships')
  const [deals, setDeals] = useState({
    learnerships: [],
    compliance: [],
    otherCourses: [],
    tapBusiness: []
  })
  const [showDealEditor, setShowDealEditor] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)

  useEffect(() => {
    if (isOpen && clientFinancials) {
      loadDealsFromClientFinancials()
    }
  }, [isOpen, clientFinancials])

  const loadDealsFromClientFinancials = () => {
    // Load existing deals from clientFinancials structure
    const loadedDeals = {
      learnerships: [],
      compliance: [],
      otherCourses: [],
      tapBusiness: []
    }

    clientFinancials.forEach(cf => {
      const productLine = cf.productLine || 'Other'
      const productKey = getProductKey(productLine)

      if (cf.dealDetails && Array.isArray(cf.dealDetails)) {
        loadedDeals[productKey] = [...cf.dealDetails]
      } else if (cf.months && Object.keys(cf.months).length > 0) {
        // Backward compatibility: convert old format to deal format
        loadedDeals[productKey].push({
          id: `legacy-${Date.now()}`,
          dealName: `${productLine} Forecast`,
          isLegacy: true,
          months: cf.months,
          comments: cf.comments || ''
        })
      }
    })

    setDeals(loadedDeals)
  }

  const getProductKey = (productLine) => {
    const mapping = {
      'Learnerships': 'learnerships',
      'Compliance': 'compliance',
      'Other Courses': 'otherCourses',
      'TAP Business': 'tapBusiness',
      'Other': 'otherCourses'
    }
    return mapping[productLine] || 'otherCourses'
  }

  const getProductLineName = (productKey) => {
    const mapping = {
      'learnerships': 'Learnerships',
      'compliance': 'Compliance',
      'otherCourses': 'Other Courses',
      'tapBusiness': 'TAP Business'
    }
    return mapping[productKey] || 'Other'
  }

  const handleAddDeal = () => {
    setEditingDeal({
      id: `new-${Date.now()}`,
      productType: activeTab,
      dealName: '',
      values: {},
      isNew: true
    })
    setShowDealEditor(true)
  }

  const handleEditDeal = (deal) => {
    setEditingDeal({
      ...deal,
      productType: activeTab
    })
    setShowDealEditor(true)
  }

  const handleDeleteDeal = (dealId) => {
    if (confirm('Are you sure you want to delete this deal?')) {
      setDeals(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(d => d.id !== dealId)
      }))
    }
  }

  const handleSaveDeal = (dealData) => {
    const productKey = dealData.productType

    // Calculate monthly distribution for this deal
    const monthlyDistribution = distributeDealToMonths(dealData, fyMonths)

    // Add distribution to deal data and remove isNew flag
    const { isNew, ...dealDataWithoutIsNew } = dealData
    const dealWithDistribution = {
      ...dealDataWithoutIsNew,
      monthlyDistribution
    }

    if (isNew) {
      setDeals(prev => ({
        ...prev,
        [productKey]: [...prev[productKey], dealWithDistribution]
      }))
    } else {
      setDeals(prev => ({
        ...prev,
        [productKey]: prev[productKey].map(d => d.id === dealData.id ? dealWithDistribution : d)
      }))
    }

    setShowDealEditor(false)
    setEditingDeal(null)
  }

  const calculateTabTotals = (productKey) => {
    const productDeals = deals[productKey] || []
    let totalIncome = 0
    let totalCosts = 0
    let grossProfit = 0

    productDeals.forEach(deal => {
      if (deal.calculation) {
        totalIncome += deal.calculation.totalIncome || 0
        totalCosts += deal.calculation.totalCosts || 0
        grossProfit += deal.calculation.grossProfit || 0
      }
    })

    return { totalIncome, totalCosts, grossProfit }
  }

  const calculateMonthlyBreakdown = () => {
    const monthlyTotals = {}

    // Initialize all months to 0
    fyMonths.forEach(m => {
      const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
      monthlyTotals[monthKey] = 0
    })

    // Sum up all deals across all product lines
    Object.keys(deals).forEach(productKey => {
      const productDeals = deals[productKey] || []
      productDeals.forEach(deal => {
        if (deal.monthlyDistribution) {
          Object.entries(deal.monthlyDistribution).forEach(([month, amount]) => {
            monthlyTotals[month] = (monthlyTotals[month] || 0) + amount
          })
        }
      })
    })

    return monthlyTotals
  }

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'R 0'
    return `R ${parseFloat(value).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const handleSaveAll = () => {
    // Convert deals structure to clientFinancials format
    const updatedFinancials = {}

    Object.keys(deals).forEach(productKey => {
      const productLine = getProductLineName(productKey)
      const productDeals = deals[productKey] || []

      if (productDeals.length > 0) {
        // Calculate monthly totals for this product line
        const months = {}
        productDeals.forEach(deal => {
          if (deal.monthlyDistribution) {
            Object.entries(deal.monthlyDistribution).forEach(([month, amount]) => {
              months[month] = (months[month] || 0) + amount
            })
          }
        })

        updatedFinancials[productLine] = {
          dealDetails: productDeals,
          months,
          comments: productDeals[0]?.comments || ''
        }
      }
    })

    onSave(updatedFinancials)
    onClose()
  }

  if (!isOpen) return null

  const currentTabDeals = deals[activeTab] || []
  const tabTotals = calculateTabTotals(activeTab)
  const monthlyBreakdown = calculateMonthlyBreakdown()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="deals-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deals-modal-header">
          <div>
            <h2>{clientName}</h2>
            <p className="modal-subtitle">Manage deals and forecasts for this client</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="deals-modal-body">
          {/* Product Line Tabs */}
          <div className="product-tabs">
            {PRODUCT_TABS.map(tab => (
              <button
                key={tab.id}
                className={`product-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-name">{tab.name}</span>
                <span className="tab-count">({deals[tab.id]?.length || 0})</span>
              </button>
            ))}
          </div>

          {/* Deals List */}
          <div className="deals-content">
            <div className="deals-list-section">
              <div className="deals-list-header">
                <h3>Deals for {PRODUCT_TABS.find(t => t.id === activeTab)?.name}</h3>
                <button className="add-deal-btn" onClick={handleAddDeal}>
                  + Add Deal
                </button>
              </div>

              {currentTabDeals.length === 0 ? (
                <div className="no-deals">
                  <p>No deals yet for this product line</p>
                  <button className="add-first-deal-btn" onClick={handleAddDeal}>
                    + Add Your First Deal
                  </button>
                </div>
              ) : (
                <div className="deals-list">
                  {currentTabDeals.map(deal => (
                    <div key={deal.id} className="deal-card">
                      <div className="deal-card-header">
                        <h4>{deal.dealName || 'Untitled Deal'}</h4>
                        <div className="deal-card-actions">
                          <button onClick={() => handleEditDeal(deal)}>Edit</button>
                          <button onClick={() => handleDeleteDeal(deal.id)}>Delete</button>
                        </div>
                      </div>
                      <div className="deal-card-body">
                        {deal.calculation && (
                          <>
                            <div className="deal-metric">
                              <span className="metric-label">Total Income:</span>
                              <span className="metric-value">{formatCurrency(deal.calculation.totalIncome)}</span>
                            </div>
                            <div className="deal-metric">
                              <span className="metric-label">Total Costs:</span>
                              <span className="metric-value">{formatCurrency(deal.calculation.totalCosts)}</span>
                            </div>
                            <div className="deal-metric">
                              <span className="metric-label">Gross Profit:</span>
                              <span className="metric-value profit">{formatCurrency(deal.calculation.grossProfit)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals Preview Panel */}
            <div className="totals-preview-panel">
              <h3>Totals for {PRODUCT_TABS.find(t => t.id === activeTab)?.name}</h3>
              <div className="totals-summary">
                <div className="total-item">
                  <span className="total-label">Total Income:</span>
                  <span className="total-value">{formatCurrency(tabTotals.totalIncome)}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Total Costs:</span>
                  <span className="total-value">{formatCurrency(tabTotals.totalCosts)}</span>
                </div>
                <div className="total-item highlight">
                  <span className="total-label">Gross Profit:</span>
                  <span className="total-value">{formatCurrency(tabTotals.grossProfit)}</span>
                </div>
              </div>

              <h4>Monthly Breakdown (All Products)</h4>
              <div className="monthly-breakdown">
                {fyMonths.filter(m => m.isRemaining).map(m => {
                  const monthKey = `${m.year}-${String(m.calendarMonth + 1).padStart(2, '0')}`
                  const amount = monthlyBreakdown[monthKey] || 0
                  return (
                    <div key={monthKey} className="month-item">
                      <span className="month-name">{m.name}:</span>
                      <span className="month-value">{formatCurrency(amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="deals-modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-all-btn" onClick={handleSaveAll}>
            Save & Apply
          </button>
        </div>

        {/* Deal Editor Modal (nested) */}
        {showDealEditor && editingDeal && (
          <div className="nested-modal-overlay" onClick={() => setShowDealEditor(false)}>
            <div className="deal-editor-modal" onClick={(e) => e.stopPropagation()}>
              <DealEditorForm
                productType={editingDeal.productType}
                deal={editingDeal}
                onSave={handleSaveDeal}
                onCancel={() => setShowDealEditor(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientDealsModal
