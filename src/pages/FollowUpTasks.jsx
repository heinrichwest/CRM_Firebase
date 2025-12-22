import { useState, useEffect } from 'react'
import { getFollowUpTasks, createFollowUpTask, updateFollowUpTask, completeFollowUpTask, getClients } from '../services/firestoreService'
import { getUsers } from '../services/userService'
import { useTenant } from '../context/TenantContext'
import { Link } from 'react-router-dom'
import './FollowUpTasks.css'

const FollowUpTasks = () => {
  const [tasks, setTasks] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [filter, setFilter] = useState({
    status: 'all',
    userId: 'all',
    dateRange: 'all'
  })

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

  const [newTask, setNewTask] = useState({
    clientId: '',
    description: '',
    type: 'Call',
    dueDate: '',
    priority: 'Normal',
    notes: '',
    assignedTo: currentUserId || ''
  })

  const taskTypes = [
    'Call',
    'Email',
    'Proposal',
    'Demo',
    'Meeting',
    'Follow-up on quote',
    'Other'
  ]

  // Load data when hierarchy is ready
  useEffect(() => {
    if (!hierarchyLoading && currentUser) {
      loadData()
    }
  }, [hierarchyLoading, currentUser, accessibleUserIds])

  useEffect(() => {
    filterTasks()
  }, [tasks, filter])

  const loadData = async () => {
    try {
      const [tasksData, usersData, clientsData] = await Promise.all([
        getFollowUpTasks(),
        getUsers(),
        getClients()
      ])

      setAllTasks(tasksData)

      // Filter tasks based on accessible user IDs
      let filteredTasksData = tasksData
      if (!isSystemAdmin && !isSalesHead()) {
        filteredTasksData = tasksData.filter(t =>
          accessibleUserIds.includes(t.assignedTo) || accessibleUserIds.includes(t.createdBy)
        )
      }
      setTasks(filteredTasksData)

      // Filter clients for non-managers
      let filteredClientsData = clientsData
      if (!isSystemAdmin && !isSalesHead()) {
        filteredClientsData = clientsData.filter(c =>
          accessibleUserIds.includes(c.assignedSalesPerson) || accessibleUserIds.includes(c.createdBy)
        )
      }
      setClients(filteredClientsData)

      setUsers(usersData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = [...tasks]

    if (filter.status !== 'all') {
      filtered = filtered.filter(t => t.status === filter.status)
    }

    if (filter.userId !== 'all') {
      filtered = filtered.filter(t => t.assignedTo === filter.userId)
    }

    if (filter.dateRange !== 'all') {
      const now = new Date()
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false
        const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)

        switch (filter.dateRange) {
          case 'overdue':
            return dueDate < now && t.status === 'pending'
          case 'today':
            return dueDate.toDateString() === now.toDateString()
          case 'thisWeek':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            return dueDate <= weekFromNow && dueDate >= now
          default:
            return true
        }
      })
    }

    // Sort by due date
    filtered.sort((a, b) => {
      const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate || 0)
      const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate || 0)
      return dateA - dateB
    })

    setFilteredTasks(filtered)
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    try {
      const taskData = {
        ...newTask,
        createdBy: currentUserId
      }
      await createFollowUpTask(taskData)
      setShowCreateForm(false)
      setNewTask({
        clientId: '',
        description: '',
        type: 'Call',
        dueDate: '',
        priority: 'Normal',
        notes: '',
        assignedTo: currentUserId || ''
      })
      loadData()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    }
  }

  const handleCompleteTask = async (taskId, notes = '') => {
    try {
      await completeFollowUpTask(taskId, notes)
      loadData()
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task. Please try again.')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA')
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate)
    const now = new Date()
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    return client ? (client.name || client.legalName || 'Unknown') : 'Unknown Client'
  }

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId)
    return user ? (user.displayName || user.email || 'Unknown') : 'Unknown User'
  }

  const overdueTasks = tasks.filter(t => {
    if (t.status !== 'pending') return false
    const days = getDaysUntilDue(t.dueDate)
    return days !== null && days < 0
  })

  const todayTasks = tasks.filter(t => {
    if (t.status !== 'pending') return false
    const days = getDaysUntilDue(t.dueDate)
    return days === 0
  })

  const thisWeekTasks = tasks.filter(t => {
    if (t.status !== 'pending') return false
    const days = getDaysUntilDue(t.dueDate)
    return days !== null && days > 0 && days <= 7
  })

  // Get clients with upcoming follow-ups (from client.nextFollowUpDate)
  const getClientFollowUpStatus = (client) => {
    if (!client.nextFollowUpDate) return { status: 'none', daysUntil: null }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const followUpDate = client.nextFollowUpDate.toDate
      ? client.nextFollowUpDate.toDate()
      : new Date(client.nextFollowUpDate)
    followUpDate.setHours(0, 0, 0, 0)

    const diffTime = followUpDate - now
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return { status: 'overdue', daysUntil }
    if (daysUntil === 0) return { status: 'due-today', daysUntil: 0 }
    if (daysUntil <= 7) return { status: 'due-soon', daysUntil }
    return { status: 'scheduled', daysUntil }
  }

  // Get clients with follow-ups for the current salesperson/team
  // Note: clients are already filtered based on accessibleUserIds in loadData
  const clientsWithFollowUps = clients
    .filter(c => c.nextFollowUpDate)
    .map(c => ({
      ...c,
      followUpStatus: getClientFollowUpStatus(c)
    }))
    .sort((a, b) => {
      // Sort by days until follow-up (overdue first, then today, then soon)
      const daysA = a.followUpStatus.daysUntil ?? 999
      const daysB = b.followUpStatus.daysUntil ?? 999
      return daysA - daysB
    })

  const overdueFollowUps = clientsWithFollowUps.filter(c => c.followUpStatus.status === 'overdue')
  const todayFollowUps = clientsWithFollowUps.filter(c => c.followUpStatus.status === 'due-today')
  const soonFollowUps = clientsWithFollowUps.filter(c => c.followUpStatus.status === 'due-soon')

  if (loading) {
    return (
      <div className="follow-up-tasks">
        <h1>Follow-Up Tasks</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="follow-up-tasks">
      <div className="tasks-header">
        <h1>Follow-Up Tasks {!isManager && <span className="page-subtitle">(My Tasks)</span>}</h1>
        <button
          className="add-task-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          + Create Follow-Up Task
        </button>
      </div>

      {/* Task Summary */}
      <div className="task-summary">
        <div className="summary-card overdue">
          <div className="summary-label">Overdue</div>
          <div className="summary-value">{overdueTasks.length}</div>
        </div>
        <div className="summary-card today">
          <div className="summary-label">Due Today</div>
          <div className="summary-value">{todayTasks.length}</div>
        </div>
        <div className="summary-card this-week">
          <div className="summary-label">Due This Week</div>
          <div className="summary-value">{thisWeekTasks.length}</div>
        </div>
        <div className="summary-card completed">
          <div className="summary-label">Completed</div>
          <div className="summary-value">
            {tasks.filter(t => t.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Client Follow-Up Dates Section */}
      {clientsWithFollowUps.length > 0 && (
        <div className="client-followups-section">
          <h3>
            Upcoming Client Follow-Ups
            {(overdueFollowUps.length > 0 || todayFollowUps.length > 0) && (
              <span className="followup-alert-badge">
                {overdueFollowUps.length + todayFollowUps.length} Needs Attention
              </span>
            )}
          </h3>
          <div className="client-followups-grid">
            {clientsWithFollowUps.slice(0, 10).map(client => (
              <div
                key={client.id}
                className={`client-followup-card followup-${client.followUpStatus.status}`}
              >
                <Link to={`/clients/${client.id}`} className="client-followup-name">
                  {client.name || client.legalName || 'Unknown'}
                </Link>
                <div className="client-followup-info">
                  <span className={`followup-status-badge ${client.followUpStatus.status}`}>
                    {client.followUpStatus.status === 'overdue' && `${Math.abs(client.followUpStatus.daysUntil)} days overdue`}
                    {client.followUpStatus.status === 'due-today' && 'Due Today'}
                    {client.followUpStatus.status === 'due-soon' && `In ${client.followUpStatus.daysUntil} days`}
                    {client.followUpStatus.status === 'scheduled' && `In ${client.followUpStatus.daysUntil} days`}
                  </span>
                  <span className="followup-date">{formatDate(client.nextFollowUpDate)}</span>
                </div>
                {client.nextFollowUpType && (
                  <div className="client-followup-type">
                    {client.nextFollowUpType}
                    {client.nextFollowUpReason && `: ${client.nextFollowUpReason}`}
                  </div>
                )}
              </div>
            ))}
          </div>
          {clientsWithFollowUps.length > 10 && (
            <div className="show-more-text">
              +{clientsWithFollowUps.length - 10} more clients with scheduled follow-ups
            </div>
          )}
        </div>
      )}

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="create-task-form">
          <div className="form-header">
            <h2>Create Follow-Up Task</h2>
            <button
              className="close-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCreateTask}>
            <div className="form-row">
              <div className="form-group">
                <label>Client *</label>
                <select
                  value={newTask.clientId}
                  onChange={(e) => setNewTask({ ...newTask, clientId: e.target.value })}
                  required
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
                <label>Type *</label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                  required
                >
                  {taskTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  required
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assigned To *</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  required
                >
                  <option value="">Select User</option>
                  {isManager ? (
                    users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.email || user.id}
                      </option>
                    ))
                  ) : (
                    <option value={currentUserId}>Myself</option>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="3"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="tasks-filters">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        {isManager && (
          <select
            value={filter.userId}
            onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email || user.id}
              </option>
            ))}
          </select>
        )}

        <select
          value={filter.dateRange}
          onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
        >
          <option value="all">All Dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due Today</option>
          <option value="thisWeek">Due This Week</option>
        </select>
      </div>

      {/* Tasks List */}
      <div className="tasks-list">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const days = getDaysUntilDue(task.dueDate)
            const isOverdue = days !== null && days < 0 && task.status === 'pending'

            return (
              <div
                key={task.id}
                className={`task-card ${isOverdue ? 'overdue' : ''} task-${task.status}`}
              >
                <div className="task-card-header">
                  <div>
                    <Link to={`/clients/${task.clientId}`} className="task-client-link">
                      {getClientName(task.clientId)}
                    </Link>
                    <span className="task-type">{task.type}</span>
                  </div>
                  <span className={`task-status task-status-${task.status}`}>
                    {task.status}
                  </span>
                </div>

                <div className="task-description">{task.description}</div>

                <div className="task-meta">
                  {isManager && <span>Assigned to: {getUserName(task.assignedTo)}</span>}
                  <span>Due: {formatDate(task.dueDate)}</span>
                  {days !== null && task.status === 'pending' && (
                    <span className={isOverdue ? 'overdue-badge' : 'days-badge'}>
                      {isOverdue ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                    </span>
                  )}
                  <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </div>

                {task.notes && (
                  <div className="task-notes">{task.notes}</div>
                )}

                {task.status === 'pending' && (
                  <div className="task-actions">
                    <button
                      className="complete-btn"
                      onClick={() => {
                        const notes = prompt('Add completion notes (optional):')
                        if (notes !== null) {
                          handleCompleteTask(task.id, notes)
                        }
                      }}
                    >
                      Mark Complete
                    </button>
                  </div>
                )}

                {task.status === 'completed' && task.completedAt && (
                  <div className="task-completed-info">
                    Completed on: {formatDate(task.completedAt)}
                    {task.completedNotes && (
                      <div className="completed-notes">Notes: {task.completedNotes}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p className="no-tasks">No tasks found.</p>
        )}
      </div>
    </div>
  )
}

export default FollowUpTasks


