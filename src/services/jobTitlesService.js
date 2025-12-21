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

const JOB_TITLES_COLLECTION = 'jobTitles'

/**
 * Get all job titles
 * @returns {Promise<Array>} Array of job title objects
 */
export const getJobTitles = async () => {
  try {
    const jobTitlesRef = collection(db, JOB_TITLES_COLLECTION)
    const snapshot = await getDocs(jobTitlesRef)

    // Map and sort in memory instead of using orderBy to avoid index requirement
    const jobTitles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Sort by title alphabetically
    return jobTitles.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  } catch (error) {
    console.error('Error getting job titles:', error)
    // If collection doesn't exist, return empty array instead of throwing
    if (error.code === 'permission-denied' || error.message?.includes('index') || error.message?.includes('collection')) {
      console.log('Job titles collection may not exist yet')
      return []
    }
    throw error
  }
}

/**
 * Get a single job title by ID
 * @param {string} jobTitleId - The job title document ID
 * @returns {Promise<Object>} Job title object
 */
export const getJobTitle = async (jobTitleId) => {
  try {
    const jobTitleRef = doc(db, JOB_TITLES_COLLECTION, jobTitleId)
    const jobTitleDoc = await getDoc(jobTitleRef)

    if (jobTitleDoc.exists()) {
      return {
        id: jobTitleDoc.id,
        ...jobTitleDoc.data()
      }
    }
    return null
  } catch (error) {
    console.error('Error getting job title:', error)
    throw error
  }
}

/**
 * Create a new job title
 * @param {Object} jobTitleData - Job title data {title}
 * @returns {Promise<string>} The new job title document ID
 */
export const createJobTitle = async (jobTitleData) => {
  try {
    const newJobTitle = {
      title: jobTitleData.title,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const jobTitlesRef = collection(db, JOB_TITLES_COLLECTION)
    const docRef = await addDoc(jobTitlesRef, newJobTitle)

    return docRef.id
  } catch (error) {
    console.error('Error creating job title:', error)
    throw error
  }
}

/**
 * Update an existing job title
 * @param {string} jobTitleId - The job title document ID
 * @param {Object} jobTitleData - Job title data to update {title}
 * @returns {Promise<void>}
 */
export const updateJobTitle = async (jobTitleId, jobTitleData) => {
  try {
    const jobTitleRef = doc(db, JOB_TITLES_COLLECTION, jobTitleId)
    const updateData = {
      title: jobTitleData.title,
      updatedAt: Timestamp.now()
    }

    await updateDoc(jobTitleRef, updateData)
  } catch (error) {
    console.error('Error updating job title:', error)
    throw error
  }
}

/**
 * Delete a job title
 * @param {string} jobTitleId - The job title document ID
 * @returns {Promise<void>}
 */
export const deleteJobTitle = async (jobTitleId) => {
  try {
    const jobTitleRef = doc(db, JOB_TITLES_COLLECTION, jobTitleId)
    await deleteDoc(jobTitleRef)
  } catch (error) {
    console.error('Error deleting job title:', error)
    throw error
  }
}

/**
 * Seed initial job title data
 * @returns {Promise<void>}
 */
export const seedJobTitles = async () => {
  try {
    const jobTitlesData = [
      { title: 'HR Manager' },
      { title: 'HR Admin' },
      { title: 'Skills and Development Facilitator' },
      { title: 'Transformations Manager' },
      { title: 'HR Director' },
      { title: 'Financial Manager' },
      { title: 'Financial Director' },
      { title: 'Managing Director' }
    ]

    const jobTitlesRef = collection(db, JOB_TITLES_COLLECTION)
    const promises = jobTitlesData.map(jobTitle =>
      addDoc(jobTitlesRef, {
        ...jobTitle,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    )

    await Promise.all(promises)
    console.log('Job titles seeded successfully')
  } catch (error) {
    console.error('Error seeding job titles:', error)
    throw error
  }
}
