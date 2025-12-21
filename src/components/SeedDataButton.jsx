import { useState } from 'react'
import { seedAllData } from '../utils/seedData'

const SeedDataButton = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [clientCount, setClientCount] = useState(10)

  const handleSeedData = async () => {
    if (!window.confirm(`This will create ${clientCount} test clients with all related data (interactions, quotes, invoices, tasks, financials, etc.). Continue?`)) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const seedResult = await seedAllData(clientCount)
      setResult(seedResult)
    } catch (error) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '20px',
      background: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px', color: '#12265E' }}>Generate Test Data</h3>
      <p style={{ margin: '0 0 15px', color: '#666', fontSize: '0.9rem' }}>
        Create realistic test clients with interactions, quotes, invoices, tasks, financials, and feedback.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <label style={{ color: '#333', fontWeight: '500' }}>
          Number of clients:
        </label>
        <input
          type="number"
          min="1"
          max="15"
          value={clientCount}
          onChange={(e) => setClientCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))}
          style={{
            width: '80px',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
          disabled={loading}
        />
      </div>

      <button
        onClick={handleSeedData}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: loading ? '#ccc' : '#12265E',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        {loading ? 'Generating Data...' : 'Generate Test Data'}
      </button>

      {result && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          borderRadius: '6px',
          background: result.success ? '#e8f5e8' : '#ffebee',
          color: result.success ? '#2e7d32' : '#c62828'
        }}>
          {result.success ? (
            <span>Successfully created {result.clientCount} clients with all related data!</span>
          ) : (
            <span>Error: {result.error}</span>
          )}
        </div>
      )}

      <p style={{ margin: '15px 0 0', color: '#999', fontSize: '0.8rem' }}>
        Note: Maximum 15 clients can be created at once. Each client will have randomized:
        interactions, quotes, invoices, follow-up tasks, financial forecasts, contracts, and feedback.
      </p>
    </div>
  )
}

export default SeedDataButton
