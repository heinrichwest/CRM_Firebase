import { useState, useCallback } from 'react'
import { useTenant } from '../context/TenantContext'
import './ApiDebug.css'

// Import from REST API services
import * as clientApi from '../api/services/clientApiService'
import * as dealApi from '../api/services/dealApiService'
import * as taskApi from '../api/services/taskApiService'
import * as userApi from '../api/services/userApiService'
import * as referenceApi from '../api/services/referenceApiService'
import * as financialApi from '../api/services/financialApiService'
import * as productLineApi from '../api/services/productLineApiService'
import * as messageApi from '../api/services/messageApiService'
import * as settingsApi from '../api/services/settingsApiService'

// Get API base URL for display
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'

const API_CATEGORIES = {
  clients: {
    name: 'Clients',
    description: 'Client REST API endpoints',
    endpoints: [
      { name: 'getClients', fn: clientApi.getClients, description: 'GET /api/Client/List', params: [] },
      { name: 'getClient', fn: clientApi.getClient, description: 'GET /api/Client/{id}', params: ['clientId'] },
      { name: 'getClientActivities', fn: clientApi.getClientActivities, description: 'GET /api/Client/{id}/Activities', params: ['clientId'] },
      { name: 'getClientInteractions', fn: clientApi.getClientInteractions, description: 'GET /api/Client/{id}/Interactions', params: ['clientId'] },
      { name: 'getClientProducts', fn: clientApi.getClientProducts, description: 'GET /api/Client/{id}/Products', params: ['clientId'] },
      { name: 'getPipelineStatusAnalytics', fn: clientApi.getPipelineStatusAnalytics, description: 'GET /api/Client/PipelineAnalytics', params: [] },
      { name: 'getClientsWithAllocationStatus', fn: clientApi.getClientsWithAllocationStatus, description: 'GET /api/Client/WithAllocationStatus', params: [] },
      { name: 'getClientsWithoutFollowUp', fn: clientApi.getClientsWithoutFollowUp, description: 'GET /api/Client/WithoutFollowUp', params: [] },
      { name: 'getClientsWithOverdueFollowUp', fn: clientApi.getClientsWithOverdueFollowUp, description: 'GET /api/Client/WithOverdueFollowUp', params: [] },
      { name: 'getFollowUpStats', fn: clientApi.getFollowUpStats, description: 'GET /api/Client/FollowUpStats', params: [] },
      { name: 'getClientsForFollowUpManagement', fn: clientApi.getClientsForFollowUpManagement, description: 'GET /api/Client/ForFollowUpManagement', params: [] }
    ]
  },
  deals: {
    name: 'Deals',
    description: 'Deal/Pipeline REST API endpoints',
    endpoints: [
      { name: 'getDeals', fn: dealApi.getDeals, description: 'GET /api/Deal/List', params: [] }
    ]
  },
  tasks: {
    name: 'Tasks',
    description: 'Follow-up Task REST API endpoints',
    endpoints: [
      { name: 'getFollowUpTasks', fn: taskApi.getFollowUpTasks, description: 'GET /api/Task/List', params: [] }
    ]
  },
  users: {
    name: 'Users',
    description: 'User REST API endpoints',
    endpoints: [
      { name: 'getUsers', fn: userApi.getUsers, description: 'GET /api/User/List', params: [] }
    ]
  },
  reference: {
    name: 'Reference Data',
    description: 'Reference data REST API endpoints',
    endpoints: [
      { name: 'getPipelineStatuses', fn: referenceApi.getPipelineStatuses, description: 'GET /api/Reference/PipelineStatuses', params: [] },
      { name: 'getSkillsPartners', fn: referenceApi.getSkillsPartners, description: 'GET /api/Reference/SkillsPartners', params: [] },
      { name: 'getSkillsPartner', fn: referenceApi.getSkillsPartner, description: 'GET /api/Reference/SkillsPartners/{id}', params: ['partnerId'] },
      { name: 'getSetas', fn: referenceApi.getSetas, description: 'GET /api/Reference/Setas', params: [] },
      { name: 'getJobTitles', fn: referenceApi.getJobTitles, description: 'GET /api/Reference/JobTitles', params: [] },
      { name: 'getRoles', fn: referenceApi.getRoles, description: 'GET /api/Reference/Roles', params: [] },
      { name: 'getRole', fn: referenceApi.getRole, description: 'GET /api/Reference/Roles/{id}', params: ['roleId'] }
    ]
  },
  products: {
    name: 'Products',
    description: 'Product Line REST API endpoints',
    endpoints: [
      { name: 'getProductLines', fn: productLineApi.getProductLines, description: 'GET /api/ProductLine/List', params: [] },
      { name: 'getProducts', fn: productLineApi.getProducts, description: 'GET /api/ProductLine/AllProducts', params: [] },
      { name: 'getProduct', fn: productLineApi.getProduct, description: 'GET /api/ProductLine/Products/{id}', params: ['productId'] }
    ]
  },
  financial: {
    name: 'Financial',
    description: 'Financial REST API endpoints',
    endpoints: [
      { name: 'getFinancialDashboard', fn: financialApi.getFinancialDashboard, description: 'GET /api/Financial/Dashboard', params: [] },
      { name: 'getFinancialYearSettings', fn: financialApi.getFinancialYearSettings, description: 'GET /api/Financial/Settings/FinancialYear', params: [] },
      { name: 'getBudgets', fn: financialApi.getBudgets, description: 'GET /api/Financial/Budgets', params: [] },
      { name: 'getBudgetsBySalesperson', fn: financialApi.getBudgetsBySalesperson, description: 'GET /api/Financial/Budgets/BySalesperson', params: ['salespersonId'] },
      { name: 'getBudgetVsForecast', fn: financialApi.getBudgetVsForecast, description: 'GET /api/Financial/BudgetVsForecast', params: [] },
      { name: 'getClientFinancials', fn: financialApi.getClientFinancials, description: 'GET /api/Financial/ClientFinancials', params: [] },
      { name: 'getClientFinancialsByYear', fn: financialApi.getClientFinancialsByYear, description: 'GET /api/Financial/ClientFinancials/ByYear', params: ['year'] },
      { name: 'getClientFinancialsByClient', fn: financialApi.getClientFinancialsByClient, description: 'GET /api/Financial/Client/{id}/Entries', params: ['clientId'] },
      { name: 'getFinancialSummaryByProductLine', fn: financialApi.getFinancialSummaryByProductLine, description: 'GET /api/Financial/Summary/ByProductLine', params: [] },
      { name: 'getForecast', fn: financialApi.getForecast, description: 'GET /api/Financial/Forecast/{clientId}', params: ['clientId', 'period'] }
    ]
  },
  settings: {
    name: 'Settings',
    description: 'Settings REST API endpoints',
    endpoints: [
      { name: 'getCalculationOptions', fn: settingsApi.getCalculationOptions, description: 'GET /api/Settings/CalculationOptions', params: [] },
      { name: 'getDefaultSalespersonProductLines', fn: settingsApi.getDefaultSalespersonProductLines, description: 'GET /api/Settings/DefaultSalespersonProductLines', params: [] },
      { name: 'getLegalDocumentTypes', fn: settingsApi.getLegalDocumentTypes, description: 'GET /api/Settings/LegalDocumentTypes', params: [] }
    ]
  },
  messages: {
    name: 'Messages',
    description: 'Message REST API endpoints',
    endpoints: [
      { name: 'getMessages', fn: messageApi.getMessages, description: 'GET /api/Message/List', params: [] }
    ]
  }
}

