import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../config/firebase'

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const getUsers = async () => {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
}

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

/**
 * Get clients, optionally filtered by tenant
 * @param {Object} filters - Filter options
 * @param {string} tenantId - Tenant ID to filter by (required for non-system-admins)
 */
export const getClients = async (filters = {}, tenantId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    let q = query(clientsRef)

    // Filter by tenant if provided
    if (tenantId) {
      q = query(q, where('tenantId', '==', tenantId))
    }

    if (filters.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type))
    }

    q = query(q, orderBy('lastContact', 'desc'))

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting clients:', error)
    throw error
  }
}

export const getClient = async (clientId) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    const clientSnap = await getDoc(clientRef)
    
    if (clientSnap.exists()) {
      return { id: clientSnap.id, ...clientSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting client:', error)
    throw error
  }
}

/**
 * Create a new client
 * @param {Object} clientData - Client data
 * @param {string} tenantId - Tenant ID (required)
 */
export const createClient = async (clientData, tenantId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    const newClient = {
      ...clientData,
      tenantId: tenantId || clientData.tenantId, // Ensure tenantId is set
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastContact: clientData.lastContact || serverTimestamp()
    }
    const docRef = await addDoc(clientsRef, newClient)
    return docRef.id
  } catch (error) {
    console.error('Error creating client:', error)
    throw error
  }
}

export const updateClient = async (clientId, clientData) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    await updateDoc(clientRef, {
      ...clientData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating client:', error)
    throw error
  }
}

// Default pipeline statuses (used if no custom ones are configured)
const DEFAULT_PIPELINE_STATUSES = [
  { id: 'new-lead', name: 'New Lead', color: '#e3f2fd', order: 1 },
  { id: 'qualifying', name: 'Qualifying', color: '#fff3e0', order: 2 },
  { id: 'proposal-sent', name: 'Proposal Sent', color: '#e8f5e9', order: 3 },
  { id: 'awaiting-decision', name: 'Awaiting Decision', color: '#e1bee7', order: 4 },
  { id: 'negotiation', name: 'Negotiation', color: '#fff9c4', order: 5 },
  { id: 'won', name: 'Won', color: '#c8e6c9', order: 6, isWon: true },
  { id: 'lost', name: 'Lost', color: '#ffcdd2', order: 7, isLost: true }
]

/**
 * Get pipeline statuses from settings or return defaults
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 */
export const getPipelineStatuses = async (tenantId = null) => {
  try {
    // Try tenant-specific settings first
    if (tenantId) {
      const tenantSettingsRef = doc(db, 'systemSettings', `pipelineStatuses_${tenantId}`)
      const tenantSettingsSnap = await getDoc(tenantSettingsRef)

      if (tenantSettingsSnap.exists()) {
        const data = tenantSettingsSnap.data()
        if (data.statuses && Array.isArray(data.statuses) && data.statuses.length > 0) {
          return data.statuses.sort((a, b) => a.order - b.order)
        }
      }
    }

    // Fall back to global settings
    const settingsRef = doc(db, 'systemSettings', 'pipelineStatuses')
    const settingsSnap = await getDoc(settingsRef)

    if (settingsSnap.exists()) {
      const data = settingsSnap.data()
      if (data.statuses && Array.isArray(data.statuses) && data.statuses.length > 0) {
        return data.statuses.sort((a, b) => a.order - b.order)
      }
    }

    return DEFAULT_PIPELINE_STATUSES
  } catch (error) {
    console.error('Error getting pipeline statuses:', error)
    return DEFAULT_PIPELINE_STATUSES
  }
}

/**
 * Save pipeline statuses to settings (admin function)
 * @param {Array} statuses - Pipeline statuses array
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 */
export const savePipelineStatuses = async (statuses, tenantId = null) => {
  try {
    const docId = tenantId ? `pipelineStatuses_${tenantId}` : 'pipelineStatuses'
    const settingsRef = doc(db, 'systemSettings', docId)
    await setDoc(settingsRef, {
      statuses: statuses,
      tenantId: tenantId,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error saving pipeline statuses:', error)
    throw error
  }
}

// Update client's pipeline status with history tracking
export const updateClientPipelineStatus = async (clientId, newStatus, userId = 'system') => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    const clientDoc = await getDoc(clientRef)

    if (!clientDoc.exists()) {
      throw new Error('Client not found')
    }

    const clientData = clientDoc.data()
    const oldStatus = clientData.pipelineStatus || null
    const now = new Date()

    // Get existing history or initialize empty array
    const pipelineStatusHistory = clientData.pipelineStatusHistory || []

    // If there's a current status, close it out with duration
    if (pipelineStatusHistory.length > 0 && !pipelineStatusHistory[pipelineStatusHistory.length - 1].endDate) {
      pipelineStatusHistory[pipelineStatusHistory.length - 1].endDate = now.toISOString()
      const startDate = new Date(pipelineStatusHistory[pipelineStatusHistory.length - 1].startDate)
      pipelineStatusHistory[pipelineStatusHistory.length - 1].durationDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
    }

    // Add new status entry
    pipelineStatusHistory.push({
      status: newStatus,
      previousStatus: oldStatus,
      startDate: now.toISOString(),
      endDate: null,
      durationDays: null,
      changedBy: userId
    })

    await updateDoc(clientRef, {
      pipelineStatus: newStatus,
      pipelineStatusHistory,
      updatedAt: serverTimestamp()
    })

    return pipelineStatusHistory
  } catch (error) {
    console.error('Error updating pipeline status:', error)
    throw error
  }
}

// Get pipeline status analytics for all clients
export const getPipelineStatusAnalytics = async () => {
  try {
    const clientsRef = collection(db, 'clients')
    const snapshot = await getDocs(clientsRef)

    const analytics = {
      byStatus: {},
      avgTimeInStatus: {},
      statusTransitions: []
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const currentStatus = data.pipelineStatus || 'not-set'

      // Count clients by current status
      analytics.byStatus[currentStatus] = (analytics.byStatus[currentStatus] || 0) + 1

      // Analyze history for time in status
      if (data.pipelineStatusHistory && Array.isArray(data.pipelineStatusHistory)) {
        data.pipelineStatusHistory.forEach(entry => {
          if (entry.status && entry.durationDays !== null) {
            if (!analytics.avgTimeInStatus[entry.status]) {
              analytics.avgTimeInStatus[entry.status] = { total: 0, count: 0 }
            }
            analytics.avgTimeInStatus[entry.status].total += entry.durationDays
            analytics.avgTimeInStatus[entry.status].count += 1
          }
        })
      }
    })

    // Calculate averages
    Object.keys(analytics.avgTimeInStatus).forEach(status => {
      const { total, count } = analytics.avgTimeInStatus[status]
      analytics.avgTimeInStatus[status] = count > 0 ? Math.round(total / count) : 0
    })

    return analytics
  } catch (error) {
    console.error('Error getting pipeline analytics:', error)
    throw error
  }
}

