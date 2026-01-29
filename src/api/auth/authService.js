/**
 * Authentication Service
 *
 * Handles user authentication, token management, and session state.
 * JWT claims contain: Identity (userId), Tenant (tenantId), Role, SessionId
 */

import { jwtDecode } from 'jwt-decode'
import { apiClient, ApiError } from '../config/apiClient'
import { USER_ENDPOINTS } from '../config/endpoints'
import { setTokens, getAccessToken, clearTokens, hasTokens } from './tokenStorage'
import { unwrapResponse } from '../adapters/responseAdapter'

/**
 * JWT Claims structure from the API
 * @typedef {Object} JwtClaims
 * @property {string} sub - User ID (Identity)
 * @property {string} tenantId - Tenant ID
 * @property {string} role - User role
 * @property {string} sessionId - Session ID
 * @property {number} exp - Expiration timestamp
 * @property {number} iat - Issued at timestamp
 */

/**
 * Parse JWT token and extract claims
 * @param {string} token - JWT access token
 * @returns {JwtClaims|null} Decoded claims or null if invalid
 */
export const parseToken = (token) => {
  if (!token) {
    return null
  }

  try {
    const decoded = jwtDecode(token)
    return decoded
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if a token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  const claims = parseToken(token)
  if (!claims || !claims.exp) {
    return true
  }

  // Add 30 second buffer to account for clock skew
  const expirationTime = claims.exp * 1000
  const currentTime = Date.now() + 30000
  return currentTime >= expirationTime
}

/**
 * Get claims from the current access token
 * @returns {JwtClaims|null} Current user claims or null
 */
export const getCurrentClaims = () => {
  const token = getAccessToken()
  return parseToken(token)
}

/**
 * Get current user ID from JWT claims
 * @returns {string|null} User ID or null
 */
export const getCurrentUserId = () => {
  const claims = getCurrentClaims()
  return claims?.sub || claims?.userId || claims?.nameid || null
}

/**
 * Get current tenant ID from JWT claims
 * @returns {string|null} Tenant ID or null
 */
export const getCurrentTenantId = () => {
  const claims = getCurrentClaims()
  return claims?.tenantId || null
}

/**
 * Get current user role from JWT claims
 * @returns {string|null} User role or null
 */
export const getCurrentRole = () => {
  const claims = getCurrentClaims()
  return claims?.role || null
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - Persist session across browser closes
 * @returns {Promise<Object>} User data with tokens
 */
export const login = async (email, password, rememberMe = false) => {
  try {
    const response = await apiClient.post(USER_ENDPOINTS.LOGIN, {
      email,
      password
    })

    const result = unwrapResponse(response)

    if (!result.accessToken || !result.refreshToken) {
      throw new ApiError('Invalid login response - missing tokens', 500)
    }

    setTokens(result.accessToken, result.refreshToken, rememberMe)

    return {
      user: {
        id: getCurrentUserId(),
        email,
        tenantId: getCurrentTenantId(),
        role: getCurrentRole()
      },
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    }
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}

/**
 * Logout - clear tokens and notify API
 */
export const logout = async () => {
  try {
    if (hasTokens()) {
      await apiClient.get(USER_ENDPOINTS.LOGOUT)
    }
  } catch (error) {
    // Ignore errors - we're logging out anyway
    console.warn('Logout API call failed:', error)
  } finally {
    clearTokens()
  }
}

/**
 * Get current user details from API
 * @returns {Promise<Object>} User details
 */
export const getUserDetail = async () => {
  const response = await apiClient.get(USER_ENDPOINTS.USER_DETAIL)
  return unwrapResponse(response)
}

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if user has valid session
 */
export const isAuthenticated = () => {
  const token = getAccessToken()
  if (!token) {
    return false
  }

  return !isTokenExpired(token)
}

/**
 * Register a new user
 * @param {Object} userData - Registration data
 * @returns {Promise<Object>} Registration result
 */
export const register = async (userData) => {
  const response = await apiClient.post(USER_ENDPOINTS.REGISTER, userData)
  return unwrapResponse(response)
}

/**
 * Validate registration data before submitting
 * @param {Object} userData - Registration data to validate
 * @returns {Promise<Object>} Validation result
 */
export const validateRegister = async (userData) => {
  const response = await apiClient.post(USER_ENDPOINTS.VALIDATE_REGISTER, userData)
  return unwrapResponse(response)
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Reset request result
 */
export const forgotPassword = async (email) => {
  const response = await apiClient.post(USER_ENDPOINTS.FORGET_PASSWORD, { email })
  return unwrapResponse(response)
}

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Change result
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post(USER_ENDPOINTS.CHANGE_PASSWORD, {
    currentPassword,
    newPassword
  })
  return unwrapResponse(response)
}

/**
 * Send OTP for verification
 * @param {string} email - Email to send OTP to
 * @returns {Promise<Object>} Send result
 */
export const sendOtp = async (email) => {
  const response = await apiClient.post(USER_ENDPOINTS.SEND_OTP, { email })
  return unwrapResponse(response)
}

/**
 * Validate OTP code
 * @param {string} email - User email
 * @param {string} otp - OTP code to validate
 * @returns {Promise<Object>} Validation result
 */
export const validateOtp = async (email, otp) => {
  const response = await apiClient.post(USER_ENDPOINTS.VALIDATE_OTP, { email, otp })
  return unwrapResponse(response)
}

/**
 * Get user permissions
 * @returns {Promise<string[]>} List of permission strings
 */
export const getUserPermissions = async () => {
  const response = await apiClient.get(USER_ENDPOINTS.GET_PERMISSIONS)
  return unwrapResponse(response)
}

/**
 * Update user profile
 * @param {Object} profileData - Profile fields to update
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (profileData) => {
  const response = await apiClient.put(USER_ENDPOINTS.UPDATE_PROFILE, profileData)
  return unwrapResponse(response)
}

/**
 * Validate an invite token
 * @param {string} token - Invite token
 * @returns {Promise<Object>} Invite validation result
 */
export const validateInvite = async (token) => {
  const response = await apiClient.post(USER_ENDPOINTS.VALIDATE_INVITE, { token })
  return unwrapResponse(response)
}