const ApiDebug = () => {
  const { isSystemAdmin } = useTenant()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [paramValues, setParamValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [executionTime, setExecutionTime] = useState(null)

  // Only allow system admins
  if (!isSystemAdmin) {
    return (
      <div className="api-debug-page">
        <div className="api-debug-header">
          <h1>REST API Debug Tool</h1>
          <p className="access-denied">Access denied. This tool is only available to system administrators.</p>
        </div>
      </div>
    )
  }

  const executeEndpoint = useCallback(async (endpoint, params = {}) => {
    if (!endpoint) return

    setLoading(true)
    setResult(null)
    setError(null)

    const startTime = performance.now()

    try {
      // Build arguments from param values
      const args = endpoint.params.map(param => params[param] || '')

      // Call the function
      const response = await endpoint.fn(...args)

      const endTime = performance.now()
      setExecutionTime((endTime - startTime).toFixed(2))
      setResult(response)
    } catch (err) {
      const endTime = performance.now()
      setExecutionTime((endTime - startTime).toFixed(2))
      setError(err.message || 'An error occurred')
      console.error('API call error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCategoryClick = (categoryKey) => {
    setSelectedCategory(selectedCategory === categoryKey ? null : categoryKey)
    setSelectedEndpoint(null)
    setResult(null)
    setError(null)
  }

  const handleEndpointClick = (endpoint) => {
    setSelectedEndpoint(endpoint)
    setParamValues({})
    setResult(null)
    setError(null)

    // Auto-execute if no parameters required
    if (endpoint.params.length === 0) {
      executeEndpoint(endpoint, {})
    }
  }

  const handleParamChange = (paramName, value) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }))
  }

  const renderValue = (value) => {
    if (value === null) return <span className="null-value">null</span>
    if (value === undefined) return <span className="undefined-value">undefined</span>
    if (typeof value === 'boolean') return <span className="boolean-value">{value.toString()}</span>
    if (typeof value === 'number') return <span className="number-value">{value}</span>
    if (typeof value === 'string') {
      // Check if it's a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return <span className="date-value">{value}</span>
      }
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value
      return <span className="string-value">"{displayValue}"</span>
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="empty-array">[]</span>
      return <span className="array-indicator">[{value.length} items]</span>
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return <span className="empty-object">{'{}'}</span>
      return <span className="object-indicator">{'{...}'}</span>
    }
    return String(value)
  }

  const renderTable = (data) => {
    if (!data) return null

    // Handle array of objects
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <p className="no-data">No data returned (empty array)</p>
      }

      // Get all unique keys from all objects
      const allKeys = new Set()
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => allKeys.add(key))
        }
      })
      const keys = Array.from(allKeys)

      if (keys.length === 0) {
        // Array of primitives
        return (
          <div className="result-table-container">
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{renderValue(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      return (
        <div className="result-table-container">
          <p className="result-count">{data.length} record(s)</p>
          <table className="result-table">
            <thead>
              <tr>
                <th>#</th>
                {keys.map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  {keys.map(key => (
                    <td key={key}>{renderValue(item[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Handle single object
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data)
      if (entries.length === 0) {
        return <p className="no-data">No data returned (empty object)</p>
      }

      return (
        <div className="result-table-container">
          <table className="result-table single-object">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key}>
                  <td className="property-name">{key}</td>
                  <td>{renderValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Handle primitives
    return (
      <div className="result-primitive">
        <strong>Result:</strong> {renderValue(data)}
      </div>
    )
  }

  const renderExpandedData = () => {
    if (!result) return null

    return (
      <div className="expanded-json">
        <h4>Raw JSON Response</h4>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="api-debug-page">
      <div className="api-debug-header">
        <h1>REST API Debug Tool</h1>
        <p>
          Test REST API endpoints. Base URL: <strong>{API_BASE_URL}</strong>
        </p>
      </div>

      <div className="api-debug-content">
        <div className="api-categories">
          <h2>API Endpoints</h2>
          {Object.entries(API_CATEGORIES).map(([key, category]) => (
            <div key={key} className="category-section">
              <div
                className={`category-header ${selectedCategory === key ? 'active' : ''}`}
                onClick={() => handleCategoryClick(key)}
              >
                <span className="category-name">{category.name}</span>
                <span className="category-count">{category.endpoints.length}</span>
                <span className="category-arrow">{selectedCategory === key ? '▼' : '▶'}</span>
              </div>

              {selectedCategory === key && (
                <div className="category-endpoints">
                  {category.endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className={`endpoint-item ${selectedEndpoint?.name === endpoint.name ? 'selected' : ''}`}
                      onClick={() => handleEndpointClick(endpoint)}
                    >
                      <span className="endpoint-name">{endpoint.name}</span>
                      {endpoint.params.length > 0 && (
                        <span className="endpoint-params">({endpoint.params.join(', ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="api-tester">
          {selectedEndpoint ? (
            <>
              <div className="endpoint-details">
                <h2>{selectedEndpoint.name}</h2>
                <p className="endpoint-description">{selectedEndpoint.description}</p>

                {selectedEndpoint.params.length > 0 && (
                  <div className="endpoint-params-form">
                    <h3>Parameters</h3>
                    {selectedEndpoint.params.map(param => (
                      <div key={param} className="param-input-group">
                        <label htmlFor={param}>{param}</label>
                        <input
                          type="text"
                          id={param}
                          value={paramValues[param] || ''}
                          onChange={(e) => handleParamChange(param, e.target.value)}
                          placeholder={`Enter ${param}`}
                        />
                      </div>
                    ))}
                    <button
                      className="execute-btn"
                      onClick={() => executeEndpoint(selectedEndpoint, paramValues)}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Execute'}
                    </button>
                  </div>
                )}
              </div>

              <div className="endpoint-result">
                <h3>
                  Result
                  {executionTime && (
                    <span className="execution-time">{executionTime}ms</span>
                  )}
                </h3>

                {loading && (
                  <div className="loading-indicator">Loading...</div>
                )}

                {error && (
                  <div className="error-message">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                {result !== null && !loading && (
                  <>
                    {renderTable(result)}
                    {renderExpandedData()}
                  </>
                )}

                {!loading && result === null && !error && selectedEndpoint.params.length > 0 && (
                  <p className="no-result">Fill in the parameters and click "Execute" to test</p>
                )}
              </div>
            </>
          ) : (
            <div className="no-endpoint-selected">
              <h2>Select an Endpoint</h2>
              <p>Choose a category and endpoint from the list to test REST API calls.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApiDebug
