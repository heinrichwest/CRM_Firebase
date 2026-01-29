/**
 * HTTP Client with Authentication Interceptors
 *
 * Provides a configured fetch wrapper with:
 * - Automatic JWT token injection
 * - 401 response handling with token refresh
 * - Consistent error handling
 * - Request/response logging (dev only)
 */

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://crm-service.speccon.co.za'
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

/**
 * Log request/response in development
 */
const logRequest = (method, url, options) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${method} ${url}`, options?.body ? JSON.parse(options.body) : '')
  }
}

const logResponse = (method, url, response, data) => {
  if (import.meta.env.DEV) {
    const status = response.ok ? '✓' : '✗'
    console.log(`[API] ${status} ${method} ${url}`, response.status, data)
  }
}

/**
 * Build headers for request
 */
const buildHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  }

  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Attempt to refresh the access token
 * @returns {Promise<boolean>} True if refresh successful
 */
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/User/RefreshToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data = await response.json()
    if (data.isError || !data.result) {
      clearTokens()
      return false
    }

    setTokens(data.result.accessToken, data.result.refreshToken)
    return true
  } catch (error) {
    console.error('Token refresh failed:', error)
    clearTokens()
    return false
  }
}

/**
 * Core fetch wrapper with authentication
 */
const fetchWithAuth = async (url, options = {}, retryCount = 0) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  const method = options.method || 'GET'

  const requestOptions = {
    ...options,
    headers: buildHeaders(options.headers)
  }

  logRequest(method, fullUrl, requestOptions)

  try {
    const response = await fetch(fullUrl, requestOptions)

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && retryCount === 0) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchWithAuth(url, options, retryCount + 1)
      }
      // Refresh failed - redirect to login
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }))
      throw new ApiError('Session expired. Please log in again.', 401)
    }

    // Parse response body
    let data = null
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    logResponse(method, fullUrl, response, data)

    // Handle error responses
    if (!response.ok) {
      const errorMessage = data?.errorMessage || data?.message || `Request failed with status ${response.status}`
      throw new ApiError(errorMessage, response.status, data?.errorCode)
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Network or other errors
    console.error(`[API] Network error for ${method} ${fullUrl}:`, error)
    throw new ApiError('Network error. Please check your connection.', 0)
  }
}

/**
 * API Client with HTTP method helpers
 */
export const apiClient = {
  /**
   * GET request
   */
  get: (url, options = {}) => {
    return fetchWithAuth(url, { ...options, method: 'GET' })
  },

  /**
   * POST request
   */
  post: (url, body, options = {}) => {
    return fetchWithAuth(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  /**
   * PUT request
   */
  put: (url, body, options = {}) => {
    return fetchWithAuth(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },

  /**
   * PATCH request
   */
  patch: (url, body, options = {}) => {
    return fetchWithAuth(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  /**
   * DELETE request
   */
  delete: (url, options = {}) => {
    return fetchWithAuth(url, { ...options, method: 'DELETE' })
  },

  /**
   * Upload file (multipart/form-data)
   */
  upload: async (url, formData, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    const headers = {}
    const token = getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(fullUrl, {
      ...options,
      method: 'POST',
      headers,
      body: formData
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(
        data?.errorMessage || 'Upload failed',
        response.status
      )
    }

    return response.json()
  }
}

/**
 * Get the API base URL
 */
export const getApiBaseUrl = () => API_BASE_URL

/**
 * Check if mock auth is enabled
 */
export const isMockAuthEnabled = () => USE_MOCK_AUTH

export default apiClient
