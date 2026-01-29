import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'
import { login as apiLogin, changePassword as apiChangePassword } from '../api'
import { getUserFriendlyError } from '../api/adapters/responseAdapter'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const { refreshAuth } = useTenant()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await apiLogin(email, password, rememberMe)

      // Check if user needs to change password (from API response)
      if (result.user?.requirePasswordChange) {
        setShowPasswordChangeModal(true)
        setLoading(false)
        return
      }

      // Update auth state so currentUser is set before we navigate (avoids redirect back to login)
      await refreshAuth()
      // Login successful - navigate to dashboard
      navigate('/', { replace: true })
    } catch (err) {
      const errorMessage = getUserFriendlyError(err)
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword === password) {
      setError('New password must be different from the current password')
      return
    }

    setChangingPassword(true)

    try {
      await apiChangePassword(password, newPassword)

      setShowPasswordChangeModal(false)
      // Update auth state then navigate to dashboard
      await refreshAuth()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error changing password:', err)
      const errorMessage = getUserFriendlyError(err)
      setError(errorMessage || 'Failed to change password')
      setChangingPassword(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Speccon CRM</h1>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleEmailPasswordLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group remember-me">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="email-login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="password-change-modal-backdrop">
          <div className="password-change-modal">
            <h2>Password Change Required</h2>
            <p>For security reasons, you must change your password before continuing.</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password (min 6 characters)"
                  disabled={changingPassword}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="email-login-button"
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
