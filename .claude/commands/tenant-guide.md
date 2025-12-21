# Tenant-Aware Development Guide

You are assisting with development on a multi-tenant CRM application. **ALWAYS** follow these patterns to ensure proper tenant isolation.

---

## TENANT ARCHITECTURE OVERVIEW

This system uses **Shared Database with Tenant ID** isolation. All tenant-specific data has a `tenantId` field.

### Tenant Document Structure (Collection: `tenants`)
```javascript
{
  id: "speccon",              // Tenant ID (slug: lowercase, hyphens)
  name: "Speccon Holdings",   // Display name
  description: "...",
  status: "active",
  settings: {
    currencySymbol: "R",
    financialYearStart: "March",
    financialYearEnd: "February"
  },
  deleted: false,             // Soft delete flag
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## COLLECTIONS REQUIRING TENANT ISOLATION

**ALWAYS filter by `tenantId` for these collections:**
- `clients` - Client records
- `users` - User accounts
- `deals` - Sales deals
- `messages` - Internal messages
- `followUpTasks` - Follow-up tasks
- `quotes` - Client quotes
- `invoices` - Invoices
- `forecasts` - Revenue forecasts
- `feedback` - Client feedback
- `clientFinancials` - Financial data
- `budgets` - Budget tracking
- `skillsPartners` - Skills partners/vendors
- `products` - Product catalog
- `productLines` - Product categories
- `calculationTemplates` - Calculation templates
- `tenantProductConfigs` - Tenant-specific product configs

**Collections WITHOUT tenant filtering (system-wide):**
- `roles` - Role definitions
- `calculationOptions` - Calculation options

**Tenant-specific settings pattern:**
- `systemSettings` - Uses document ID pattern: `pipelineStatuses_{tenantId}`

---

## CONTEXT PROVIDER USAGE

### Getting Tenant Context
```javascript
import { useTenant } from '../context/TenantContext'

