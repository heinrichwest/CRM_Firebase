import React, { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getUsersByTenant, updateUserRole, getManagersInTenant, assignSalespersonToManager, removeSalespersonFromManager } from '../services/userService'
import { getRoles, SYSTEM_FEATURES, getFeatureCategories } from '../services/roleService'
import { createUserAccount, sendPasswordReset } from '../services/userInvitationService'
import { getTenants } from '../services/tenantService'
import { useTenant } from '../context/TenantContext'
import './UserManagement.css'

const UserManagement = () => {
  const { getTenantId, isSystemAdmin, currentUser } = useTenant()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [managers, setManagers] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
  const [selectedUser, setSelectedUser] = useState(null)
  const [userPermissions, setUserPermissions] = useState({})
  const [savingHierarchy, setSavingHierarchy] = useState(null) // userId being saved

  // Tenant filter state (system admin only)
  const [tenantFilter, setTenantFilter] = useState('all')

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    role: 'salesperson',
    tenantId: '',
    isSystemAdmin: false
  })

  // CSV Upload state
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvData, setCsvData] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [csvDefaultPassword, setCsvDefaultPassword] = useState('')
  const [csvRequirePasswordChange, setCsvRequirePasswordChange] = useState(true) // New: require password change on first login
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, results: [] })
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const tenantId = getTenantId()

  useEffect(() => {
    loadData()
  }, [isSystemAdmin])

  const loadData = async () => {
    try {
      // For system admin, get all users; for tenant admin, filter by their tenant
      const filterTenantId = isSystemAdmin ? null : tenantId
      const [usersData, rolesData] = await Promise.all([
        getUsersByTenant(filterTenantId),
        getRoles()
      ])

      setUsers(usersData)
      setRoles(rolesData.filter(r => !r.deleted))

      // Load managers (tenantId is optional - if not provided, returns all managers)
      try {
        const managersData = await getManagersInTenant(tenantId)
        setManagers(managersData)
      } catch (err) {
        console.error('Error loading managers:', err)
      }

      // Load tenants for system admin
      if (isSystemAdmin) {
        try {
          const tenantsData = await getTenants()
          setTenants(tenantsData)
        } catch (err) {
          console.error('Error loading tenants:', err)
        }
      }

      // Load user permissions (stored in user documents)
      const permissionsMap = {}
      usersData.forEach(user => {
        if (user.customPermissions) {
          permissionsMap[user.id] = user.customPermissions
        }
      })
      setUserPermissions(permissionsMap)

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUserForm.email) {
      alert('Email is required')
      return
    }
    if (!newUserForm.password) {
      alert('Password is required')
      return
    }
    if (newUserForm.password.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    if (newUserForm.password !== newUserForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setAddingUser(true)
    try {
      await createUserAccount({
        email: newUserForm.email,
        password: newUserForm.password,
        displayName: newUserForm.displayName,
        role: newUserForm.role,
        tenantId: isSystemAdmin ? newUserForm.tenantId : tenantId,
        isSystemAdmin: newUserForm.isSystemAdmin
      }, currentUser?.uid)

      alert(`User ${newUserForm.email} created successfully! They can now log in with the password you set.`)
      setShowAddUserModal(false)
      setNewUserForm({
        email: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        role: 'salesperson',
        tenantId: '',
        isSystemAdmin: false
      })
      loadData()
    } catch (error) {
      console.error('Error adding user:', error)
      alert(error.message || 'Failed to create user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleSendPasswordReset = async (email) => {
    try {
      await sendPasswordReset(email)
      alert(`Password reset email sent to ${email}`)
    } catch (error) {
      console.error('Error sending password reset:', error)
      alert('Failed to send password reset email')
    }
  }

  // CSV Upload Functions
  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      parseCsvData(text)
    }
    reader.readAsText(file)
  }

  const parseCsvData = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    const errors = []
    const data = []

    // Expected format: email, displayName (optional), role (required)
    // Password is NOT included in CSV - use default password field instead
    // First line can be header
    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
      const email = parts[0]
      const displayName = parts[1] || ''
      const role = parts[2] || '' // Role is now in column 3 (no password column)

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email "${email}"`)
        continue
      }

      // Validate role (required)
      if (!role) {
        errors.push(`Row ${i + 1}: Role is required for "${email}". Valid roles: ${roles.map(r => r.id).join(', ')}`)
        continue
      }

      if (roles.length > 0) {
        const validRole = roles.find(r => r.id === role || r.name.toLowerCase() === role.toLowerCase())
        if (!validRole) {
          errors.push(`Row ${i + 1}: Invalid role "${role}" for "${email}". Valid roles: ${roles.map(r => r.id).join(', ')}`)
          continue
        }
      }

      data.push({
        email,
        displayName: displayName || email.split('@')[0],
        role: role || '', // Store role from CSV
        row: i + 1
      })
    }

    setCsvData(data)
    setCsvErrors(errors)
  }

  const handleCsvUpload = async () => {
    if (csvData.length === 0) {
      alert('No valid users to upload')
      return
    }

    // Default password is required for CSV upload
    if (!csvDefaultPassword) {
      alert('Please set a default password for all users.')
      return
    }

    if (csvDefaultPassword.length < 6) {
      alert('Default password must be at least 6 characters')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: csvData.length, results: [] })

    const results = []
    for (let i = 0; i < csvData.length; i++) {
      const user = csvData[i]
      setUploadProgress(prev => ({ ...prev, current: i + 1 }))

      // Get role from CSV (required field)
      // Match by role id or name (case-insensitive)
      const matchedRole = roles.find(r => r.id === user.role || r.name.toLowerCase() === user.role.toLowerCase())
      const userRole = matchedRole ? matchedRole.id : user.role

      try {
        await createUserAccount({
          email: user.email,
          password: csvDefaultPassword, // Always use default password
          displayName: user.displayName,
          role: userRole,
          tenantId: isSystemAdmin ? null : tenantId, // Tenant admins assign to their tenant
          isSystemAdmin: false,
          requirePasswordChange: csvRequirePasswordChange // Flag to enforce password change on first login
        }, currentUser?.uid)

        results.push({ email: user.email, success: true })
      } catch (error) {
        results.push({ email: user.email, success: false, error: error.message })
      }
    }

    setUploadProgress(prev => ({ ...prev, results }))
    setIsUploading(false)

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    if (failCount === 0) {
      alert(`Successfully created ${successCount} users!${csvRequirePasswordChange ? ' Users will be prompted to change their password on first login.' : ''}`)
      resetCsvUpload()
      loadData()
    } else {
      alert(`Created ${successCount} users. ${failCount} failed. Check the results below.`)
    }
  }

  const resetCsvUpload = () => {
    setCsvData([])
    setCsvErrors([])
    setCsvDefaultPassword('')
    setCsvRequirePasswordChange(true) // Reset to default
    setUploadProgress({ current: 0, total: 0, results: [] })
    setShowCsvUpload(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      await updateUserRole(userId, newRoleId)
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRoleId } : u))
      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role. Please try again.')
    }
  }

  const handleManagerChange = async (userId, managerId) => {
    setSavingHierarchy(userId)
    try {
      if (managerId) {
        await assignSalespersonToManager(userId, managerId)
        setUsers(users.map(u => u.id === userId ? { ...u, managerId } : u))
      } else {
        await removeSalespersonFromManager(userId)
        setUsers(users.map(u => u.id === userId ? { ...u, managerId: null } : u))
      }
      // Reload managers list in case team structure changed
      const managersData = await getManagersInTenant(tenantId)
      setManagers(managersData)
    } catch (error) {
      console.error('Error updating manager:', error)
      alert('Failed to update manager assignment. Please try again.')
    } finally {
      setSavingHierarchy(null)
    }
  }

  const getManagerName = (managerId) => {
    if (!managerId) return 'Unassigned'
    const manager = users.find(u => u.id === managerId)
    return manager?.displayName || manager?.email || 'Unknown'
  }

  // Get valid managers for a user based on role hierarchy
  // Salesperson -> Manager, Manager -> Group Sales Manager
  const getValidManagersForUser = (user) => {
    if (!user) return []
    const userTenantId = user.tenantId
    const userRole = user.role || 'salesperson'

    // Filter users from same tenant
    const tenantUsers = users.filter(u => u.tenantId === userTenantId && u.id !== user.id)

    if (userRole === 'salesperson') {
      // Salespeople can have Managers as their manager
      return tenantUsers.filter(u => u.role === 'manager')
    } else if (userRole === 'manager') {
      // Managers can have Group Sales Managers as their manager
      return tenantUsers.filter(u => u.role === 'group-sales-manager')
    }
    // Group Sales Managers and others have no manager in hierarchy
    return []
  }

  const getTenantName = (userTenantId) => {
    if (!userTenantId) return 'Unassigned'
    const tenant = tenants.find(t => t.id === userTenantId)
    return tenant?.name || userTenantId
  }

  // Filter users by tenant
  // - System admins see all users (with optional filter)
  // - Tenant admins only see their own tenant's users
  const filteredUsers = (() => {
    if (isSystemAdmin) {
      // System admin with filter
      if (tenantFilter !== 'all') {
        return users.filter(u => {
          if (tenantFilter === 'unassigned') return !u.tenantId
          return u.tenantId === tenantFilter
        })
      }
      // System admin without filter - see all
      return users
    } else {
      // Tenant admin - only see their own tenant's users
      return users.filter(u => u.tenantId === tenantId)
    }
  })()

  const handlePermissionToggle = async (userId, permissionId) => {
    try {
      const currentPermissions = userPermissions[userId] || []
      const newPermissions = currentPermissions.includes(permissionId)
        ? currentPermissions.filter(p => p !== permissionId)
        : [...currentPermissions, permissionId]

      // Update in Firestore
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        customPermissions: newPermissions,
        updatedAt: serverTimestamp()
      })

      setUserPermissions({
        ...userPermissions,
        [userId]: newPermissions
      })
    } catch (error) {
      console.error('Error updating user permissions:', error)
      alert('Failed to update permissions. Please try again.')
    }
  }

  const getUserEffectivePermissions = (user) => {
    // If user has custom permissions, use those
    if (userPermissions[user.id] && userPermissions[user.id].length > 0) {
      return userPermissions[user.id]
    }
    
    // Otherwise, use role permissions
    const userRole = roles.find(r => r.id === (user.role || 'salesperson'))
    return userRole?.permissions || []
  }

  const hasPermission = (user, permissionId) => {
    return getUserEffectivePermissions(user).includes(permissionId)
  }

  if (loading) {
    return (
      <div className="user-management">
        <h1>User Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <div className="header-actions">
          {isSystemAdmin && (
            <div className="tenant-filter">
              <label htmlFor="tenantFilter">Filter by Tenant:</label>
              <select
                id="tenantFilter"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="tenant-filter-select"
              >
                <option value="all">All Tenants ({users.length})</option>
                <option value="unassigned">Unassigned ({users.filter(u => !u.tenantId).length})</option>
                {tenants.map(tenant => {
                  const count = users.filter(u => u.tenantId === tenant.id).length
                  return (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name || tenant.id} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          )}
          <button
            className="add-user-btn"
            onClick={() => setShowAddUserModal(true)}
          >
            + Add User
          </button>
          <button
            className="csv-upload-btn"
            onClick={() => setShowCsvUpload(true)}
          >
            Upload CSV
          </button>
          <div className="view-mode-toggle">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </button>
          </div>
        </div>
      </div>

      {/* CSV Upload Form */}
      {showCsvUpload && (
        <div className="csv-upload-form">
          <h3>Bulk Upload Users via CSV</h3>
          <p className="form-hint">
            Upload a CSV file with columns: <strong>email</strong>, <strong>displayName</strong> (optional), <strong>role</strong>.
            All users will use the default password you set below.
            {!isSystemAdmin && <span> Users will be automatically assigned to your tenant.</span>}
          </p>

          <div className="form-group">
            <label>CSV File</label>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleCsvFileSelect}
              className="file-input"
            />
          </div>

          <div className="form-group">
            <label>Default Password (required for all users) *</label>
            <input
              type="password"
              value={csvDefaultPassword}
              onChange={(e) => setCsvDefaultPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={csvRequirePasswordChange}
                onChange={(e) => setCsvRequirePasswordChange(e.target.checked)}
              />
              Require password change on first login
            </label>
            <span className="hint-text">Users will be prompted to set a new password when they first log in</span>
          </div>

          {csvErrors.length > 0 && (
            <div className="csv-errors">
              <strong>Validation Errors:</strong>
              <ul>
                {csvErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {csvData.length > 0 && (
            <div className="csv-preview">
              <h4>Preview ({csvData.length} users to create)</h4>
              <div className="csv-table-wrapper">
                <table className="csv-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Email</th>
                      <th>Display Name</th>
                      <th>Role</th>
                      {uploadProgress.results.length > 0 && <th>Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((user, index) => {
                      const result = uploadProgress.results.find(r => r.email === user.email)
                      const matchedRole = user.role ? roles.find(r => r.id === user.role || r.name.toLowerCase() === user.role.toLowerCase()) : null
                      return (
                        <tr key={index} className={result ? (result.success ? 'success-row' : 'error-row') : ''}>
                          <td>{user.row}</td>
                          <td>{user.email}</td>
                          <td>{user.displayName}</td>
                          <td>
                            {matchedRole ? (
                              <span className="role-set">{matchedRole.name}</span>
                            ) : (
                              <span className="status-error">Missing</span>
                            )}
                          </td>
                          {uploadProgress.results.length > 0 && (
                            <td>
                              {result ? (
                                result.success ? (
                                  <span className="status-success">Created</span>
                                ) : (
                                  <span className="status-error" title={result.error}>Failed</span>
                                )
                              ) : (
                                <span className="status-pending">Pending</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
              <span>Processing {uploadProgress.current} of {uploadProgress.total}...</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={resetCsvUpload}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={handleCsvUpload}
              disabled={isUploading || csvData.length === 0}
            >
              {isUploading ? `Creating Users...` : `Create ${csvData.length} Users`}
            </button>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="users-list-view">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                {isSystemAdmin && <th>Tenant</th>}
                <th>Role</th>
                <th>Manager</th>
                <th>Custom Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const effectivePermissions = getUserEffectivePermissions(user)
                const hasCustomPermissions = userPermissions[user.id] && userPermissions[user.id].length > 0
                
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || user.email} className="user-avatar-small" />
                        ) : (
                          <div className="user-avatar-small placeholder">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{user.displayName || user.email || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    {isSystemAdmin && (
                      <td>
                        <span className={`tenant-badge ${user.tenantId ? '' : 'unassigned'}`}>
                          {getTenantName(user.tenantId)}
                        </span>
                      </td>
                    )}
                    <td>
                      <select
                        value={user.role || 'salesperson'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {(user.role === 'salesperson' || user.role === 'manager') ? (
                        <select
                          value={user.managerId || ''}
                          onChange={(e) => handleManagerChange(user.id, e.target.value)}
                          className="manager-select"
                          disabled={savingHierarchy === user.id}
                        >
                          <option value="">No Manager</option>
                          {getValidManagersForUser(user).map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.displayName || manager.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="no-manager-text">N/A</span>
                      )}
                    </td>
                    <td>
                      {hasCustomPermissions ? (
                        <span className="custom-permissions-badge">
                          {userPermissions[user.id].length} custom permission(s)
                        </span>
                      ) : (
                        <span className="role-permissions-badge">Using role permissions</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="edit-permissions-btn"
                        onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                      >
                        {selectedUser?.id === user.id ? 'Hide' : 'Edit'} Permissions
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Permission Editor for Selected User */}
          {selectedUser && (
            <div className="permission-editor">
              <div className="editor-header">
                <h2>Edit Permissions for {selectedUser.displayName || selectedUser.email}</h2>
                <button
                  className="close-editor-btn"
                  onClick={() => setSelectedUser(null)}
                >
                  ×
                </button>
              </div>
              <div className="editor-content">
                <p className="editor-info">
                  <strong>Current Role:</strong> {roles.find(r => r.id === (selectedUser.role || 'salesperson'))?.name || 'Salesperson'}
                </p>
                <p className="editor-info">
                  Custom permissions override role permissions. Uncheck all to use role permissions only.
                </p>
                <div className="permissions-container">
                  {getFeatureCategories().map(category => {
                    const categoryFeatures = SYSTEM_FEATURES.filter(f => f.category === category)
                    return (
                      <div key={category} className="permission-category">
                        <h3 className="category-heading">{category}</h3>
                        <div className="permissions-grid">
                          {categoryFeatures.map(feature => {
                            const hasPerm = hasPermission(selectedUser, feature.id)
                            const isCustom = userPermissions[selectedUser.id]?.includes(feature.id)
                            
                            return (
                              <label key={feature.id} className="permission-item">
                                <input
                                  type="checkbox"
                                  checked={hasPerm}
                                  onChange={() => handlePermissionToggle(selectedUser.id, feature.id)}
                                />
                                <span className="permission-name">{feature.name}</span>
                                {isCustom && <span className="custom-indicator">(Custom)</span>}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="editor-actions">
                  <button
                    className="clear-custom-btn"
                    onClick={async () => {
                      try {
                        const userRef = doc(db, 'users', selectedUser.id)
                        await updateDoc(userRef, {
                          customPermissions: [],
                          updatedAt: serverTimestamp()
                        })
                        setUserPermissions({
                          ...userPermissions,
                          [selectedUser.id]: []
                        })
                        alert('Custom permissions cleared. User will use role permissions.')
                      } catch (error) {
                        console.error('Error clearing permissions:', error)
                        alert('Failed to clear permissions.')
                      }
                    }}
                  >
                    Clear Custom Permissions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="users-grid-view">
          <div className="grid-container">
            <table className="permissions-grid-table">
              <thead>
                <tr>
                  <th className="feature-column">Features</th>
                  {filteredUsers.map(user => (
                    <th key={user.id} className="user-column">
                      <div className="user-header">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || user.email} className="user-avatar-tiny" />
                        ) : (
                          <div className="user-avatar-tiny placeholder">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="user-header-info">
                          <div className="user-name-small">{user.displayName || user.email || 'Unknown'}</div>
                          <div className="user-role-small">
                            {roles.find(r => r.id === (user.role || 'salesperson'))?.name || 'Salesperson'}
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getFeatureCategories().map(category => {
                  const categoryFeatures = SYSTEM_FEATURES.filter(f => f.category === category)
                  return (
                    <React.Fragment key={category}>
                      <tr className="category-row">
                        <td colSpan={filteredUsers.length + 1} className="category-header-cell">
                          <strong>{category}</strong>
                        </td>
                      </tr>
                      {categoryFeatures.map(feature => (
                        <tr key={feature.id}>
                          <td className="feature-name-cell">{feature.name}</td>
                          {filteredUsers.map(user => (
                            <td key={user.id} className="permission-checkbox-cell">
                              <input
                                type="checkbox"
                                checked={hasPermission(user, feature.id)}
                                onChange={() => handlePermissionToggle(user.id, feature.id)}
                                title={`${feature.name} for ${user.displayName || user.email}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="add-user-modal">
            <div className="modal-header">
              <h2>Create New User</h2>
              <button
                className="close-modal-btn"
                onClick={() => {
                  setShowAddUserModal(false)
                  setNewUserForm({
                    email: '',
                    displayName: '',
                    password: '',
                    confirmPassword: '',
                    role: 'salesperson',
                    tenantId: '',
                    isSystemAdmin: false
                  })
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="add-user-form">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={newUserForm.confirmPassword}
                  onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                />
              </div>

              {isSystemAdmin && (
                <div className="form-group">
                  <label htmlFor="tenantId">Tenant *</label>
                  <select
                    id="tenantId"
                    value={newUserForm.tenantId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, tenantId: e.target.value })}
                    required
                  >
                    <option value="">Select a tenant...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name || tenant.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                >
                  {roles.length === 0 ? (
                    <option value="salesperson">Salesperson</option>
                  ) : (
                    roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {isSystemAdmin && (
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newUserForm.isSystemAdmin}
                      onChange={(e) => setNewUserForm({ ...newUserForm, isSystemAdmin: e.target.checked })}
                    />
                    Grant System Admin Access
                  </label>
                  <span className="hint-text">System admins can manage all tenants and system settings</span>
                </div>
              )}

              <div className="form-info">
                <p>The user will be created immediately and can log in with the email and password you set.</p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddUserModal(false)
                    setNewUserForm({
                      email: '',
                      displayName: '',
                      password: '',
                      confirmPassword: '',
                      role: 'salesperson',
                      tenantId: '',
                      isSystemAdmin: false
                    })
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={addingUser}
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement

