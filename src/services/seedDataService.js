/**
 * Seed Data Service
 *
 * Firebase-backed seed/clear/reset is not used. All data is managed via the REST API.
 * These functions throw if called so the UI can show a clear message.
 */

const REST_API_ONLY_MSG = 'This feature is not available when using the REST API backend.'

export const clearAllData = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const seedAllData = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const resetAndSeed = async () => {
  throw new Error(REST_API_ONLY_MSG)
}