const MyComponent = () => {
  const {
    getTenantId,           // Returns current tenant ID
    currentUser,           // Firebase Auth user
    userData,              // Firestore user document
    isSystemAdmin,         // true if system-level admin
    currentTenant,         // Full tenant object with settings
    accessibleUserIds,     // User IDs this user can see
    teamMembers,           // Team member objects
    effectiveProductLineIds, // Product lines user has access to
    hasPermission,         // Check specific permission
    hasTenantAccess,       // Check if user has tenant features
    isTeamManager,         // Check if user is a manager
    isSalesHead,           // Check if user is sales head
    canAccessUserData,     // Check access to another user's data
  } = useTenant()
}
```

---

## REQUIRED PATTERNS

### Pattern 1: Reading Data (ALWAYS filter by tenant)
```javascript
const loadData = async () => {
  const tenantId = getTenantId()

  // For system admins who need all data, use null
  const filterTenantId = isSystemAdmin ? null : tenantId

  // Pass tenantId to service functions
  const data = await getClients({}, filterTenantId)

  // Apply user-level filtering if not admin
  if (!isSystemAdmin && !isSalesHead()) {
    data = data.filter(item =>
      accessibleUserIds.includes(item.assignedSalesPerson) ||
      accessibleUserIds.includes(item.createdBy)
    )
  }
}
```

### Pattern 2: Creating Data (ALWAYS include tenantId)
```javascript
const handleCreate = async (formData) => {
  const tenantId = getTenantId()

  await createItem({
    ...formData,
    tenantId: tenantId,  // REQUIRED!
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}
```

### Pattern 3: Service Function with Tenant Filter
```javascript
// In firestoreService.js
export const getItems = async (filters = {}, tenantId = null) => {
  const itemsRef = collection(db, 'items')
  let q = query(itemsRef)

  // ALWAYS apply tenant filter when provided
  if (tenantId) {
    q = query(q, where('tenantId', '==', tenantId))
  }

  // Apply additional filters
  if (filters.status) {
    q = query(q, where('status', '==', filters.status))
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const createItem = async (itemData, tenantId = null) => {
  const newItem = {
    ...itemData,
    tenantId: tenantId || itemData.tenantId, // Ensure tenantId is set
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const docRef = await addDoc(collection(db, 'items'), newItem)
  return docRef.id
}
```

### Pattern 4: User Dropdown/Selection (Filter by tenant)
```javascript
const loadUsers = async () => {
  const tenantId = getTenantId()

  // Use getTenantUsers to get only users in this tenant
  const users = await getTenantUsers(tenantId)
  setUsers(users)
}

// For assignee dropdowns
<select>
  {users.map(user => (
    <option key={user.id} value={user.id}>
      {user.firstName} {user.lastName}
    </option>
  ))}
</select>
```

### Pattern 5: Tenant-Specific Settings
```javascript
// Getting tenant-specific settings with fallback to global
export const getPipelineStatuses = async (tenantId = null) => {
  if (tenantId) {
    // Try tenant-specific first
    const tenantSettingsRef = doc(db, 'systemSettings', `pipelineStatuses_${tenantId}`)
    const tenantSettingsSnap = await getDoc(tenantSettingsRef)
    if (tenantSettingsSnap.exists()) {
      return tenantSettingsSnap.data().statuses
    }
  }

  // Fall back to global settings
  const settingsRef = doc(db, 'systemSettings', 'pipelineStatuses')
  const settingsSnap = await getDoc(settingsRef)
  return settingsSnap.exists() ? settingsSnap.data().statuses : []
}
```

### Pattern 6: Loading Data with Hierarchy Dependency
```javascript
const { getTenantId, accessibleUserIds, hierarchyLoading } = useTenant()

useEffect(() => {
  // Wait for hierarchy to load before fetching data
  if (!hierarchyLoading && currentUser) {
    loadData()
  }
}, [hierarchyLoading, currentUser, accessibleUserIds])
```

---

## USER ACCESS LEVELS

1. **System Admin** (`isSystemAdmin: true`)
   - Can access ALL tenants
   - Can create/manage tenants
   - Use `null` for tenantId to see all data

2. **Tenant Admin** (has admin role within tenant)
   - Manages users within their tenant
   - Full access to tenant data

3. **Sales Head** (`isSalesHead()`)
   - See all data within their tenant
   - No need for user-level filtering

4. **Team Manager** (`isTeamManager()`)
   - See their team's data
   - Use `accessibleUserIds` for filtering

5. **Regular User**
   - See only their own data
   - `accessibleUserIds` contains only their ID

---

## CHECKLIST FOR NEW FEATURES

Before implementing any feature, verify:

- [ ] Does the data need tenant isolation? (Check collections list above)
- [ ] Am I using `getTenantId()` from context?
- [ ] Am I passing `tenantId` to service functions for reads?
- [ ] Am I including `tenantId` when creating new documents?
- [ ] Am I filtering user dropdowns by tenant?
- [ ] Am I waiting for `hierarchyLoading` to complete?
- [ ] Am I applying user-level filtering for non-admins?
- [ ] Are service functions accepting and using `tenantId` parameter?

---

## KEY FILE LOCATIONS

| File | Purpose |
|------|---------|
| `src/context/TenantContext.jsx` | Tenant context provider, useTenant() hook |
| `src/services/tenantService.js` | Tenant CRUD operations |
| `src/services/firestoreService.js` | Data access with tenant filtering |
| `src/services/tenantProductConfigService.js` | Tenant-specific product config |

---

## ANTI-PATTERNS (AVOID THESE)

```javascript
// BAD: Fetching without tenant filter
const clients = await getDocs(collection(db, 'clients'))

// GOOD: Always filter by tenant
const tenantId = getTenantId()
const q = query(collection(db, 'clients'), where('tenantId', '==', tenantId))
const clients = await getDocs(q)

// BAD: Creating without tenantId
await addDoc(collection(db, 'clients'), { name: 'New Client' })

// GOOD: Always include tenantId
await addDoc(collection(db, 'clients'), {
  name: 'New Client',
  tenantId: getTenantId()
})

// BAD: Loading all users for dropdown
const users = await getUsers()

// GOOD: Load only tenant users
const users = await getTenantUsers(getTenantId())
```

---

## EXAMPLE: COMPLETE PAGE IMPLEMENTATION

```javascript
import React, { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import { getItems, createItem } from '../services/itemService'

const ItemsPage = () => {
  const {
    getTenantId,
    currentUser,
    isSystemAdmin,
    isSalesHead,
    accessibleUserIds,
    hierarchyLoading
  } = useTenant()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Wait for hierarchy before loading
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadItems()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

  const loadItems = async () => {
    setLoading(true)
    try {
      const tenantId = getTenantId()

      // Fetch with tenant filter
      let data = await getItems({}, tenantId)

      // Apply user-level filtering if not admin/sales head
      if (!isSystemAdmin && !isSalesHead()) {
        data = data.filter(item =>
          accessibleUserIds.includes(item.assignedTo) ||
          accessibleUserIds.includes(item.createdBy)
        )
      }

      setItems(data)
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (formData) => {
    const tenantId = getTenantId()

    await createItem({
      ...formData,
      tenantId,
      createdBy: currentUser.uid
    })

    loadItems() // Refresh list
  }

  return (/* JSX */)
}

export default ItemsPage
```

---

When the user describes a feature or asks you to implement something, ALWAYS reference this guide and ensure proper tenant isolation is implemented.
