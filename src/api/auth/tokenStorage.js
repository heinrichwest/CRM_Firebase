/**
 * Secure Token Storage
 *
 * Manages JWT access and refresh tokens in browser storage.
 * Uses sessionStorage by default for better security (tokens cleared on tab close).
 * Can be configured to use localStorage for "remember me" functionality.
 */

const ACCESS_TOKEN_KEY = 'crm_access_token'
const REFRESH_TOKEN_KEY = 'crm_refresh_token'
const STORAGE_TYPE_KEY = 'crm_storage_type'

/**
 * Get the appropriate storage based on user preference
 */
const getStorage = () => {
  const storageType = localStorage.getItem(STORAGE_TYPE_KEY)
  return storageType === 'local' ? localStorage : sessionStorage
}

/**
 * Store tokens securely
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @param {boolean} rememberMe - If true, use localStorage for persistence
 */
export const setTokens = (accessToken, refreshToken, rememberMe = false) => {
  if (rememberMe) {
    localStorage.setItem(STORAGE_TYPE_KEY, 'local')
  } else {
    localStorage.setItem(STORAGE_TYPE_KEY, 'session')
  }

  const storage = getStorage()
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/**
 * Get the access token
 * @returns {string|null} Access token or null if not found
 */
export const getAccessToken = () => {
  // Check both storages in case of storage type change
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
         localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Get the refresh token
 * @returns {string|null} Refresh token or null if not found
 */
export const getRefreshToken = () => {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
         localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Clear all stored tokens (logout)
 */
export const clearTokens = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(STORAGE_TYPE_KEY)
}

/**
 * Check if user has stored tokens
 * @returns {boolean} True if tokens exist
 */
export const hasTokens = () => {
  return !!getAccessToken() && !!getRefreshToken()
}

/**
 * Update only the access token (after refresh)
 * @param {string} accessToken - New access token
 */
export const updateAccessToken = (accessToken) => {
  const storage = getStorage()
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
}
