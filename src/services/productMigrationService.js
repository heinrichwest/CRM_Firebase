/**
 * Product Migration Service
 *
 * Firebase-backed product migration is not used. All data is managed via the REST API.
 * These functions throw if called so the UI can show a clear message.
 */

const REST_API_ONLY_MSG = 'This feature is not available when using the REST API backend.'

export const getMigrationStatus = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const migrateProduct = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const migrateAllProducts = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const rollbackProductMigration = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const rollbackAllMigrations = async () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const verifyMigration = async () => {
  throw new Error(REST_API_ONLY_MSG)
}
