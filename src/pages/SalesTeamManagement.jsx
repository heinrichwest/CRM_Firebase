import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import { useTeamHierarchy } from '../hooks/useTeamHierarchy'
import { getProductLines } from '../services/firestoreService'
import './SalesTeamManagement.css'

const SalesTeamManagement = () => {
  const { currentTenant, isSystemAdmin, hasPermission, getTenantId } = useTenant()
  const {
    hierarchy,
    managers,
    unassigned,
    stats,
    loading,
    error,
    isTeamManager,
    isSalesHead,
    loadHierarchy,
    loadManagers,
    loadUnassigned,
    loadStats,
    assignToManager,
    removeFromManager,
    updateSalesLevel,
    assignProductLines
  } = useTeamHierarchy()

  const [productLines, setProductLines] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showProductLineModal, setShowProductLineModal] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [selectedProductLineIds, setSelectedProductLineIds] = useState([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const tenantId = getTenantId()

  // Check permissions
  const canManageTeams = isSystemAdmin ||
    hasPermission('manage_all_teams') ||
    hasPermission('manage_team') ||
    hasPermission('manage_users')

  useEffect(() => {
    if (tenantId && canManageTeams) {
      loadInitialData()
    }
  }, [tenantId, canManageTeams])

  const loadInitialData = async () => {
    await Promise.all([
      loadHierarchy(),
      loadManagers(),
      loadUnassigned(),
      loadStats(),
      loadProductLinesData()
    ])
  }

  const loadProductLinesData = async () => {
    try {
      const lines = await getProductLines()
      setProductLines(lines)
    } catch (err) {
      console.error('Error loading product lines:', err)
    }
  }

  const handleAssignClick = (user) => {
    setSelectedUser(user)
    setSelectedManagerId('')
    setShowAssignModal(true)
  }

  const handleProductLinesClick = (user) => {
    setSelectedUser(user)
    setSelectedProductLineIds(user.assignedProductLineIds || [])
    setShowProductLineModal(true)
  }

  const handleAssignToManager = async () => {
    if (!selectedUser || !selectedManagerId) return

    setSaving(true)
    const result = await assignToManager(selectedUser.id, selectedManagerId)

    if (result.success) {
      setMessage(`${selectedUser.name || selectedUser.email} assigned successfully`)
      setShowAssignModal(false)
      setSelectedUser(null)
    } else {
      setMessage(`Error: ${result.error}`)
    }

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRemoveFromManager = async (user) => {
    if (!window.confirm(`Remove ${user.name || user.email} from their manager?`)) return

    setSaving(true)
    const result = await removeFromManager(user.id)

    if (result.success) {
      setMessage(`${user.name || user.email} removed from manager`)
    } else {
      setMessage(`Error: ${result.error}`)
    }

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveProductLines = async () => {
    if (!selectedUser) return

    setSaving(true)
    const result = await assignProductLines(selectedUser.id, selectedProductLineIds)

    if (result.success) {
      setMessage('Product lines updated successfully')
      setShowProductLineModal(false)
      setSelectedUser(null)
      await loadHierarchy()
    } else {
      setMessage(`Error: ${result.error}`)
    }

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const toggleProductLine = (lineId) => {
    setSelectedProductLineIds(prev =>
      prev.includes(lineId)
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    )
  }

  const renderTeamNode = (node, level = 0) => {
    const isManager = node.salesLevel === 'sales_manager' ||
                     node.salesLevel === 'sales_head' ||
                     node.role === 'sales_manager' ||
                     node.role === 'sales_head'

    return (
      <div key={node.id} className="team-node" style={{ marginLeft: level * 24 }}>
        <div className={`team-member ${isManager ? 'is-manager' : ''}`}>
          <div className="member-info">
            <div className="member-avatar">
              {(node.name || node.email || '?')[0].toUpperCase()}
            </div>
            <div className="member-details">
              <span className="member-name">{node.name || node.email}</span>
              <span className="member-role">
                {node.salesLevel === 'sales_head' ? 'Sales Head' :
                 node.salesLevel === 'sales_manager' ? 'Sales Manager' :
                 node.role || 'Salesperson'}
              </span>
              {node.assignedProductLineIds?.length > 0 && (
                <span className="member-products">
                  {node.assignedProductLineIds.length} product line(s)
                </span>
              )}
            </div>
          </div>
          <div className="member-actions">
            {isManager && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleProductLinesClick(node)}
              >
                Product Lines
              </button>
            )}
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleAssignClick(node)}
            >
              Reassign
            </button>
          </div>
        </div>
        {node.children?.length > 0 && (
          <div className="team-children">
            {node.children.map(child => renderTeamNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="sales-team-management-page">
        <div className="access-denied">
          <h2>No Tenant Selected</h2>
          <p>Please select a tenant to manage sales teams.</p>
        </div>
      </div>
    )
  }

  if (!canManageTeams) {
    return (
      <div className="sales-team-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to manage sales teams.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sales-team-management-page">
      <div className="page-header">
        <h1>Sales Team Management</h1>
        <p>
          Manage team structure and assignments for{' '}
          <strong>{currentTenant?.name || 'this tenant'}</strong>
        </p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {error && (
        <div className="message error">{error}</div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{stats.totalTeamSize}</span>
            <span className="stat-label">Total Team Size</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.directReports}</span>
            <span className="stat-label">Direct Reports</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{unassigned?.length || 0}</span>
            <span className="stat-label">Unassigned</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{managers?.length || 0}</span>
            <span className="stat-label">Managers</span>
          </div>
        </div>
      )}

      <div className="content-grid">
        {/* Unassigned Salespeople */}
        <div className="panel unassigned-panel">
          <div className="panel-header">
            <h2>Unassigned Salespeople</h2>
            <button
              className="btn btn-sm btn-secondary"
              onClick={loadUnassigned}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : unassigned?.length === 0 ? (
              <div className="empty-state">
                All salespeople are assigned to managers.
              </div>
            ) : (
              <div className="unassigned-list">
                {unassigned?.map(user => (
                  <div key={user.id} className="unassigned-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        {(user.displayName || user.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="member-details">
                        <span className="member-name">{user.displayName || user.email}</span>
                        <span className="member-role">{user.role || 'Salesperson'}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAssignClick({
                        id: user.id,
                        name: user.displayName,
                        email: user.email
                      })}
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Hierarchy */}
        <div className="panel hierarchy-panel">
          <div className="panel-header">
            <h2>Team Structure</h2>
            <button
              className="btn btn-sm btn-secondary"
              onClick={loadHierarchy}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="loading">Loading team structure...</div>
            ) : !hierarchy?.roots?.length ? (
              <div className="empty-state">
                No team structure configured yet.
              </div>
            ) : (
              <div className="team-hierarchy">
                {hierarchy.roots.map(root => renderTeamNode(root, 0))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign to Manager Modal */}
      {showAssignModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to Manager</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Assign <strong>{selectedUser.name || selectedUser.email}</strong> to a manager:
              </p>
              <div className="form-field">
                <label>Select Manager</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  <option value="">-- Select a Manager --</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.displayName || manager.email}
                      {' '}
                      ({manager.salesLevel === 'sales_head' ? 'Sales Head' :
                        manager.salesLevel === 'sales_manager' ? 'Sales Manager' :
                        manager.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAssignToManager}
                disabled={!selectedManagerId || saving}
              >
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Lines Modal */}
      {showProductLineModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProductLineModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Product Lines</h2>
              <button className="modal-close" onClick={() => setShowProductLineModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Select product lines for <strong>{selectedUser.name || selectedUser.email}</strong>:
              </p>
              <p className="help-text">
                Salespeople under this manager will only see these product lines.
                Leave empty for access to all products.
              </p>
              <div className="product-line-list">
                {productLines.map(line => (
                  <label key={line.id} className="product-line-option">
                    <input
                      type="checkbox"
                      checked={selectedProductLineIds.includes(line.id)}
                      onChange={() => toggleProductLine(line.id)}
                    />
                    <span>{line.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowProductLineModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProductLines}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesTeamManagement
