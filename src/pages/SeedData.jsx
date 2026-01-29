import { useState, useEffect } from 'react'
import { resetAndSeed, clearAllData, seedAllData } from '../services/seedDataService'
import {
  getMigrationStatus,
  migrateAllProducts,
  verifyMigration
} from '../services/productMigrationService'
import { getUsers } from '../services/userService'
import { useTenant } from '../context/TenantContext'
import './SeedData.css'

const SeedData = () => {
  const { currentUser } = useTenant()
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [userIds, setUserIds] = useState({
    salesPerson1: '',
    salesPerson2: '',
    admin: '',
    manager: ''
  })

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState(null)
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    try {
      console.log('=== DEBUGGING USER LOAD ===')
      console.log('Current authenticated user:', currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      } : 'NOT LOGGED IN')

      if (!currentUser) {
        throw new Error('You must be logged in to load users. Please log in first.')
      }

      console.log('Attempting to load users via API...')
      const usersList = await getUsers()
      console.log('Users loaded:', usersList?.length || 0)
      console.log('Processed users list:', usersList)
      
      setUsers(usersList)
      
      // Auto-populate user IDs if possible
      const sales1 = usersList.find(u => u.email?.toLowerCase().includes('sales') || u.title?.toLowerCase().includes('sales'))
      const sales2 = usersList.find(u => u.id !== sales1?.id && (u.email?.toLowerCase().includes('sales') || u.title?.toLowerCase().includes('sales')))
      const adminUser = usersList.find(u => u.email?.toLowerCase().includes('admin') || u.title?.toLowerCase().includes('admin'))
      const managerUser = usersList.find(u => u.email?.toLowerCase().includes('manager') || u.title?.toLowerCase().includes('manager'))
      
      setUserIds({
        salesPerson1: sales1?.id || usersList[0]?.id || '',
        salesPerson2: sales2?.id || usersList[1]?.id || '',
        admin: adminUser?.id || usersList[2]?.id || '',
        manager: managerUser?.id || usersList[3]?.id || ''
      })
      
      console.log('=== END DEBUG ===')
    } catch (error) {
      console.error('=== ERROR LOADING USERS ===')
      console.error('Error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      })
      console.error('=== END ERROR ===')
      
      let errorMessage = `Failed to load users: ${error.message || 'Unknown error'}. `

      if (error.response?.status === 403) {
        errorMessage += 'Permission denied. You may not have access to view all users.'
      } else if (error.response?.status === 401) {
        errorMessage += 'Authentication failed. Please log in again.'
      }

      errorMessage += ' Check browser console (F12) for detailed error information.'
      
      setError(errorMessage)
    } finally {
      setLoadingUsers(false)
    }
  }

  const getSelectedUserName = (userId) => {
    if (!userId) return null
    const user = users.find(u => u.id === userId)
    return user ? (user.displayName || user.email || user.id) : null
  }

  const handleResetAndSeed = async () => {
    if (!window.confirm('This will DELETE all existing data and replace it with seed data. Are you sure?')) {
      return
    }

    // Validate user IDs
    if (!userIds.salesPerson1 || !userIds.salesPerson2) {
      setError('Please select at least two salesperson users')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      // Pass user IDs to reset and seed function
      const result = await resetAndSeed(userIds)
      setMessage(result.message || 'Data reset and seeded successfully!')
    } catch (err) {
      setError(err.message || 'Failed to reset and seed data')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedOnly = async () => {
    if (!window.confirm('This will add seed data without deleting existing data. Continue?')) {
      return
    }

    // Validate user IDs
    if (!userIds.salesPerson1 || !userIds.salesPerson2) {
      setError('Please select at least two salesperson users')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      // Pass user IDs to seed function
      const result = await seedAllData(userIds)
      setMessage(result.message || 'Seed data added successfully!')
    } catch (err) {
      setError(err.message || 'Failed to seed data')
    } finally {
      setLoading(false)
    }
  }

  const handleClearOnly = async () => {
    if (!window.confirm('This will DELETE ALL DATA. This action cannot be undone. Are you absolutely sure?')) {
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      await clearAllData()
      setMessage('All data cleared successfully!')
    } catch (err) {
      setError(err.message || 'Failed to clear data')
    } finally {
      setLoading(false)
    }
  }

  // Migration functions
  const checkMigrationStatus = async () => {
    setMigrationLoading(true)
    setMigrationMessage('')
    try {
      const status = await getMigrationStatus()
      setMigrationStatus(status)
    } catch (err) {
      setMigrationMessage(`Error checking status: ${err.message}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  const handleMigrateProducts = async (dryRun = false) => {
    if (!dryRun && !window.confirm('This will update all products to use the new template system. Continue?')) {
      return
    }

    setMigrationLoading(true)
    setMigrationMessage('')
    try {
      const result = await migrateAllProducts(dryRun)
      if (dryRun) {
        setMigrationMessage(`Dry run complete: ${result.migrated.length} products would be migrated`)
      } else {
        setMigrationMessage(`Migration complete: ${result.migrated.length} products migrated, ${result.skipped.length} skipped, ${result.errors.length} errors`)
      }
      await checkMigrationStatus()
    } catch (err) {
      setMigrationMessage(`Migration failed: ${err.message}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  const handleVerifyMigration = async () => {
    setMigrationLoading(true)
    setMigrationMessage('')
    try {
      const result = await verifyMigration()
      if (result.isComplete) {
        setMigrationMessage(`Verification passed: All ${result.summary.valid} products have valid templates`)
      } else {
        setMigrationMessage(`Verification issues: ${result.summary.invalid} invalid, ${result.summary.missing} missing templates`)
      }
    } catch (err) {
      setMigrationMessage(`Verification failed: ${err.message}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  return (
    <div className="seed-data">
      <h1>Seed Data Management</h1>
      
      <div className="seed-data-content">
        <div className="warning-box">
          <h3>⚠️ Warning</h3>
          <p>These operations will modify your database. Use with caution in production environments.</p>
        </div>

        <div className="seed-info">
          <h2>Seed Data Includes:</h2>
          <ul>
            <li><strong>5 Clients</strong> - Mix of Corporate and School types with different statuses (Active, Prospect)</li>
            <li><strong>13 Client Financials</strong> - Detailed forecasts per product line with deal details</li>
            <li><strong>5 Deals</strong> - Distributed across pipeline stages (Discovery, Qualification, Proposal, Negotiation)</li>
            <li><strong>15 Quotes</strong> - Historical quotes with Accepted, Sent, and Pending statuses</li>
            <li><strong>22 Invoices</strong> - Comprehensive history with Paid, Pending, and Unpaid statuses</li>
            <li><strong>5 Follow-Up Tasks</strong> - Pending tasks with varying priorities</li>
            <li><strong>4 Messages</strong> - Different statuses and priorities</li>
            <li><strong>4 Feedback</strong> - Client comments and notes</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleResetAndSeed}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Reset & Seed Data'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handleSeedOnly}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Add Seed Data Only'}
          </button>
          
          <button
            className="btn btn-danger"
            onClick={handleClearOnly}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Clear All Data'}
          </button>
        </div>

        {message && (
          <div className="success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ✗ {error}
          </div>
        )}

        <div className="user-selection">
          <h3>Select User IDs for Seed Data</h3>
          <p className="user-note">The seed data will assign clients and deals to these users. Select the appropriate users:</p>
          
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={loadUsers} className="refresh-btn" disabled={loadingUsers}>
              {loadingUsers ? 'Loading...' : '🔄 Refresh Users'}
            </button>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>
              {users.length > 0 ? `Found ${users.length} user(s)` : 'No users loaded'}
            </span>
          </div>

          {loadingUsers ? (
            <div className="loading-users">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="no-users-warning">
              <p>⚠️ No users found in the database.</p>
              <p><strong>Possible issues:</strong></p>
              <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                <li>API connection may not be configured correctly</li>
                <li>Users may not exist in the database</li>
                <li>You may not have permission to view users</li>
                <li>You may not be logged in</li>
              </ul>
              <p style={{ marginTop: '15px' }}>
                <strong>To fix:</strong> Check your browser console (F12) for error messages.
                Users are automatically created when you log in. Make sure you have logged in at least once.
              </p>
              <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
                <p style={{ margin: '5px 0' }}><strong>API URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not configured'}</p>
                <p style={{ margin: '5px 0' }}><strong>Logged in as:</strong> {currentUser?.email || 'Not logged in'}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="user-inputs">
                <div className="user-input-group">
                  <label>Sales Person 1: <span className="required">*</span></label>
                  <select
                    value={userIds.salesPerson1}
                    onChange={(e) => setUserIds({ ...userIds, salesPerson1: e.target.value })}
                    className="user-select"
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  {userIds.salesPerson1 && (
                    <div className="selected-user-info">
                      Selected: <strong>{getSelectedUserName(userIds.salesPerson1)}</strong>
                    </div>
                  )}
                </div>
                
                <div className="user-input-group">
                  <label>Sales Person 2: <span className="required">*</span></label>
                  <select
                    value={userIds.salesPerson2}
                    onChange={(e) => setUserIds({ ...userIds, salesPerson2: e.target.value })}
                    className="user-select"
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  {userIds.salesPerson2 && (
                    <div className="selected-user-info">
                      Selected: <strong>{getSelectedUserName(userIds.salesPerson2)}</strong>
                    </div>
                  )}
                </div>
                
                <div className="user-input-group">
                  <label>Admin: <span className="optional">(Optional)</span></label>
                  <select
                    value={userIds.admin}
                    onChange={(e) => setUserIds({ ...userIds, admin: e.target.value })}
                    className="user-select"
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  {userIds.admin && (
                    <div className="selected-user-info">
                      Selected: <strong>{getSelectedUserName(userIds.admin)}</strong>
                    </div>
                  )}
                </div>
                
                <div className="user-input-group">
                  <label>Manager: <span className="optional">(Optional)</span></label>
                  <select
                    value={userIds.manager}
                    onChange={(e) => setUserIds({ ...userIds, manager: e.target.value })}
                    className="user-select"
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  {userIds.manager && (
                    <div className="selected-user-info">
                      Selected: <strong>{getSelectedUserName(userIds.manager)}</strong>
                    </div>
                  )}
                </div>
              </div>
              
              {(userIds.salesPerson1 || userIds.salesPerson2) && (
                <div className="selected-users-summary">
                  <h4>Selected Users Summary:</h4>
                  <ul>
                    {userIds.salesPerson1 && (
                      <li><strong>Sales Person 1:</strong> {getSelectedUserName(userIds.salesPerson1)}</li>
                    )}
                    {userIds.salesPerson2 && (
                      <li><strong>Sales Person 2:</strong> {getSelectedUserName(userIds.salesPerson2)}</li>
                    )}
                    {userIds.admin && (
                      <li><strong>Admin:</strong> {getSelectedUserName(userIds.admin)}</li>
                    )}
                    {userIds.manager && (
                      <li><strong>Manager:</strong> {getSelectedUserName(userIds.manager)}</li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="instructions">
          <h3>Instructions:</h3>
          <ol>
            <li><strong>Select Users:</strong> Choose the users above that will be assigned to seed data (at least Sales Person 1 and 2 are required).</li>
            <li><strong>Reset & Seed Data:</strong> Deletes all existing data and creates fresh seed data. Use this for a clean start.</li>
            <li><strong>Add Seed Data Only:</strong> Adds seed data without deleting existing data. Useful if you want to keep some existing data.</li>
            <li><strong>Clear All Data:</strong> Deletes all data without adding seed data. Use with extreme caution!</li>
          </ol>
          <p className="note">
            <strong>Note:</strong> The system will automatically try to detect users based on email/title, but you can manually select them above.
          </p>
        </div>

        {/* Product Migration Section */}
        <div className="migration-section" style={{ marginTop: '40px', padding: '20px', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #c0d8f0' }}>
          <h2 style={{ marginTop: 0, color: '#12265E' }}>Product Template Migration</h2>
          <p style={{ color: '#666' }}>
            Migrate existing products to use the new calculation template system.
            This assigns a calculation template to each product based on its product line.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={checkMigrationStatus}
              disabled={migrationLoading}
            >
              {migrationLoading ? 'Loading...' : 'Check Status'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleMigrateProducts(true)}
              disabled={migrationLoading}
            >
              Dry Run
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleMigrateProducts(false)}
              disabled={migrationLoading}
            >
              {migrationLoading ? 'Migrating...' : 'Migrate All Products'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleVerifyMigration}
              disabled={migrationLoading}
            >
              Verify
            </button>
          </div>

          {migrationMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              background: migrationMessage.includes('failed') || migrationMessage.includes('Error') ? '#ffebee' : '#e8f5e9',
              color: migrationMessage.includes('failed') || migrationMessage.includes('Error') ? '#c62828' : '#2e7d32'
            }}>
              {migrationMessage}
            </div>
          )}

          {migrationStatus && (
            <div style={{ background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Migration Status</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#e3f2fd', borderRadius: '6px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1565c0' }}>{migrationStatus.total}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Products</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: '#e8f5e9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>{migrationStatus.migratedCount}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Migrated</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: migrationStatus.notMigratedCount > 0 ? '#fff3e0' : '#e8f5e9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: migrationStatus.notMigratedCount > 0 ? '#ef6c00' : '#2e7d32' }}>{migrationStatus.notMigratedCount}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Not Migrated</div>
                </div>
              </div>

              {migrationStatus.notMigrated?.length > 0 && (
                <div>
                  <h5 style={{ margin: '12px 0 8px' }}>Products Pending Migration:</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', maxHeight: '150px', overflowY: 'auto' }}>
                    {migrationStatus.notMigrated.slice(0, 10).map(p => (
                      <li key={p.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                        {p.name} <span style={{ color: '#666' }}>(suggested: {p.suggestedTemplate})</span>
                      </li>
                    ))}
                    {migrationStatus.notMigrated.length > 10 && (
                      <li style={{ color: '#666', fontStyle: 'italic' }}>
                        ...and {migrationStatus.notMigrated.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SeedData