export const getClientActivities = async (clientId) => {
  try {
    const activitiesRef = collection(db, 'clients', clientId, 'activities')
    const q = query(activitiesRef, orderBy('timestamp', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting client activities:', error)
    throw error
  }
}

export const addClientActivity = async (clientId, activity) => {
  try {
    const activitiesRef = collection(db, 'clients', clientId, 'activities')
    await addDoc(activitiesRef, {
      ...activity,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error('Error adding activity:', error)
    throw error
  }
}

// ============================================================================
// INTERACTIONS
// ============================================================================

export const getClientInteractions = async (clientId, filters = {}) => {
  try {
    const interactionsRef = collection(db, 'clients', clientId, 'interactions')
    let q = query(interactionsRef, orderBy('timestamp', 'desc'))
    
    if (filters.type) {
      q = query(q, where('type', '==', filters.type))
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting interactions:', error)
    throw error
  }
}

export const createInteraction = async (clientId, interactionData) => {
  try {
    const interactionsRef = collection(db, 'clients', clientId, 'interactions')
    const newInteraction = {
      ...interactionData,
      timestamp: interactionData.timestamp || serverTimestamp(),
      createdAt: serverTimestamp()
    }
    const docRef = await addDoc(interactionsRef, newInteraction)

    // Build client update - always update lastContact
    const clientUpdate = {
      lastContact: interactionData.timestamp || serverTimestamp()
    }

    // If follow-up data is provided, update client's next follow-up
    if (interactionData.followUpDate) {
      clientUpdate.nextFollowUpDate = interactionData.followUpDate
      clientUpdate.nextFollowUpReason = interactionData.followUpReason || ''
      clientUpdate.nextFollowUpType = interactionData.followUpType || 'call'
      clientUpdate.nextFollowUpCreatedBy = interactionData.userId
      clientUpdate.nextFollowUpCreatedAt = serverTimestamp()
    }

    await updateClient(clientId, clientUpdate)

    return docRef.id
  } catch (error) {
    console.error('Error creating interaction:', error)
    throw error
  }
}

// ============================================================================
// FOLLOW-UP TASKS
// ============================================================================

export const getFollowUpTasks = async (filters = {}) => {
  try {
    const tasksRef = collection(db, 'followUpTasks')
    let q = query(tasksRef, orderBy('dueDate', 'asc'))
    
    if (filters.userId) {
      q = query(q, where('assignedTo', '==', filters.userId))
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters.clientId) {
      q = query(q, where('clientId', '==', filters.clientId))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting follow-up tasks:', error)
    throw error
  }
}

export const createFollowUpTask = async (taskData) => {
  try {
    const tasksRef = collection(db, 'followUpTasks')
    const newTask = {
      ...taskData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(tasksRef, newTask)
    return docRef.id
  } catch (error) {
    console.error('Error creating follow-up task:', error)
    throw error
  }
}

export const updateFollowUpTask = async (taskId, taskData) => {
  try {
    const taskRef = doc(db, 'followUpTasks', taskId)
    await updateDoc(taskRef, {
      ...taskData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating follow-up task:', error)
    throw error
  }
}

export const completeFollowUpTask = async (taskId, notes = '') => {
  try {
    const taskRef = doc(db, 'followUpTasks', taskId)
    const taskSnap = await getDoc(taskRef)
    
    if (taskSnap.exists()) {
      const task = taskSnap.data()
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        completedNotes: notes,
        updatedAt: serverTimestamp()
      })
      
      // If task is linked to a client, create an interaction
      if (task.clientId) {
        await createInteraction(task.clientId, {
          type: 'task_completed',
          summary: `Follow-up task completed: ${task.description}`,
          notes: notes,
          userId: task.assignedTo,
          relatedTaskId: taskId
        })
      }
    }
  } catch (error) {
    console.error('Error completing follow-up task:', error)
    throw error
  }
}

// ============================================================================
// DEALS / SALES PIPELINE
// ============================================================================

export const getDeals = async (stage = null, filters = {}) => {
  try {
    const dealsRef = collection(db, 'deals')
    let q

    // Build query based on filters - avoid compound queries that need indexes
    if (filters.clientId) {
      q = query(dealsRef, where('clientId', '==', filters.clientId))
    } else if (stage) {
      q = query(dealsRef, where('stage', '==', stage))
    } else if (filters.userId) {
      q = query(dealsRef, where('assignedTo', '==', filters.userId))
    } else {
      q = query(dealsRef, orderBy('lastContact', 'desc'))
    }

    const snapshot = await getDocs(q)
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Apply additional client-side filtering if needed
    if (stage && filters.clientId) {
      results = results.filter(d => d.stage === stage)
    }

    // Sort by lastContact descending
    results.sort((a, b) => {
      const dateA = a.lastContact?.toDate?.() || new Date(0)
      const dateB = b.lastContact?.toDate?.() || new Date(0)
      return dateB - dateA
    })

    return results
  } catch (error) {
    console.error('Error getting deals:', error)
    return [] // Return empty array instead of throwing
  }
}

export const createDeal = async (dealData) => {
  try {
    const dealsRef = collection(db, 'deals')
    const newDeal = {
      ...dealData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastContact: dealData.lastContact || serverTimestamp(),
      stage: dealData.stage || 'new-lead'
    }
    const docRef = await addDoc(dealsRef, newDeal)
    return docRef.id
  } catch (error) {
    console.error('Error creating deal:', error)
    throw error
  }
}

export const updateDeal = async (dealId, dealData) => {
  try {
    const dealRef = doc(db, 'deals', dealId)
    await updateDoc(dealRef, {
      ...dealData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating deal:', error)
    throw error
  }
}

export const moveDealStage = async (dealId, newStage) => {
  try {
    await updateDeal(dealId, { stage: newStage })
  } catch (error) {
    console.error('Error moving deal stage:', error)
    throw error
  }
}

// ============================================================================
// PRODUCTS (Legacy - kept for backward compatibility)
// ============================================================================

// Note: getClientProducts is defined in the Product Catalog section below
// This legacy createProduct is replaced by addClientProduct in the Product Catalog section

// ============================================================================
// QUOTES & INVOICES
// ============================================================================

export const getQuotes = async (clientId = null) => {
  try {
    const quotesRef = collection(db, 'quotes')
    let q = query(quotesRef, orderBy('date', 'desc'))
    
    if (clientId) {
      q = query(q, where('clientId', '==', clientId))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting quotes:', error)
    throw error
  }
}

export const createQuote = async (quoteData) => {
  try {
    const quotesRef = collection(db, 'quotes')
    const newQuote = {
      ...quoteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(quotesRef, newQuote)
    return docRef.id
  } catch (error) {
    console.error('Error creating quote:', error)
    throw error
  }
}

export const getInvoices = async (clientId = null) => {
  try {
    const invoicesRef = collection(db, 'invoices')
    let q = query(invoicesRef, orderBy('issueDate', 'desc'))
    
    if (clientId) {
      q = query(q, where('clientId', '==', clientId))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting invoices:', error)
    throw error
  }
}

export const createInvoice = async (invoiceData) => {
  try {
    const invoicesRef = collection(db, 'invoices')
    const newInvoice = {
      ...invoiceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(invoicesRef, newInvoice)
    return docRef.id
  } catch (error) {
    console.error('Error creating invoice:', error)
    throw error
  }
}

// ============================================================================
// CONTRACTS
// ============================================================================

export const getContracts = async (clientId) => {
  try {
    const contractsRef = collection(db, 'clients', clientId, 'contracts')
    const snapshot = await getDocs(contractsRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting contracts:', error)
    return [] // Return empty array instead of throwing
  }
}

export const createContract = async (clientId, contractData) => {
  try {
    const contractsRef = collection(db, 'clients', clientId, 'contracts')
    const newContract = {
      ...contractData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(contractsRef, newContract)
    return docRef.id
  } catch (error) {
    console.error('Error creating contract:', error)
    throw error
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

export const getMessages = async (status = null) => {
  try {
    const messagesRef = collection(db, 'messages')
    let q = query(messagesRef, orderBy('createdAt', 'desc'))
    
    if (status) {
      q = query(q, where('status', '==', status))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting messages:', error)
    throw error
  }
}

export const createMessage = async (messageData) => {
  try {
    const messagesRef = collection(db, 'messages')
    const newMessage = {
      ...messageData,
      status: messageData.status || 'unread',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(messagesRef, newMessage)
    return docRef.id
  } catch (error) {
    console.error('Error creating message:', error)
    throw error
  }
}

// ============================================================================
// FORECASTS
// ============================================================================

export const getForecast = async (clientId, period) => {
  try {
    const forecastRef = doc(db, 'forecasts', `${clientId}_${period}`)
    const forecastSnap = await getDoc(forecastRef)
    
    if (forecastSnap.exists()) {
      return { id: forecastSnap.id, ...forecastSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting forecast:', error)
    throw error
  }
}

export const saveForecast = async (clientId, period, forecastData) => {
  try {
    const forecastRef = doc(db, 'forecasts', `${clientId}_${period}`)
    await updateDoc(forecastRef, {
      ...forecastData,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      const forecastsRef = collection(db, 'forecasts')
      await addDoc(forecastsRef, {
        clientId,
        period,
        ...forecastData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } else {
      console.error('Error saving forecast:', error)
      throw error
    }
  }
}

// ============================================================================
// FEEDBACK
// ============================================================================

export const getFeedback = async (clientId = null) => {
  try {
    const feedbackRef = collection(db, 'feedback')
    let q

    // Use single field queries to avoid needing composite indexes
    if (clientId) {
      q = query(feedbackRef, where('clientId', '==', clientId))
    } else {
      q = query(feedbackRef, orderBy('date', 'desc'))
    }

    const snapshot = await getDocs(q)
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Sort by date descending (client-side for filtered results)
    if (clientId) {
      results.sort((a, b) => {
        const dateA = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
    }

    return results
  } catch (error) {
    console.error('Error getting feedback:', error)
    return [] // Return empty array instead of throwing
  }
}

export const createFeedback = async (feedbackData) => {
  try {
    const feedbackRef = collection(db, 'feedback')
    const newFeedback = {
      ...feedbackData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(feedbackRef, newFeedback)
    return docRef.id
  } catch (error) {
    console.error('Error creating feedback:', error)
    throw error
  }
}

// ============================================================================
// FINANCIAL DASHBOARD
// ============================================================================

export const getFinancialDashboard = async () => {
  try {
    const dashboardRef = doc(db, 'financialDashboard', 'main')
    const dashboardSnap = await getDoc(dashboardRef)
    
    if (dashboardSnap.exists()) {
      return dashboardSnap.data()
    }
    
    // Return default structure if not found
    return {
      learnerships: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      tapBusiness: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      compliance: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 },
      otherCourses: { previousYear: 0, ytd: 0, forecast: 0, fullYear: 0 }
    }
  } catch (error) {
    console.error('Error getting financial dashboard:', error)
    throw error
  }
}

export const updateFinancialDashboard = async (financialData) => {
  try {
    const dashboardRef = doc(db, 'financialDashboard', 'main')
    const dashboardSnap = await getDoc(dashboardRef)
    
    const updateData = {
      ...financialData,
      updatedAt: serverTimestamp()
    }
    
    // If document doesn't exist, add createdAt timestamp
    if (!dashboardSnap.exists()) {
      updateData.createdAt = serverTimestamp()
    }
    
    // Use setDoc with merge to create or update
    await setDoc(dashboardRef, updateData, { merge: true })
  } catch (error) {
    console.error('Error updating financial dashboard:', error)
    throw error
  }
}

// ============================================================================
// BUDGET TRACKING
// ============================================================================

/**
 * Get all budgets for a financial year
 * @param {string} financialYear - Financial year (e.g., "2024/2025")
 * @returns {Promise<Array>} Array of budget records
 */
export const getBudgets = async (financialYear = null) => {
  try {
    const budgetsRef = collection(db, 'budgets')
    let q = budgetsRef

    if (financialYear) {
      q = query(budgetsRef, where('financialYear', '==', financialYear))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting budgets:', error)
    return []
  }
}

/**
 * Get budgets for a specific salesperson
 * @param {string} userId - Salesperson user ID
 * @param {string} financialYear - Optional financial year filter
 * @returns {Promise<Array>} Array of budget records
 */
export const getBudgetsBySalesperson = async (userId, financialYear = null) => {
  try {
    const budgetsRef = collection(db, 'budgets')
    let q = query(budgetsRef, where('salespersonId', '==', userId))

    const snapshot = await getDocs(q)
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    if (financialYear) {
      results = results.filter(b => b.financialYear === financialYear)
    }

    return results
  } catch (error) {
    console.error('Error getting budgets by salesperson:', error)
    return []
  }
}

/**
 * Save or update a budget record
 * @param {string} salespersonId - Salesperson user ID
 * @param {string} productLine - Product line name
 * @param {string} financialYear - Financial year
 * @param {number} budgetAmount - Budget amount
 * @param {string} updatedBy - User ID who made the update
 * @returns {Promise<string>} Document ID
 */
export const saveBudget = async (salespersonId, productLine, financialYear, budgetAmount, updatedBy) => {
  try {
    // Use composite key: salespersonId_financialYear_productLine
    const budgetId = `${salespersonId}_${financialYear.replace('/', '-')}_${productLine.replace(/\s+/g, '_')}`
    const budgetRef = doc(db, 'budgets', budgetId)
    const budgetSnap = await getDoc(budgetRef)

    const updateData = {
      salespersonId,
      productLine,
      financialYear,
      budgetAmount: parseFloat(budgetAmount) || 0,
      updatedBy,
      updatedAt: serverTimestamp()
    }

    if (!budgetSnap.exists()) {
      updateData.createdAt = serverTimestamp()
    }

    await setDoc(budgetRef, updateData, { merge: true })
    return budgetId
  } catch (error) {
    console.error('Error saving budget:', error)
    throw error
  }
}

/**
 * Delete a budget record
 * @param {string} budgetId - Budget document ID
 * @returns {Promise<void>}
 */
export const deleteBudget = async (budgetId) => {
  try {
    const budgetRef = doc(db, 'budgets', budgetId)
    await deleteDoc(budgetRef)
  } catch (error) {
    console.error('Error deleting budget:', error)
    throw error
  }
}

/**
 * Calculate forecast from deal details array
 * @param {Array} deals - Array of deal objects
 * @param {string} productLineType - Type of product line (learnership, tap, compliance, other)
 * @returns {number} Total forecast amount
 */
const calculateForecastFromDeals = (deals, productLineType) => {
  if (!deals || !Array.isArray(deals)) return 0

  return deals.reduce((total, deal) => {
    const certainty = (deal.certaintyPercentage || 100) / 100
    let dealTotal = 0

    if (productLineType === 'learnership') {
      // Learnerships: learners * costPerLearner
      dealTotal = (deal.learners || 0) * (deal.costPerLearner || 0)
    } else if (productLineType === 'tap') {
      // TAP Business: numberOfEmployees * costPerEmployeePerMonth * contractMonths
      dealTotal = (deal.numberOfEmployees || 0) * (deal.costPerEmployeePerMonth || 0) * (deal.contractMonths || 12)
    } else if (productLineType === 'compliance') {
      // Compliance: numberOfTrainees * pricePerPerson
      dealTotal = (deal.numberOfTrainees || 0) * (deal.pricePerPerson || 0)
    } else {
      // Other courses: numberOfParticipants * coursePrice
      dealTotal = (deal.numberOfParticipants || 0) * (deal.coursePrice || 0)
    }

    return total + (dealTotal * certainty)
  }, 0)
}

/**
 * Get the full year forecast from a client financial record
 * Calculates from deal details if fullYearForecast is not set
 * @param {Object} cf - Client financial record
 * @returns {number} Full year forecast amount
 */
const getFullYearForecastFromRecord = (cf) => {
  // If fullYearForecast is explicitly set and greater than 0, use it
  if (cf.fullYearForecast && cf.fullYearForecast > 0) {
    return cf.fullYearForecast
  }

  // Otherwise, calculate from deal details
  const productLine = (cf.productLine || '').toLowerCase()
  let forecast = 0

  if (productLine.includes('learnership')) {
    forecast = calculateForecastFromDeals(cf.learnershipDetails, 'learnership')
  } else if (productLine.includes('tap') || productLine.includes('business')) {
    forecast = calculateForecastFromDeals(cf.tapBusinessDetails, 'tap')
  } else if (productLine.includes('compliance')) {
    forecast = calculateForecastFromDeals(cf.complianceDetails, 'compliance')
  } else if (productLine.includes('course') || productLine.includes('other')) {
    forecast = calculateForecastFromDeals(cf.otherCoursesDetails, 'other')
  }

  return forecast
}

/**
 * Normalize product line name to standard format
 * @param {string} productLine - Product line name
 * @returns {string} Normalized product line name
 */
const normalizeProductLine = (productLine) => {
  if (!productLine) return 'Other'
  const normalized = productLine.toLowerCase().replace(/\s+/g, '')

  if (normalized.includes('learnership')) return 'Learnerships'
  if (normalized.includes('tap') || normalized === 'tapbusiness') return 'TAP Business'
  if (normalized.includes('compliance')) return 'Compliance Training'
  if (normalized.includes('othercourse') || normalized === 'othercourses') return 'Other Courses'
  if (normalized === 'other') return 'Other' // Keep "Other" as separate catch-all category

  return productLine // Return original if no match
}

/**
 * Get budget vs forecast comparison for all salespeople
 * @param {string} financialYear - Financial year
 * @returns {Promise<Array>} Array with budget vs forecast data per salesperson
 */
export const getBudgetVsForecast = async (financialYear) => {
  try {
    const [budgets, clientFinancials, clients, users] = await Promise.all([
      getBudgets(financialYear),
      getClientFinancials(),
      getClients(),
      getUsers()
    ])

    // Filter financials for the specified year
    // Handle different financial year formats: "2024/2025" vs "2025" vs 2025
    const yearFinancials = clientFinancials.filter(cf => {
      const cfYear = String(cf.financialYear || '')
      const targetYear = String(financialYear || '')

      // Direct match
      if (cfYear === targetYear) return true

      // If target is "2024/2025" format, extract end year and match against "2025"
      if (targetYear.includes('/')) {
        const endYear = targetYear.split('/')[1]
        if (cfYear === endYear) return true
      }

      // If cfYear is "2024/2025" format and target is just "2025"
      if (cfYear.includes('/')) {
        const endYear = cfYear.split('/')[1]
        if (endYear === targetYear) return true
      }

      return false
    })

    // Group financials by salesperson (via client assignment)
    const salespersonForecasts = {}

    // Legacy product lines to exclude completely (same as Dashboard)
    // Note: includes common typos like 'conculting'
    const legacyProductLines = ['general', 'consulting', 'conculting']

    yearFinancials.forEach(cf => {
      const client = clients.find(c => c.id === cf.clientId)
      if (!client || !client.assignedSalesPerson) return

      // Skip legacy product lines
      const rawProductLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
      if (legacyProductLines.includes(rawProductLine)) return
      // Also skip if it contains 'consult' (catches consulting, conculting, etc.)
      if (rawProductLine.includes('consult')) return

      const spId = client.assignedSalesPerson
      if (!salespersonForecasts[spId]) {
        salespersonForecasts[spId] = {}
      }

      // Normalize product line name to match budget categories
      const productLine = normalizeProductLine(cf.productLine)
      if (!salespersonForecasts[spId][productLine]) {
        salespersonForecasts[spId][productLine] = {
          forecast: 0
        }
      }

      // Use fullYearForecast directly (consistent with Dashboard calculation)
      const forecast = cf.fullYearForecast || 0
      salespersonForecasts[spId][productLine].forecast += forecast
    })

    // Build comparison data
    const comparison = users.map(user => {
      const userBudgets = budgets.filter(b => b.salespersonId === user.id)
      const userForecasts = salespersonForecasts[user.id] || {}

      // Get all product lines from both budgets and forecasts
      const productLines = new Set([
        ...userBudgets.map(b => b.productLine),
        ...Object.keys(userForecasts)
      ])

      const productData = {}
      let totalBudget = 0
      let totalForecast = 0

      productLines.forEach(pl => {
        const budget = userBudgets.find(b => b.productLine === pl)?.budgetAmount || 0
        const forecast = userForecasts[pl]?.forecast || 0

        productData[pl] = { budget, forecast }
        totalBudget += budget
        totalForecast += forecast
      })

      return {
        userId: user.id,
        userName: user.displayName || user.email || 'Unknown',
        productData,
        totalBudget,
        totalForecast,
        variance: totalForecast - totalBudget,
        variancePercent: totalBudget > 0 ? ((totalForecast - totalBudget) / totalBudget) * 100 : 0
      }
    }).filter(u => u.totalBudget > 0 || u.totalForecast > 0)

    return comparison
  } catch (error) {
    console.error('Error getting budget vs forecast:', error)
    return []
  }
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

/**
 * Get financial year settings for a tenant
 * @param {string} tenantId - Optional tenant ID. If provided, looks for tenant-specific settings first.
 * @returns {Promise<Object>} Financial year settings
 *
 * Priority order:
 * 1. Tenant-specific settings (systemSettings/financialYear_{tenantId})
 * 2. System-wide defaults (systemSettings/financialYear)
 * 3. Hardcoded defaults
 */
export const getFinancialYearSettings = async (tenantId = null) => {
  try {
    // Default settings
    const defaults = {
      currentFinancialYear: '2024/2025',
      financialYearStart: 'March',
      financialYearEnd: 'February',
      reportingMonth: 'February',
      currencySymbol: 'R'
    }

    // Try tenant-specific settings first
    if (tenantId) {
      const tenantFyRef = doc(db, 'systemSettings', `financialYear_${tenantId}`)
      const tenantFySnap = await getDoc(tenantFyRef)

      if (tenantFySnap.exists()) {
        const data = tenantFySnap.data()
        return {
          currentFinancialYear: data.currentFinancialYear || defaults.currentFinancialYear,
          financialYearStart: data.financialYearStart || defaults.financialYearStart,
          financialYearEnd: data.financialYearEnd || defaults.financialYearEnd,
          reportingMonth: data.reportingMonth || data.financialYearEnd || defaults.reportingMonth,
          currencySymbol: data.currencySymbol || defaults.currencySymbol,
          tenantId: tenantId,
          isSystemWide: false
        }
      }
    }

    // Fall back to system-wide settings
    const fyRef = doc(db, 'systemSettings', 'financialYear')
    const fySnap = await getDoc(fyRef)

    if (fySnap.exists()) {
      const data = fySnap.data()
      return {
        currentFinancialYear: data.currentFinancialYear || defaults.currentFinancialYear,
        financialYearStart: data.financialYearStart || defaults.financialYearStart,
        financialYearEnd: data.financialYearEnd || defaults.financialYearEnd,
        reportingMonth: data.reportingMonth || data.financialYearEnd || defaults.reportingMonth,
        currencySymbol: data.currencySymbol || defaults.currencySymbol,
        tenantId: null,
        isSystemWide: true
      }
    }

    // Return defaults if nothing is set
    return {
      ...defaults,
      tenantId: null,
      isSystemWide: true
    }
  } catch (error) {
    console.error('Error getting financial year settings:', error)
    throw error
  }
}

/**
 * Save financial year settings for a tenant
 * @param {Object} settings - Financial year settings
 * @param {string} tenantId - Optional tenant ID. If provided, saves as tenant-specific.
 */
export const saveFinancialYearSettings = async (settings, tenantId = null) => {
  try {
    const docId = tenantId ? `financialYear_${tenantId}` : 'financialYear'
    const fyRef = doc(db, 'systemSettings', docId)

    await setDoc(fyRef, {
      ...settings,
      tenantId: tenantId || null,
      updatedAt: serverTimestamp()
    }, { merge: true })

    return { success: true, docId }
  } catch (error) {
    console.error('Error saving financial year settings:', error)
    throw error
  }
}

// Helper function to get month number from month name
const getMonthNumber = (monthName) => {
  const months = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  }
  return months[monthName] ?? 2 // Default to March if invalid
}

// Helper function to get month name from number
const getMonthName = (monthNumber) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return months[monthNumber] ?? 'March'
}

// Helper function to calculate which months are YTD vs remaining
// Uses "Month 1", "Month 2", ... "Month 12" format for consistency with uploads
export const calculateFinancialYearMonths = async (tenantId = null) => {
  try {
    const fySettings = await getFinancialYearSettings(tenantId)
    const fyStartMonth = getMonthNumber(fySettings.financialYearStart || 'March')
    const fyEndMonth = getMonthNumber(fySettings.financialYearEnd || 'February')
    const reportingMonthNumber = getMonthNumber(fySettings.reportingMonth || fySettings.financialYearEnd || 'February')

    // Determine financial year end year from string like "2024/2025"
    let fyEndYear = new Date().getFullYear()
    if (typeof fySettings.currentFinancialYear === 'string') {
      const parts = fySettings.currentFinancialYear.split('/')
      const endYearStr = parts[1] || parts[0]
      const parsed = parseInt(endYearStr, 10)
      if (!isNaN(parsed)) {
        fyEndYear = parsed
      }
    }

    // Calculate which months are in the current FY
    // Using actual month names (March, April, etc.) based on financial year start
    const fyMonths = []
    let calendarMonth = fyStartMonth
    let year = fyStartMonth > fyEndMonth ? fyEndYear - 1 : fyEndYear

    // Generate 12 months with actual month names
    for (let i = 0; i < 12; i++) {
      const monthName = getMonthName(calendarMonth)
      fyMonths.push({
        name: monthName,                  // Use actual month name: March, April, etc.
        calendarMonth: calendarMonth,     // Actual calendar month (0-11)
        calendarMonthName: monthName,     // Same as name for consistency
        year: year,
        fyMonthNumber: i + 1,             // 1-indexed position in FY
        isYTD: false,
        isRemaining: false
      })

      calendarMonth++
      if (calendarMonth > 11) {
        calendarMonth = 0
        year++
      }
    }

    // Calculate which FY month number the reporting month corresponds to
    // e.g., If FY starts March and reporting is November, that's the 9th month (March=1, Apr=2, ..., Nov=9)
    let reportingFyMonth = 0
    for (let i = 0; i < fyMonths.length; i++) {
      if (fyMonths[i].calendarMonth === reportingMonthNumber) {
        reportingFyMonth = i + 1  // 1-indexed
        break
      }
    }

    // Mark YTD months (from FY start through reporting month)
    // Mark remaining months (after reporting month through FY end)
    if (reportingFyMonth > 0) {
      for (let i = 0; i < reportingFyMonth; i++) {
        fyMonths[i].isYTD = true
      }
      for (let i = reportingFyMonth; i < fyMonths.length; i++) {
        fyMonths[i].isRemaining = true
      }
    }

    console.log('calculateFinancialYearMonths:', {
      fyStartMonth: getMonthName(fyStartMonth),
      reportingMonth: fySettings.reportingMonth,
      reportingFyMonth,
      ytdMonthCount: fyMonths.filter(m => m.isYTD).length,
      ytdMonthNames: fyMonths.filter(m => m.isYTD).map(m => m.name)
    })

    return {
      currentFinancialYear: fySettings.currentFinancialYear,  // Return the original string (e.g., "2024/2025")
      fyEndYear,  // Also include the parsed year for calculations
      fyStartMonth,
      fyEndMonth,
      reportingMonth: reportingMonthNumber,
      reportingMonthName: fySettings.reportingMonth,
      reportingFyMonth,  // Which Month N the reporting month is
      months: fyMonths,
      ytdMonths: fyMonths.filter(m => m.isYTD),
      remainingMonths: fyMonths.filter(m => m.isRemaining)
    }
  } catch (error) {
    console.error('Error calculating financial year months:', error)
    throw error
  }
}

// ============================================================================
// CLIENT FINANCIALS (Detailed Forecasting)
// ============================================================================

/**
 * Get a single client financial record
 * @param {string} clientId - Client ID
 * @param {number} financialYear - Financial year (e.g., 2025)
 * @param {string} productLine - Product line name
 * @returns {Promise<Object|null>} Client financial record or null
 */
export const getClientFinancial = async (clientId, financialYear, productLine) => {
  try {
    // Use composite key: clientId_financialYear_productLine
    const financialId = `${clientId}_${financialYear}_${productLine.replace(/\s+/g, '_')}`
    const financialRef = doc(db, 'clientFinancials', financialId)
    const financialSnap = await getDoc(financialRef)
    
    if (financialSnap.exists()) {
      return { id: financialSnap.id, ...financialSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting client financial:', error)
    throw error
  }
}

/**
 * Get all client financials for a specific financial year
 * @param {number} financialYear - Financial year (e.g., 2025)
 * @param {Object} filters - Optional filters (clientId, productLine)
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancialsByYear = async (financialYear, filters = {}) => {
  try {
    const financialsRef = collection(db, 'clientFinancials')
    let q

    // Use single field queries to avoid needing composite indexes
    if (filters.clientId) {
      q = query(financialsRef, where('clientId', '==', filters.clientId))
    } else {
      q = query(financialsRef, where('financialYear', '==', financialYear))
    }

    const snapshot = await getDocs(q)
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Apply client-side filtering
    if (filters.clientId && financialYear) {
      results = results.filter(r => r.financialYear === financialYear)
    }
    if (filters.productLine) {
      results = results.filter(r => r.productLine === filters.productLine)
    }

    return results
  } catch (error) {
    console.error('Error getting client financials by year:', error)
    return [] // Return empty array instead of throwing
  }
}

/**
 * Get all client financials for a specific client
 * @param {string} clientId - Client ID
 * @param {number} financialYear - Optional financial year filter
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancialsByClient = async (clientId, financialYear = null) => {
  try {
    const financialsRef = collection(db, 'clientFinancials')
    let q = query(
      financialsRef,
      where('clientId', '==', clientId),
      orderBy('financialYear', 'desc'),
      orderBy('productLine', 'asc')
    )
    
    if (financialYear) {
      q = query(q, where('financialYear', '==', financialYear))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting client financials by client:', error)
    throw error
  }
}

/**
 * Calculate full year forecast from YTD + remaining months
 * @param {Object} financialData - Financial data object with history and months
 * @returns {number} Full year forecast amount
 */
export const calculateFullYearForecast = (financialData) => {
  const ytd = financialData.history?.currentYearYTD || 0
  const months = financialData.months || {}
  
  // Sum all remaining month forecasts
  const remainingMonthsTotal = Object.values(months).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0)
  }, 0)
  
  return ytd + remainingMonthsTotal
}

/**
 * Save or update a client financial record
 * @param {string} clientId - Client ID
 * @param {string} clientName - Client name (denormalized)
 * @param {number} financialYear - Financial year
 * @param {string} productLine - Product line name
 * @param {Object} financialData - Financial data to save
 * @param {string} userId - User ID who is making the update
 * @returns {Promise<string>} Document ID
 */
export const saveClientFinancial = async (clientId, clientName, financialYear, productLine, financialData, userId) => {
  try {
    // Use composite key: clientId_financialYear_productLine
    const financialId = `${clientId}_${financialYear}_${productLine.replace(/\s+/g, '_')}`
    const financialRef = doc(db, 'clientFinancials', financialId)
    const financialSnap = await getDoc(financialRef)
    
    // Calculate full year forecast
    const fullYearForecast = calculateFullYearForecast(financialData)
    
    // Use the pre-calculated fullYearForecast if provided, otherwise calculate from months
    const finalFullYearForecast = financialData.fullYearForecast !== undefined
      ? financialData.fullYearForecast
      : fullYearForecast

    const updateData = {
      clientId,
      clientName,
      financialYear,
      productLine,
      history: financialData.history || {
        yearMinus1: 0,
        yearMinus2: 0,
        yearMinus3: 0,
        currentYearYTD: 0
      },
      months: financialData.months || {},
      fullYearForecast: finalFullYearForecast,
      comments: financialData.comments || '',
      learnershipDetails: financialData.learnershipDetails || [],
      tapBusinessDetails: financialData.tapBusinessDetails || [],
      complianceDetails: financialData.complianceDetails || [],
      otherCoursesDetails: financialData.otherCoursesDetails || [],
      lastUpdatedBy: userId,
      lastUpdatedAt: serverTimestamp()
    }
    
    if (!financialSnap.exists()) {
      updateData.createdAt = serverTimestamp()
    }
    
    await setDoc(financialRef, updateData, { merge: true })
    return financialId
  } catch (error) {
    console.error('Error saving client financial:', error)
    throw error
  }
}

/**
 * Batch save multiple client financial records (for CSV import)
 * @param {Array} financialRecords - Array of financial record objects
 * @param {string} userId - User ID who is making the update
 * @returns {Promise<Object>} Result object with success count and errors
 */
export const batchSaveClientFinancials = async (financialRecords, userId) => {
  try {
    const batch = writeBatch(db)
    const errors = []
    let successCount = 0
    
    for (const record of financialRecords) {
      try {
        const { clientId, clientName, financialYear, productLine, financialData } = record
        
        if (!clientId || !financialYear || !productLine) {
          errors.push({
            record,
            error: 'Missing required fields: clientId, financialYear, or productLine'
          })
          continue
        }
        
        // Calculate full year forecast
        const fullYearForecast = calculateFullYearForecast(financialData)
        
        const financialId = `${clientId}_${financialYear}_${productLine.replace(/\s+/g, '_')}`
        const financialRef = doc(db, 'clientFinancials', financialId)
        
        const updateData = {
          clientId,
          clientName: clientName || '',
          financialYear,
          productLine,
          history: financialData.history || {
            yearMinus1: 0,
            yearMinus2: 0,
            yearMinus3: 0,
            currentYearYTD: 0
          },
          months: financialData.months || {},
          fullYearForecast,
          comments: financialData.comments || '',
          learnershipDetails: financialData.learnershipDetails || [],
          lastUpdatedBy: userId,
          lastUpdatedAt: serverTimestamp()
        }
        
        // Check if document exists to preserve createdAt
        const financialSnap = await getDoc(financialRef)
        if (!financialSnap.exists()) {
          updateData.createdAt = serverTimestamp()
        }
        
        batch.set(financialRef, updateData, { merge: true })
        successCount++
      } catch (error) {
        errors.push({
          record,
          error: error.message || 'Unknown error'
        })
      }
    }
    
    if (successCount > 0) {
      await batch.commit()
    }
    
    return {
      successCount,
      errorCount: errors.length,
      errors
    }
  } catch (error) {
    console.error('Error batch saving client financials:', error)
    throw error
  }
}

/**
 * Delete a client financial record
 * @param {string} financialId - Financial record ID
 * @returns {Promise<void>}
 */
export const deleteClientFinancial = async (financialId) => {
  try {
    const financialRef = doc(db, 'clientFinancials', financialId)
    await deleteDoc(financialRef)
  } catch (error) {
    console.error('Error deleting client financial:', error)
    throw error
  }
}

/**
 * Get client financials filtered by client IDs
 * @param {Array<string>} clientIds - Array of client IDs to filter by (required)
 * @returns {Promise<Array>} Array of client financial records
 */
export const getClientFinancials = async (clientIds = null) => {
  try {
    // If clientIds is an empty array, return empty (no clients = no financials)
    if (Array.isArray(clientIds) && clientIds.length === 0) {
      return []
    }

    const financialsRef = collection(db, 'clientFinancials')
    const snapshot = await getDocs(financialsRef)
    const allFinancials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Filter by client IDs if provided
    if (clientIds && clientIds.length > 0) {
      return allFinancials.filter(f => clientIds.includes(f.clientId))
    }

    return allFinancials
  } catch (error) {
    console.error('Error getting client financials:', error)
    return []
  }
}

/**
 * Get aggregated financial summary by product line for a financial year
 * @param {number} financialYear - Financial year
 * @returns {Promise<Object>} Aggregated data by product line
 */
export const getFinancialSummaryByProductLine = async (financialYear) => {
  try {
    const financials = await getClientFinancialsByYear(financialYear)
    
    const summary = {}
    
    financials.forEach(financial => {
      const productLine = financial.productLine || 'Other'
      
      if (!summary[productLine]) {
        summary[productLine] = {
          productLine,
          totalYTD: 0,
          totalForecast: 0,
          clientCount: 0,
          yearMinus1: 0,
          yearMinus2: 0,
          yearMinus3: 0
        }
      }
      
      summary[productLine].totalYTD += financial.history?.currentYearYTD || 0
      summary[productLine].totalForecast += financial.fullYearForecast || 0
      summary[productLine].clientCount++
      summary[productLine].yearMinus1 += financial.history?.yearMinus1 || 0
      summary[productLine].yearMinus2 += financial.history?.yearMinus2 || 0
      summary[productLine].yearMinus3 += financial.history?.yearMinus3 || 0
    })
    
    return Object.values(summary)
  } catch (error) {
    console.error('Error getting financial summary by product line:', error)
    throw error
  }
}

// ============================================================================
// SKILLS PARTNER MANAGEMENT
// ============================================================================

/**
 * Get all skills partners (optionally filtered by tenant)
 * @param {string} tenantId - Optional tenant ID to filter by
 */
export const getSkillsPartners = async (tenantId = null) => {
  try {
    const partnersRef = collection(db, 'skillsPartners')
    let snapshot

    if (tenantId) {
      // Filter by tenant
      const q = query(partnersRef, where('tenantId', '==', tenantId))
      snapshot = await getDocs(q)
    } else {
      // Return all partners (for system admin or backward compatibility)
      snapshot = await getDocs(partnersRef)
    }

    const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    // Sort by name in JavaScript to avoid needing a Firestore index
    return partners.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting skills partners:', error)
    // Return empty array instead of throwing to prevent UI from breaking
    return []
  }
}

/**
 * Get a single skills partner by ID
 */
export const getSkillsPartner = async (partnerId) => {
  try {
    const partnerRef = doc(db, 'skillsPartners', partnerId)
    const partnerSnap = await getDoc(partnerRef)

    if (partnerSnap.exists()) {
      return { id: partnerSnap.id, ...partnerSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting skills partner:', error)
    throw error
  }
}

/**
 * Create a new skills partner
 * @param {Object} partnerData - Partner data including tenantId
 */
export const createSkillsPartner = async (partnerData) => {
  try {
    const partnersRef = collection(db, 'skillsPartners')
    const newPartner = {
      ...partnerData,
      tenantId: partnerData.tenantId || null, // Ensure tenantId is included
      status: partnerData.status || 'Active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(partnersRef, newPartner)
    return docRef.id
  } catch (error) {
    console.error('Error creating skills partner:', error)
    throw error
  }
}

/**
 * Update an existing skills partner
 */
export const updateSkillsPartner = async (partnerId, partnerData) => {
  try {
    const partnerRef = doc(db, 'skillsPartners', partnerId)
    await updateDoc(partnerRef, {
      ...partnerData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating skills partner:', error)
    throw error
  }
}

/**
 * Delete a skills partner and clear references from clients
 */
export const deleteSkillsPartner = async (partnerId) => {
  try {
    // First, find all clients with this skills partner and clear the reference
    const clientsRef = collection(db, 'clients')
    const q = query(clientsRef, where('skillsPartnerId', '==', partnerId))
    const snapshot = await getDocs(q)

    // Use a batch to update all clients and delete the partner
    const batch = writeBatch(db)

    // Clear skillsPartnerId from all affected clients
    snapshot.docs.forEach(clientDoc => {
      batch.update(clientDoc.ref, {
        skillsPartnerId: null,
        updatedAt: serverTimestamp()
      })
    })

    // Delete the skills partner
    const partnerRef = doc(db, 'skillsPartners', partnerId)
    batch.delete(partnerRef)

    await batch.commit()

    return { deletedPartnerId: partnerId, clientsUpdated: snapshot.docs.length }
  } catch (error) {
    console.error('Error deleting skills partner:', error)
    throw error
  }
}

/**
 * Get clients with allocation info (for manager dashboard)
 * @param {string} tenantId - Optional tenant ID to filter by
 */
export const getClientsWithAllocationStatus = async (tenantId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    let snapshot

    if (tenantId) {
      const q = query(clientsRef, where('tenantId', '==', tenantId))
      snapshot = await getDocs(q)
    } else {
      snapshot = await getDocs(clientsRef)
    }

    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Get all users for name lookup
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const users = {}
    usersSnapshot.docs.forEach(doc => {
      users[doc.id] = doc.data()
    })

    // Get all skills partners for name lookup
    const partnersSnapshot = await getDocs(collection(db, 'skillsPartners'))
    const partners = {}
    partnersSnapshot.docs.forEach(doc => {
      partners[doc.id] = doc.data()
    })

    // Enrich clients with user/partner names
    return clients.map(client => ({
      ...client,
      salesPersonName: client.assignedSalesPerson ?
        (users[client.assignedSalesPerson]?.displayName || users[client.assignedSalesPerson]?.email || 'Unknown') : null,
      skillsPartnerName: client.skillsPartnerId ?
        (partners[client.skillsPartnerId]?.name || 'Unknown') : null,
      hasUnallocatedSalesPerson: !client.assignedSalesPerson,
      hasUnallocatedSkillsPartner: !client.skillsPartnerId
    }))
  } catch (error) {
    console.error('Error getting clients with allocation status:', error)
    throw error
  }
}

/**
 * Assign a sales person to a client
 */
export const assignSalesPersonToClient = async (clientId, userId) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    await updateDoc(clientRef, {
      assignedSalesPerson: userId,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error assigning sales person:', error)
    throw error
  }
}

/**
 * Assign a skills partner to a client
 */
export const assignSkillsPartnerToClient = async (clientId, partnerId) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    await updateDoc(clientRef, {
      skillsPartnerId: partnerId,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error assigning skills partner:', error)
    throw error
  }
}

// ============================================================================
// PRODUCT CATALOG MANAGEMENT
// ============================================================================

/**
 * Get all product lines (categories)
 */
export const getProductLines = async () => {
  try {
    const productLinesRef = collection(db, 'productLines')
    const snapshot = await getDocs(productLinesRef)
    const productLines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return productLines.sort((a, b) => (a.order || 0) - (b.order || 0))
  } catch (error) {
    console.error('Error getting product lines:', error)
    return []
  }
}

/**
 * Create or update a product line
 */
export const saveProductLine = async (productLineData, productLineId = null) => {
  try {
    if (productLineId) {
      const productLineRef = doc(db, 'productLines', productLineId)
      await updateDoc(productLineRef, {
        ...productLineData,
        updatedAt: serverTimestamp()
      })
      return productLineId
    } else {
      const productLinesRef = collection(db, 'productLines')
      const docRef = await addDoc(productLinesRef, {
        ...productLineData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    }
  } catch (error) {
    console.error('Error saving product line:', error)
    throw error
  }
}

/**
 * Update a product line by ID
 */
export const updateProductLine = async (productLineId, updateData) => {
  try {
    const productLineRef = doc(db, 'productLines', productLineId)
    await updateDoc(productLineRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    })
    return productLineId
  } catch (error) {
    console.error('Error updating product line:', error)
    throw error
  }
}

/**
 * Get all products from the catalog
 */
export const getProducts = async (productLineId = null) => {
  try {
    const productsRef = collection(db, 'products')
    let q = query(productsRef)

    if (productLineId) {
      q = query(productsRef, where('productLineId', '==', productLineId))
    }

    const snapshot = await getDocs(q)
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (error) {
    console.error('Error getting products:', error)
    return []
  }
}

/**
 * Get a single product by ID
 */
export const getProduct = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId)
    const productSnap = await getDoc(productRef)
    if (productSnap.exists()) {
      return { id: productSnap.id, ...productSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting product:', error)
    throw error
  }
}

/**
 * Create a new product in the catalog
 */
export const createCatalogProduct = async (productData) => {
  try {
    const productsRef = collection(db, 'products')
    const docRef = await addDoc(productsRef, {
      ...productData,
      status: productData.status || 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating catalog product:', error)
    throw error
  }
}

// Alias for backward compatibility
export const createProduct = createCatalogProduct

/**
 * Update an existing product
 */
export const updateProduct = async (productId, productData) => {
  try {
    const productRef = doc(db, 'products', productId)
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

/**
 * Delete (archive) a product
 */
export const archiveProduct = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId)
    await updateDoc(productRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error archiving product:', error)
    throw error
  }
}

// ============================================================================
// CALCULATION METHODS
// ============================================================================

/**
 * Default calculation methods - these define the structure and formula for each product line
 * Admin can edit the configurable options (dropdowns, defaults) but formula changes require code updates
 */
export const DEFAULT_CALCULATION_METHODS = {
  learnerships: {
    id: 'learnerships',
    name: 'Learnerships',
    description: 'Calculation for learnership programs',
    version: '1.0',
    fields: [
      { id: 'learnerCount', name: 'Number of Learners', type: 'number', required: true },
      { id: 'costPerLearner', name: 'Cost per Learner (R)', type: 'currency', required: true },
      { id: 'nqfLevel', name: 'NQF Level', type: 'select', required: true, optionsKey: 'nqfLevels' },
      { id: 'duration', name: 'Duration (Months)', type: 'number', required: true, default: 12 },
      { id: 'startDate', name: 'Start Date', type: 'date', required: false },
      { id: 'endDate', name: 'End Date', type: 'date', required: false }
    ],
    formula: 'learnerCount * costPerLearner',
    formulaDescription: 'Number of Learners × Cost per Learner'
  },
  tapBusiness: {
    id: 'tapBusiness',
    name: 'TAP Business',
    description: 'Calculation for TAP platform subscriptions',
    version: '1.0',
    fields: [
      { id: 'employeeCount', name: 'Number of Employees', type: 'number', required: true },
      { id: 'packageType', name: 'Package Type', type: 'select', required: true, optionsKey: 'tapPackages' },
      { id: 'monthlyFee', name: 'Monthly Fee per Employee (R)', type: 'currency', required: true },
      { id: 'contractMonths', name: 'Contract Duration (Months)', type: 'number', required: true, default: 12 }
    ],
    formula: 'employeeCount * monthlyFee * contractMonths',
    formulaDescription: 'Employees × Monthly Fee × Contract Months'
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance Training',
    description: 'Calculation for compliance and safety training',
    version: '1.0',
    fields: [
      { id: 'traineeCount', name: 'Number of Trainees', type: 'number', required: true },
      { id: 'courseType', name: 'Course Type', type: 'select', required: true, optionsKey: 'complianceCourses' },
      { id: 'costPerTrainee', name: 'Cost per Trainee (R)', type: 'currency', required: true },
      { id: 'trainingDate', name: 'Training Date', type: 'date', required: false }
    ],
    formula: 'traineeCount * costPerTrainee',
    formulaDescription: 'Number of Trainees × Cost per Trainee'
  },
  otherCourses: {
    id: 'otherCourses',
    name: 'Other Courses',
    description: 'Calculation for general training courses',
    version: '1.0',
    fields: [
      { id: 'participantCount', name: 'Number of Participants', type: 'number', required: true },
      { id: 'courseName', name: 'Course', type: 'select', required: true, optionsKey: 'generalCourses' },
      { id: 'durationDays', name: 'Duration (Days)', type: 'number', required: true, default: 1 },
      { id: 'dailyRate', name: 'Daily Rate (R)', type: 'currency', required: true },
      { id: 'courseDate', name: 'Course Date', type: 'date', required: false }
    ],
    formula: 'participantCount * durationDays * dailyRate',
    formulaDescription: 'Participants × Days × Daily Rate'
  }
}

/**
 * Get calculation method options (admin-configurable dropdowns)
 */
export const getCalculationOptions = async () => {
  try {
    const optionsRef = doc(db, 'systemSettings', 'calculationOptions')
    const optionsSnap = await getDoc(optionsRef)

    if (optionsSnap.exists()) {
      return optionsSnap.data()
    }

    // Return defaults if not configured
    return {
      nqfLevels: [
        { id: 'nqf1', name: 'NQF Level 1', value: 1 },
        { id: 'nqf2', name: 'NQF Level 2', value: 2 },
        { id: 'nqf3', name: 'NQF Level 3', value: 3 },
        { id: 'nqf4', name: 'NQF Level 4', value: 4 },
        { id: 'nqf5', name: 'NQF Level 5', value: 5 },
        { id: 'nqf6', name: 'NQF Level 6', value: 6 }
      ],
      tapPackages: [
        { id: 'basic', name: 'Basic Package', value: 'basic' },
        { id: 'standard', name: 'Standard Package', value: 'standard' },
        { id: 'premium', name: 'Premium Package', value: 'premium' },
        { id: 'enterprise', name: 'Enterprise Package', value: 'enterprise' }
      ],
      complianceCourses: [
        { id: 'first-aid-1', name: 'First Aid Level 1', value: 'first-aid-1' },
        { id: 'first-aid-2', name: 'First Aid Level 2', value: 'first-aid-2' },
        { id: 'first-aid-3', name: 'First Aid Level 3', value: 'first-aid-3' },
        { id: 'fire-safety', name: 'Fire Safety', value: 'fire-safety' },
        { id: 'ohs', name: 'Occupational Health & Safety', value: 'ohs' },
        { id: 'hazmat', name: 'Hazardous Materials Handling', value: 'hazmat' },
        { id: 'food-safety', name: 'Food Safety & Hygiene', value: 'food-safety' }
      ],
      generalCourses: [
        { id: 'excel-basic', name: 'Excel Basic', value: 'excel-basic' },
        { id: 'excel-advanced', name: 'Excel Advanced', value: 'excel-advanced' },
        { id: 'word', name: 'Microsoft Word', value: 'word' },
        { id: 'powerpoint', name: 'PowerPoint', value: 'powerpoint' },
        { id: 'project-mgmt', name: 'Project Management', value: 'project-mgmt' },
        { id: 'leadership', name: 'Leadership Skills', value: 'leadership' },
        { id: 'communication', name: 'Business Communication', value: 'communication' },
        { id: 'time-mgmt', name: 'Time Management', value: 'time-mgmt' }
      ]
    }
  } catch (error) {
    console.error('Error getting calculation options:', error)
    return {}
  }
}

/**
 * Save calculation method options (admin function)
 */
export const saveCalculationOptions = async (options) => {
  try {
    const optionsRef = doc(db, 'systemSettings', 'calculationOptions')
    await setDoc(optionsRef, {
      ...options,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error saving calculation options:', error)
    throw error
  }
}

/**
 * Get default product lines for salesperson forecast view
 */
export const getDefaultSalespersonProductLines = async () => {
  try {
    const settingsRef = doc(db, 'systemSettings', 'salespersonDefaults')
    const settingsDoc = await getDoc(settingsRef)

    if (settingsDoc.exists()) {
      return settingsDoc.data().defaultProductLines || []
    }

    // Return empty array to indicate defaults should be used
    return []
  } catch (error) {
    console.error('Error getting default salesperson product lines:', error)
    return []
  }
}

/**
 * Save default product lines for salesperson forecast view (admin function)
 */
export const saveDefaultSalespersonProductLines = async (productLines) => {
  try {
    const settingsRef = doc(db, 'systemSettings', 'salespersonDefaults')
    await setDoc(settingsRef, {
      defaultProductLines: productLines,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error saving default salesperson product lines:', error)
    throw error
  }
}

/**
 * Calculate total for a product based on its calculation method
 */
export const calculateProductTotal = (calculationMethodId, fieldValues) => {
  const method = DEFAULT_CALCULATION_METHODS[calculationMethodId]
  if (!method) return 0

  try {
    switch (calculationMethodId) {
      case 'learnerships':
        return (fieldValues.learnerCount || 0) * (fieldValues.costPerLearner || 0)

      case 'tapBusiness':
        return (fieldValues.employeeCount || 0) * (fieldValues.monthlyFee || 0) * (fieldValues.contractMonths || 12)

      case 'compliance':
        return (fieldValues.traineeCount || 0) * (fieldValues.costPerTrainee || 0)

      case 'otherCourses':
        return (fieldValues.participantCount || 0) * (fieldValues.durationDays || 1) * (fieldValues.dailyRate || 0)

      default:
        return 0
    }
  } catch (error) {
    console.error('Error calculating product total:', error)
    return 0
  }
}

/**
 * Add a product to a client (using predefined product from catalog)
 */
export const addClientProduct = async (clientId, productData) => {
  try {
    const productsRef = collection(db, 'clients', clientId, 'products')
    const docRef = await addDoc(productsRef, {
      ...productData,
      calculatedTotal: calculateProductTotal(productData.calculationMethodId, productData.fieldValues || {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding client product:', error)
    throw error
  }
}

/**
 * Update a client's product
 */
export const updateClientProduct = async (clientId, productId, productData) => {
  try {
    const productRef = doc(db, 'clients', clientId, 'products', productId)
    await updateDoc(productRef, {
      ...productData,
      calculatedTotal: calculateProductTotal(productData.calculationMethodId, productData.fieldValues || {}),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating client product:', error)
    throw error
  }
}

/**
 * Get all products for a client
 */
export const getClientProducts = async (clientId) => {
  try {
    const productsRef = collection(db, 'clients', clientId, 'products')
    const snapshot = await getDocs(productsRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting client products:', error)
    return []
  }
}

/**
 * Delete a client's product
 */
export const deleteClientProduct = async (clientId, productId) => {
  try {
    const productRef = doc(db, 'clients', clientId, 'products', productId)
    await deleteDoc(productRef)
  } catch (error) {
    console.error('Error deleting client product:', error)
    throw error
  }
}

/**
 * Initialize default product lines, products, and calculation options (for first-time setup)
 */
export const initializeProductCatalog = async () => {
  try {
    const batch = writeBatch(db)

    // Create default product lines with their calculation methods
    const productLines = [
      { id: 'learnerships', name: 'Learnerships', calculationMethodId: 'learnerships', order: 1, status: 'active' },
      { id: 'tapBusiness', name: 'TAP Business', calculationMethodId: 'tapBusiness', order: 2, status: 'active' },
      { id: 'compliance', name: 'Compliance Training', calculationMethodId: 'compliance', order: 3, status: 'active' },
      { id: 'otherCourses', name: 'Other Courses', calculationMethodId: 'otherCourses', order: 4, status: 'active' }
    ]

    for (const pl of productLines) {
      const plRef = doc(db, 'productLines', pl.id)
      batch.set(plRef, {
        ...pl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    // Create sample products for each product line
    const products = [
      // Learnerships
      { name: 'NQF4 Business Administration Learnership', productLineId: 'learnerships', defaultCostPerLearner: 35000, status: 'active' },
      { name: 'NQF4 Generic Management Learnership', productLineId: 'learnerships', defaultCostPerLearner: 38000, status: 'active' },
      { name: 'NQF2 Contact Centre Learnership', productLineId: 'learnerships', defaultCostPerLearner: 25000, status: 'active' },
      { name: 'NQF3 IT Support Learnership', productLineId: 'learnerships', defaultCostPerLearner: 32000, status: 'active' },

      // TAP Business
      { name: 'TAP Basic Package', productLineId: 'tapBusiness', defaultMonthlyFee: 150, status: 'active' },
      { name: 'TAP Standard Package', productLineId: 'tapBusiness', defaultMonthlyFee: 250, status: 'active' },
      { name: 'TAP Premium Package', productLineId: 'tapBusiness', defaultMonthlyFee: 400, status: 'active' },
      { name: 'TAP Enterprise Package', productLineId: 'tapBusiness', defaultMonthlyFee: 600, status: 'active' },

      // Compliance
      { name: 'First Aid Level 1', productLineId: 'compliance', defaultCostPerTrainee: 1200, status: 'active' },
      { name: 'First Aid Level 2', productLineId: 'compliance', defaultCostPerTrainee: 1800, status: 'active' },
      { name: 'First Aid Level 3', productLineId: 'compliance', defaultCostPerTrainee: 2500, status: 'active' },
      { name: 'Fire Safety Training', productLineId: 'compliance', defaultCostPerTrainee: 950, status: 'active' },
      { name: 'OHS Representative Training', productLineId: 'compliance', defaultCostPerTrainee: 3500, status: 'active' },

      // Other Courses
      { name: 'Excel Advanced Training', productLineId: 'otherCourses', defaultDailyRate: 2500, defaultDuration: 2, status: 'active' },
      { name: 'Excel Basic Training', productLineId: 'otherCourses', defaultDailyRate: 2000, defaultDuration: 1, status: 'active' },
      { name: 'Project Management Fundamentals', productLineId: 'otherCourses', defaultDailyRate: 3500, defaultDuration: 3, status: 'active' },
      { name: 'Leadership Development Workshop', productLineId: 'otherCourses', defaultDailyRate: 4000, defaultDuration: 2, status: 'active' }
    ]

    for (const product of products) {
      const productRef = doc(collection(db, 'products'))
      batch.set(productRef, {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    // Save default calculation options
    const optionsRef = doc(db, 'systemSettings', 'calculationOptions')
    batch.set(optionsRef, {
      nqfLevels: [
        { id: 'nqf1', name: 'NQF Level 1', value: 1 },
        { id: 'nqf2', name: 'NQF Level 2', value: 2 },
        { id: 'nqf3', name: 'NQF Level 3', value: 3 },
        { id: 'nqf4', name: 'NQF Level 4', value: 4 },
        { id: 'nqf5', name: 'NQF Level 5', value: 5 },
        { id: 'nqf6', name: 'NQF Level 6', value: 6 }
      ],
      tapPackages: [
        { id: 'basic', name: 'Basic Package', value: 'basic' },
        { id: 'standard', name: 'Standard Package', value: 'standard' },
        { id: 'premium', name: 'Premium Package', value: 'premium' },
        { id: 'enterprise', name: 'Enterprise Package', value: 'enterprise' }
      ],
      complianceCourses: [
        { id: 'first-aid-1', name: 'First Aid Level 1', value: 'first-aid-1' },
        { id: 'first-aid-2', name: 'First Aid Level 2', value: 'first-aid-2' },
        { id: 'first-aid-3', name: 'First Aid Level 3', value: 'first-aid-3' },
        { id: 'fire-safety', name: 'Fire Safety', value: 'fire-safety' },
        { id: 'ohs', name: 'Occupational Health & Safety', value: 'ohs' },
        { id: 'hazmat', name: 'Hazardous Materials Handling', value: 'hazmat' },
        { id: 'food-safety', name: 'Food Safety & Hygiene', value: 'food-safety' }
      ],
      generalCourses: [
        { id: 'excel-basic', name: 'Excel Basic', value: 'excel-basic' },
        { id: 'excel-advanced', name: 'Excel Advanced', value: 'excel-advanced' },
        { id: 'word', name: 'Microsoft Word', value: 'word' },
        { id: 'powerpoint', name: 'PowerPoint', value: 'powerpoint' },
        { id: 'project-mgmt', name: 'Project Management', value: 'project-mgmt' },
        { id: 'leadership', name: 'Leadership Skills', value: 'leadership' },
        { id: 'communication', name: 'Business Communication', value: 'communication' },
        { id: 'time-mgmt', name: 'Time Management', value: 'time-mgmt' }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await batch.commit()
    console.log('Product catalog initialized successfully with default product lines, products, and calculation options')
  } catch (error) {
    console.error('Error initializing product catalog:', error)
    throw error
  }
}

// ============================================================================
// CLIENT FOLLOW-UP TRACKING
// ============================================================================

/**
 * Update a client's next follow-up date and details
 */
export const updateClientFollowUp = async (clientId, followUpData, userId) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    await updateDoc(clientRef, {
      nextFollowUpDate: followUpData.date,
      nextFollowUpReason: followUpData.reason || '',
      nextFollowUpType: followUpData.type || 'call',
      nextFollowUpCreatedBy: userId,
      nextFollowUpCreatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating client follow-up:', error)
    throw error
  }
}

/**
 * Clear a client's next follow-up (e.g., when completed without setting new one)
 */
export const clearClientFollowUp = async (clientId) => {
  try {
    const clientRef = doc(db, 'clients', clientId)
    await updateDoc(clientRef, {
      nextFollowUpDate: null,
      nextFollowUpReason: null,
      nextFollowUpType: null,
      nextFollowUpCreatedBy: null,
      nextFollowUpCreatedAt: null,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error clearing client follow-up:', error)
    throw error
  }
}

/**
 * Get clients without a future follow-up date
 * @param {string|null} salespersonId - Filter by salesperson (null = all clients)
 * @returns {Array} Clients without follow-up
 */
export const getClientsWithoutFollowUp = async (salespersonId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    let q = query(clientsRef)

    if (salespersonId) {
      q = query(clientsRef, where('assignedSalesPerson', '==', salespersonId))
    }

    const snapshot = await getDocs(q)
    const now = new Date()

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(client => {
        // Exclude won/lost clients from follow-up requirements
        const status = (client.pipelineStatus || '').toLowerCase()
        if (status === 'won' || status === 'lost') return false

        // No follow-up date set at all
        if (!client.nextFollowUpDate) return true

        return false
      })
  } catch (error) {
    console.error('Error getting clients without follow-up:', error)
    throw error
  }
}

/**
 * Get clients with overdue follow-up dates
 * @param {string|null} salespersonId - Filter by salesperson (null = all clients)
 * @returns {Array} Clients with overdue follow-up
 */
export const getClientsWithOverdueFollowUp = async (salespersonId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    let q = query(clientsRef)

    if (salespersonId) {
      q = query(clientsRef, where('assignedSalesPerson', '==', salespersonId))
    }

    const snapshot = await getDocs(q)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(client => {
        // Exclude won/lost clients
        const status = (client.pipelineStatus || '').toLowerCase()
        if (status === 'won' || status === 'lost') return false

        // Has a follow-up date that is in the past
        if (!client.nextFollowUpDate) return false

        const followUpDate = client.nextFollowUpDate.toDate
          ? client.nextFollowUpDate.toDate()
          : new Date(client.nextFollowUpDate)
        followUpDate.setHours(0, 0, 0, 0)

        return followUpDate < now
      })
  } catch (error) {
    console.error('Error getting clients with overdue follow-up:', error)
    throw error
  }
}

/**
 * Get follow-up statistics for dashboard
 * @param {string|null} salespersonId - Filter by salesperson (null = all clients)
 * @returns {Object} Follow-up stats
 */
export const getFollowUpStats = async (salespersonId = null) => {
  try {
    const clientsRef = collection(db, 'clients')
    let q = query(clientsRef)

    if (salespersonId) {
      q = query(clientsRef, where('assignedSalesPerson', '==', salespersonId))
    }

    const snapshot = await getDocs(q)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    let noFollowUp = 0
    let overdue = 0
    let dueToday = 0
    let dueThisWeek = 0
    let totalActive = 0

    snapshot.docs.forEach(doc => {
      const client = { id: doc.id, ...doc.data() }

      // Exclude won/lost clients from stats
      const status = (client.pipelineStatus || '').toLowerCase()
      if (status === 'won' || status === 'lost') return

      totalActive++

      if (!client.nextFollowUpDate) {
        noFollowUp++
        return
      }

      const followUpDate = client.nextFollowUpDate.toDate
        ? client.nextFollowUpDate.toDate()
        : new Date(client.nextFollowUpDate)
      followUpDate.setHours(0, 0, 0, 0)

      if (followUpDate < now) {
        overdue++
      } else if (followUpDate.getTime() === now.getTime()) {
        dueToday++
      } else if (followUpDate < nextWeek) {
        dueThisWeek++
      }
    })

    return {
      noFollowUp,
      overdue,
      dueToday,
      dueThisWeek,
      totalActive,
      needsAttention: noFollowUp + overdue // Combined count for alerts
    }
  } catch (error) {
    console.error('Error getting follow-up stats:', error)
    return {
      noFollowUp: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      totalActive: 0,
      needsAttention: 0
    }
  }
}

/**
 * Get all clients with their follow-up status for management
 * @param {string|null} salespersonId - Filter by salesperson
 * @param {string} filter - 'all', 'no-followup', 'overdue', 'due-today', 'due-this-week'
 * @returns {Array} Clients with follow-up status
 */
export const getClientsForFollowUpManagement = async (salespersonId = null, filter = 'all') => {
  try {
    const clientsRef = collection(db, 'clients')
    let q = query(clientsRef, orderBy('name', 'asc'))

    if (salespersonId) {
      q = query(clientsRef, where('assignedSalesPerson', '==', salespersonId), orderBy('name', 'asc'))
    }

    const snapshot = await getDocs(q)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    let clients = snapshot.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() }

      // Calculate follow-up status
      let followUpStatus = 'none'
      let daysUntilFollowUp = null

      if (data.nextFollowUpDate) {
        const followUpDate = data.nextFollowUpDate.toDate
          ? data.nextFollowUpDate.toDate()
          : new Date(data.nextFollowUpDate)
        followUpDate.setHours(0, 0, 0, 0)

        const diffTime = followUpDate - now
        daysUntilFollowUp = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (followUpDate < now) {
          followUpStatus = 'overdue'
        } else if (followUpDate.getTime() === now.getTime()) {
          followUpStatus = 'due-today'
        } else if (followUpDate < nextWeek) {
          followUpStatus = 'due-this-week'
        } else {
          followUpStatus = 'scheduled'
        }
      }

      return {
        ...data,
        followUpStatus,
        daysUntilFollowUp
      }
    })

    // Exclude won/lost clients
    clients = clients.filter(client => {
      const status = (client.pipelineStatus || '').toLowerCase()
      return status !== 'won' && status !== 'lost'
    })

    // Apply filter
    if (filter === 'no-followup') {
      clients = clients.filter(c => c.followUpStatus === 'none')
    } else if (filter === 'overdue') {
      clients = clients.filter(c => c.followUpStatus === 'overdue')
    } else if (filter === 'due-today') {
      clients = clients.filter(c => c.followUpStatus === 'due-today')
    } else if (filter === 'due-this-week') {
      clients = clients.filter(c => c.followUpStatus === 'due-this-week')
    } else if (filter === 'needs-attention') {
      clients = clients.filter(c => c.followUpStatus === 'none' || c.followUpStatus === 'overdue')
    }

    // Sort: overdue first, then no follow-up, then by date
    clients.sort((a, b) => {
      const statusOrder = { 'overdue': 0, 'none': 1, 'due-today': 2, 'due-this-week': 3, 'scheduled': 4 }
      const orderDiff = statusOrder[a.followUpStatus] - statusOrder[b.followUpStatus]
      if (orderDiff !== 0) return orderDiff

      // Within same status, sort by days until follow-up (or name if no date)
      if (a.daysUntilFollowUp !== null && b.daysUntilFollowUp !== null) {
        return a.daysUntilFollowUp - b.daysUntilFollowUp
      }
      return (a.name || '').localeCompare(b.name || '')
    })

    return clients
  } catch (error) {
    console.error('Error getting clients for follow-up management:', error)
    throw error
  }
}

// ============================================================================
// LEGAL DOCUMENT CHECKLIST SETTINGS
// ============================================================================

/**
 * Default legal document types (used if no custom ones are configured)
 */
const DEFAULT_LEGAL_DOCUMENT_TYPES = [
  { key: 'serviceAgreement', label: 'Service Agreement Signed', required: true, order: 1 },
  { key: 'companyRegistration', label: 'Company Registration Documents', required: true, order: 2 },
  { key: 'bbbee', label: 'B-BBEE Certificate', required: false, order: 3 },
  { key: 'taxClearance', label: 'Tax Clearance Certificate', required: false, order: 4 },
  { key: 'bankingDetails', label: 'Banking Details Received', required: true, order: 5 },
  { key: 'contactList', label: 'Contact List Provided', required: false, order: 6 },
  { key: 'orgChart', label: 'Organogram / Org Chart', required: false, order: 7 },
  { key: 'wspdocs', label: 'WSP/ATR Documents', required: false, order: 8 }
]

/**
 * Get legal document types for checklist
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 * @returns {Promise<Array>} Array of document types
 */
export const getLegalDocumentTypes = async (tenantId = null) => {
  try {
    // Try tenant-specific settings first
    if (tenantId) {
      const tenantSettingsRef = doc(db, 'systemSettings', `legalDocuments_${tenantId}`)
      const tenantSettingsSnap = await getDoc(tenantSettingsRef)

      if (tenantSettingsSnap.exists()) {
        const data = tenantSettingsSnap.data()
        if (data.documentTypes && Array.isArray(data.documentTypes) && data.documentTypes.length > 0) {
          return data.documentTypes.sort((a, b) => (a.order || 0) - (b.order || 0))
        }
      }
    }

    // Fall back to global settings
    const settingsRef = doc(db, 'systemSettings', 'legalDocuments')
    const settingsSnap = await getDoc(settingsRef)

    if (settingsSnap.exists()) {
      const data = settingsSnap.data()
      if (data.documentTypes && Array.isArray(data.documentTypes) && data.documentTypes.length > 0) {
        return data.documentTypes.sort((a, b) => (a.order || 0) - (b.order || 0))
      }
    }

    return DEFAULT_LEGAL_DOCUMENT_TYPES
  } catch (error) {
    console.error('Error getting legal document types:', error)
    return DEFAULT_LEGAL_DOCUMENT_TYPES
  }
}

/**
 * Save legal document types (admin function)
 * @param {Array} documentTypes - Array of document type objects
 * @param {string} tenantId - Optional tenant ID for tenant-specific settings
 */
export const saveLegalDocumentTypes = async (documentTypes, tenantId = null) => {
  try {
    const docId = tenantId ? `legalDocuments_${tenantId}` : 'legalDocuments'
    const settingsRef = doc(db, 'systemSettings', docId)
    await setDoc(settingsRef, {
      documentTypes: documentTypes,
      tenantId: tenantId,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error saving legal document types:', error)
    throw error
  }
}

