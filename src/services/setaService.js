import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'

const SETAS_COLLECTION = 'setas'

/**
 * Get all SETAs
 * @returns {Promise<Array>} Array of SETA objects
 */
export const getSetas = async () => {
  try {
    const setasRef = collection(db, SETAS_COLLECTION)
    const snapshot = await getDocs(setasRef)

    // Map and sort in memory instead of using orderBy to avoid index requirement
    const setas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Sort by shortName alphabetically
    return setas.sort((a, b) => (a.shortName || '').localeCompare(b.shortName || ''))
  } catch (error) {
    console.error('Error getting SETAs:', error)
    // If collection doesn't exist, return empty array instead of throwing
    if (error.code === 'permission-denied' || error.message?.includes('index') || error.message?.includes('collection')) {
      console.log('SETA collection may not exist yet')
      return []
    }
    throw error
  }
}

/**
 * Get a single SETA by ID
 * @param {string} setaId - The SETA document ID
 * @returns {Promise<Object>} SETA object
 */
export const getSeta = async (setaId) => {
  try {
    const setaRef = doc(db, SETAS_COLLECTION, setaId)
    const setaDoc = await getDoc(setaRef)

    if (setaDoc.exists()) {
      return {
        id: setaDoc.id,
        ...setaDoc.data()
      }
    }
    return null
  } catch (error) {
    console.error('Error getting SETA:', error)
    throw error
  }
}

/**
 * Create a new SETA
 * @param {Object} setaData - SETA data {shortName, fullName}
 * @returns {Promise<string>} The new SETA document ID
 */
export const createSeta = async (setaData) => {
  try {
    const newSeta = {
      shortName: setaData.shortName,
      fullName: setaData.fullName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const setasRef = collection(db, SETAS_COLLECTION)
    const docRef = await addDoc(setasRef, newSeta)

    return docRef.id
  } catch (error) {
    console.error('Error creating SETA:', error)
    throw error
  }
}

/**
 * Update an existing SETA
 * @param {string} setaId - The SETA document ID
 * @param {Object} setaData - SETA data to update {shortName, fullName}
 * @returns {Promise<void>}
 */
export const updateSeta = async (setaId, setaData) => {
  try {
    const setaRef = doc(db, SETAS_COLLECTION, setaId)
    const updateData = {
      shortName: setaData.shortName,
      fullName: setaData.fullName,
      updatedAt: Timestamp.now()
    }

    await updateDoc(setaRef, updateData)
  } catch (error) {
    console.error('Error updating SETA:', error)
    throw error
  }
}

/**
 * Delete a SETA
 * @param {string} setaId - The SETA document ID
 * @returns {Promise<void>}
 */
export const deleteSeta = async (setaId) => {
  try {
    const setaRef = doc(db, SETAS_COLLECTION, setaId)
    await deleteDoc(setaRef)
  } catch (error) {
    console.error('Error deleting SETA:', error)
    throw error
  }
}

/**
 * Seed initial SETA data
 * @returns {Promise<void>}
 */
export const seedSetas = async () => {
  try {
    const setasData = [
      { shortName: 'AgriSETA', fullName: 'Agricultural Sector Education and Training Authority' },
      { shortName: 'BANKSETA', fullName: 'Banking Sector Education and Training Authority' },
      { shortName: 'CHIETA', fullName: 'Chemical Industries Education and Training Authority' },
      { shortName: 'CETA', fullName: 'Construction Education and Training Authority' },
      { shortName: 'CATHSSETA', fullName: 'Culture, Arts, Tourism, Hospitality and Sport SETA' },
      { shortName: 'ETDP SETA', fullName: 'Education, Training and Development Practices SETA' },
      { shortName: 'EWSETA', fullName: 'Energy and Water SETA' },
      { shortName: 'FP&M SETA', fullName: 'Fibre Processing & Manufacturing SETA' },
      { shortName: 'FASSET', fullName: 'Finance and Accounting Services SETA' },
      { shortName: 'FoodBev SETA', fullName: 'Food and Beverage Manufacturing Industry SETA' },
      { shortName: 'HWSETA', fullName: 'Health and Welfare SETA' },
      { shortName: 'INSETA', fullName: 'Insurance SETA' },
      { shortName: 'LGSETA', fullName: 'Local Government SETA' },
      { shortName: 'merSETA', fullName: 'Manufacturing, Engineering and Related Services SETA' },
      { shortName: 'MICT SETA', fullName: 'Media, Information and Communication Technologies SETA' },
      { shortName: 'MQA', fullName: 'Mining Qualifications Authority' },
      { shortName: 'PSETA', fullName: 'Public Service SETA' },
      { shortName: 'SASSETA', fullName: 'Safety and Security SETA' },
      { shortName: 'SSETA', fullName: 'Services SETA' },
      { shortName: 'TETA', fullName: 'Transport Education and Training Authority' },
      { shortName: 'W&RSETA', fullName: 'Wholesale & Retail SETA' }
    ]

    const setasRef = collection(db, SETAS_COLLECTION)
    const promises = setasData.map(seta =>
      addDoc(setasRef, {
        ...seta,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    )

    await Promise.all(promises)
    console.log('SETAs seeded successfully')
  } catch (error) {
    console.error('Error seeding SETAs:', error)
    throw error
  }
}
