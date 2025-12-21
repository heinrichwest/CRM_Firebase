import { useState } from 'react'
import { useTenant } from '../context/TenantContext'
import {
  auditTenantIds,
  fixAllTenantIds,
  fixInfinityUsers,
  getSystemCollections,
  TENANT_COLLECTIONS,
  SYSTEM_COLLECTIONS
} from '../services/tenantFixService'
import './TenantFixAdmin.css'

const TenantFixAdmin = () => {
  const { isSystemAdmin } = useTenant()
  const [loading, setLoading] = useState(false)
  const [auditReport, setAuditReport] = useState(null)
  const [fixResults, setFixResults] = useState(null)
  const [infinityResults, setInfinityResults] = useState(null)
  const [targetTenantId, setTargetTenantId] = useState('speccon')
  const [error, setError] = useState('')

  // Only system admins can access this page
  if (!isSystemAdmin) {
    return (
      <div className="tenant-fix-admin">
        <h1>Access Denied</h1>
        <p>You must be a system administrator to access this page.</p>
      </div>
    )
  }

  const handleAudit = async () => {
    setLoading(true)
    setError('')
    setAuditReport(null)

    try {
      const report = await auditTenantIds()
      setAuditReport(report)
    } catch (err) {
      setError(`Audit failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFix = async () => {
    if (!targetTenantId.trim()) {
      setError('Please enter a valid target tenant ID')
      return
    }

    if (!window.confirm(`Are you sure you want to fix all invalid tenant IDs to "${targetTenantId}"? This cannot be undone.`)) {
      return
    }

    setLoading(true)
    setError('')
    setFixResults(null)

    try {
      const results = await fixAllTenantIds(targetTenantId)
      setFixResults(results)
    } catch (err) {
      setError(`Fix failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFixInfinityUsers = async () => {
    if (!window.confirm('Are you sure you want to fix all Infinity users? This will set tenantId to "infinity" for all users with "Infinity" in their email. This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError('')
    setInfinityResults(null)

    try {
      const results = await fixInfinityUsers()
      setInfinityResults(results)
    } catch (err) {
      setError(`Fix Infinity users failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const systemCollections = getSystemCollections()

  return (
    <div className="tenant-fix-admin">
      <h1>Tenant Data Fix Tool</h1>
      <p className="description">
        This tool audits and fixes tenant ID issues across all collections in the database.
      </p>

      {error && <div className="error-message">{error}</div>}

      {/* Collections Info */}
      <div className="info-section">
        <h2>Collections Overview</h2>
        <div className="collections-grid">
          <div className="collection-list">
            <h3>Require Tenant ID ({TENANT_COLLECTIONS.length})</h3>
            <ul>
              {TENANT_COLLECTIONS.map(col => (
                <li key={col}>{col}</li>
              ))}
            </ul>
          </div>
          <div className="collection-list system">
            <h3>System-Wide Defaults (No Tenant ID)</h3>
            <p className="detail" style={{ marginBottom: '12px' }}>
              {systemCollections.description}
            </p>
            <ul>
              {SYSTEM_COLLECTIONS.map(col => (
                <li key={col}>
                  <strong>{col}</strong>
                  <span className="detail">{systemCollections.details[col]}</span>
                </li>
              ))}
              <li>
                <strong>systemSettings</strong>
                <span className="detail">Uses document ID pattern (e.g., setting_tenantId)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-section">
        <h2>Actions</h2>

        <div className="action-card">
          <h3>1. Audit Tenant IDs</h3>
          <p>Scan all collections and report any invalid or missing tenant IDs.</p>
          <button
            className="primary-btn"
            onClick={handleAudit}
            disabled={loading}
          >
            {loading ? 'Running Audit...' : 'Run Audit'}
          </button>
        </div>

        <div className="action-card">
          <h3>2. Fix Tenant IDs</h3>
          <p>Update all invalid tenant IDs to the specified target tenant.</p>
          <div className="input-group">
            <label>Target Tenant ID:</label>
            <input
              type="text"
              value={targetTenantId}
              onChange={(e) => setTargetTenantId(e.target.value)}
              placeholder="e.g., speccon"
            />
          </div>
          <button
            className="danger-btn"
            onClick={handleFix}
            disabled={loading || !targetTenantId.trim()}
          >
            {loading ? 'Fixing...' : 'Fix All Invalid Tenant IDs'}
          </button>
        </div>

        <div className="action-card">
          <h3>3. Fix Infinity Users</h3>
          <p>Find all users with "Infinity" in their email and set their tenantId to "infinity".</p>
          <button
            className="warning-btn"
            onClick={handleFixInfinityUsers}
            disabled={loading}
          >
            {loading ? 'Fixing...' : 'Fix Infinity Users'}
          </button>
        </div>
      </div>

      {/* Audit Results */}
      {auditReport && (
        <div className="results-section">
          <h2>Audit Report</h2>
          <p className="timestamp">Generated: {auditReport.timestamp}</p>

          <div className="summary-card">
            <h3>Summary</h3>
            <p><strong>Total Issues Found:</strong> {auditReport.totalIssues}</p>
            <p><strong>Invalid Tenant IDs:</strong></p>
            <ul>
              {Object.entries(auditReport.invalidTenantIds).map(([tid, count]) => (
                <li key={tid}><code>{tid}</code>: {count} records</li>
              ))}
            </ul>
          </div>

          <h3>By Collection</h3>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Collection</th>
                <th>Total Records</th>
                <th>Issues</th>
                <th>Tenant Distribution</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(auditReport.collections).map(([colName, data]) => (
                <tr key={colName} className={data.issueCount > 0 ? 'has-issues' : ''}>
                  <td>{colName}</td>
                  <td>{data.totalRecords}</td>
                  <td className={data.issueCount > 0 ? 'issue-count' : ''}>
                    {data.issueCount}
                  </td>
                  <td>
                    {Object.entries(data.tenantIdDistribution).map(([tid, count]) => (
                      <span key={tid} className="tenant-badge">
                        {tid}: {count}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fix Results */}
      {fixResults && (
        <div className="results-section">
          <h2>Fix Results</h2>
          <p className="timestamp">Completed: {fixResults.endTime}</p>

          <div className="summary-card success">
            <h3>Summary</h3>
            <p><strong>Target Tenant ID:</strong> {fixResults.targetTenantId}</p>
            <p><strong>Total Records Fixed:</strong> {fixResults.totalFixed}</p>
            <p><strong>Total Errors:</strong> {fixResults.totalErrors}</p>
          </div>

          <h3>By Collection</h3>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Collection</th>
                <th>Total</th>
                <th>Already Valid</th>
                <th>Fixed</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(fixResults.collections).map(([colName, data]) => (
                <tr key={colName}>
                  <td>{colName}</td>
                  <td>{data.totalRecords}</td>
                  <td>{data.validRecords}</td>
                  <td className={data.fixedRecords > 0 ? 'fixed-count' : ''}>
                    {data.fixedRecords}
                  </td>
                  <td className={data.errors.length > 0 ? 'error-count' : ''}>
                    {data.errors.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinity Users Results */}
      {infinityResults && (
        <div className="results-section">
          <h2>Infinity Users Fix Results</h2>

          <div className="summary-card success">
            <h3>Summary</h3>
            <p><strong>Total Users Scanned:</strong> {infinityResults.totalUsers}</p>
            <p><strong>Already Correct:</strong> {infinityResults.alreadyCorrect}</p>
            <p><strong>Fixed:</strong> {infinityResults.fixed}</p>
            <p><strong>Errors:</strong> {infinityResults.errors.length}</p>
          </div>

          {infinityResults.fixedUsers.length > 0 && (
            <>
              <h3>Fixed Users</h3>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Previous Tenant ID</th>
                    <th>New Tenant ID</th>
                  </tr>
                </thead>
                <tbody>
                  {infinityResults.fixedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td className="issue-count">{user.previousTenantId || 'none'}</td>
                      <td className="fixed-count">infinity</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {infinityResults.errors.length > 0 && (
            <>
              <h3>Errors</h3>
              <ul>
                {infinityResults.errors.map((err, idx) => (
                  <li key={idx} className="error-count">
                    {err.email}: {err.error}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TenantFixAdmin
