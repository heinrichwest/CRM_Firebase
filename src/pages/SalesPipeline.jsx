import { useState, useEffect } from 'react'
import { getClients, updateClientPipelineStatus, getPipelineStatuses, getClientsWithAllocationStatus } from '../services/firestoreService'
import { useTenant } from '../context/TenantContext'
import { Link } from 'react-router-dom'
import './SalesPipeline.css'

const SalesPipeline = () => {
  const [clients, setClients] = useState([])
  const [filteredClients, setFilteredClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [draggedDeal, setDraggedDeal] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [stages, setStages] = useState([])

  // Team hierarchy from context
  const {
    currentUser,
    isSystemAdmin,
    accessibleUserIds,
    isTeamManager,
    isSalesHead,
    hierarchyLoading,
    getTenantId
  } = useTenant()

  const isManager = isSystemAdmin || isTeamManager() || isSalesHead()
  const currentUserId = currentUser?.uid
  const tenantId = getTenantId()

  // Default stages as fallback
  const defaultStages = [
    { id: 'new-lead', name: 'New Lead', color: '#e3f2fd' },
    { id: 'qualifying', name: 'Qualifying', color: '#fff3e0' },
    { id: 'proposal-sent', name: 'Proposal Sent', color: '#e8f5e8' },
    { id: 'awaiting-decision', name: 'Awaiting Decision', color: '#f3e5f5' },
    { id: 'negotiation', name: 'Negotiation', color: '#fff9c4' },
    { id: 'won', name: 'Won', color: '#c8e6c9' },
    { id: 'lost', name: 'Lost', color: '#ffcdd2' }
  ]

  // Load data when hierarchy is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadPipelineStatuses()
      loadClients()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm, stageFilter])

  const loadPipelineStatuses = async () => {
    try {
      const statusData = await getPipelineStatuses()
      // getPipelineStatuses returns an array directly, not an object with statuses property
      if (statusData && Array.isArray(statusData) && statusData.length > 0) {
        setStages(statusData)
      } else if (statusData && statusData.statuses && statusData.statuses.length > 0) {
        // Fallback for object format
        setStages(statusData.statuses)
      } else {
        setStages(defaultStages)
      }
    } catch (error) {
      console.error('Error loading pipeline statuses:', error)
      setStages(defaultStages)
    }
  }

  const loadClients = async () => {
    try {
      const filterTenantId = isSystemAdmin ? null : tenantId
      const clientsData = await getClientsWithAllocationStatus(filterTenantId)
      
      // Filter clients based on accessible user IDs (unless sales head or system admin)
      let filteredClientData = clientsData
      if (!isSystemAdmin && !isSalesHead()) {
        filteredClientData = clientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) ||
          accessibleUserIds.includes(c.createdBy)
        )
      }

      // Only include clients with pipelineStatus
      const clientsWithPipeline = filteredClientData.filter(c => c.pipelineStatus)
      
      setClients(clientsWithPipeline)
      setLoading(false)
    } catch (error) {
      console.error('Error loading clients:', error)
      setLoading(false)
    }
  }

  const filterClients = () => {
    let filtered = [...clients]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.legalName?.toLowerCase().includes(searchLower) ||
        client.tradingName?.toLowerCase().includes(searchLower)
      )
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(client => {
        const status = (client.pipelineStatus || '').toLowerCase()
        return status === stageFilter.toLowerCase()
      })
    }

    setFilteredClients(filtered)
  }

  // Calculate how long a client has been in their current pipeline status
  const getStatusDuration = (client) => {
    if (!client.pipelineStatusHistory || client.pipelineStatusHistory.length === 0) {
      // Fallback to createdAt or updatedAt if no history
      const date = client.updatedAt || client.createdAt
      if (!date) return null
      const statusDate = date.toDate ? date.toDate() : new Date(date)
      const now = new Date()
      const diffDays = Math.floor((now - statusDate) / (1000 * 60 * 60 * 24))
      return diffDays
    }

    // Find the current status entry (the one without an endDate)
    const currentStatusEntry = client.pipelineStatusHistory
      .slice()
      .reverse()
      .find(entry => !entry.endDate && entry.status === client.pipelineStatus)

    if (currentStatusEntry && currentStatusEntry.startDate) {
      const startDate = new Date(currentStatusEntry.startDate)
      const now = new Date()
      const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
      return diffDays
    }

    return null
  }

  const handleMoveStage = async (clientId, newStage) => {
    try {
      await updateClientPipelineStatus(clientId, newStage, currentUserId)
      await loadClients()
    } catch (error) {
      console.error('Error moving client to stage:', error)
      alert('Failed to update pipeline status. Please try again.')
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deal.id)
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      e.target.classList.add('dragging')
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const handleDragOver = (e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId)
    }
  }

  const handleDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage(null)
    }
  }

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault()
    setDragOverStage(null)

    if (!draggedDeal) {
      return
    }

    const currentStatus = (draggedDeal.pipelineStatus || '').toLowerCase()
    const targetStatus = targetStageId.toLowerCase()

    // Only update if the status actually changes
    if (currentStatus === targetStatus) {
      setDraggedDeal(null)
      return
    }

    try {
      await updateClientPipelineStatus(draggedDeal.id, targetStageId, currentUserId)
      await loadClients()
    } catch (error) {
      console.error('Error moving client to stage:', error)
      alert('Failed to update pipeline status. Please try again.')
    }

    setDraggedDeal(null)
  }

  // Get clients for a specific pipeline stage
  const getClientsByStage = (stageId) => {
    const stageIdLower = stageId.toLowerCase()

    let filtered = filteredClients.filter(client => {
      const status = (client.pipelineStatus || '').toLowerCase()
      return status === stageIdLower
    })
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.legalName?.toLowerCase().includes(searchLower) ||
        client.tradingName?.toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }

  const getClientName = (clientId) => {
    if (!clientId) return 'N/A'
    const client = clients.find(c => c.id === clientId)
    return client ? (client.name || client.legalName || 'Unknown') : 'Unknown Client'
  }

  // Use the same display logic for pipeline statuses as the Clients screen
  const formatPipelineStatus = (status) => {
    if (!status) return ''
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA')
  }

  if (loading || stages.length === 0) {
    return (
      <div className="sales-pipeline">
        <h1>Sales Pipeline</h1>
        <div className="sales-pipeline-content">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sales-pipeline">
      <div className="pipeline-header">
        <h1>Sales Pipeline {!isManager && <span className="page-subtitle">(My Clients)</span>}</h1>
      </div>

      {/* Filters */}
      <div className="pipeline-filters">
        <input
          type="text"
          placeholder="Search clients..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {stages.map(stage => {
          const stageClients = getClientsByStage(stage.id)
          return (
            <div
              key={stage.id}
              className={`kanban-column ${dragOverStage === stage.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="column-header" style={{ backgroundColor: stage.color }}>
                <h3>{formatPipelineStatus(stage.id)}</h3>
                <span className="deal-count">{stageClients.length}</span>
              </div>
              <div className="deals-list">
                {stageClients.map(client => (
                  <div
                    key={client.id}
                    className={`deal-card ${draggedDeal?.id === client.id ? 'dragging' : ''} client-pipeline-card`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, client)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedDeal(client)}
                  >
                    <div className="deal-company">
                      <Link to={`/clients/${client.id}`} onClick={(e) => e.stopPropagation()}>
                        {client.name || client.legalName || client.tradingName || 'Unnamed Client'}
                      </Link>
                    </div>
                    <div className="deal-meta">
                      {(() => {
                        const days = getStatusDuration(client)
                        if (days === null || days === undefined) return 'Days in status: N/A'
                        return `Days in status: ${days} day${days !== 1 ? 's' : ''}`
                      })()}
                    </div>
                    <div className="deal-actions">
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDeal(client)
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
                {stageClients.length === 0 && (
                  <div className="empty-stage">No clients in this stage</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="deal-modal" onClick={() => setSelectedDeal(null)}>
          <div className="deal-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDeal.company || 'Deal Details'}</h2>
              <button className="close-btn" onClick={() => setSelectedDeal(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedDeal.clientId && (
                <div className="detail-item">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">
                    <Link to={`/clients/${selectedDeal.clientId}`}>
                      {getClientName(selectedDeal.clientId)}
                    </Link>
                  </span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Contact:</span>
                <span className="detail-value">{selectedDeal.contact || 'N/A'}</span>
              </div>
              {selectedDeal.product && (
                <div className="detail-item">
                  <span className="detail-label">Product:</span>
                  <span className="detail-value">{selectedDeal.product}</span>
                </div>
              )}
              {selectedDeal.numberOfLearners && (
                <div className="detail-item">
                  <span className="detail-label">Number of Learners:</span>
                  <span className="detail-value">{selectedDeal.numberOfLearners}</span>
                </div>
              )}
              {selectedDeal.seta && (
                <div className="detail-item">
                  <span className="detail-label">SETA:</span>
                  <span className="detail-value">{selectedDeal.seta}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Deal Value:</span>
                <span className="detail-value">{formatCurrency(selectedDeal.value || 0)}</span>
              </div>
              {selectedDeal.budgetEstimate && (
                <div className="detail-item">
                  <span className="detail-label">Budget Estimate:</span>
                  <span className="detail-value">{formatCurrency(selectedDeal.budgetEstimate)}</span>
                </div>
              )}
              {selectedDeal.bbbeeContribution && (
                <div className="detail-item">
                  <span className="detail-label">BBBEE Contribution:</span>
                  <span className="detail-value">{selectedDeal.bbbeeContribution}</span>
                </div>
              )}
              {selectedDeal.expectedClosingDate && (
                <div className="detail-item">
                  <span className="detail-label">Expected Closing Date:</span>
                  <span className="detail-value">{formatDate(selectedDeal.expectedClosingDate)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Priority:</span>
                <span className="detail-value">{selectedDeal.priority || 'Normal'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Stage:</span>
                <span className="detail-value">{stages.find(s => s.id === selectedDeal.stage)?.name || 'N/A'}</span>
              </div>
              {selectedDeal.details && (
                <div className="detail-item full-width">
                  <span className="detail-label">Details:</span>
                  <span className="detail-value">{selectedDeal.details}</span>
                </div>
              )}
              {selectedDeal.supportingDocuments && (
                <div className="detail-item full-width">
                  <span className="detail-label">Supporting Documents:</span>
                  <span className="detail-value">{selectedDeal.supportingDocuments}</span>
                </div>
              )}
              {selectedDeal.nextAction && (
                <div className="detail-item">
                  <span className="detail-label">Next Action:</span>
                  <span className="detail-value">{selectedDeal.nextAction}</span>
                </div>
              )}
              {selectedDeal.lastContact && (
                <div className="detail-item">
                  <span className="detail-label">Last Contact:</span>
                  <span className="detail-value">{formatDate(selectedDeal.lastContact)}</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="action-btn">Edit</button>
              <button className="action-btn">Message</button>
              <button className="action-btn" onClick={() => setSelectedDeal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesPipeline
