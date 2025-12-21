import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantStats,
  migrateDataToTenant,
  initializeSpecconTenant
} from '../services/tenantService'
import './TenantManagement.css'

const TenantManagement = () => {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [tenantStats, setTenantStats] = useState({})

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currencySymbol: 'R',
    financialYearStart: 'March',
    financialYearEnd: 'February'
  })

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const tenantsData = await getTenants()
      setTenants(tenantsData)

      // Load stats for each tenant
      const statsPromises = tenantsData.map(async (tenant) => {
        const stats = await getTenantStats(tenant.id)
        return { tenantId: tenant.id, ...stats }
      })
      const allStats = await Promise.all(statsPromises)
      const statsMap = {}
      allStats.forEach(s => {
        statsMap[s.tenantId] = s
      })
      setTenantStats(statsMap)
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a tenant name')
      return
    }

    setSaving(true)
    try {
      await createTenant({
        name: formData.name.trim(),
        description: formData.description.trim(),
        currencySymbol: formData.currencySymbol,
        financialYearStart: formData.financialYearStart,
        financialYearEnd: formData.financialYearEnd
      })

      setFormData({
        name: '',
        description: '',
        currencySymbol: 'R',
        financialYearStart: 'March',
        financialYearEnd: 'February'
      })
      setShowCreateForm(false)
      await loadTenants()
    } catch (error) {
      alert('Error creating tenant: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTenant = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a tenant name')
      return
    }

    setSaving(true)
    try {
      await updateTenant(editingTenant.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        settings: {
          currencySymbol: formData.currencySymbol,
          financialYearStart: formData.financialYearStart,
          financialYearEnd: formData.financialYearEnd
        }
      })

      setEditingTenant(null)
      setFormData({
        name: '',
        description: '',
        currencySymbol: 'R',
        financialYearStart: 'March',
        financialYearEnd: 'February'
      })
      await loadTenants()
    } catch (error) {
      alert('Error updating tenant: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTenant = async (tenant) => {
    const stats = tenantStats[tenant.id] || {}
    if (stats.userCount > 0 || stats.clientCount > 0) {
      alert(`Cannot delete tenant with ${stats.userCount} users and ${stats.clientCount} clients. Please remove all data first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete the tenant "${tenant.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteTenant(tenant.id)
      await loadTenants()
    } catch (error) {
      alert('Error deleting tenant: ' + error.message)
    }
  }

  const handleEditClick = (tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      description: tenant.description || '',
      currencySymbol: tenant.settings?.currencySymbol || 'R',
      financialYearStart: tenant.settings?.financialYearStart || 'March',
      financialYearEnd: tenant.settings?.financialYearEnd || 'February'
    })
    setShowCreateForm(false)
  }

  const handleCancelEdit = () => {
    setEditingTenant(null)
    setShowCreateForm(false)
    setFormData({
      name: '',
      description: '',
      currencySymbol: 'R',
      financialYearStart: 'March',
      financialYearEnd: 'February'
    })
  }

  const handleInitializeSpeccon = async () => {
    if (!confirm('This will create the Speccon tenant and migrate all existing data. Continue?')) {
      return
    }

    setMigrating(true)
    try {
      // First, create the Speccon tenant
      await initializeSpecconTenant()

      // Then migrate all existing data to the Speccon tenant
      await migrateDataToTenant('speccon')

      alert('Speccon tenant initialized and data migrated successfully!')
      await loadTenants()
    } catch (error) {
      alert('Error initializing Speccon tenant: ' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="tenant-management">
        <h1>Tenant Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="tenant-management">
      <div className="page-header">
        <h1>Tenant Management</h1>
        <p className="page-description">
          Manage tenants (organizations) in the system. Each tenant has isolated data.
        </p>
      </div>

      {tenants.length === 0 && (
        <div className="no-tenants-warning">
          <h3>No Tenants Configured</h3>
          <p>
            The system does not have any tenants configured yet. Click the button below to
            initialize the Speccon tenant and migrate all existing data.
          </p>
          <button
            className="init-btn"
            onClick={handleInitializeSpeccon}
            disabled={migrating}
          >
            {migrating ? 'Initializing...' : 'Initialize Speccon Tenant & Migrate Data'}
          </button>
        </div>
      )}

      <div className="tenant-list-container">
        <div className="tenant-list-header">
          <h2>Tenants ({tenants.length})</h2>
          <button
            className="add-tenant-btn"
            onClick={() => {
              setShowCreateForm(true)
              setEditingTenant(null)
              setFormData({
                name: '',
                description: '',
                currencySymbol: 'R',
                financialYearStart: 'March',
                financialYearEnd: 'February'
              })
            }}
          >
            + Add New Tenant
          </button>
        </div>

        {(showCreateForm || editingTenant) && (
          <div className="tenant-form">
            <h3>{editingTenant ? 'Edit Tenant' : 'Create New Tenant'}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tenant Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the tenant"
                  rows={3}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  placeholder="R"
                  maxLength={5}
                />
              </div>
              <div className="form-group">
                <label>Financial Year Start</label>
                <select
                  value={formData.financialYearStart}
                  onChange={(e) => setFormData({ ...formData, financialYearStart: e.target.value })}
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Financial Year End</label>
                <select
                  value={formData.financialYearEnd}
                  onChange={(e) => setFormData({ ...formData, financialYearEnd: e.target.value })}
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={editingTenant ? handleUpdateTenant : handleCreateTenant}
                disabled={saving}
              >
                {saving ? 'Saving...' : (editingTenant ? 'Update Tenant' : 'Create Tenant')}
              </button>
            </div>
          </div>
        )}

        <div className="tenant-list">
          {tenants.map(tenant => {
            const stats = tenantStats[tenant.id] || {}
            return (
              <div key={tenant.id} className="tenant-card">
                <div className="tenant-info">
                  <div className="tenant-header">
                    <h3>{tenant.name}</h3>
                    <span className={`tenant-status ${tenant.status || 'active'}`}>
                      {tenant.status || 'Active'}
                    </span>
                  </div>
                  {tenant.description && (
                    <p className="tenant-description">{tenant.description}</p>
                  )}
                  <div className="tenant-id">ID: {tenant.id}</div>
                  <div className="tenant-stats">
                    <span className="stat">
                      <strong>{stats.userCount || 0}</strong> Users
                    </span>
                    <span className="stat">
                      <strong>{stats.clientCount || 0}</strong> Clients
                    </span>
                  </div>
                  <div className="tenant-settings">
                    <span>Currency: {tenant.settings?.currencySymbol || 'R'}</span>
                    <span>
                      FY: {tenant.settings?.financialYearStart || 'March'} - {tenant.settings?.financialYearEnd || 'February'}
                    </span>
                  </div>
                </div>
                <div className="tenant-actions">
                  <Link to={`/tenants/${tenant.id}/users`} className="view-users-btn">
                    Manage Users
                  </Link>
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(tenant)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteTenant(tenant)}
                    disabled={stats.userCount > 0 || stats.clientCount > 0}
                    title={stats.userCount > 0 || stats.clientCount > 0 ? 'Cannot delete tenant with users or clients' : 'Delete tenant'}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {tenants.length === 0 && !showCreateForm && (
          <div className="empty-state">
            <p>No tenants found. Create your first tenant to get started.</p>
          </div>
        )}
      </div>

      <div className="info-section">
        <h3>About Multi-Tenancy</h3>
        <ul>
          <li>Each tenant is a separate organization with isolated data.</li>
          <li>Users belong to one tenant and can only see that tenant's data.</li>
          <li>System admins can manage all tenants and switch between them.</li>
          <li>Tenant settings (currency, financial year) apply to all users in that tenant.</li>
        </ul>
      </div>
    </div>
  )
}

export default TenantManagement
