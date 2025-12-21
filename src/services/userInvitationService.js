import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db, secondaryAuth } from '../config/firebase'
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'

/**
 * User Invitation Service
 *
 * Handles creating user accounts and sending invitations.
 * System admins can create users for any tenant.
 * Tenant admins can only create users for their own tenant.
 */

/**
 * Create a new user account with email/password
 * This creates both Firebase Auth and Firestore user document
 *
 * @param {Object} userData - User data
 * @param {string} userData.email - User email (required)
 * @param {string} userData.password - User password (required)
 * @param {string} userData.displayName - User display name
 * @param {string} userData.role - User role ID (default: 'salesperson')
 * @param {string} userData.tenantId - Tenant ID to assign user to
 * @param {boolean} userData.isSystemAdmin - Whether user is a system admin
 * @param {string} createdByUserId - ID of the user creating this account
 * @returns {Promise<Object>} - Created user data
 */
export const createUserAccount = async (userData, createdByUserId) => {
  const { email, password, displayName, role, tenantId, isSystemAdmin, requirePasswordChange } = userData

  if (!email) {
    throw new Error('Email is required')
  }

  if (!password) {
    throw new Error('Password is required')
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  try {
    // Check if user already exists in Firestore
    const usersRef = collection(db, 'users')
    const existingQuery = query(usersRef, where('email', '==', email.toLowerCase()))
    const existingSnapshot = await getDocs(existingQuery)

    if (!existingSnapshot.empty) {
      throw new Error('A user with this email already exists')
    }

    // Create Firebase Auth account using the SECONDARY auth instance
    // This prevents the admin from being logged out when creating users
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const userId = userCredential.user.uid

    // Sign out from the secondary auth immediately (cleanup)
    await signOut(secondaryAuth)

    // Create Firestore user document
    const userDoc = {
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0],
      role: role || 'salesperson',
      tenantId: tenantId || null,
      isSystemAdmin: isSystemAdmin || false,
      requirePasswordChange: requirePasswordChange || false, // Flag to enforce password change on first login
      customPermissions: [],
      phone: '',
      title: '',
      department: '',
      bio: '',
      provider: 'email',
      createdAt: serverTimestamp(),
      createdBy: createdByUserId,
      updatedAt: serverTimestamp()
    }

    await setDoc(doc(db, 'users', userId), userDoc)

    return {
      id: userId,
      ...userDoc
    }
  } catch (error) {
    console.error('Error creating user account:', error)

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. The user may need to be added to a tenant instead.')
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format')
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters')
    }

    throw error
  }
}

/**
 * Create a pending user invitation (without creating auth account)
 * The user will create their own account when they accept the invitation
 *
 * @param {Object} inviteData - Invitation data
 * @param {string} createdByUserId - ID of the user creating this invitation
 * @returns {Promise<Object>} - Created invitation data
 */
export const createUserInvitation = async (inviteData, createdByUserId) => {
  const { email, displayName, role, tenantId, salesLevel, managerId, isSystemAdmin } = inviteData

  if (!email) {
    throw new Error('Email is required')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  try {
    // Check if invitation already exists
    const invitationsRef = collection(db, 'userInvitations')
    const existingQuery = query(invitationsRef, where('email', '==', email.toLowerCase()))
    const existingSnapshot = await getDocs(existingQuery)

    if (!existingSnapshot.empty) {
      throw new Error('An invitation for this email already exists')
    }

    // Check if user already exists
    const usersRef = collection(db, 'users')
    const userQuery = query(usersRef, where('email', '==', email.toLowerCase()))
    const userSnapshot = await getDocs(userQuery)

    if (!userSnapshot.empty) {
      throw new Error('A user with this email already exists')
    }

    // Create invitation document
    const invitationDoc = {
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0],
      role: role || 'salesperson',
      tenantId: tenantId || null,
      salesLevel: salesLevel || null,
      managerId: managerId || null,
      isSystemAdmin: isSystemAdmin || false,
      status: 'pending', // pending, accepted, expired
      createdAt: serverTimestamp(),
      createdBy: createdByUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }

    const docRef = doc(collection(db, 'userInvitations'))
    await setDoc(docRef, invitationDoc)

    return {
      id: docRef.id,
      ...invitationDoc
    }
  } catch (error) {
    console.error('Error creating user invitation:', error)
    throw error
  }
}

/**
 * Get pending invitations for a tenant
 * @param {string} tenantId - Tenant ID (null for all invitations - system admin only)
 * @returns {Promise<Array>} - Array of invitation objects
 */
export const getPendingInvitations = async (tenantId = null) => {
  try {
    const invitationsRef = collection(db, 'userInvitations')
    let q

    if (tenantId) {
      q = query(
        invitationsRef,
        where('tenantId', '==', tenantId),
        where('status', '==', 'pending')
      )
    } else {
      q = query(invitationsRef, where('status', '==', 'pending'))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error getting pending invitations:', error)
    throw error
  }
}

/**
 * Cancel/delete a pending invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const cancelInvitation = async (invitationId) => {
  try {
    await deleteDoc(doc(db, 'userInvitations', invitationId))
  } catch (error) {
    console.error('Error canceling invitation:', error)
    throw error
  }
}

/**
 * Resend invitation email
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const resendInvitation = async (invitationId) => {
  try {
    const invitationRef = doc(db, 'userInvitations', invitationId)
    await updateDoc(invitationRef, {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updatedAt: serverTimestamp()
    })
    // In a real app, you'd trigger an email here
  } catch (error) {
    console.error('Error resending invitation:', error)
    throw error
  }
}

/**
 * Accept an invitation (called when user signs up)
 * @param {string} email - User email
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<Object|null>} - Invitation data if found, null otherwise
 */
export const acceptInvitation = async (email, userId) => {
  try {
    const invitationsRef = collection(db, 'userInvitations')
    const q = query(
      invitationsRef,
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const invitation = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }

    // Update user document with invitation data
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      tenantId: invitation.tenantId,
      role: invitation.role,
      salesLevel: invitation.salesLevel,
      managerId: invitation.managerId,
      isSystemAdmin: invitation.isSystemAdmin,
      invitationAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Mark invitation as accepted
    await updateDoc(doc(db, 'userInvitations', invitation.id), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedByUserId: userId
    })

    return invitation
  } catch (error) {
    console.error('Error accepting invitation:', error)
    throw error
  }
}

/**
 * Add an existing user to a tenant
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export const addUserToTenant = async (userId, tenantId, options = {}) => {
  try {
    const { role, salesLevel, managerId } = options

    const updateData = {
      tenantId,
      updatedAt: serverTimestamp()
    }

    if (role) updateData.role = role
    if (salesLevel) updateData.salesLevel = salesLevel
    if (managerId) updateData.managerId = managerId

    await updateDoc(doc(db, 'users', userId), updateData)
  } catch (error) {
    console.error('Error adding user to tenant:', error)
    throw error
  }
}

/**
 * Remove a user from a tenant (set tenantId to null)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const removeUserFromTenant = async (userId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      tenantId: null,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error removing user from tenant:', error)
    throw error
  }
}

/**
 * Get users without a tenant assignment
 * @returns {Promise<Array>} - Array of unassigned users
 */
export const getUnassignedUsers = async () => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('tenantId', '==', null))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => !u.isSystemAdmin) // Exclude system admins
  } catch (error) {
    console.error('Error getting unassigned users:', error)
    throw error
  }
}

/**
 * Generate a temporary password
 * @returns {string} - Random password
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Send password reset email to user
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (email) => {
  try {
    const auth = getAuth()
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Error sending password reset:', error)
    throw error
  }
}
