/**
 * Seed Data Generator
 *
 * Firebase-backed seed generation is not used. All data is managed via the REST API.
 * These functions throw if called so the UI can show a clear message.
 */

const REST_API_ONLY_MSG = 'Seed data generation is not available when using the REST API backend.'

const throwNotAvailable = () => {
  throw new Error(REST_API_ONLY_MSG)
}

export const generateSeedClients = async () => { throwNotAvailable() }
export const generateSeedInteractions = async () => { throwNotAvailable() }
export const generateSeedQuotes = async () => { throwNotAvailable() }
export const generateSeedInvoices = async () => { throwNotAvailable() }
export const generateSeedTasks = async () => { throwNotAvailable() }
export const generateSeedFinancials = async () => { throwNotAvailable() }
export const generateSeedFeedback = async () => { throwNotAvailable() }
export const generateSeedContracts = async () => { throwNotAvailable() }
export const generateSeedDeals = async () => { throwNotAvailable() }
export const seedAllData = async () => { throwNotAvailable() }

export default seedAllData
