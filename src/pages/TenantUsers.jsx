import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getTenant, getTenantUsers, assignUserToTenant, removeUserFromTenant } from '../services/tenantService'
import { getUsers } from '../services/userService'
import { getRoles } from '../services/roleService'
import { createUserAccount, sendPasswordReset } from '../services/userInvitationService'
import { useTenant } from '../context/TenantContext'
import './TenantUsers.css'

const TenantUsers = () => {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useTenant()
  const [tenant, setTenant] = useState(null)
  const [users, setUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('salesperson')
  const [saving, setSaving] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    role: 'salesperson'
  })

  // CSV Upload state
  const [csvData, setCsvData] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [csvDefaultPassword, setCsvDefaultPassword] = useState('')
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, results: [] })
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tenantData, tenantUsers, allUsersData, rolesData] = await Promise.all([
        getTenant(tenantId),
        getTenantUsers(tenantId),
        getUsers(),
        getRoles()
      ])

      if (!tenantData) {
        navigate('/tenants')
        return
      }

      setTenant(tenantData)
      setUsers(tenantUsers)
      setAllUsers(allUsersData)
      setRoles(rolesData.filter(r => !r.deleted))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get users that are not already in this tenant
  const availableUsers = allUsers.filter(u =>
    !u.tenantId || u.tenantId !== tenantId
  )

  const handleAddUser = async () => {
    if (!selectedUserId) {
      alert('Please select a user')
      return
    }

    setSaving(true)
    try {
      await assignUserToTenant(selectedUserId, tenantId, selectedRole)
      setShowAddUser(false)
      setSelectedUserId('')
      setSelectedRole('salesperson')
      await loadData()
    } catch (error) {
      alert('Error adding user: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUser = async (userId, userName) => {
    if (!confirm(`Remove "${userName}" from this tenant? They will lose access to all tenant data.`)) {
      return
    }

    try {
      await removeUserFromTenant(userId)
      await loadData()
    } catch (error) {
      alert('Error removing user: ' + error.message)
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      await assignUserToTenant(userId, tenantId, newRole)
      await loadData()
    } catch (error) {
      alert('Error updating role: ' + error.message)
    }
  }

  const handleCreateUser = async (e) => {
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

    setSaving(true)
    try {
      await createUserAccount({
        email: newUserForm.email,
        password: newUserForm.password,
        displayName: newUserForm.displayName,
        role: newUserForm.role,
        tenantId: tenantId,
        isSystemAdmin: false
      }, currentUser?.uid)

      alert(`User ${newUserForm.email} created successfully! They can now log in with the password you set.`)
      setShowCreateUser(false)
      setNewUserForm({
        email: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        role: 'salesperson'
      })
      loadData()
    } catch (error) {
      console.error('Error creating user:', error)
      alert(error.message || 'Failed to create user')
    } finally {
      setSaving(false)
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

    // Expected format: email, displayName (optional), password (optional), role (optional)
    // First line can be header
    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
      const email = parts[0]
      const displayName = parts[1] || ''
      const password = parts[2] || '' // Optional password column
      const role = parts[3] || '' // Optional role column

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email "${email}"`)
        continue
      }

      // Validate password if provided
      if (password && password.length < 6) {
        errors.push(`Row ${i + 1}: Password must be at least 6 characters for "${email}"`)
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
        password: password || '',
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

    // Check if any user is missing a password and no default is set
    const usersWithoutPassword = csvData.filter(u => !u.password)
    if (usersWithoutPassword.length > 0 && !csvDefaultPassword) {
      alert(`${usersWithoutPassword.length} user(s) don't have a password in the CSV. Please set a default password.`)
      return
    }

    if (csvDefaultPassword && csvDefaultPassword.length < 6) {
      alert('Default password must be at least 6 characters')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: csvData.length, results: [] })

    const results = []
    for (let i = 0; i < csvData.length; i++) {
      const user = csvData[i]
      setUploadProgress(prev => ({ ...prev, current: i + 1 }))

      // Use per-user password if provided, otherwise fall back to default
      const userPassword = user.password || csvDefaultPassword

      // Get role from CSV (required field)
      // Match by role id or name (case-insensitive)
      const matchedRole = roles.find(r => r.id === user.role || r.name.toLowerCase() === user.role.toLowerCase())
      const userRole = matchedRole ? matchedRole.id : user.role

      try {
        await createUserAccount({
          email: user.email,
          password: userPassword,
          displayName: user.displayName,
          role: userRole,
          tenantId: tenantId,
          isSystemAdmin: false
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
      alert(`Successfully created ${successCount} users!`)
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
    setUploadProgress({ current: 0, total: 0, results: [] })
    setShowCsvUpload(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="tenant-users">
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <div className="tenant-users">
      <div className="page-header">
        <div className="header-breadcrumb">
          <Link to="/tenants" className="back-link">← Back to Tenants</Link>
          <h1>{tenant?.name} - Users</h1>
        </div>
        <p className="page-description">
          Manage users for this tenant. Users can only access data within their assigned tenant.
        </p>
      </div>

      <div className="users-container">
        <div className="users-header">
          <h2>Tenant Users ({users.length})</h2>
          <div className="header-buttons">
            <button
              className="invite-user-btn"
              onClick={() => setShowCreateUser(true)}
            >
              + Create New User
            </button>
            <button
              className="csv-upload-btn"
              onClick={() => setShowCsvUpload(true)}
            >
              Upload CSV
            </button>
            <button
              className="add-user-btn"
              onClick={() => setShowAddUser(true)}
            >
              + Add Existing User
            </button>
          </div>
        </div>

        {showAddUser && (
          <div className="add-user-form">
            <h3>Add User to Tenant</h3>
            {availableUsers.length === 0 ? (
              <p className="no-users-message">
                All users are already assigned to tenants. Create new users in Firebase Authentication first.
              </p>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">-- Select a user --</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.displayName || user.email} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowAddUser(false)
                      setSelectedUserId('')
                      setSelectedRole('salesperson')
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleAddUser}
                    disabled={saving || !selectedUserId}
                  >
                    {saving ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {showCreateUser && (
          <div className="invite-user-form">
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={newUserForm.displayName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input
                    type="password"
                    value={newUserForm.confirmPassword}
                    onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
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
              <p className="form-hint">
                The user will be created immediately and can log in with the email and password you set.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowCreateUser(false)
                    setNewUserForm({
                      email: '',
                      displayName: '',
                      password: '',
                      confirmPassword: '',
                      role: 'salesperson'
                    })
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {showCsvUpload && (
          <div className="csv-upload-form">
            <h3>Bulk Upload Users via CSV</h3>
            <p className="form-hint">
              Upload a CSV file with columns: <strong>email</strong>, <strong>displayName</strong> (optional), <strong>password</strong> (optional), <strong>role</strong>.
              If password is not provided in the CSV, the default password below will be used.
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
              <label>Default Password (for users without password in CSV)</label>
              <input
                type="password"
                value={csvDefaultPassword}
                onChange={(e) => setCsvDefaultPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <span className="form-field-hint">
                {csvData.length > 0 && `${csvData.filter(u => !u.password).length} of ${csvData.length} users will use this password`}
              </span>
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
                        <th>Password</th>
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
                              {user.password ? (
                                <span className="password-set">Set in CSV</span>
                              ) : (
                                <span className="password-default">Using default</span>
                              )}
                            </td>
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
                className="save-btn"
                onClick={handleCsvUpload}
                disabled={isUploading || csvData.length === 0 || !csvDefaultPassword}
              >
                {isUploading ? `Creating Users...` : `Create ${csvData.length} Users`}
              </button>
            </div>
          </div>
        )}

        <div className="users-list">
          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users in this tenant yet. Add users to give them access.</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <div className="user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} />
                    ) : (
                      <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{user.displayName || 'No name'}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-meta">
                      <span className="user-id">ID: {user.id.substring(0, 8)}...</span>
                      {user.lastLogin && (
                        <span className="user-login">
                          Last login: {user.lastLogin.toDate?.().toLocaleDateString() || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="user-actions">
                  <div className="role-select">
                    <label>Role:</label>
                    <select
                      value={user.role || 'salesperson'}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveUser(user.id, user.displayName || user.email)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="info-section">
        <h3>About Tenant Users</h3>
        <ul>
          <li>Users must be assigned to a tenant to access the system.</li>
          <li>Each user can only belong to one tenant at a time.</li>
          <li>The role determines what permissions the user has within the tenant.</li>
          <li>Removing a user from a tenant revokes their access to all tenant data.</li>
        </ul>
      </div>
    </div>
  )
}

export default TenantUsers
