import React, { useState, useEffect } from 'react'
import { getRoles, saveRole, deleteRole, SYSTEM_FEATURES, getFeatureCategories, initializeDefaultRoles } from '../services/roleService'
import { getUsers, updateUserRole } from '../services/userService'
import './RoleManagement.css'

const RoleManagement = () => {
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRole, setShowAddRole] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Initialize default roles if needed
      await initializeDefaultRoles()
      
      const [rolesData, usersData] = await Promise.all([
        getRoles(),
        getUsers()
      ])
      
      setRoles(rolesData.filter(r => !r.deleted))
      setUsers(usersData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const handleTogglePermission = (roleId, permissionId) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return

    const updatedPermissions = role.permissions?.includes(permissionId)
      ? role.permissions.filter(p => p !== permissionId)
      : [...(role.permissions || []), permissionId]

    const updatedRoles = roles.map(r =>
      r.id === roleId ? { ...r, permissions: updatedPermissions } : r
    )
    setRoles(updatedRoles)

    // If editing, update the editing role
    if (editingRole?.id === roleId) {
      setEditingRole({ ...editingRole, permissions: updatedPermissions })
    }
  }

  const handleSaveRole = async (roleId) => {
    try {
      const role = roles.find(r => r.id === roleId)
      if (!role) return

      await saveRole(roleId, {
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      })

      alert('Role updated successfully!')
      loadData()
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Failed to save role. Please try again.')
    }
  }

  const handleSaveAllRoles = async () => {
    try {
      await Promise.all(
        roles.map(role =>
          saveRole(role.id, {
            name: role.name,
            description: role.description || '',
            permissions: role.permissions || []
          })
        )
      )

      alert('All role changes saved successfully!')
      loadData()
    } catch (error) {
      console.error('Error saving all roles:', error)
      alert('Failed to save all roles. Please try again.')
    }
  }

  const handleCreateRole = async () => {
    try {
      if (!newRole.name.trim()) {
        alert('Please enter a role name')
        return
      }

      const roleId = newRole.name.toLowerCase().replace(/\s+/g, '-')
      
      await saveRole(roleId, {
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions
      })

      setNewRole({ name: '', description: '', permissions: [] })
      setShowAddRole(false)
      loadData()
      alert('Role created successfully!')
    } catch (error) {
      console.error('Error creating role:', error)
      alert('Failed to create role. Please try again.')
    }
  }

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) {
      return
    }

    try {
      await deleteRole(roleId)
      loadData()
      alert('Role deleted successfully!')
    } catch (error) {
      console.error('Error deleting role:', error)
      alert(error.message || 'Failed to delete role. Please try again.')
    }
  }

  const handleEditRole = (role) => {
    setEditingRole(role)
  }

  const handleCancelEdit = () => {
    setEditingRole(null)
    loadData()
  }

  const handleUpdateUserRole = async (userId, newRoleId) => {
    try {
      await updateUserRole(userId, newRoleId)
      loadData()
      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="role-management">
        <h1>Role Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="role-management">
      <div className="role-management-header">
        <h1>Role Management</h1>
        <button 
          className="add-role-btn"
          onClick={() => setShowAddRole(true)}
        >
          + Add New Role
        </button>
      </div>

      {/* Add New Role Form */}
      {showAddRole && (
        <div className="add-role-form">
          <div className="form-header">
            <h2>Create New Role</h2>
            <button 
              className="close-btn"
              onClick={() => {
                setShowAddRole(false)
                setNewRole({ name: '', description: '', permissions: [] })
              }}
            >
              ×
            </button>
          </div>
          <div className="form-content">
            <div className="form-group">
              <label>Role Name *</label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g., Account Manager"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="3"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Describe the role's responsibilities..."
              />
            </div>
            <div className="form-group">
              <label>Permissions</label>
              <div className="permissions-container">
                {getFeatureCategories().map(category => {
                  const categoryFeatures = SYSTEM_FEATURES.filter(f => f.category === category)
                  return (
                    <div key={category} className="permission-category">
                      <h4 className="category-heading-small">{category}</h4>
                      <div className="permissions-list">
                        {categoryFeatures.map(feature => (
                          <label key={feature.id} className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={newRole.permissions.includes(feature.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewRole({
                                    ...newRole,
                                    permissions: [...newRole.permissions, feature.id]
                                  })
                                } else {
                                  setNewRole({
                                    ...newRole,
                                    permissions: newRole.permissions.filter(p => p !== feature.id)
                                  })
                                }
                              }}
                            />
                            <span>{feature.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowAddRole(false)
                  setNewRole({ name: '', description: '', permissions: [] })
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="save-btn"
                onClick={handleCreateRole}
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Grid */}
      <div className="role-grid-container">
        <table className="role-permissions-grid">
          <thead>
            <tr>
              <th className="feature-column">System Features</th>
              {roles.map(role => (
                <th key={role.id} className="role-column">
                  <div className="role-header">
                    <div>
                      <strong>{role.name}</strong>
                      {role.description && (
                        <div className="role-description">{role.description}</div>
                      )}
                    </div>
                    <div className="role-actions">
                      {editingRole?.id === role.id ? (
                        <>
                          <button
                            className="save-role-btn"
                            onClick={() => handleSaveRole(role.id)}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-role-btn"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="edit-role-btn"
                            onClick={() => handleEditRole(role)}
                          >
                            Edit
                          </button>
                          {!['admin', 'accountant', 'salesperson', 'manager'].includes(role.id) && (
                            <button
                              className="delete-role-btn"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
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
                    <td className="category-header-cell feature-column">
                      <strong>{category}</strong>
                    </td>
                    <td colSpan={roles.length} className="category-header-cell">
                      <strong>{category}</strong>
                    </td>
                  </tr>
                  {categoryFeatures.map(feature => (
                    <tr key={feature.id}>
                      <td className="feature-name">{feature.name}</td>
                      {roles.map(role => (
                        <td key={role.id} className="permission-cell">
                          <input
                            type="checkbox"
                            checked={role.permissions?.includes(feature.id) || false}
                            onChange={() => handleTogglePermission(role.id, feature.id)}
                            disabled={editingRole?.id !== role.id && editingRole !== null}
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
        <div className="role-grid-actions">
          <button
            type="button"
            className="save-all-roles-btn"
            onClick={handleSaveAllRoles}
          >
            Save All Changes
          </button>
        </div>
      </div>

      {/* User Role Assignment */}
      <div className="user-roles-section">
        <h2>User Role Assignment</h2>
        <table className="user-roles-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.displayName || user.email || 'Unknown'}</td>
                <td>{user.email || 'N/A'}</td>
                <td>
                  <span className="current-role">
                    {roles.find(r => r.id === (user.role || 'salesperson'))?.name || 'Salesperson'}
                  </span>
                </td>
                <td>
                  <select
                    value={user.role || 'salesperson'}
                    onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RoleManagement

