import { useState, useEffect } from 'react'
import { getDeals, createDeal, updateDeal, moveDealStage, getClients, updateClientPipelineStatus, getPipelineStatuses } from '../services/firestoreService'
import { useTenant } from '../context/TenantContext'
import { Link } from 'react-router-dom'
import './SalesPipeline.css'

const SalesPipeline = () => {
  const [deals, setDeals] = useState([])
  const [allDeals, setAllDeals] = useState([]) // Keep all deals for filtering
  const [clients, setClients] = useState([])
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
    hierarchyLoading
  } = useTenant()

  const isManager = isSystemAdmin || isTeamManager() || isSalesHead()
  const currentUserId = currentUser?.uid

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

  const [newDeal, setNewDeal] = useState({
    clientId: '',
    company: '',
    contact: '',
    product: '',
    numberOfLearners: '',
    seta: '',
    budgetEstimate: '',
    bbbeeContribution: '',
    expectedClosingDate: '',
    details: '',
    value: '',
    priority: 'Normal',
    stage: 'new-lead',
    nextAction: '',
    proposalType: '',
    closeDate: '',
    supportingDocuments: ''
  })

  // Load data when hierarchy is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadPipelineStatuses()
      loadDeals()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

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

  const loadDeals = async () => {
    try {
      const [dealsData, clientsData] = await Promise.all([
        getDeals(),
        getClients()
      ])
      setAllDeals(dealsData)
      setClients(clientsData)

      // Create combined list: deals + clients with pipelineStatus (as "client pipeline items")
      let combinedPipeline = [...dealsData]

      // Add clients with pipelineStatus that don't already have a deal
      const clientsWithDeals = new Set(dealsData.map(d => d.clientId))
      const clientPipelineItems = clientsData
        .filter(client => client.pipelineStatus && !clientsWithDeals.has(client.id))
        .map(client => ({
          id: `client_${client.id}`,
          clientId: client.id,
          company: client.name || client.legalName || 'Unknown Client',
          stage: client.pipelineStatus,
          value: 0,
          priority: 'Normal',
          isClientPipeline: true, // Flag to identify these are from client.pipelineStatus
          assignedTo: client.assignedSalesPerson,
          createdAt: client.createdAt
        }))

      combinedPipeline = [...combinedPipeline, ...clientPipelineItems]

      // Filter based on accessible user IDs (unless sales head or system admin)
      if (!isSystemAdmin && !isSalesHead()) {
        combinedPipeline = combinedPipeline.filter(d =>
          accessibleUserIds.includes(d.assignedTo) || accessibleUserIds.includes(d.createdBy)
        )
      }

      setDeals(combinedPipeline)
      setLoading(false)
    } catch (error) {
      console.error('Error loading deals:', error)
      setLoading(false)
    }
  }

  const handleCreateDeal = async (e) => {
    e.preventDefault()
    try {
      const dealData = {
        ...newDeal,
        value: parseFloat(newDeal.value) || 0,
        lastContact: new Date(),
        createdBy: currentUserId,
        assignedTo: currentUserId
      }
      await createDeal(dealData)
      setShowCreateForm(false)
      setNewDeal({
        clientId: '',
        company: '',
        contact: '',
        product: '',
        numberOfLearners: '',
        seta: '',
        budgetEstimate: '',
        bbbeeContribution: '',
        expectedClosingDate: '',
        details: '',
        value: '',
        priority: 'Normal',
        stage: 'new-lead',
        nextAction: '',
        proposalType: '',
        closeDate: '',
        supportingDocuments: ''
      })
      loadDeals()
    } catch (error) {
      console.error('Error creating deal:', error)
      alert('Failed to create deal. Please try again.')
    }
  }

  const handleMoveStage = async (dealId, newStage) => {
    try {
      // Check if this is a client pipeline item (from client.pipelineStatus)
      if (dealId.startsWith('client_')) {
        const clientId = dealId.replace('client_', '')
        await updateClientPipelineStatus(clientId, newStage, currentUserId)
      } else {
        await moveDealStage(dealId, newStage)
      }
      loadDeals()
    } catch (error) {
      console.error('Error moving deal:', error)
      alert('Failed to move deal. Please try again.')
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

    if (draggedDeal && draggedDeal.stage !== targetStageId) {
      try {
        // Check if this is a client pipeline item
        if (draggedDeal.isClientPipeline) {
          const clientId = draggedDeal.id.replace('client_', '')
          await updateClientPipelineStatus(clientId, targetStageId, currentUserId)
        } else {
          await moveDealStage(draggedDeal.id, targetStageId)
        }
        loadDeals()
      } catch (error) {
        console.error('Error moving deal:', error)
        alert('Failed to move deal. Please try again.')
      }
    }
    setDraggedDeal(null)
  }

  const getDealsByStage = (stageId) => {
    let filtered = deals.filter(deal => deal.stage === stageId)
    
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.contact?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }

  const calculateMetrics = () => {
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
    const wonDeals = deals.filter(d => d.stage === 'won')
    const lostDeals = deals.filter(d => d.stage === 'lost')
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const avgDealSize = activeDeals.length > 0 ? pipelineValue / activeDeals.length : 0
    const winRate = (wonDeals.length + lostDeals.length) > 0 
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
      : 0

    return {
      pipelineValue,
      activeDeals: activeDeals.length,
      winRate: winRate.toFixed(1),
      avgDealSize
    }
  }

  const getClientName = (clientId) => {
    if (!clientId) return 'N/A'
    const client = clients.find(c => c.id === clientId)
    return client ? (client.name || client.legalName || 'Unknown') : 'Unknown Client'
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

  const metrics = calculateMetrics()

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
        <h1>Sales Pipeline {!isManager && <span className="page-subtitle">(My Deals)</span>}</h1>
        <button 
          className="add-deal-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          + Add Deal
        </button>
      </div>

      {/* Create Deal Form */}
      {showCreateForm && (
        <div className="create-deal-form">
          <div className="form-header">
            <h2>Create New Deal</h2>
            <button 
              className="close-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCreateDeal}>
            <div className="form-row">
              <div className="form-group">
                <label>Client *</label>
                <select
                  required
                  value={newDeal.clientId}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value)
                    setNewDeal({ 
                      ...newDeal, 
                      clientId: e.target.value,
                      company: client ? (client.name || client.legalName) : ''
                    })
                  }}
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.legalName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Contact</label>
                <input
                  type="text"
                  value={newDeal.contact}
                  onChange={(e) => setNewDeal({ ...newDeal, contact: e.target.value })}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Product *</label>
                <select
                  required
                  value={newDeal.product}
                  onChange={(e) => setNewDeal({ ...newDeal, product: e.target.value })}
                >
                  <option value="">Select Product</option>
                  <option value="Accredited Training">Accredited Training</option>
                  <option value="E-Learning">E-Learning</option>
                  <option value="LMS">LMS</option>
                  <option value="Learnerships">Learnerships</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Number of Learners</label>
                <input
                  type="number"
                  value={newDeal.numberOfLearners}
                  onChange={(e) => setNewDeal({ ...newDeal, numberOfLearners: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>SETA</label>
                <select
                  value={newDeal.seta}
                  onChange={(e) => setNewDeal({ ...newDeal, seta: e.target.value })}
                >
                  <option value="">Select SETA</option>
                  <option value="MERSETA">MERSETA</option>
                  <option value="W&RSETA">W&RSETA</option>
                  <option value="FASSET">FASSET</option>
                  <option value="BANKSETA">BANKSETA</option>
                  <option value="INSETA">INSETA</option>
                  <option value="ETDP SETA">ETDP SETA</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Budget Estimate (R)</label>
                <input
                  type="number"
                  value={newDeal.budgetEstimate}
                  onChange={(e) => setNewDeal({ ...newDeal, budgetEstimate: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>BBBEE Contribution Target</label>
                <input
                  type="text"
                  value={newDeal.bbbeeContribution}
                  onChange={(e) => setNewDeal({ ...newDeal, bbbeeContribution: e.target.value })}
                  placeholder="e.g., Level 1, 2, etc."
                />
              </div>
              <div className="form-group">
                <label>Expected Closing Date</label>
                <input
                  type="date"
                  value={newDeal.expectedClosingDate}
                  onChange={(e) => setNewDeal({ ...newDeal, expectedClosingDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Deal Value (R)</label>
                <input
                  type="number"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newDeal.priority}
                  onChange={(e) => setNewDeal({ ...newDeal, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Details</label>
              <textarea
                rows="4"
                value={newDeal.details}
                onChange={(e) => setNewDeal({ ...newDeal, details: e.target.value })}
                placeholder="Enter deal details..."
              />
            </div>

            <div className="form-group">
              <label>Supporting Documents</label>
              <input
                type="text"
                value={newDeal.supportingDocuments}
                onChange={(e) => setNewDeal({ ...newDeal, supportingDocuments: e.target.value })}
                placeholder="List supporting documents (e.g., Proposal.pdf, Quote.xlsx)"
              />
            </div>

            <div className="form-group">
              <label>Stage</label>
              <select
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Create Deal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key Metrics */}
      <div className="pipeline-metrics">
        <div className="metric-card">
          <div className="metric-label">Pipeline Value</div>
          <div className="metric-value">{formatCurrency(metrics.pipelineValue)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Deals</div>
          <div className="metric-value">{metrics.activeDeals}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Win Rate</div>
          <div className="metric-value">{metrics.winRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Deal Size</div>
          <div className="metric-value">{formatCurrency(metrics.avgDealSize)}</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Won Deals Value</div>
          <div className="summary-value">
            {formatCurrency(deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0))}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pipeline Value</div>
          <div className="summary-value">{formatCurrency(metrics.pipelineValue)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending Revenue</div>
          <div className="summary-value">
            {formatCurrency(deals.filter(d => ['proposal-sent', 'awaiting-decision', 'negotiation'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0))}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Avg Deal Size</div>
          <div className="summary-value">{formatCurrency(metrics.avgDealSize)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="pipeline-filters">
        <input
          type="text"
          placeholder="Search companies..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {stages.map(stage => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          ))}
        </select>
        <button className="export-btn">Export</button>
        <button className="bulk-actions-btn">Bulk Actions</button>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {stages.map(stage => {
          const stageDeals = getDealsByStage(stage.id)
          return (
            <div
              key={stage.id}
              className={`kanban-column ${dragOverStage === stage.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="column-header" style={{ backgroundColor: stage.color }}>
                <h3>{stage.name}</h3>
                <span className="deal-count">{stageDeals.length}</span>
              </div>
              <div className="deals-list">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    className={`deal-card ${draggedDeal?.id === deal.id ? 'dragging' : ''} ${deal.isClientPipeline ? 'client-pipeline-card' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedDeal(deal)}
                  >
                    {deal.isClientPipeline && (
                      <div className="client-pipeline-badge">Client Status</div>
                    )}
                    <div className="deal-company">
                      {deal.clientId ? (
                        <Link to={`/clients/${deal.clientId}`} onClick={(e) => e.stopPropagation()}>
                          {getClientName(deal.clientId)}
                        </Link>
                      ) : (
                        deal.company || 'Unnamed Company'
                      )}
                    </div>
                    {deal.product && <div className="deal-product">Product: {deal.product}</div>}
                    {deal.contact && <div className="deal-contact">{deal.contact}</div>}
                    {deal.details && <div className="deal-details">{deal.details.substring(0, 100)}...</div>}
                    {!deal.isClientPipeline && (
                      <div className="deal-footer">
                        <div className="deal-value">{formatCurrency(deal.value || deal.budgetEstimate || 0)}</div>
                        <span className={`priority-badge priority-${deal.priority?.toLowerCase()}`}>
                          {deal.priority || 'Normal'}
                        </span>
                      </div>
                    )}
                    {deal.numberOfLearners && (
                      <div className="deal-meta">
                        Learners: {deal.numberOfLearners}
                      </div>
                    )}
                    {deal.expectedClosingDate && (
                      <div className="deal-meta">
                        Closing: {formatDate(deal.expectedClosingDate)}
                      </div>
                    )}
                    {deal.lastContact && (
                      <div className="deal-meta">
                        Last Contact: {formatDate(deal.lastContact)}
                      </div>
                    )}
                    {deal.nextAction && (
                      <div className="deal-meta">
                        Next: {deal.nextAction}
                      </div>
                    )}
                    <div className="deal-actions">
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDeal(deal)
                        }}
                      >
                        View
                      </button>
                      {stage.id !== 'won' && stage.id !== 'lost' && (
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            const currentIndex = stages.findIndex(s => s.id === stage.id)
                            if (currentIndex < stages.length - 1) {
                              handleMoveStage(deal.id, stages[currentIndex + 1].id)
                            }
                          }}
                        >
                          Next Stage
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="empty-stage">No deals in this stage</div>
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
