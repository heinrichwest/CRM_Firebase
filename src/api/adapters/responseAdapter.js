/**
 * Response Adapter
 *
 * Handles unwrapping of API ResponseDto<T> format and pagination responses.
 *
 * Standard API response format:
 * {
 *   result: T,
 *   isError: boolean,
 *   errorMessage: string,
 *   message: string,
 *   statusCode: int
 * }
 *
 * Paginated response format (result contains):
 * {
 *   items: T[],
 *   totalCount: int,
 *   page: int,
 *   pageSize: int,
 *   totalPages: int
 * }
 */

import { ApiError } from '../config/apiClient'

/**
 * Unwrap a standard API response
 * @param {Object} response - API response with ResponseDto format
 * @returns {T} The result data
 * @throws {ApiError} If response indicates an error
 */
export const unwrapResponse = (response) => {
  // Handle null/undefined response
  if (response === null || response === undefined) {
    throw new ApiError('Empty response received', 500)
  }

  // If response doesn't have our standard format, return as-is
  if (typeof response.isError === 'undefined') {
    return response
  }

  // Check for error
  if (response.isError) {
    throw new ApiError(
      response.errorMessage || response.message || 'An error occurred',
      response.statusCode || 400
    )
  }

  // Return the result, handling null result case
  return response.result
}

/**
 * Unwrap a paginated API response
 * @param {Object} response - API response containing paginated data
 * @returns {Object} Normalized pagination response
 */
export const unwrapPagedResponse = (response) => {
  const result = unwrapResponse(response)

  // Handle case where result is directly the items array
  if (Array.isArray(result)) {
    return {
      data: result,
      pagination: {
        total: result.length,
        page: 1,
        pageSize: result.length,
        totalPages: 1
      }
    }
  }

  // Handle standard paginated response
  return {
    data: result.items || [],
    pagination: {
      total: result.totalCount || 0,
      page: result.page || 1,
      pageSize: result.pageSize || 25,
      totalPages: result.totalPages || 1
    }
  }
}

/**
 * Extract items from a response, handling both array and paginated formats
 * @param {Object} response - API response
 * @returns {Array} Array of items
 */
export const extractItems = (response) => {
  const result = unwrapResponse(response)

  if (Array.isArray(result)) {
    return result
  }

  if (result?.items && Array.isArray(result.items)) {
    return result.items
  }

  return []
}

/**
 * Check if a response indicates success
 * @param {Object} response - API response
 * @returns {boolean} True if response is successful
 */
export const isSuccessResponse = (response) => {
  if (response === null || response === undefined) {
    return false
  }

  if (typeof response.isError !== 'undefined') {
    return !response.isError
  }

  return true
}

/**
 * Extract error message from a response
 * @param {Object} response - API response
 * @returns {string|null} Error message or null if no error
 */
export const extractErrorMessage = (response) => {
  if (response?.isError) {
    return response.errorMessage || response.message || 'An error occurred'
  }
  return null
}

/**
 * Transform API error to user-friendly message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyError = (error) => {
  if (error instanceof ApiError) {
    // Map common status codes to friendly messages
    switch (error.statusCode) {
      case 400:
        return error.message || 'Invalid request. Please check your input.'
      case 401:
        return 'Your session has expired. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return error.message || 'A conflict occurred. The resource may already exist.'
      case 422:
        return error.message || 'The provided data is invalid.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
      case 502:
      case 503:
        return 'A server error occurred. Please try again later.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }

  return error.message || 'An unexpected error occurred.'
}
