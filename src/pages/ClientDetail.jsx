import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getClient,
  getQuotes,
  getInvoices,
  getClientActivities,
  getClientInteractions,
  getFollowUpTasks,
  getClientFinancialsByYear,
  getFeedback,
  getContracts,
  getDeals,
  calculateFinancialYearMonths,
  createFeedback,
  saveClientFinancial,
  updateClientPipelineStatus,
  updateClientFollowUp,
  getUsers,
  updateClient,
  getPipelineStatuses,
  getProducts,
  getProductLines,
  getLegalDocumentTypes,
  getFinancialYearSettings
} from '../services/firestoreService'
import {
  UPLOAD_TYPES,
  getFinancialDataByClient,
  calculateFinancialYear
} from '../services/financialUploadService'
import { Timestamp } from 'firebase/firestore'
import { auth } from '../config/firebase'
import { useTenant } from '../context/TenantContext'
import { getJobTitles } from '../services/jobTitlesService'
import InteractionCapture from '../components/InteractionCapture'
import './ClientDetail.css'

const ClientDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, getTenantId } = useTenant()
  const tenantId = getTenantId()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [allQuotes, setAllQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [interactions, setInteractions] = useState([])
  const [followUpTasks, setFollowUpTasks] = useState([])
  const [financials, setFinancials] = useState([])
  const [feedback, setFeedback] = useState([])
  const [contracts, setContracts] = useState([])
  const [deals, setDeals] = useState([])
  const [lmsData, setLmsData] = useState(null)
  const [users, setUsers] = useState([])
  const [fyInfo, setFyInfo] = useState(null)
  const [fySettings, setFySettings] = useState(null)
  const [uploadedFinancials, setUploadedFinancials] = useState({
    ytdActual: [],
    budget: [],
    ytd1: [],
    ytd2: [],
    ytd3: []
  })
  const [interactionFilters, setInteractionFilters] = useState({
    type: 'all',
    userId: 'all'
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Product line modal state
  const [productLineModalOpen, setProductLineModalOpen] = useState(false)
  const [selectedFinancial, setSelectedFinancial] = useState(null)
  const [editingDeals, setEditingDeals] = useState([])
  const [savingDeals, setSavingDeals] = useState(false)
  const [activeDealTab, setActiveDealTab] = useState(0)
  const [savingPipelineStatus, setSavingPipelineStatus] = useState(false)

  // Follow-up state
  const [showFollowUpEdit, setShowFollowUpEdit] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    date: '',
    type: 'call',
    reason: ''
  })
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  // SharePoint and document checklist state
  const [editingSharePoint, setEditingSharePoint] = useState(false)
  const [sharePointLink, setSharePointLink] = useState('')
  const [savingSharePoint, setSavingSharePoint] = useState(false)
  const [documentChecklist, setDocumentChecklist] = useState({})
  const [savingDocChecklist, setSavingDocChecklist] = useState(false)

  // Last contact date state
  const [editingLastContact, setEditingLastContact] = useState(false)
  const [lastContactDate, setLastContactDate] = useState('')
  const [savingLastContact, setSavingLastContact] = useState(false)

  // Client locations state
  const [locations, setLocations] = useState([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [locationForm, setLocationForm] = useState({ name: '', address: '', city: '', province: '', postalCode: '', isHeadOffice: false })
  const [savingLocation, setSavingLocation] = useState(false)

  // Client contacts state
  const [contacts, setContacts] = useState([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [contactFormData, setContactFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', locationId: '', isDecisionMaker: false, isMainContact: false, notes: '' })
  const [savingContact, setSavingContact] = useState(false)

  // Products state for learnership dropdown
  const [products, setProducts] = useState([])
  const [productLines, setProductLines] = useState([])

  // Legal document types (loaded from admin settings)
  const [legalDocumentTypes, setLegalDocumentTypes] = useState([])

  // Job titles for contact persons
  const [jobTitles, setJobTitles] = useState([])

  const followUpTypes = [
    { value: 'call', label: 'Call' },
    { value: 'email', label: 'Send Email' },
    { value: 'meeting', label: 'Schedule Meeting' },
    { value: 'proposal', label: 'Send Proposal' },
    { value: 'quote', label: 'Follow Up on Quote' },
    { value: 'demo', label: 'Schedule Demo' },
    { value: 'contract', label: 'Contract Discussion' },
    { value: 'other', label: 'Other' }
  ]

  // Pipeline stages loaded from database
  const [pipelineStages, setPipelineStages] = useState([
    { id: '', name: 'Not in Pipeline', color: '#f5f5f5' }
  ])

  useEffect(() => {
    if (id) {
      loadClientData()
    }
  }, [id])

  const loadClientData = async () => {
    try {
      // First, load the client - this is required
      const clientData = await getClient(id)

      if (!clientData) {
        console.error('Client not found with ID:', id)
        setLoading(false)
        return
      }

      setClient(clientData)

      // Initialize SharePoint and document checklist from client data
      setSharePointLink(clientData.sharePointFolderLink || '')
      setDocumentChecklist(clientData.documentChecklist || {})
      setLocations(clientData.locations || [])
      setContacts(clientData.contacts || [])

      // Initialize lastContactDate for editing
      if (clientData.lastContact) {
        const date = clientData.lastContact.toDate ? clientData.lastContact.toDate() : new Date(clientData.lastContact)
        setLastContactDate(date.toISOString().split('T')[0])
      } else {
        setLastContactDate('')
      }

      // Get financial year info and settings (tenant-specific)
      let fyData = null
      try {
        const [fyMonthsData, fySettingsData] = await Promise.all([
          calculateFinancialYearMonths(tenantId),
          getFinancialYearSettings(tenantId)
        ])
        fyData = fyMonthsData
        setFyInfo(fyData)
        setFySettings(fySettingsData)
      } catch (fyError) {
        console.error('Error loading financial year info:', fyError)
        // Set default FY info
        setFyInfo({ currentFinancialYear: 2025 })
        setFySettings({ reportingMonth: 'February' })
      }

      // Load remaining data in parallel, but handle errors individually
      const loadWithFallback = async (fn, fallback = []) => {
        try {
          return await fn()
        } catch (error) {
          console.error('Error loading data:', error)
          return fallback
        }
      }

      const [
        quotesData,
        invoicesData,
        interactionsData,
        tasksData,
        financialsData,
        feedbackData,
        contractsData,
        dealsData,
        usersData,
        pipelineStatusesData,
        productsData,
        productLinesData,
        legalDocTypesData,
        jobTitlesData
      ] = await Promise.all([
        loadWithFallback(() => getQuotes(id)),
        loadWithFallback(() => getInvoices(id)),
        loadWithFallback(() => getClientInteractions(id)),
        loadWithFallback(() => getFollowUpTasks({ clientId: id })),
        loadWithFallback(() => fyData ? getClientFinancialsByYear(fyData.currentFinancialYear, { clientId: id }) : Promise.resolve([])),
        loadWithFallback(() => getFeedback(id)),
        loadWithFallback(() => getContracts(id)),
        loadWithFallback(() => getDeals(null, { clientId: id })),
        loadWithFallback(() => getUsers()),
        loadWithFallback(() => getPipelineStatuses()),
        loadWithFallback(() => getProducts()),
        loadWithFallback(() => getProductLines()),
        loadWithFallback(() => getLegalDocumentTypes()),
        loadWithFallback(() => getJobTitles())
      ])

      setAllQuotes(quotesData)
      setQuotes(quotesData.slice(0, 5))
      setAllInvoices(invoicesData)
      setInvoices(invoicesData.slice(0, 5))
      setInteractions(interactionsData)
      setFollowUpTasks(tasksData)
      setFinancials(financialsData)
      setFeedback(feedbackData)
      setContracts(contractsData)
      setDeals(dealsData)
      setUsers(usersData)
      // Set pipeline stages from database with "Not in Pipeline" as first option
      setPipelineStages([
        { id: '', name: 'Not in Pipeline', color: '#f5f5f5' },
        ...pipelineStatusesData
      ])
      // Set products for learnership dropdown
      setProducts(productsData.filter(p => p.status === 'active'))
      setProductLines(productLinesData)
      // Set legal document types from admin settings
      setLegalDocumentTypes(legalDocTypesData)
      // Set job titles for contact persons
      setJobTitles(jobTitlesData)

      // Load LMS data if client uses LMS
      if (clientData?.currentLmsUsage === 'Yes' && clientData?.lmsId) {
        // Simulated LMS data - in production, this would fetch from LMS API
        setLmsData(generateLmsData(clientData))
      }

      // Load uploaded financial data (budget and historical) for this client
      if (tenantId && fyData) {
        try {
          const currentFY = fyData.currentFinancialYear
          const fy1 = calculateFinancialYear(currentFY, -1)
          const fy2 = calculateFinancialYear(currentFY, -2)
          const fy3 = calculateFinancialYear(currentFY, -3)

          // Fetch all financial data for client once
          const allClientData = await getFinancialDataByClient(id, tenantId)

          const ytdActualData = allClientData.filter(d => d.uploadType === UPLOAD_TYPES.YTD_ACTUAL && d.financialYear === currentFY)
          const budgetData = allClientData.filter(d => d.uploadType === UPLOAD_TYPES.BUDGET && d.financialYear === currentFY)
          const ytd1Data = allClientData.filter(d => d.uploadType === UPLOAD_TYPES.YTD_1 && d.financialYear === fy1)
          const ytd2Data = allClientData.filter(d => d.uploadType === UPLOAD_TYPES.YTD_2 && d.financialYear === fy2)
          const ytd3Data = allClientData.filter(d => d.uploadType === UPLOAD_TYPES.YTD_3 && d.financialYear === fy3)

          setUploadedFinancials({
            ytdActual: ytdActualData,
            budget: budgetData,
            ytd1: ytd1Data,
            ytd2: ytd2Data,
            ytd3: ytd3Data
          })
        } catch (err) {
          console.error('Error loading uploaded financials:', err)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading client data:', error)
      setLoading(false)
    }
  }

  // Generate simulated LMS data for demo
  const generateLmsData = (clientData) => {
    const employeeCount = Math.floor(Math.random() * 200) + 20
    const activeCourses = Math.floor(Math.random() * 10) + 3

    return {
      totalEmployees: employeeCount,
      activeUsers: Math.floor(employeeCount * (0.6 + Math.random() * 0.3)),
      completedCourses: Math.floor(Math.random() * 500) + 100,
      inProgressCourses: Math.floor(Math.random() * 150) + 30,
      avgCompletionRate: Math.floor(Math.random() * 30) + 65,
      lastActivityDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      courses: [
        { name: 'First Aid Level 1', enrolled: Math.floor(Math.random() * 50) + 10, completed: Math.floor(Math.random() * 40) + 5, avgScore: Math.floor(Math.random() * 20) + 75 },
        { name: 'Fire Safety Basics', enrolled: Math.floor(Math.random() * 40) + 8, completed: Math.floor(Math.random() * 35) + 3, avgScore: Math.floor(Math.random() * 15) + 80 },
        { name: 'OHS Awareness', enrolled: Math.floor(Math.random() * 60) + 15, completed: Math.floor(Math.random() * 50) + 10, avgScore: Math.floor(Math.random() * 18) + 78 },
        { name: 'Excel Fundamentals', enrolled: Math.floor(Math.random() * 30) + 5, completed: Math.floor(Math.random() * 25) + 2, avgScore: Math.floor(Math.random() * 20) + 70 },
        { name: 'Leadership Skills', enrolled: Math.floor(Math.random() * 20) + 3, completed: Math.floor(Math.random() * 15) + 1, avgScore: Math.floor(Math.random() * 15) + 82 },
      ],
      recentActivity: [
        { user: 'John Smith', action: 'Completed', course: 'First Aid Level 1', date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { user: 'Sarah Johnson', action: 'Started', course: 'Fire Safety Basics', date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
        { user: 'Mike Williams', action: 'Passed Assessment', course: 'OHS Awareness', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        { user: 'Emily Brown', action: 'Enrolled', course: 'Leadership Skills', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { user: 'David Lee', action: 'Completed', course: 'Excel Fundamentals', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ]
    }
  }

  const handleInteractionCreated = () => {
    loadClientData()
  }

  const getUserName = (userId) => {
    if (!userId) return 'Unassigned'
    const user = users.find(u => u.id === userId)
    return user?.displayName || user?.email || 'Unknown User'
  }

  // Document types for checklist - loaded from admin settings (legalDocumentTypes state)
  // The legalDocumentTypes are loaded from getLegalDocumentTypes() and sorted by order

  const handleSaveSharePointLink = async () => {
    setSavingSharePoint(true)
    try {
      await updateClient(id, { sharePointFolderLink: sharePointLink })
      setClient(prev => ({ ...prev, sharePointFolderLink: sharePointLink }))
      setEditingSharePoint(false)
    } catch (error) {
      console.error('Error saving SharePoint link:', error)
      alert('Failed to save SharePoint link')
    } finally {
      setSavingSharePoint(false)
    }
  }

  const handleSaveLastContact = async () => {
    setSavingLastContact(true)
    try {
      const lastContactTimestamp = lastContactDate ? Timestamp.fromDate(new Date(lastContactDate)) : null
      await updateClient(id, { lastContact: lastContactTimestamp })
      setClient(prev => ({ ...prev, lastContact: lastContactTimestamp }))
      setEditingLastContact(false)
    } catch (error) {
      console.error('Error updating last contact:', error)
      alert('Failed to update last contact date')
    } finally {
      setSavingLastContact(false)
    }
  }

  const handleDocumentChecklistChange = async (key, checked) => {
    const newChecklist = { ...documentChecklist, [key]: checked }
    setDocumentChecklist(newChecklist)
    setSavingDocChecklist(true)
    try {
      await updateClient(id, { documentChecklist: newChecklist })
      setClient(prev => ({ ...prev, documentChecklist: newChecklist }))
    } catch (error) {
      console.error('Error saving document checklist:', error)
    } finally {
      setSavingDocChecklist(false)
    }
  }

  // Location CRUD functions
  const openLocationModal = (location = null) => {
    if (location) {
      setEditingLocation(location)
      setLocationForm({ ...location })
    } else {
      setEditingLocation(null)
      setLocationForm({ name: '', address: '', city: '', province: '', postalCode: '', isHeadOffice: false })
    }
    setShowLocationModal(true)
  }

  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      alert('Location name is required')
      return
    }
    setSavingLocation(true)
    try {
      let newLocations
      if (editingLocation) {
        newLocations = locations.map(loc => loc.id === editingLocation.id ? { ...locationForm, id: editingLocation.id } : loc)
      } else {
        const newLocation = { ...locationForm, id: `loc-${Date.now()}` }
        newLocations = [...locations, newLocation]
      }
      await updateClient(id, { locations: newLocations })
      setLocations(newLocations)
      setClient(prev => ({ ...prev, locations: newLocations }))
      setShowLocationModal(false)
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save location')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return
    try {
      const newLocations = locations.filter(loc => loc.id !== locationId)
      await updateClient(id, { locations: newLocations })
      setLocations(newLocations)
      setClient(prev => ({ ...prev, locations: newLocations }))
    } catch (error) {
      console.error('Error deleting location:', error)
    }
  }

  // Contact CRUD functions - modal-based editing
  const openContactModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact)
      setContactFormData({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        jobTitle: contact.jobTitle || '',
        locationId: contact.locationId || '',
        isDecisionMaker: contact.isDecisionMaker || false,
        isMainContact: contact.isMainContact || false,
        notes: contact.notes || ''
      })
    } else {
      setEditingContact(null)
      setContactFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        jobTitle: '',
        locationId: '',
        isDecisionMaker: false,
        isMainContact: false,
        notes: ''
      })
    }
    setShowContactModal(true)
  }

  const handleSaveContact = async () => {
    // Validate
    if (!contactFormData.firstName?.trim() || !contactFormData.lastName?.trim()) {
      alert('First name and last name are required')
      return
    }

    setSavingContact(true)
    try {
      let updatedContacts
      if (editingContact) {
        // Update existing contact
        updatedContacts = contacts.map(c =>
          c.id === editingContact.id
            ? { ...c, ...contactFormData, updatedAt: new Date().toISOString() }
            : c
        )
      } else {
        // Add new contact
        const newContact = {
          id: `contact-${Date.now()}`,
          ...contactFormData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        updatedContacts = [...contacts, newContact]
      }

      await updateClient(id, { contacts: updatedContacts })
      setContacts(updatedContacts)
      setClient(prev => ({ ...prev, contacts: updatedContacts }))
      setShowContactModal(false)
      setEditingContact(null)
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Failed to save contact')
    } finally {
      setSavingContact(false)
    }
  }

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return

    setSavingContact(true)
    try {
      const updatedContacts = contacts.filter(c => c.id !== contactId)
      await updateClient(id, { contacts: updatedContacts })
      setContacts(updatedContacts)
      setClient(prev => ({ ...prev, contacts: updatedContacts }))
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Failed to delete contact')
    } finally {
      setSavingContact(false)
    }
  }

  const getLocationName = (locationId) => {
    const loc = locations.find(l => l.id === locationId)
    return loc?.name || 'N/A'
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      await createFeedback({
        clientId: id,
        clientName: client?.name || 'Unknown',
        type: 'comment',
        content: newComment,
        date: new Date(),
        userName: 'Current User', // In production, get from auth context
        userId: 'currentUserId'
      })
      setNewComment('')
      loadClientData()
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handlePipelineStatusChange = async (newStatus) => {
    setSavingPipelineStatus(true)
    try {
      // Use the new function that tracks history
      const history = await updateClientPipelineStatus(id, newStatus)
      setClient(prev => ({ ...prev, pipelineStatus: newStatus, pipelineStatusHistory: history }))
    } catch (error) {
      console.error('Error updating pipeline status:', error)
      alert('Failed to update pipeline status')
    } finally {
      setSavingPipelineStatus(false)
    }
  }

  const getPipelineStageName = (stageId) => {
    const stage = pipelineStages.find(s => s.id === stageId)
    return stage ? stage.name : 'Not in Pipeline'
  }

  const getPipelineStageColor = (stageId) => {
    const stage = pipelineStages.find(s => s.id === stageId)
    return stage ? stage.color : '#f5f5f5'
  }

  // Follow-up helper functions
  const getFollowUpStatus = () => {
    if (!client?.nextFollowUpDate) return { status: 'none', daysUntil: null }

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

  const handleSaveFollowUp = async () => {
    if (!followUpForm.date || !followUpForm.reason) {
      alert('Please fill in all required fields')
      return
    }

    setSavingFollowUp(true)
    try {
      const followUpDate = new Date(`${followUpForm.date}T09:00:00`)
      const followUpTimestamp = Timestamp.fromDate(followUpDate)

      await updateClientFollowUp(id, {
        date: followUpTimestamp,
        reason: followUpForm.reason,
        type: followUpForm.type
      }, auth.currentUser?.uid)

      // Update local state
      setClient(prev => ({
        ...prev,
        nextFollowUpDate: followUpTimestamp,
        nextFollowUpReason: followUpForm.reason,
        nextFollowUpType: followUpForm.type
      }))

      setShowFollowUpEdit(false)
      setFollowUpForm({ date: '', type: 'call', reason: '' })
    } catch (error) {
      console.error('Error saving follow-up:', error)
      alert('Failed to save follow-up. Please try again.')
    } finally {
      setSavingFollowUp(false)
    }
  }

  const openFollowUpEdit = () => {
    // Pre-fill form if there's an existing follow-up
    if (client?.nextFollowUpDate) {
      const date = client.nextFollowUpDate.toDate
        ? client.nextFollowUpDate.toDate()
        : new Date(client.nextFollowUpDate)
      setFollowUpForm({
        date: date.toISOString().split('T')[0],
        type: client.nextFollowUpType || 'call',
        reason: client.nextFollowUpReason || ''
      })
    } else {
      // Default to 1 week from now
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 7)
      setFollowUpForm({
        date: defaultDate.toISOString().split('T')[0],
        type: 'call',
        reason: ''
      })
    }
    setShowFollowUpEdit(true)
  }

  const filteredInteractions = interactions.filter(interaction => {
    if (interactionFilters.type !== 'all' && interaction.type !== interactionFilters.type) {
      return false
    }
    if (interactionFilters.userId !== 'all' && interaction.userId !== interactionFilters.userId) {
      return false
    }
    return true
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount || 0))
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-ZA')
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-ZA')
  }

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(timestamp)
  }

  // Open product line modal with deals
  const openProductLineModal = (financial) => {
    setSelectedFinancial(financial)

    // Get the deals based on product line type
    const productLine = financial.productLine?.toLowerCase() || ''
    let deals = []

    if (productLine.includes('learnership')) {
      deals = financial.learnershipDetails || []
    } else if (productLine.includes('tap') || productLine.includes('business')) {
      deals = financial.tapBusinessDetails || []
    } else if (productLine.includes('compliance')) {
      deals = financial.complianceDetails || []
    } else if (productLine.includes('course') || productLine.includes('other')) {
      deals = financial.otherCoursesDetails || []
    }

    setEditingDeals(JSON.parse(JSON.stringify(deals))) // Deep clone
    setActiveDealTab(0)
    setProductLineModalOpen(true)
  }

  // Close product line modal
  const closeProductLineModal = () => {
    setProductLineModalOpen(false)
    setSelectedFinancial(null)
    setEditingDeals([])
  }

  // Get product line type for styling
  const getProductLineType = (productLine) => {
    const pl = productLine?.toLowerCase() || ''
    if (pl.includes('learnership')) return 'learnership'
    if (pl.includes('tap') || pl.includes('business')) return 'tap'
    if (pl.includes('compliance')) return 'compliance'
    return 'other'
  }

  // Get products for a specific product line type
  const getProductsForType = (productLineType) => {
    // Find the product line ID matching this type
    const matchingProductLine = productLines.find(pl => {
      const plName = pl.name?.toLowerCase() || ''
      if (productLineType === 'learnership') return plName.includes('learnership')
      if (productLineType === 'tap') return plName.includes('tap') || plName.includes('business')
      if (productLineType === 'compliance') return plName.includes('compliance')
      return plName.includes('other') || plName.includes('course')
    })

    if (!matchingProductLine) return []

    return products.filter(p => p.productLineId === matchingProductLine.id)
  }

  // Handle learnership product selection
  const handleProductSelection = (dealIndex, productId, productLineType) => {
    const selectedProduct = products.find(p => p.id === productId)
    if (!selectedProduct) return

    setEditingDeals(prev => {
      const updated = [...prev]
      if (updated[dealIndex]) {
        updated[dealIndex] = {
          ...updated[dealIndex],
          productId: productId,
          name: selectedProduct.name,
          // Set default cost based on product line type
          ...(productLineType === 'learnership' && selectedProduct.defaultCostPerLearner ? {
            costPerLearner: selectedProduct.defaultCostPerLearner
          } : {}),
          ...(productLineType === 'tap' && selectedProduct.defaultMonthlyFee ? {
            costPerEmployeePerMonth: selectedProduct.defaultMonthlyFee
          } : {}),
          ...(productLineType === 'compliance' && selectedProduct.defaultCostPerTrainee ? {
            pricePerPerson: selectedProduct.defaultCostPerTrainee
          } : {}),
          ...((productLineType === 'other') && selectedProduct.defaultDailyRate ? {
            pricePerPerson: selectedProduct.defaultDailyRate
          } : {})
        }
      }
      return updated
    })
  }

  // Handle deal field change
  const handleDealChange = (dealIndex, field, value) => {
    setEditingDeals(prev => {
      const updated = [...prev]
      if (updated[dealIndex]) {
        updated[dealIndex] = { ...updated[dealIndex], [field]: value }
      }
      return updated
    })
  }

  // Save deals back to Firestore
  const saveDeals = async () => {
    if (!selectedFinancial) return

    setSavingDeals(true)
    try {
      const productLine = selectedFinancial.productLine?.toLowerCase() || ''
      const updateData = { ...selectedFinancial }

      // Update the appropriate deals array
      if (productLine.includes('learnership')) {
        updateData.learnershipDetails = editingDeals
      } else if (productLine.includes('tap') || productLine.includes('business')) {
        updateData.tapBusinessDetails = editingDeals
      } else if (productLine.includes('compliance')) {
        updateData.complianceDetails = editingDeals
      } else {
        updateData.otherCoursesDetails = editingDeals
      }

      // Save to Firestore
      await saveClientFinancial(updateData)

      // Reload financials to reflect changes
      if (fyInfo) {
        const financialsData = await getClientFinancialsByYear(fyInfo.currentFinancialYear, id)
        setFinancials(financialsData)
      }

      closeProductLineModal()
      alert('Deals saved successfully!')
    } catch (error) {
      console.error('Error saving deals:', error)
      alert('Failed to save deals. Please try again.')
    } finally {
      setSavingDeals(false)
    }
  }

  // Add new deal
  const addNewDeal = () => {
    if (!selectedFinancial) return

    const productLine = selectedFinancial.productLine?.toLowerCase() || ''
    let newDeal = {}

    if (productLine.includes('learnership')) {
      newDeal = {
        id: `D${editingDeals.length + 1}`,
        name: '',
        description: '',
        certaintyPercentage: 100,
        learners: 0,
        costPerLearner: 0,
        fundingType: 'SETA',
        paymentStartDate: '',
        paymentFrequency: 'Monthly',
        paymentMonths: 12
      }
    } else if (productLine.includes('tap') || productLine.includes('business')) {
      newDeal = {
        id: `TAP${editingDeals.length + 1}`,
        name: '',
        description: '',
        certaintyPercentage: 100,
        numberOfEmployees: 0,
        costPerEmployeePerMonth: 0,
        paymentStartDate: '',
        paymentType: 'Monthly',
        contractMonths: 12
      }
    } else if (productLine.includes('compliance')) {
      newDeal = {
        id: `COMP${editingDeals.length + 1}`,
        name: '',
        description: '',
        certaintyPercentage: 100,
        courseName: '',
        numberOfTrainees: 0,
        pricePerPerson: 0,
        trainingDate: ''
      }
    } else {
      newDeal = {
        id: `COURSE${editingDeals.length + 1}`,
        name: '',
        description: '',
        certaintyPercentage: 100,
        courseName: '',
        numberOfTrainees: 0,
        pricePerPerson: 0,
        trainingDate: ''
      }
    }

    setEditingDeals(prev => [...prev, newDeal])
    setActiveDealTab(editingDeals.length)
  }

  // Delete deal
  const deleteDeal = (dealIndex) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return

    setEditingDeals(prev => prev.filter((_, i) => i !== dealIndex))
    if (activeDealTab >= editingDeals.length - 1) {
      setActiveDealTab(Math.max(0, editingDeals.length - 2))
    }
  }

  if (loading) {
    return (
      <div className="client-detail">
        <div className="loading-spinner">
          <p>Loading client dashboard...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="client-detail">
        <p>Client not found</p>
        <Link to="/clients">Back to Clients</Link>
      </div>
    )
  }

  // Calculate financial metrics
  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid')
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const outstandingInvoices = allInvoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const overdueInvoices = outstandingInvoices.filter(inv => {
    if (!inv.dueDate) return false
    const dueDate = inv.dueDate.toDate ? inv.dueDate.toDate() : new Date(inv.dueDate)
    return dueDate < new Date()
  })
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)

  // Use same calculation logic as Dashboard
  const ytdMonths = fyInfo?.ytdMonths || []
  const remainingMonthsData = fyInfo?.remainingMonths || []

  // Helper to calculate YTD from monthly data (using Month 1, Month 2, etc. format) - same as Dashboard
  const calculateYtdFromMonthly = (records) => {
    let total = 0
    records.forEach(record => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      if (ytdMonths.length > 0) {
        // Use fyMonthNumber to get "Month 1", "Month 2", etc.
        ytdMonths.forEach(month => {
          const monthKey = `Month ${month.fyMonthNumber}`
          const value = monthData[monthKey] || 0
          total += parseFloat(value) || 0
        })
      }
    })
    return total
  }

  // Helper to calculate full year from monthly data (for budget - sum all monthly values) - same as Dashboard
  const calculateFullYearFromMonthly = (records) => {
    let total = 0
    records.forEach(record => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      // Sum all monthly values (budget uses "Month 1", "Month 2", etc. format)
      if (monthData && typeof monthData === 'object') {
        const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
          return sum + (parseFloat(value) || 0)
        }, 0)
        total += monthlyTotal || (record.total || 0)
      } else {
        total += (record.total || 0)
      }
    })
    return total
  }

  // Helper to calculate historical year total from monthly data - same as Dashboard
  const calculateHistoricalYearTotal = (records) => {
    let total = 0
    records.forEach(record => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      // Sum all monthly values
      const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
        return sum + (parseFloat(value) || 0)
      }, 0)
      total += monthlyTotal || (record.total || 0)
    })
    return total
  }

  // Helper to calculate YTD from historical data (only up to reporting month) - same as Dashboard
  const calculateYtdFromHistorical = (records) => {
    let total = 0
    records.forEach(record => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      if (ytdMonths.length > 0) {
        // Sum only YTD months (Month 1 through Month N where N is reporting month)
        ytdMonths.forEach(month => {
          const monthKey = `Month ${month.fyMonthNumber}`
          const value = monthData[monthKey] || 0
          total += parseFloat(value) || 0
        })
      } else {
        // Fallback: sum all if no YTD months available
        const monthlyTotal = Object.values(monthData).reduce((sum, value) => {
          return sum + (parseFloat(value) || 0)
        }, 0)
        total += monthlyTotal || (record.total || 0)
      }
    })
    return total
  }

  // Helper to calculate YTD budget (only months up to reporting month) - same as Dashboard
  const calculateYtdBudget = (records) => {
    let total = 0
    records.forEach(record => {
      const monthData = record.monthlyData || record.monthlyValues || {}
      if (ytdMonths.length > 0) {
        // Sum only YTD months for budget
        ytdMonths.forEach(month => {
          const monthKey = `Month ${month.fyMonthNumber}`
          const value = monthData[monthKey] || 0
          total += parseFloat(value) || 0
        })
      } else {
        // Fallback: use total if no monthly data
        total += (record.total || 0)
      }
    })
    return total
  }

  // Calculate totals from uploaded data (same logic as Dashboard)
  const totalYtd = calculateYtdFromMonthly(uploadedFinancials.ytdActual)
  const totalFy2024 = calculateHistoricalYearTotal(uploadedFinancials.ytd1) // YTD-1 = FY 2024
  const totalFy2023 = calculateHistoricalYearTotal(uploadedFinancials.ytd2) // YTD-2 = FY 2023
  const totalFy2022 = calculateHistoricalYearTotal(uploadedFinancials.ytd3) // YTD-3 = FY 2022
  const totalBudget = calculateFullYearFromMonthly(uploadedFinancials.budget)
  
  // Calculate YTD values for budget and historical years
  const ytdBudget = calculateYtdBudget(uploadedFinancials.budget)
  const ytdFy2024 = calculateYtdFromHistorical(uploadedFinancials.ytd1) // YTD-1 = FY 2024 YTD
  const ytdFy2023 = calculateYtdFromHistorical(uploadedFinancials.ytd2) // YTD-2 = FY 2023 YTD
  const ytdFy2022 = calculateYtdFromHistorical(uploadedFinancials.ytd3) // YTD-3 = FY 2022 YTD
  
  // Full year totals (sum of all months)
  const fullYearYtdActual = calculateFullYearFromMonthly(uploadedFinancials.ytdActual)

  // Calculate forecast from saved financials and monthly forecasts (same logic as Dashboard)
  let totalForecastingMonths = 0
  const monthForecastTotals = {}
  
  // Initialize month forecasts
  remainingMonthsData.slice(0, 4).forEach(month => {
    const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
    monthForecastTotals[monthKey] = 0
  })

  // Legacy product lines to exclude
  const legacyProductLines = ['general', 'consulting']

  financials.forEach(cf => {
    const productLine = (cf.productLine || '').toLowerCase().replace(/\s+/g, '')
    if (legacyProductLines.includes(productLine)) return

    // Get monthly forecasts
    const months = cf.months || {}
    remainingMonthsData.slice(0, 4).forEach(month => {
      const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
      const monthValue = months[monthKey] || 0
      monthForecastTotals[monthKey] = (monthForecastTotals[monthKey] || 0) + (parseFloat(monthValue) || 0)
    })
  })

  // Calculate full year forecast as YTD + sum of forecasting months (same as Dashboard)
  totalForecastingMonths = Object.values(monthForecastTotals).reduce((sum, value) => sum + (parseFloat(value) || 0), 0)
  const calculatedFullYear = totalYtd + totalForecastingMonths

  // Check if we have uploaded financial data
  const hasUploadedFinancials = uploadedFinancials.ytdActual.length > 0 || uploadedFinancials.budget.length > 0

  // Use uploaded YTD if available, otherwise fallback to financials YTD
  const effectiveYtdActual = hasUploadedFinancials ? totalYtd : financials.reduce((sum, f) => sum + (f.history?.currentYearYTD || 0), 0)
  const effectiveFullYearForecast = hasUploadedFinancials ? calculatedFullYear : financials.reduce((sum, f) => sum + (f.fullYearForecast || 0), 0)

  // Outstanding tasks
  const pendingTasks = followUpTasks.filter(t => t.status === 'pending')
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false
    const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)
    return dueDate < new Date()
  })

  // Pending quotes
  const pendingQuotes = allQuotes.filter(q => q.status === 'Sent' || q.status === 'Pending')

  return (
    <div className="client-detail">
      <div className="client-detail-header">
        <div>
          <Link to="/clients" className="back-link">&larr; Back to Clients</Link>
          <h1>{client.name || client.legalName || 'Unnamed Client'}</h1>
          <p className="client-type">{client.type || 'N/A'} {client.industry && `• ${client.industry}`}</p>
        </div>
        <div className="header-actions">
          <Link to={`/clients/${id}/edit`} className="edit-btn">
            Edit Client
          </Link>
        </div>
      </div>

      {/* Financial Performance - Same layout as Dashboard (shown at top) */}
      {hasUploadedFinancials && (
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          {/* Financial Performance Widget */}
          <div className="dashboard-widget financial-dashboard">
            <div className="widget-header">
              <h2>Financial Performance</h2>
              <Link to={`/financial-editor/${id}`} className="edit-link">
                Edit
              </Link>
            </div>
            <div className="financial-summary">
              <div className="financial-section">
                <div className="financial-section-header">Prior Year Actuals</div>
                <div className="financial-item">
                  <span className="financial-label">FY 2022</span>
                  <span className="financial-value">{formatCurrency(totalFy2022)}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">FY 2023</span>
                  <span className="financial-value">{formatCurrency(totalFy2023)}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">FY 2024</span>
                  <span className="financial-value">{formatCurrency(totalFy2024)}</span>
                </div>
              </div>

              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">YTD Actual ({fySettings?.reportingMonth || 'October'})</span>
                  <span className="financial-value">{formatCurrency(totalYtd)}</span>
                </div>
              </div>

              <div className="financial-section">
                <div className="financial-section-header">Forecasting Months</div>
                {remainingMonthsData.length > 0 ? (
                  <div 
                    className="forecasting-months-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      marginTop: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {remainingMonthsData.slice(0, 4).map((month, idx) => {
                      const monthKey = `${month.year}-${String(month.calendarMonth + 1).padStart(2, '0')}`
                      const monthValue = monthForecastTotals[monthKey] || 0
                      return (
                        <div 
                          key={idx} 
                          className="forecasting-month-item"
                          style={{
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <span className="forecasting-month-label">{month.name}</span>
                          <span className="forecasting-month-value">{formatCurrency(monthValue)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '8px 0', color: '#666' }}>No forecasting months available</div>
                )}
              </div>

              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">Full Year Forecast</span>
                  <span className="financial-value">{formatCurrency(calculatedFullYear)}</span>
                </div>
              </div>

              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">Budget</span>
                  <span className="financial-value">{formatCurrency(totalBudget)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* YTD Financial Performance Widget */}
          <div className="dashboard-widget financial-dashboard">
            <div className="widget-header">
              <h2>YTD Financial Performance</h2>
            </div>
            <div className="financial-summary">
              <div className="financial-section">
                <div className="financial-section-header">Prior Year YTD Actuals</div>
                <div className="financial-item">
                  <span className="financial-label">FY 2022 YTD</span>
                  <span className="financial-value">{formatCurrency(ytdFy2022)}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">FY 2023 YTD</span>
                  <span className="financial-value">{formatCurrency(ytdFy2023)}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">FY 2024 YTD</span>
                  <span className="financial-value">{formatCurrency(ytdFy2024)}</span>
                </div>
              </div>

              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">YTD Actual ({fySettings?.reportingMonth || 'October'})</span>
                  <span className="financial-value">{formatCurrency(totalYtd)}</span>
                </div>
              </div>

              <div className="financial-section">
                <div className="financial-section-header-with-value">
                  <span className="financial-section-header-text">YTD Budget</span>
                  <span className="financial-value">{formatCurrency(ytdBudget)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="client-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'interactions' ? 'active' : ''}
          onClick={() => setActiveTab('interactions')}
        >
          Interactions ({interactions.length})
        </button>
        <button
          className={activeTab === 'comments' ? 'active' : ''}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({feedback.length})
        </button>
        {userRole?.id !== 'salesperson' && (
          <button
            className={activeTab === 'tasks' ? 'active' : ''}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks ({pendingTasks.length})
          </button>
        )}
        <button
          className={activeTab === 'locations' ? 'active' : ''}
          onClick={() => setActiveTab('locations')}
        >
          Locations ({locations.length})
        </button>
        <button
          className={activeTab === 'contacts' ? 'active' : ''}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts ({contacts.length})
        </button>
        <button
          className={activeTab === 'legal' ? 'active' : ''}
          onClick={() => setActiveTab('legal')}
        >
          Legal
        </button>
        {client.currentLmsUsage === 'Yes' && (
          <button
            className={activeTab === 'lms' ? 'active' : ''}
            onClick={() => setActiveTab('lms')}
          >
            LMS Reports
          </button>
        )}
      </div>

      {/* Pipeline Status Warning */}
      {!client.pipelineStatus && (
        <div className="pipeline-warning-bar">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">This client has no pipeline status set. Please assign a pipeline stage.</span>
          <select
            className="quick-pipeline-select"
            value=""
            onChange={(e) => handlePipelineStatusChange(e.target.value)}
            disabled={savingPipelineStatus}
          >
            <option value="" disabled>Set Pipeline Status...</option>
            {pipelineStages.filter(s => s.id !== '').map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Follow-Up Status Card - Prominently Displayed */}
      {(() => {
        const followUpStatus = getFollowUpStatus()
        return (
          <div className={`followup-status-card followup-${followUpStatus.status}`}>
            <div className="followup-status-content">
              <div className="followup-status-icon">
                {followUpStatus.status === 'overdue' && '🔴'}
                {followUpStatus.status === 'due-today' && '🟠'}
                {followUpStatus.status === 'due-soon' && '🟡'}
                {followUpStatus.status === 'scheduled' && '🟢'}
                {followUpStatus.status === 'none' && '⚪'}
              </div>
              <div className="followup-status-details">
                <div className="followup-status-label">Next Follow-Up</div>
                {client.nextFollowUpDate ? (
                  <>
                    <div className="followup-status-date">
                      {formatDate(client.nextFollowUpDate)}
                      {followUpStatus.status === 'overdue' && (
                        <span className="followup-badge overdue"> (Overdue by {Math.abs(followUpStatus.daysUntil)} days)</span>
                      )}
                      {followUpStatus.status === 'due-today' && (
                        <span className="followup-badge due-today"> (Due Today)</span>
                      )}
                      {followUpStatus.status === 'due-soon' && (
                        <span className="followup-badge due-soon"> (In {followUpStatus.daysUntil} days)</span>
                      )}
                    </div>
                    <div className="followup-status-info">
                      <span className="followup-type-badge">
                        {followUpTypes.find(t => t.value === client.nextFollowUpType)?.label || 'Follow-Up'}
                      </span>
                      {client.nextFollowUpReason && (
                        <span className="followup-reason">{client.nextFollowUpReason}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="followup-status-missing">
                    <span className="warning-text">No follow-up scheduled!</span>
                    <span className="helper-text">Log an interaction to schedule a follow-up</span>
                  </div>
                )}
              </div>
              <button
                className="followup-edit-btn"
                onClick={openFollowUpEdit}
              >
                {client.nextFollowUpDate ? 'Update' : 'Set Follow-Up'}
              </button>
            </div>

            {/* Follow-Up Edit Form (inline) */}
            {showFollowUpEdit && (
              <div className="followup-edit-inline">
                <div className="followup-edit-form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={followUpForm.date}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Action *</label>
                    <select
                      value={followUpForm.type}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      {followUpTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group flex-grow">
                    <label>Reason *</label>
                    <input
                      type="text"
                      value={followUpForm.reason}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="E.g., Follow up on proposal, Check decision..."
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => setShowFollowUpEdit(false)}
                      disabled={savingFollowUp}
                    >
                      Cancel
                    </button>
                    <button
                      className="save-btn"
                      onClick={handleSaveFollowUp}
                      disabled={savingFollowUp}
                    >
                      {savingFollowUp ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-info">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-badge status-${client.status?.toLowerCase()}`}>
              {client.status || 'N/A'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Pipeline:</span>
            <select
              className="pipeline-status-select"
              value={client.pipelineStatus || ''}
              onChange={(e) => handlePipelineStatusChange(e.target.value)}
              disabled={savingPipelineStatus}
              style={{ backgroundColor: getPipelineStageColor(client.pipelineStatus) }}
            >
              {pipelineStages.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </div>
          <div className="status-item">
            <span className="status-label">Last Contact:</span>
            {editingLastContact ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={lastContactDate}
                  onChange={(e) => setLastContactDate(e.target.value)}
                  disabled={savingLastContact}
                  style={{ padding: '4px 8px', fontSize: '14px' }}
                />
                <button
                  className="btn-save-small"
                  onClick={handleSaveLastContact}
                  disabled={savingLastContact}
                >
                  {savingLastContact ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn-cancel-small"
                  onClick={() => {
                    setEditingLastContact(false)
                    if (client.lastContact) {
                      const date = client.lastContact.toDate ? client.lastContact.toDate() : new Date(client.lastContact)
                      setLastContactDate(date.toISOString().split('T')[0])
                    } else {
                      setLastContactDate('')
                    }
                  }}
                  disabled={savingLastContact}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="status-value" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {formatDate(client.lastContact)}
                <button
                  className="btn-edit-small"
                  onClick={() => setEditingLastContact(true)}
                  title="Edit last contact date"
                >
                  ✏️
                </button>
              </span>
            )}
          </div>
          <div className="status-item">
            <span className="status-label">Account Owner:</span>
            <span className="status-value">{getUserName(client.assignedSalesPerson)}</span>
          </div>
          <div className="status-item">
            <span className="status-label">FY End:</span>
            <span className="status-value">{client.financialYearEnd || 'February'}</span>
          </div>
          {client.sharePointFolderLink && (
            <div className="status-item">
              <a href={client.sharePointFolderLink} target="_blank" rel="noopener noreferrer" className="sharepoint-link">
                📁 SharePoint Folder
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-grid">
            {/* Client Information Card */}
            <div className="info-card">
              <h3>Client Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Legal Name</label>
                  <span>{client.legalName || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Trading Name</label>
                  <span>{client.tradingName || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>VAT Number</label>
                  <span>{client.vatNumber || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Industry</label>
                  <span>{client.industry || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Sector</label>
                  <span>{client.sector || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>SETA</label>
                  <span>{client.seta || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>B-BBEE Level</label>
                  <span>{client.bbbeeLevel || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Contacts Summary - Minimal */}
            {contacts.length > 0 && (
              <div className="info-card">
                <h3>Contacts ({contacts.length})</h3>
                <div className="contacts-minimal-list">
                  {contacts.slice(0, 3).map((contact) => (
                    <div key={contact.id} className="contact-minimal-item">
                      <strong>{contact.firstName} {contact.lastName}</strong>
                      {contact.jobTitle && <span> - {contact.jobTitle}</span>}
                      {contact.isMainContact && <span className="badge-minimal main">Main</span>}
                      {contact.isDecisionMaker && <span className="badge-minimal dm">DM</span>}
                    </div>
                  ))}
                  {contacts.length > 3 && (
                    <div className="contact-minimal-item more">
                      +{contacts.length - 3} more contact{contacts.length - 3 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Outstanding Items Summary */}
            <div className="info-card alerts-card">
              <h3>Outstanding Items</h3>
              <div className="alerts-list">
                {totalOverdue > 0 && (
                  <div className="alert-item alert-danger">
                    <span className="alert-icon">🔴</span>
                    <div className="alert-content">
                      <strong>{overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}</strong>
                      <span>Total: {formatCurrency(totalOverdue)}</span>
                    </div>
                  </div>
                )}
                {outstandingInvoices.length > 0 && (
                  <div className="alert-item alert-warning">
                    <span className="alert-icon">🟡</span>
                    <div className="alert-content">
                      <strong>{outstandingInvoices.length} Outstanding Invoice{outstandingInvoices.length !== 1 ? 's' : ''}</strong>
                      <span>Total: {formatCurrency(totalOutstanding)}</span>
                    </div>
                  </div>
                )}
                {overdueTasks.length > 0 && userRole?.id !== 'salesperson' && (
                  <div className="alert-item alert-danger">
                    <span className="alert-icon">⏰</span>
                    <div className="alert-content">
                      <strong>{overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? 's' : ''}</strong>
                      <span>Requires immediate attention</span>
                    </div>
                  </div>
                )}
                {pendingQuotes.length > 0 && (
                  <div className="alert-item alert-info">
                    <span className="alert-icon">📋</span>
                    <div className="alert-content">
                      <strong>{pendingQuotes.length} Pending Quote{pendingQuotes.length !== 1 ? 's' : ''}</strong>
                      <span>Awaiting client response</span>
                    </div>
                  </div>
                )}
                {totalOverdue === 0 && outstandingInvoices.length === 0 && (userRole?.id === 'salesperson' || overdueTasks.length === 0) && pendingQuotes.length === 0 && (
                  <div className="alert-item alert-success">
                    <span className="alert-icon">✅</span>
                    <div className="alert-content">
                      <strong>All Clear</strong>
                      <span>No outstanding items</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="info-card">
              <h3>Recent Activity</h3>
              <div className="recent-activity-list">
                {interactions.slice(0, 5).map((interaction) => (
                  <div key={interaction.id} className="activity-item">
                    <span className={`activity-type type-${interaction.type}`}>{interaction.type?.toUpperCase()}</span>
                    <span className="activity-summary">{interaction.summary || 'No summary'}</span>
                    <span className="activity-date">{getTimeAgo(interaction.timestamp)}</span>
                  </div>
                ))}
                {interactions.length === 0 && (
                  <p className="no-data">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {client.notes && (
            <div className="notes-section">
              <h3>Notes</h3>
              <p>{client.notes}</p>
            </div>
          )}

          {/* Locations Section */}
          {locations.length > 0 && (
            <div className="locations-overview-section">
              <h3>Client Locations</h3>
              <div className="locations-grid">
                {locations.map((location) => (
                  <div key={location.id} className="location-card">
                    <div className="location-name">
                      <strong>{location.name}</strong>
                      {location.isHeadOffice && <span className="head-office-badge">Head Office</span>}
                    </div>
                    {location.address && <div className="location-detail">{location.address}</div>}
                    {(location.city || location.province) && (
                      <div className="location-detail">
                        {location.city}{location.city && location.province && ', '}{location.province}
                        {location.postalCode && ` ${location.postalCode}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forecast tab and content removed as per design change */}


      {activeTab === 'interactions' && (
        <div className="tab-content">
          <InteractionCapture
            clientId={id}
            client={client}
            contacts={contacts}
            onInteractionCreated={handleInteractionCreated}
          />

          <div className="interactions-filters">
            <select
              value={interactionFilters.type}
              onChange={(e) => setInteractionFilters({ ...interactionFilters, type: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="teams">Teams</option>
              <option value="sms">SMS</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="interactions-timeline">
            {filteredInteractions.length > 0 ? (
              filteredInteractions.map((interaction) => (
                <div key={interaction.id} className="interaction-item">
                  <div className="interaction-header">
                    <span className={`interaction-type type-${interaction.type}`}>{interaction.type?.toUpperCase()}</span>
                    <span className="interaction-date">
                      {formatDateTime(interaction.timestamp)}
                    </span>
                  </div>
                  <div className="interaction-user">
                    By: {interaction.userName || 'Unknown'}
                    {interaction.contactPersonName && (
                      <span className="interaction-with"> | With: {interaction.contactPersonName} ({interaction.contactPersonRole})</span>
                    )}
                  </div>
                  {interaction.summary && (
                    <div className="interaction-summary">
                      <strong>Summary:</strong> {interaction.summary}
                    </div>
                  )}
                  {interaction.notes && (
                    <div className="interaction-notes">
                      <strong>Notes:</strong> {interaction.notes}
                    </div>
                  )}
                  {interaction.documentsShared && (
                    <div className="interaction-docs">
                      <strong>Documents Shared:</strong> {interaction.documentsShared}
                    </div>
                  )}
                  {interaction.objectionsRaised && (
                    <div className="interaction-objections">
                      <strong>Objections:</strong> {interaction.objectionsRaised}
                    </div>
                  )}
                  {interaction.nextSteps && (
                    <div className="interaction-next-steps">
                      <strong>Next Steps:</strong> {interaction.nextSteps}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-interactions">No interactions recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="tab-content">
          {/* Add Comment Form */}
          <div className="add-comment-form">
            <h3>Add Comment</h3>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or note about this client..."
              rows="3"
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment || !newComment.trim()}
              className="submit-comment-btn"
            >
              {submittingComment ? 'Adding...' : 'Add Comment'}
            </button>
          </div>

          {/* Comments / Feedback History */}
          <div className="comments-list">
            <h3>Comments &amp; Feedback History</h3>
            {feedback.length > 0 ? (
              feedback.map((item) => (
                <div key={item.id} className={`comment-item type-${item.type || 'comment'}`}>
                  <div className="comment-header">
                    <span className="comment-user">{item.userName || 'Unknown User'}</span>
                    <span className="comment-date">{formatDateTime(item.date || item.createdAt)}</span>
                  </div>
                  <div className="comment-content">
                    {item.content || item.message || item.notes}
                  </div>
                  {item.type && item.type !== 'comment' && (
                    <span className={`comment-type-badge type-${item.type}`}>{item.type}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="no-data">No comments or feedback recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="tab-content">
          <div className="tasks-section">
            <div className="tasks-header">
              <h2>Follow-Up Tasks</h2>
              <div className="tasks-summary">
                <span className="task-count pending">{pendingTasks.length} Pending</span>
                <span className="task-count overdue">{overdueTasks.length} Overdue</span>
              </div>
            </div>

            {followUpTasks.length > 0 ? (
              <div className="tasks-list">
                {followUpTasks.map((task) => {
                  const isOverdue = task.status === 'pending' && task.dueDate &&
                    (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)) < new Date()

                  return (
                    <div key={task.id} className={`task-item task-${task.status} ${isOverdue ? 'overdue' : ''}`}>
                      <div className="task-header">
                        <span className="task-description">{task.description}</span>
                        <span className={`task-status task-status-${task.status} ${isOverdue ? 'overdue' : ''}`}>
                          {isOverdue ? 'OVERDUE' : task.status}
                        </span>
                      </div>
                      <div className="task-meta">
                        <span>Type: {task.type}</span>
                        <span className={isOverdue ? 'overdue-text' : ''}>Due: {formatDate(task.dueDate)}</span>
                        {task.priority && <span className={`priority-${task.priority.toLowerCase()}`}>Priority: {task.priority}</span>}
                        {task.assignedToName && <span>Assigned: {task.assignedToName}</span>}
                      </div>
                      {task.notes && (
                        <div className="task-notes">{task.notes}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>No follow-up tasks for this client.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="tab-content">
          <div className="locations-section">
            <div className="section-header">
              <h2>Client Locations</h2>
              <button className="add-btn" onClick={() => openLocationModal()}>
                + Add Location
              </button>
            </div>

            {locations.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>Province</th>
                    <th>Postal Code</th>
                    <th>Head Office</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td><strong>{location.name}</strong></td>
                      <td>{location.address || 'N/A'}</td>
                      <td>{location.city || 'N/A'}</td>
                      <td>{location.province || 'N/A'}</td>
                      <td>{location.postalCode || 'N/A'}</td>
                      <td>
                        {location.isHeadOffice ? (
                          <span className="status-badge status-active">Yes</span>
                        ) : (
                          <span className="status-badge status-inactive">No</span>
                        )}
                      </td>
                      <td>
                        <button className="action-btn edit" onClick={() => openLocationModal(location)}>Edit</button>
                        <button className="action-btn delete" onClick={() => handleDeleteLocation(location.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-card">
                <p>No locations added yet.</p>
                <button onClick={() => openLocationModal()}>Add First Location</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="tab-content">
          <div className="contacts-section">
            <div className="section-header">
              <h2>Client Contacts</h2>
              <button className="add-btn" onClick={() => openContactModal()}>
                + Add Contact
              </button>
            </div>

            {contacts.length > 0 ? (
              <table className="data-table contacts-table">
                <thead>
                  <tr>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Job Title</th>
                    <th>Location</th>
                    <th className="text-center">Decision Maker</th>
                    <th className="text-center">Main Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td><strong>{contact.firstName || 'N/A'}</strong></td>
                      <td><strong>{contact.lastName || 'N/A'}</strong></td>
                      <td>{contact.jobTitle || 'N/A'}</td>
                      <td>{getLocationName(contact.locationId)}</td>
                      <td className="text-center">
                        {contact.isDecisionMaker ? (
                          <span className="badge-check">✓</span>
                        ) : (
                          <span className="badge-uncheck">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {contact.isMainContact ? (
                          <span className="badge-check">✓</span>
                        ) : (
                          <span className="badge-uncheck">—</span>
                        )}
                      </td>
                      <td>
                        <button className="action-btn edit" onClick={() => openContactModal(contact)}>Edit</button>
                        <button className="action-btn delete" onClick={() => handleDeleteContact(contact.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-card">
                <p>No contacts added yet.</p>
                <button onClick={() => openContactModal()}>Add First Contact</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'legal' && (
        <div className="tab-content">
          <div className="legal-section">
            <h2>Legal Documents &amp; Contracts</h2>

            {/* Contracts */}
            <div className="contracts-section">
              <h3>Contracts</h3>
              {contracts.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Contract Name</th>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.name || 'Unnamed Contract'}</td>
                        <td>{contract.type || 'N/A'}</td>
                        <td>{formatDate(contract.startDate)}</td>
                        <td>{formatDate(contract.endDate)}</td>
                        <td>{formatCurrency(contract.value)}</td>
                        <td>
                          <span className={`status-badge status-${contract.status?.toLowerCase()}`}>
                            {contract.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {contract.documentUrl ? (
                            <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer">View</a>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No contracts on file</p>
              )}
            </div>

            {/* SharePoint/Google Drive Folder Link */}
            <div className="sharepoint-section">
              <h3>Document Storage (SharePoint/Google Drive)</h3>
              {editingSharePoint ? (
                <div className="sharepoint-edit">
                  <input
                    type="url"
                    value={sharePointLink}
                    onChange={(e) => setSharePointLink(e.target.value)}
                    placeholder="Enter SharePoint or Google Drive folder URL"
                    className="sharepoint-input"
                  />
                  <div className="sharepoint-edit-actions">
                    <button
                      className="btn-save"
                      onClick={handleSaveSharePointLink}
                      disabled={savingSharePoint}
                    >
                      {savingSharePoint ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setEditingSharePoint(false)
                        setSharePointLink(client.sharePointFolderLink || '')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sharepoint-display">
                  {client.sharePointFolderLink ? (
                    <>
                      <a href={client.sharePointFolderLink} target="_blank" rel="noopener noreferrer" className="sharepoint-button">
                        📁 Open Document Folder
                      </a>
                      <button className="btn-edit-link" onClick={() => setEditingSharePoint(true)}>
                        Edit Link
                      </button>
                    </>
                  ) : (
                    <button className="btn-add-link" onClick={() => setEditingSharePoint(true)}>
                      + Add Document Link
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Document Received Checklist */}
            <div className="documents-section">
              <h3>Documents Received Checklist</h3>
              <p className="section-description">Track which documents have been received from the client</p>
              <div className="document-checklist-grid">
                {legalDocumentTypes.length > 0 ? (
                  legalDocumentTypes.map(doc => (
                    <label key={doc.key} className={`doc-checkbox-item ${doc.required ? 'required-doc' : ''}`}>
                      <input
                        type="checkbox"
                        checked={documentChecklist[doc.key] || false}
                        onChange={(e) => handleDocumentChecklistChange(doc.key, e.target.checked)}
                        disabled={savingDocChecklist}
                      />
                      <span className="doc-checkbox-label">
                        {doc.label}
                        {doc.required && <span className="required-indicator">*</span>}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="no-documents-msg">No document types configured. Please contact your administrator.</p>
                )}
              </div>
            </div>

            {/* Company Registration Info */}
            <div className="documents-section">
              <h3>Company Information</h3>
              <div className="document-checklist">
                <div className="doc-item">
                  <span className="doc-icon">{client.vatNumber ? '✅' : '❌'}</span>
                  <span className="doc-name">VAT Registration</span>
                  <span className="doc-status">{client.vatNumber || 'Not provided'}</span>
                </div>
                <div className="doc-item">
                  <span className="doc-icon">{client.bbbeeLevel ? '✅' : '❌'}</span>
                  <span className="doc-name">B-BBEE Certificate</span>
                  <span className="doc-status">{client.bbbeeLevel || 'Not provided'}</span>
                </div>
                <div className="doc-item">
                  <span className="doc-icon">{client.seta ? '✅' : '❌'}</span>
                  <span className="doc-name">SETA Registration</span>
                  <span className="doc-status">{client.seta || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lms' && lmsData && (
        <div className="tab-content">
          <div className="lms-section">
            <h2>LMS Reports - {client.name}</h2>

            {/* LMS Overview Cards */}
            <div className="lms-overview-cards">
              <div className="lms-card">
                <span className="lms-icon">👥</span>
                <div className="lms-card-content">
                  <span className="lms-value">{lmsData.totalEmployees}</span>
                  <span className="lms-label">Total Employees</span>
                </div>
              </div>
              <div className="lms-card">
                <span className="lms-icon">✅</span>
                <div className="lms-card-content">
                  <span className="lms-value">{lmsData.activeUsers}</span>
                  <span className="lms-label">Active Users</span>
                </div>
              </div>
              <div className="lms-card">
                <span className="lms-icon">🎓</span>
                <div className="lms-card-content">
                  <span className="lms-value">{lmsData.completedCourses}</span>
                  <span className="lms-label">Completed Courses</span>
                </div>
              </div>
              <div className="lms-card">
                <span className="lms-icon">📈</span>
                <div className="lms-card-content">
                  <span className="lms-value">{lmsData.avgCompletionRate}%</span>
                  <span className="lms-label">Avg Completion Rate</span>
                </div>
              </div>
            </div>

            {/* Course Performance */}
            <div className="lms-courses-section">
              <h3>Course Performance</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Enrolled</th>
                    <th>Completed</th>
                    <th>Completion Rate</th>
                    <th>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {lmsData.courses.map((course, index) => (
                    <tr key={index}>
                      <td>{course.name}</td>
                      <td>{course.enrolled}</td>
                      <td>{course.completed}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(course.completed / course.enrolled * 100).toFixed(0)}%` }}
                          />
                          <span>{(course.completed / course.enrolled * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>{course.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Activity */}
            <div className="lms-activity-section">
              <h3>Recent LMS Activity</h3>
              <div className="lms-activity-list">
                {lmsData.recentActivity.map((activity, index) => (
                  <div key={index} className="lms-activity-item">
                    <span className={`activity-action action-${activity.action.toLowerCase().replace(' ', '-')}`}>
                      {activity.action}
                    </span>
                    <span className="activity-user">{activity.user}</span>
                    <span className="activity-course">{activity.course}</span>
                    <span className="activity-time">{getTimeAgo(activity.date)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lms-last-sync">
              <span>Last Activity: {getTimeAgo(lmsData.lastActivityDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Line Deal Modal */}
      {productLineModalOpen && selectedFinancial && (
        <div className="deal-modal-backdrop" onClick={closeProductLineModal}>
          <div className={`deal-modal deal-modal-${getProductLineType(selectedFinancial.productLine)}`} onClick={e => e.stopPropagation()}>
            <div className="deal-modal-header">
              <h3>{selectedFinancial.productLine} - Deals</h3>
              <button className="close-btn" onClick={closeProductLineModal}>&times;</button>
            </div>

            <div className="deal-modal-summary">
              <div className="summary-item">
                <label>Previous Year</label>
                <span>{formatCurrency(selectedFinancial.history?.yearMinus1 || 0)}</span>
              </div>
              <div className="summary-item">
                <label>YTD</label>
                <span>{formatCurrency(selectedFinancial.history?.currentYearYTD || 0)}</span>
              </div>
              <div className="summary-item">
                <label>Full Year Forecast</label>
                <span className="highlight">{formatCurrency(selectedFinancial.fullYearForecast || 0)}</span>
              </div>
            </div>

            <div className="deal-tabs">
              {editingDeals.map((deal, index) => (
                <button
                  key={deal.id || index}
                  className={`deal-tab ${activeDealTab === index ? 'active' : ''}`}
                  onClick={() => setActiveDealTab(index)}
                >
                  {deal.name || `Deal ${index + 1}`}
                  {deal.certaintyPercentage < 100 && ` (${deal.certaintyPercentage}%)`}
                </button>
              ))}
              <button className="deal-tab add-deal-tab" onClick={addNewDeal}>+ Add Deal</button>
            </div>

            <div className="deal-content">
              {editingDeals.length === 0 ? (
                <div className="no-deals">
                  <p>No deals yet. Click "+ Add Deal" to create one.</p>
                </div>
              ) : (
                editingDeals.map((deal, index) => {
                  if (activeDealTab !== index) return null

                  const productLineType = getProductLineType(selectedFinancial.productLine)

                  return (
                    <div key={deal.id || index} className="deal-form">
                      <div className="deal-form-header">
                        <h4>Deal {index + 1}</h4>
                        <button className="delete-deal-btn" onClick={() => deleteDeal(index)}>Delete Deal</button>
                      </div>

                      <div className="deal-form-grid">
                        {/* Product/Deal Selection - shows dropdown if products exist */}
                        <div className="form-field">
                          <label>{productLineType === 'learnership' ? 'Learnership' : productLineType === 'tap' ? 'Package' : 'Course'}</label>
                          {getProductsForType(productLineType).length > 0 ? (
                            <select
                              value={deal.productId || ''}
                              onChange={e => handleProductSelection(index, e.target.value, productLineType)}
                            >
                              <option value="">-- Select {productLineType === 'learnership' ? 'Learnership' : 'Product'} --</option>
                              {getProductsForType(productLineType).map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                  {product.defaultCostPerLearner ? ` (R${product.defaultCostPerLearner}/learner)` : ''}
                                  {product.defaultMonthlyFee ? ` (R${product.defaultMonthlyFee}/month)` : ''}
                                  {product.defaultCostPerTrainee ? ` (R${product.defaultCostPerTrainee}/trainee)` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={deal.name || ''}
                              onChange={e => handleDealChange(index, 'name', e.target.value)}
                              placeholder="Enter name"
                            />
                          )}
                        </div>

                        <div className="form-field">
                          <label>Certainty %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={deal.certaintyPercentage || 100}
                            onChange={e => handleDealChange(index, 'certaintyPercentage', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="form-field full-width">
                          <label>Description</label>
                          <textarea
                            value={deal.description || ''}
                            onChange={e => handleDealChange(index, 'description', e.target.value)}
                            placeholder="Deal notes..."
                            rows="2"
                          />
                        </div>

                        {/* Learnership-specific fields */}
                        {productLineType === 'learnership' && (
                          <>
                            <div className="form-field">
                              <label>Number of Learners</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.learners || 0}
                                onChange={e => handleDealChange(index, 'learners', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Cost per Learner (R)</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.costPerLearner || 0}
                                onChange={e => handleDealChange(index, 'costPerLearner', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Total Value</label>
                              <div className="calculated-value">{formatCurrency((deal.learners || 0) * (deal.costPerLearner || 0))}</div>
                            </div>
                            <div className="form-field">
                              <label>Payment Start Date</label>
                              <input
                                type="date"
                                value={deal.paymentStartDate || ''}
                                onChange={e => handleDealChange(index, 'paymentStartDate', e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Payment Frequency</label>
                              <select
                                value={deal.paymentFrequency || 'Monthly'}
                                onChange={e => {
                                  handleDealChange(index, 'paymentFrequency', e.target.value)
                                  if (e.target.value === 'Once-off') {
                                    handleDealChange(index, 'paymentMonths', 1)
                                  }
                                }}
                              >
                                <option value="Monthly">Monthly</option>
                                <option value="Once-off">Once-off</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Payment Months</label>
                              <input
                                type="number"
                                min="1"
                                value={deal.paymentFrequency === 'Once-off' ? 1 : (deal.paymentMonths || 12)}
                                onChange={e => handleDealChange(index, 'paymentMonths', parseInt(e.target.value) || 1)}
                                disabled={deal.paymentFrequency === 'Once-off'}
                              />
                            </div>
                          </>
                        )}

                        {/* TAP Business-specific fields */}
                        {productLineType === 'tap' && (
                          <>
                            <div className="form-field">
                              <label>Number of Employees</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.numberOfEmployees || 0}
                                onChange={e => handleDealChange(index, 'numberOfEmployees', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Cost per Employee/Month (R)</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.costPerEmployeePerMonth || 0}
                                onChange={e => handleDealChange(index, 'costPerEmployeePerMonth', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Monthly Value</label>
                              <div className="calculated-value">{formatCurrency((deal.numberOfEmployees || 0) * (deal.costPerEmployeePerMonth || 0))}</div>
                            </div>
                            <div className="form-field">
                              <label>Payment Start Date</label>
                              <input
                                type="date"
                                value={deal.paymentStartDate || ''}
                                onChange={e => handleDealChange(index, 'paymentStartDate', e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Payment Type</label>
                              <select
                                value={deal.paymentType || 'Monthly'}
                                onChange={e => {
                                  handleDealChange(index, 'paymentType', e.target.value)
                                  if (e.target.value === 'Annual') {
                                    handleDealChange(index, 'contractMonths', 1)
                                  }
                                }}
                              >
                                <option value="Monthly">Monthly</option>
                                <option value="Annual">Annual</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Contract Duration (Months)</label>
                              <input
                                type="number"
                                min="1"
                                value={deal.paymentType === 'Annual' ? 1 : (deal.contractMonths || 12)}
                                onChange={e => handleDealChange(index, 'contractMonths', parseInt(e.target.value) || 1)}
                                disabled={deal.paymentType === 'Annual'}
                              />
                            </div>
                          </>
                        )}

                        {/* Compliance/Other Courses fields */}
                        {(productLineType === 'compliance' || productLineType === 'other') && (
                          <>
                            <div className="form-field">
                              <label>Course Name</label>
                              <input
                                type="text"
                                value={deal.courseName || ''}
                                onChange={e => handleDealChange(index, 'courseName', e.target.value)}
                                placeholder="Enter course name"
                              />
                            </div>
                            <div className="form-field">
                              <label>Number of Trainees</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.numberOfTrainees || 0}
                                onChange={e => handleDealChange(index, 'numberOfTrainees', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Price per Person (R)</label>
                              <input
                                type="number"
                                min="0"
                                value={deal.pricePerPerson || 0}
                                onChange={e => handleDealChange(index, 'pricePerPerson', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="form-field">
                              <label>Total Value</label>
                              <div className="calculated-value">{formatCurrency((deal.numberOfTrainees || 0) * (deal.pricePerPerson || 0))}</div>
                            </div>
                            <div className="form-field">
                              <label>Training Date</label>
                              <input
                                type="date"
                                value={deal.trainingDate || ''}
                                onChange={e => handleDealChange(index, 'trainingDate', e.target.value)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="deal-modal-footer">
              <button className="cancel-btn" onClick={closeProductLineModal}>Cancel</button>
              <button className="save-btn" onClick={saveDeals} disabled={savingDeals}>
                {savingDeals ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="modal-backdrop" onClick={() => setShowLocationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLocation ? 'Edit Location' : 'Add Location'}</h3>
              <button className="close-btn" onClick={() => setShowLocationModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Location Name *</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Head Office, Johannesburg Branch"
                />
              </div>
              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <select
                    value={locationForm.province}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, province: e.target.value }))}
                  >
                    <option value="">Select Province</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="North West">North West</option>
                    <option value="Northern Cape">Northern Cape</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={locationForm.postalCode}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="Postal Code"
                  />
                </div>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={locationForm.isHeadOffice}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, isHeadOffice: e.target.checked }))}
                  />
                  This is the Head Office
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowLocationModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSaveLocation} disabled={savingLocation}>
                {savingLocation ? 'Saving...' : (editingLocation ? 'Update Location' : 'Add Location')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-backdrop" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
              <button className="close-btn" onClick={() => setShowContactModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={contactFormData.firstName}
                    onChange={(e) => setContactFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={contactFormData.lastName}
                    onChange={(e) => setContactFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <select
                  value={contactFormData.jobTitle}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                >
                  <option value="">Select Job Title</option>
                  {jobTitles.map(jt => (
                    <option key={jt.id} value={jt.title}>{jt.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Location / Place of Work</label>
                <select
                  value={contactFormData.locationId}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, locationId: e.target.value }))}
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}{loc.isHeadOffice ? ' (Head Office)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={contactFormData.isDecisionMaker}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, isDecisionMaker: e.target.checked }))}
                    />
                    Decision Maker
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={contactFormData.isMainContact}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, isMainContact: e.target.checked }))}
                    />
                    Main Contact
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Notes / Feedback</label>
                <textarea
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or feedback about this contact..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowContactModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSaveContact} disabled={savingContact}>
                {savingContact ? 'Saving...' : (editingContact ? 'Update Contact' : 'Add Contact')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDetail
