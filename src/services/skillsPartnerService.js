import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'

const SKILLS_PARTNERS_COLLECTION = 'skillsPartners'

/**
 * Get all skills partners
 * @returns {Promise<Array>} Array of skills partner objects
 */
export const getSkillsPartners = async () => {
  try {
    const partnersRef = collection(db, SKILLS_PARTNERS_COLLECTION)
    const snapshot = await getDocs(partnersRef)

    const partners = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Sort by name alphabetically
    return partners.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting skills partners:', error)
    if (error.code === 'permission-denied' || error.message?.includes('collection')) {
      console.log('Skills partners collection may not exist yet')
      return []
    }
    throw error
  }
}

/**
 * Get active skills partners only
 * @returns {Promise<Array>} Array of active skills partner objects
 */
export const getActiveSkillsPartners = async () => {
  try {
    const partners = await getSkillsPartners()
    return partners.filter(p => p.status === 'active')
  } catch (error) {
    console.error('Error getting active skills partners:', error)
    return []
  }
}

/**
 * Get a single skills partner by ID
 * @param {string} partnerId - The skills partner document ID
 * @returns {Promise<Object>} Skills partner object
 */
export const getSkillsPartner = async (partnerId) => {
  try {
    const partnerRef = doc(db, SKILLS_PARTNERS_COLLECTION, partnerId)
    const partnerDoc = await getDoc(partnerRef)

    if (partnerDoc.exists()) {
      return {
        id: partnerDoc.id,
        ...partnerDoc.data()
      }
    }
    return null
  } catch (error) {
    console.error('Error getting skills partner:', error)
    throw error
  }
}

/**
 * Create a new skills partner
 * @param {Object} partnerData - Skills partner data
 * @returns {Promise<string>} ID of created skills partner
 */
export const createSkillsPartner = async (partnerData) => {
  try {
    const newPartner = {
      ...partnerData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, SKILLS_PARTNERS_COLLECTION), newPartner)
    return docRef.id
  } catch (error) {
    console.error('Error creating skills partner:', error)
    throw error
  }
}

/**
 * Update an existing skills partner
 * @param {string} partnerId - The skills partner document ID
 * @param {Object} partnerData - Updated skills partner data
 * @returns {Promise<void>}
 */
export const updateSkillsPartner = async (partnerId, partnerData) => {
  try {
    const partnerRef = doc(db, SKILLS_PARTNERS_COLLECTION, partnerId)
    await updateDoc(partnerRef, {
      ...partnerData,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating skills partner:', error)
    throw error
  }
}

/**
 * Delete a skills partner
 * @param {string} partnerId - The skills partner document ID
 * @returns {Promise<void>}
 */
export const deleteSkillsPartner = async (partnerId) => {
  try {
    const partnerRef = doc(db, SKILLS_PARTNERS_COLLECTION, partnerId)
    await deleteDoc(partnerRef)
  } catch (error) {
    console.error('Error deleting skills partner:', error)
    throw error
  }
}

/**
 * Get commission rate for a specific partner and product line
 * @param {string} partnerId - The skills partner ID
 * @param {string} productLineId - The product line ID
 * @returns {Promise<number>} Commission percentage (0-100)
 */
export const getCommissionRate = async (partnerId, productLineId) => {
  try {
    const partner = await getSkillsPartner(partnerId)
    if (!partner || !partner.commissionRates) {
      return 0
    }

    // Commission rates stored as { productLineId: percentage }
    return partner.commissionRates[productLineId] || 0
  } catch (error) {
    console.error('Error getting commission rate:', error)
    return 0
  }
}

/**
 * Seed initial skills partners (for testing/demo)
 * @returns {Promise<void>}
 */
export const seedSkillsPartners = async () => {
  try {
    const samplePartners = [
      {
        name: 'Skills Development Solutions',
        contactPerson: 'John Smith',
        email: 'john@skillsdev.co.za',
        phone: '+27 11 123 4567',
        status: 'active',
        agreementLink: 'https://drive.google.com/example1',
        commissionRates: {}, // Will be set per product line
        notes: 'Primary skills partner for corporate training'
      },
      {
        name: 'Training Excellence Partners',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@trainingexcel.co.za',
        phone: '+27 21 987 6543',
        status: 'active',
        agreementLink: 'https://drive.google.com/example2',
        commissionRates: {},
        notes: 'Specialized in learnership programs'
      },
      {
        name: 'Workforce Development Co',
        contactPerson: 'Michael Brown',
        email: 'michael@workforce.co.za',
        phone: '+27 31 555 8888',
        status: 'active',
        agreementLink: '',
        commissionRates: {},
        notes: 'Focus on compliance training'
      }
    ]

    for (const partner of samplePartners) {
      await createSkillsPartner(partner)
    }

    console.log('Skills partners seeded successfully')
  } catch (error) {
    console.error('Error seeding skills partners:', error)
    throw error
  }
}
