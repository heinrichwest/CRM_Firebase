/**
 * Firebase Configuration
 *
 * This module is only loaded when VITE_USE_FIREBASE=true via dynamic import
 * in firestoreService.js. When using REST API mode, this file is never loaded.
 *
 * WARNING: This file should NOT be imported directly by components or services.
 * Use the firestoreService.js facade instead.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize a secondary app for creating users without affecting current session
const secondaryApp = initializeApp(firebaseConfig, 'Secondary')

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)

// Secondary auth for user creation
export const secondaryAuth = getAuth(secondaryApp)

export { app, secondaryApp }
