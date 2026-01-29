import { useState, useEffect } from 'react'
import { getUserData, createOrUpdateUser } from '../services/userService'
import { useTenant } from '../context/TenantContext'
import './Profile.css'

const Profile = () => {
  const { currentUser } = useTenant()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [managerData, setManagerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    title: '',
    department: '',
    bio: ''
  })

  useEffect(() => {
    loadUserProfile()
  }, [currentUser])

  const loadUserProfile = async () => {
    try {
      if (currentUser) {
        setUser(currentUser)
        setFormData({
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          phone: '',
          title: '',
          department: '',
          bio: ''
        })

        // Load additional user data from API
        const data = await getUserData(currentUser.uid)
        if (data) {
          setUserData(data)
          setFormData(prev => ({
            ...prev,
            phone: data.phone || '',
            title: data.title || '',
            department: data.department || '',
            bio: data.bio || ''
          }))

          // Load manager data if user has a manager
          if (data.managerId) {
            const manager = await getUserData(data.managerId)
            setManagerData(manager)
          } else {
            setManagerData(null)
          }
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (currentUser) {
        // Update user document via API
        await createOrUpdateUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: formData.displayName,
          phone: formData.phone,
          title: formData.title,
          department: formData.department,
          bio: formData.bio
        })

        setEditing(false)
        loadUserProfile()
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="profile">
        <h1>Profile</h1>
        <div className="profile-content">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile">
        <h1>Profile</h1>
        <div className="profile-content">
          <p>No user logged in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>My Profile</h1>
        {!editing && (
          <button
            className="edit-profile-btn"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        {editing ? (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-section">
              <h2>Personal Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email cannot be changed</small>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 12 345 6789"
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Sales Manager"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, Operations"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  rows="4"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setEditing(false)
                  loadUserProfile()
                }}
              >
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-view">
            <div className="profile-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} />
              ) : (
                <div className="avatar-placeholder">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-info">
              <div className="info-section">
                <h2>Personal Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Display Name</span>
                    <span className="info-value">{user.displayName || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{formData.phone || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Title</span>
                    <span className="info-value">{formData.title || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Department</span>
                    <span className="info-value">{formData.department || 'Not set'}</span>
                  </div>
                  {formData.bio && (
                    <div className="info-item full-width">
                      <span className="info-label">Bio</span>
                      <span className="info-value">{formData.bio}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-section">
                <h2>Account Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Role</span>
                    <span className="info-value">
                      {userData?.role ? (
                        <span className="role-badge">{userData.role}</span>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Manager</span>
                    <span className="info-value">
                      {managerData ? (
                        <span>{managerData.displayName || managerData.email}</span>
                      ) : 'No manager assigned'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">User ID</span>
                    <span className="info-value small">{user.uid}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Provider</span>
                    <span className="info-value">Email/Password</span>
                  </div>
                  {userData?.createdAt && (
                    <div className="info-item">
                      <span className="info-label">Member Since</span>
                      <span className="info-value">{formatDate(userData.createdAt)}</span>
                    </div>
                  )}
                  {userData?.lastLogin && (
                    <div className="info-item">
                      <span className="info-label">Last Login</span>
                      <span className="info-value">{formatDate(userData.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
