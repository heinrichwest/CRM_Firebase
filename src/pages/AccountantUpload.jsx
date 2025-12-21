import React, { useState, useEffect, useRef } from 'react'
import { useTenant } from '../context/TenantContext'
import { getClients, createClient } from '../services/firestoreService'
import { getProductLines, getFinancialYearSettings } from '../services/firestoreService'
import {
  UPLOAD_TYPES,
  parseCSV,
  validateUploadData,
  saveFinancialUpload,
  getUploadHistory,
  deleteFinancialUpload,
  calculateFinancialYear,
  getFinancialComparison
} from '../services/financialUploadService'
import './AccountantUpload.css'

const AccountantUpload = () => {
  const { getTenantId, currentUser, isSystemAdmin } = useTenant()
  const tenantId = getTenantId()
  const fileInputRef = useRef(null)

  // State
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [clients, setClients] = useState([])
  const [productLines, setProductLines] = useState([])
  const [financialYear, setFinancialYear] = useState('')
  const [uploadHistory, setUploadHistory] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Upload state
  const [selectedUploadType, setSelectedUploadType] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [showValidation, setShowValidation] = useState(false)

  // Available years based on current FY
  const [availableYears, setAvailableYears] = useState([])

  // Active tab state
  const [activeTab, setActiveTab] = useState('upload')

  // Client management state
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClient, setNewClient] = useState({ companyName: '', contactPerson: '', email: '', phone: '' })
  const [addingClient, setAddingClient] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [tenantId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      // Check if tenantId is available
      if (!tenantId) {
        console.warn('AccountantUpload - No tenantId available. User may not be assigned to a tenant.')
        setError('Your user account is not assigned to a tenant. Please contact an administrator to assign you to a tenant.')
        setLoading(false)
        return
      }

      // Load core data first (these collections should have rules)
      // Financial year settings are tenant-specific
      const [clientsData, productLinesData, fySettings] = await Promise.all([
        getClients({}, tenantId),
        getProductLines(),
        getFinancialYearSettings(tenantId)
      ])

      setClients(clientsData)
      setProductLines(productLinesData)
      setFinancialYear(fySettings.currentFinancialYear)

      // Try to load upload history (may fail if rules not set up yet)
      if (tenantId) {
        try {
          const historyData = await getUploadHistory(tenantId)
          setUploadHistory(historyData)
        } catch (historyError) {
          console.warn('Could not load upload history:', historyError.message)
          // Don't fail completely - just show empty history
          setUploadHistory([])
          if (historyError.code === 'permission-denied') {
            console.info('Firebase rules for financialUploads collection need to be configured')
          }
        }
      }

      // Calculate available years
      const currentFY = fySettings.currentFinancialYear
      const years = [
        { value: calculateFinancialYear(currentFY, -3), label: `YTD-3: ${calculateFinancialYear(currentFY, -3)}`, type: UPLOAD_TYPES.YTD_3 },
        { value: calculateFinancialYear(currentFY, -2), label: `YTD-2: ${calculateFinancialYear(currentFY, -2)}`, type: UPLOAD_TYPES.YTD_2 },
        { value: calculateFinancialYear(currentFY, -1), label: `YTD-1: ${calculateFinancialYear(currentFY, -1)}`, type: UPLOAD_TYPES.YTD_1 },
        { value: currentFY, label: `Budget: ${currentFY}`, type: UPLOAD_TYPES.BUDGET },
        { value: currentFY, label: `YTD Actual: ${currentFY}`, type: UPLOAD_TYPES.YTD_ACTUAL }
      ]
      setAvailableYears(years)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Client management functions
  const handleAddClient = async () => {
    if (!newClient.companyName.trim()) {
      setError('Company name is required')
      return
    }

    setAddingClient(true)
    setError('')

    try {
      await createClient({
        companyName: newClient.companyName.trim(),
        contactPerson: newClient.contactPerson.trim() || '',
        email: newClient.email.trim() || '',
        phone: newClient.phone.trim() || '',
        status: 'active'
      }, tenantId)

      setSuccess(`Client "${newClient.companyName}" created successfully!`)
      setShowAddClientModal(false)
      setNewClient({ companyName: '', contactPerson: '', email: '', phone: '' })

      // Refresh clients list
      const clientsData = await getClients({}, tenantId)
      setClients(clientsData)

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error creating client:', error)
      setError(`Failed to create client: ${error.message}`)
    } finally {
      setAddingClient(false)
    }
  }

  const downloadClientsCSV = () => {
    const headers = ['Client Name', 'Contact Person', 'Email', 'Phone', 'Status']
    const rows = clients.map(client => [
      client.name || client.companyName || client.legalName || '',
      client.contactPerson || client.contactName || '',
      client.email || client.contactEmail || '',
      client.phone || client.contactPhone || '',
      client.status || 'active'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredClients = clients.filter(client => {
    const searchTerm = clientSearchTerm.toLowerCase()
    const clientName = (client.name || client.companyName || client.legalName || '').toLowerCase()
    const contactPerson = (client.contactPerson || client.contactName || '').toLowerCase()
    return clientName.includes(searchTerm) || contactPerson.includes(searchTerm)
  })

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!selectedUploadType) {
      setError('Please select an upload type first')
      return
    }

    setError('')
    setSuccess('')
    setParsedData(null)
    setValidationResult(null)

    try {
      const content = await readFileContent(file)
      const parsed = parseCSV(content)
      setParsedData(parsed)

      // Validate against existing clients and products
      const validation = validateUploadData(parsed.rows, clients, productLines)
      setValidationResult(validation)
      setShowValidation(true)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      setError(`Error parsing CSV: ${error.message}`)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleUploadTypeChange = (e) => {
    const type = e.target.value
    setSelectedUploadType(type)

    // Auto-select the corresponding year
    const yearInfo = availableYears.find(y => y.type === type)
    if (yearInfo) {
      setSelectedYear(yearInfo.value)
    }

    // Reset validation
    setParsedData(null)
    setValidationResult(null)
    setShowValidation(false)
  }

  const handleConfirmUpload = async () => {
    if (!validationResult || !validationResult.matchedRows.length) {
      setError('No valid data to upload')
      return
    }

    if (!tenantId) {
      setError('No tenant selected')
      return
    }

    setUploading(true)
    setError('')

    try {
      const result = await saveFinancialUpload(
        validationResult.matchedRows,
        selectedUploadType,
        selectedYear,
        currentUser?.uid,
        tenantId
      )

      setSuccess(`Successfully uploaded ${result.successCount} records!`)

      // Refresh upload history
      const historyData = await getUploadHistory(tenantId)
      setUploadHistory(historyData)

      // Reset form
      setParsedData(null)
      setValidationResult(null)
      setShowValidation(false)
      setSelectedUploadType('')
      setSelectedYear('')

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error uploading data:', error)
      setError(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteUpload = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this upload? This will remove all associated financial data.')) {
      return
    }

    try {
      await deleteFinancialUpload(uploadId, tenantId)
      setSuccess('Upload deleted successfully')

      // Refresh history
      const historyData = await getUploadHistory(tenantId)
      setUploadHistory(historyData)

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting upload:', error)
      setError(`Failed to delete upload: ${error.message}`)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUploadTypeName = (type) => {
    switch (type) {
      case UPLOAD_TYPES.YTD_3: return 'YTD-3 (3 Years Ago)'
      case UPLOAD_TYPES.YTD_2: return 'YTD-2 (2 Years Ago)'
      case UPLOAD_TYPES.YTD_1: return 'YTD-1 (Prior Year)'
      case UPLOAD_TYPES.BUDGET: return 'Budget'
      case UPLOAD_TYPES.YTD_ACTUAL: return 'YTD Actual (Current Year)'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="accountant-upload">
        <h1>Financial Data Upload</h1>
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="accountant-upload">
      <div className="page-header">
        <h1>Accountant Portal</h1>
        <p className="page-description">
          Upload financial data (YTD actuals, budgets) and manage clients.
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tab Navigation */}
      <div className="accountant-tabs">
        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Data
        </button>
        <button
          className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          Client Management ({clients.length})
        </button>
      </div>

      {/* UPLOAD TAB */}
      {activeTab === 'upload' && (
        <>
          {/* Upload Section */}
          <div className="upload-section">
            <h2>Upload New Data</h2>

            <div className="upload-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Upload Type</label>
                  <select
                    value={selectedUploadType}
                    onChange={handleUploadTypeChange}
                  >
                    <option value="">Select upload type...</option>
                    <option value={UPLOAD_TYPES.YTD_ACTUAL}>YTD Actual: Current Year Actuals</option>
                    <option value={UPLOAD_TYPES.BUDGET}>Budget: Current Year Budget</option>
                    <option value={UPLOAD_TYPES.YTD_1}>YTD-1: Prior Year Actuals (Last year)</option>
                    <option value={UPLOAD_TYPES.YTD_2}>YTD-2: Prior Year Actuals (2 years ago)</option>
                    <option value={UPLOAD_TYPES.YTD_3}>YTD-3: Prior Year Actuals (3 years ago)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Financial Year</label>
                  <input
                    type="text"
                    value={selectedYear}
                    readOnly
                    placeholder="Select upload type first"
                  />
                </div>
              </div>

              <div className="upload-instructions">
                <h3>CSV Format Requirements</h3>
                <ul>
                  <li><strong>Column A:</strong> Client Name (must match existing clients)</li>
                  <li><strong>Column B:</strong> Product Name (must match existing products)</li>
              <li><strong>Columns C-N:</strong> Monthly amounts (Month 1, Month 2, Month 3, Month 4, Month 5, Month 6, Month 7, Month 8, Month 9, Month 10, Month 11, Month 12)</li>
            </ul>
            <div className="template-download">
              <button className="secondary-btn" onClick={() => downloadTemplate()}>
                Download CSV Template
              </button>
            </div>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileSelect}
              disabled={!selectedUploadType}
            />
            <p>Select a CSV file to upload</p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {showValidation && validationResult && (
        <div className="validation-section">
          <h2>Validation Results</h2>

          {/* Summary */}
          <div className="validation-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Rows</span>
                <span className="summary-value">{validationResult.summary.totalRows}</span>
              </div>
              <div className="summary-item success">
                <span className="summary-label">Matched</span>
                <span className="summary-value">{validationResult.summary.matchedCount}</span>
              </div>
              <div className="summary-item warning">
                <span className="summary-label">Unmatched Clients</span>
                <span className="summary-value">{validationResult.summary.unmatchedClientCount}</span>
              </div>
              <div className="summary-item warning">
                <span className="summary-label">Unmatched Products</span>
                <span className="summary-value">{validationResult.summary.unmatchedProductCount}</span>
              </div>
              {validationResult.summary.duplicateCount > 0 && (
                <div className="summary-item error">
                  <span className="summary-label">Duplicates</span>
                  <span className="summary-value">{validationResult.summary.duplicateCount}</span>
                </div>
              )}
            </div>

            <div className="amount-summary">
              <div className="amount-item">
                <span>Total Amount in File:</span>
                <strong>{formatCurrency(validationResult.summary.totalAmount)}</strong>
              </div>
              <div className="amount-item success">
                <span>Matched Amount:</span>
                <strong>{formatCurrency(validationResult.summary.matchedAmount)}</strong>
              </div>
              <div className="amount-item warning">
                <span>Unmatched Amount:</span>
                <strong>{formatCurrency(validationResult.summary.unmatchedAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Unmatched Clients */}
          {validationResult.unmatchedClients.length > 0 && (
            <div className="validation-errors">
              <h3>Unmatched Clients ({validationResult.unmatchedClients.length})</h3>
              <p className="help-text">
                These clients were not found in the system. Please add them or correct the names in your CSV.
              </p>
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Client Name</th>
                    <th>Product</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.unmatchedClients.slice(0, 20).map((item, index) => (
                    <tr key={index}>
                      <td>{item.rowIndex}</td>
                      <td className="highlight-cell">{item.clientName}</td>
                      <td>{item.productName}</td>
                      <td className="amount-cell">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  {validationResult.unmatchedClients.length > 20 && (
                    <tr className="more-row">
                      <td colSpan="4">
                        ...and {validationResult.unmatchedClients.length - 20} more unmatched clients
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Unmatched Products */}
          {validationResult.unmatchedProducts.length > 0 && (
            <div className="validation-errors">
              <h3>Unmatched Products ({validationResult.unmatchedProducts.length})</h3>
              <p className="help-text">
                These products were not found in the system. Please add them or correct the names in your CSV.
              </p>
              <div className="unmatched-products-list">
                {validationResult.unmatchedProducts.map((item, index) => (
                  <span key={index} className="unmatched-product-badge">
                    {item.productName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Rows Warning */}
          {validationResult.duplicateRows && validationResult.duplicateRows.length > 0 && (
            <div className="validation-errors duplicate-section">
              <h3>Duplicate Rows ({validationResult.duplicateRows.length})</h3>
              <p className="help-text">
                These rows have the same Client + Product combination as earlier rows and will be skipped.
                Each client/product combination should appear only once with all 12 months in columns.
              </p>
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Client Name</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.duplicateRows.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td>{item.rowIndex}</td>
                      <td>{item.clientName}</td>
                      <td>{item.productName}</td>
                      <td className="amount-cell">{formatCurrency(item.total)}</td>
                      <td className="reason-cell">{item.reason}</td>
                    </tr>
                  ))}
                  {validationResult.duplicateRows.length > 10 && (
                    <tr className="more-row">
                      <td colSpan="5">
                        ...and {validationResult.duplicateRows.length - 10} more duplicate rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Matched Preview */}
          {validationResult.matchedRows.length > 0 && (
            <div className="matched-preview">
              <h3>Preview of Matched Data ({validationResult.matchedRows.length} records)</h3>
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Product</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.matchedRows.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td>{row.clientName}</td>
                      <td>{row.productLine}</td>
                      <td className="amount-cell">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  {validationResult.matchedRows.length > 10 && (
                    <tr className="more-row">
                      <td colSpan="3">
                        ...and {validationResult.matchedRows.length - 10} more matched records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Buttons */}
          <div className="validation-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                setShowValidation(false)
                setParsedData(null)
                setValidationResult(null)
              }}
            >
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={handleConfirmUpload}
              disabled={uploading || validationResult.matchedRows.length === 0}
            >
              {uploading ? 'Uploading...' : `Upload ${validationResult.matchedRows.length} Records`}
            </button>
          </div>

          {validationResult.summary.unmatchedAmount > 0 && (
            <div className="upload-warning">
              <strong>Warning:</strong> {formatCurrency(validationResult.summary.unmatchedAmount)} will NOT be uploaded due to unmatched clients/products.
            </div>
          )}
        </div>
      )}

          {/* Upload History */}
          <div className="history-section">
            <h2>Upload History</h2>

            {uploadHistory.length === 0 ? (
              <p className="no-history">No uploads yet.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Financial Year</th>
                    <th>Records</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.map(upload => (
                    <tr key={upload.id}>
                      <td>{formatDate(upload.uploadedAt)}</td>
                      <td>{getUploadTypeName(upload.uploadType)}</td>
                      <td>{upload.financialYear}</td>
                      <td>{upload.rowCount || upload.successCount || 0}</td>
                      <td className="amount-cell">{formatCurrency(upload.totalAmount)}</td>
                      <td>
                        <span className={`status-badge ${upload.status}`}>
                          {upload.status || 'completed'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUpload(upload.id)}
                          title="Delete this upload"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* CLIENTS TAB */}
      {activeTab === 'clients' && (
        <div className="clients-section">
          <div className="clients-header">
            <h2>All Clients ({clients.length})</h2>
            <div className="clients-actions">
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="search-input"
              />
              <button className="secondary-btn" onClick={downloadClientsCSV}>
                Download CSV
              </button>
              <button className="primary-btn" onClick={() => setShowAddClientModal(true)}>
                + Add Client
              </button>
            </div>
          </div>

          <div className="clients-table-container">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      {clientSearchTerm ? 'No clients match your search.' : 'No clients found.'}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <tr key={client.id}>
                      <td className="client-name">{client.name || client.companyName || client.legalName || '-'}</td>
                      <td>{client.contactPerson || client.contactName || '-'}</td>
                      <td>{client.email || client.contactEmail || '-'}</td>
                      <td>{client.phone || client.contactPhone || '-'}</td>
                      <td>
                        <span className={`status-badge ${client.status || 'active'}`}>
                          {client.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="modal-overlay" onClick={() => setShowAddClientModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Client</h2>
              <button className="modal-close" onClick={() => setShowAddClientModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={newClient.companyName}
                  onChange={(e) => setNewClient(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input
                  type="text"
                  value={newClient.contactPerson}
                  onChange={(e) => setNewClient(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Enter contact person name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddClientModal(false)}>Cancel</button>
              <button
                className="primary-btn"
                onClick={handleAddClient}
                disabled={addingClient || !newClient.companyName.trim()}
              >
                {addingClient ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to download CSV template
const downloadTemplate = () => {
  const headers = ['Client Name', 'Product Name', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12']
  const sampleRow = ['Sample Company', 'Learnerships', '10000', '15000', '12000', '18000', '20000', '22000', '25000', '23000', '28000', '30000', '32000', '35000']

  const csvContent = [
    headers.join(','),
    sampleRow.join(',')
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'financial_upload_template.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

export default AccountantUpload
