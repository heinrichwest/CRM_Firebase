import { useState, useEffect } from 'react'
import { getPipelineStatuses, savePipelineStatuses } from '../services/firestoreService'
import './PipelineStatusManagement.css'

const PipelineStatusManagement = () => {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: '#e3f2fd', isWon: false, isLost: false })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStatus, setNewStatus] = useState({ name: '', color: '#e3f2fd', isWon: false, isLost: false })

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    try {
      const statusData = await getPipelineStatuses()
      setStatuses(statusData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading pipeline statuses:', error)
      setLoading(false)
    }
  }

  const generateId = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  const handleAddStatus = async () => {
    if (!newStatus.name.trim()) {
      alert('Please enter a status name')
      return
    }

    const id = generateId(newStatus.name)
    if (statuses.some(s => s.id === id)) {
      alert('A status with this name already exists')
      return
    }

    const maxOrder = Math.max(...statuses.map(s => s.order), 0)
    const statusToAdd = {
      id,
      name: newStatus.name.trim(),
      color: newStatus.color,
      order: maxOrder + 1,
      isWon: newStatus.isWon,
      isLost: newStatus.isLost
    }

    const updatedStatuses = [...statuses, statusToAdd]
    await saveStatuses(updatedStatuses)
    setNewStatus({ name: '', color: '#e3f2fd', isWon: false, isLost: false })
    setShowAddForm(false)
  }

  const handleEditStatus = (status) => {
    setEditingId(status.id)
    setEditForm({
      name: status.name,
      color: status.color,
      isWon: status.isWon || false,
      isLost: status.isLost || false
    })
  }

  const handleSaveEdit = async (statusId) => {
    if (!editForm.name.trim()) {
      alert('Please enter a status name')
      return
    }

    const updatedStatuses = statuses.map(s => {
      if (s.id === statusId) {
        return {
          ...s,
          name: editForm.name.trim(),
          color: editForm.color,
          isWon: editForm.isWon,
          isLost: editForm.isLost
        }
      }
      return s
    })

    await saveStatuses(updatedStatuses)
    setEditingId(null)
  }

  const handleDeleteStatus = async (statusId) => {
    const status = statuses.find(s => s.id === statusId)
    if (status.isWon || status.isLost) {
      alert('Cannot delete Won or Lost status. These are required for the pipeline to function correctly.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${status.name}"? Clients with this status will retain their status value but it will no longer appear in the dropdown.`)) {
      return
    }

    const updatedStatuses = statuses.filter(s => s.id !== statusId)
    await saveStatuses(updatedStatuses)
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return

    const updatedStatuses = [...statuses]
    const temp = updatedStatuses[index].order
    updatedStatuses[index].order = updatedStatuses[index - 1].order
    updatedStatuses[index - 1].order = temp

    // Swap positions in array
    const tempStatus = updatedStatuses[index]
    updatedStatuses[index] = updatedStatuses[index - 1]
    updatedStatuses[index - 1] = tempStatus

    await saveStatuses(updatedStatuses)
  }

  const handleMoveDown = async (index) => {
    if (index === statuses.length - 1) return

    const updatedStatuses = [...statuses]
    const temp = updatedStatuses[index].order
    updatedStatuses[index].order = updatedStatuses[index + 1].order
    updatedStatuses[index + 1].order = temp

    // Swap positions in array
    const tempStatus = updatedStatuses[index]
    updatedStatuses[index] = updatedStatuses[index + 1]
    updatedStatuses[index + 1] = tempStatus

    await saveStatuses(updatedStatuses)
  }

  const saveStatuses = async (updatedStatuses) => {
    setSaving(true)
    try {
      await savePipelineStatuses(updatedStatuses)
      setStatuses(updatedStatuses.sort((a, b) => a.order - b.order))
    } catch (error) {
      console.error('Error saving statuses:', error)
      alert('Failed to save changes. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="pipeline-status-management">
        <h1>Pipeline Status Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="pipeline-status-management">
      <div className="page-header">
        <h1>Pipeline Status Management</h1>
        <p className="page-description">
          Configure the sales pipeline stages. Drag to reorder or use the arrows to change the display order.
        </p>
      </div>

      <div className="status-list-container">
        <div className="status-list-header">
          <h2>Pipeline Stages</h2>
          <button
            className="add-status-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            + Add New Status
          </button>
        </div>

        {showAddForm && (
          <div className="add-status-form">
            <div className="form-row">
              <div className="form-group">
                <label>Status Name *</label>
                <input
                  type="text"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  placeholder="e.g., Demo Scheduled"
                />
              </div>
              <div className="form-group color-picker-group">
                <label>Color</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  />
                  <span className="color-preview" style={{ backgroundColor: newStatus.color }}></span>
                </div>
              </div>
            </div>
            <div className="form-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newStatus.isWon}
                  onChange={(e) => setNewStatus({ ...newStatus, isWon: e.target.checked, isLost: false })}
                />
                This is a "Won" status (deal closed successfully)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newStatus.isLost}
                  onChange={(e) => setNewStatus({ ...newStatus, isLost: e.target.checked, isWon: false })}
                />
                This is a "Lost" status (deal did not close)
              </label>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="save-btn" onClick={handleAddStatus} disabled={saving}>
                {saving ? 'Adding...' : 'Add Status'}
              </button>
            </div>
          </div>
        )}

        <div className="status-list">
          {statuses.map((status, index) => (
            <div
              key={status.id}
              className="status-item"
              style={{ borderLeftColor: status.color }}
            >
              {editingId === status.id ? (
                <div className="edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Status name"
                      />
                    </div>
                    <div className="form-group color-picker-group">
                      <div className="color-picker-wrapper">
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        />
                        <span className="color-preview" style={{ backgroundColor: editForm.color }}></span>
                      </div>
                    </div>
                  </div>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.isWon}
                        onChange={(e) => setEditForm({ ...editForm, isWon: e.target.checked, isLost: false })}
                      />
                      Won status
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.isLost}
                        onChange={(e) => setEditForm({ ...editForm, isLost: e.target.checked, isWon: false })}
                      />
                      Lost status
                    </label>
                  </div>
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    <button className="save-btn" onClick={() => handleSaveEdit(status.id)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="status-info">
                    <div className="status-order">{index + 1}</div>
                    <div
                      className="status-color-badge"
                      style={{ backgroundColor: status.color }}
                    ></div>
                    <div className="status-name">
                      {status.name}
                      {status.isWon && <span className="status-tag won">Won</span>}
                      {status.isLost && <span className="status-tag lost">Lost</span>}
                    </div>
                    <div className="status-id">{status.id}</div>
                  </div>
                  <div className="status-actions">
                    <button
                      className="order-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || saving}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      className="order-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === statuses.length - 1 || saving}
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => handleEditStatus(status)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteStatus(status.id)}
                      disabled={saving || status.isWon || status.isLost}
                      title={status.isWon || status.isLost ? 'Cannot delete Won/Lost status' : 'Delete'}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="info-section">
          <h3>Information</h3>
          <ul>
            <li>Pipeline statuses define the stages a client goes through in your sales process.</li>
            <li>The order shown here is the order they will appear in dropdown menus.</li>
            <li>You must have at least one "Won" and one "Lost" status for reporting to work correctly.</li>
            <li>Deleting a status will not change clients already in that status, but the status will no longer be available for selection.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PipelineStatusManagement
