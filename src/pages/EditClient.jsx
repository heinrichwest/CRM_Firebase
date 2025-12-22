import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient, updateClient, getClientActivities, addClientActivity } from '../services/firestoreService'
import { getSetas } from '../services/setaService'
import { getSkillsPartners } from '../services/skillsPartnerService'
import './EditClient.css'

const EditClient = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activities, setActivities] = useState([])
  const [setas, setSetas] = useState([])
  const [skillsPartners, setSkillsPartners] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    tradingName: '',
    vatNumber: '',
    type: 'Corporate',
    status: 'Prospect',
    pipelineStatus: '',
    address: '',
    country: 'South Africa',
    industry: '',
    sector: '',
    seta: '',
    bbbeeLevel: '',
    financialYearEnd: '',
    sharePointFolderLink: '',
    primaryContact: '',
    contactEmail: '',
    phone: '',
    ytdRevenue: 0,
    pipelineValue: 0,
    nextFollowUpDate: null,
    assignedSalesPerson: '',
    skillsPartnerId: 'not-allocated'
  })

  const pipelineStages = [
    { id: '', name: 'Not in Pipeline' },
    { id: 'new-lead', name: 'New Lead' },
    { id: 'qualifying', name: 'Qualifying' },
    { id: 'proposal-sent', name: 'Proposal Sent' },
    { id: 'awaiting-decision', name: 'Awaiting Decision' },
    { id: 'negotiation', name: 'Negotiation' },
    { id: 'won', name: 'Won' },
    { id: 'lost', name: 'Lost' }
  ]

  useEffect(() => {
    if (id) {
      loadClientData()
      loadSetas()
      loadSkillsPartners()
    }
  }, [id])

  const loadClientData = async () => {
    try {
      const [clientData, activitiesData] = await Promise.all([
        getClient(id),
        getClientActivities(id)
      ])

      if (clientData) {
        setFormData({
          name: clientData.name || '',
          legalName: clientData.legalName || '',
          tradingName: clientData.tradingName || '',
          vatNumber: clientData.vatNumber || '',
          type: clientData.type || 'Corporate',
          status: clientData.status || 'Prospect',
          pipelineStatus: clientData.pipelineStatus || '',
          address: clientData.address || '',
          country: clientData.country || 'South Africa',
          industry: clientData.industry || '',
          sector: clientData.sector || '',
          seta: clientData.seta || '',
          bbbeeLevel: clientData.bbbeeLevel || '',
          financialYearEnd: clientData.financialYearEnd || '',
          sharePointFolderLink: clientData.sharePointFolderLink || '',
          primaryContact: clientData.primaryContact || '',
          contactEmail: clientData.contactEmail || '',
          phone: clientData.phone || '',
          ytdRevenue: clientData.ytdRevenue || 0,
          pipelineValue: clientData.pipelineValue || 0,
          nextFollowUpDate: clientData.nextFollowUpDate || null,
          assignedSalesPerson: clientData.assignedSalesPerson || '',
          skillsPartnerId: clientData.skillsPartnerId || 'not-allocated'
        })
      }

      setActivities(activitiesData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading client data:', error)
      setLoading(false)
    }
  }

  const loadSetas = async () => {
    try {
      const setasList = await getSetas()
      setSetas(setasList)
    } catch (error) {
      console.error('Error loading SETAs:', error)
    }
  }

  const loadSkillsPartners = async () => {
    try {
      const partnersList = await getSkillsPartners()
      setSkillsPartners(partnersList)
    } catch (error) {
      console.error('Error loading Skills Partners:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Format number with thousand separators for display
  const formatNumberDisplay = (value) => {
    if (value === '' || value === null || value === undefined) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return num.toLocaleString('en-ZA')
  }

  // Handle currency input - strips formatting and stores raw number
  const handleCurrencyChange = (e) => {
    const { name, value } = e.target
    // Remove all non-numeric characters except decimal point
    const rawValue = value.replace(/[^\d.]/g, '')
    const numericValue = rawValue === '' ? 0 : parseFloat(rawValue)
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(numericValue) ? 0 : numericValue
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await updateClient(id, formData)
      
      // Add activity log entry
      await addClientActivity(id, {
        type: 'client_updated',
        description: `Client information was updated`,
        userId: 'system'
      })
      
      navigate(`/clients/${id}`)
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Failed to update client. Please try again.')
      setSaving(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toISOString().split('T')[0]
  }

  if (loading) {
    return (
      <div className="edit-client">
        <h1>Edit Client</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="edit-client">
      <div className="edit-client-header">
        <h1>Edit Client</h1>
        <button onClick={() => navigate(`/clients/${id}`)} className="cancel-btn">
          Cancel
        </button>
      </div>

      <div className="edit-client-content">
        <form onSubmit={handleSubmit} className="client-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Client Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="legalName">Legal Name</label>
                <input
                  type="text"
                  id="legalName"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tradingName">Trading Name</label>
                <input
                  type="text"
                  id="tradingName"
                  name="tradingName"
                  value={formData.tradingName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vatNumber">VAT Number</label>
                <input
                  type="text"
                  id="vatNumber"
                  name="vatNumber"
                  value={formData.vatNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Client Type *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Corporate">Corporate</option>
                  <option value="School">School</option>
                  <option value="Program">Program</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Prospect">Prospect</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pipelineStatus">Pipeline Status</label>
                <select
                  id="pipelineStatus"
                  name="pipelineStatus"
                  value={formData.pipelineStatus}
                  onChange={handleInputChange}
                  className={`pipeline-select ${formData.pipelineStatus ? `pipeline-${formData.pipelineStatus}` : ''}`}
                >
                  {pipelineStages.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Industry & SETA Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  placeholder="e.g., Mining, Healthcare, Retail"
                />
              </div>

              <div className="form-group">
                <label htmlFor="sector">Sector</label>
                <input
                  type="text"
                  id="sector"
                  name="sector"
                  value={formData.sector}
                  onChange={handleInputChange}
                  placeholder="e.g., Private, Public, NGO"
                />
              </div>

              <div className="form-group">
                <label htmlFor="seta">SETA</label>
                <select
                  id="seta"
                  name="seta"
                  value={formData.seta}
                  onChange={handleInputChange}
                >
                  <option value="">Select SETA</option>
                  {setas.map(seta => (
                    <option key={seta.id} value={seta.shortName}>
                      {seta.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bbbeeLevel">BBBEE Level</label>
                <select
                  id="bbbeeLevel"
                  name="bbbeeLevel"
                  value={formData.bbbeeLevel}
                  onChange={handleInputChange}
                >
                  <option value="">Select Level</option>
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                  <option value="Level 6">Level 6</option>
                  <option value="Level 7">Level 7</option>
                  <option value="Level 8">Level 8</option>
                  <option value="Non-compliant">Non-compliant</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="skillsPartnerId">Skills Partner</label>
                <select
                  id="skillsPartnerId"
                  name="skillsPartnerId"
                  value={formData.skillsPartnerId}
                  onChange={handleInputChange}
                >
                  <option value="not-allocated">Not Allocated</option>
                  {skillsPartners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Financial Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="financialYearEnd">Financial Year End</label>
                <input
                  type="text"
                  id="financialYearEnd"
                  name="financialYearEnd"
                  placeholder="e.g., March"
                  value={formData.financialYearEnd}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Information</h2>
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="sharePointFolderLink">SharePoint/Google Drive Link</label>
                <input
                  type="url"
                  id="sharePointFolderLink"
                  name="sharePointFolderLink"
                  value={formData.sharePointFolderLink}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(`/clients/${id}`)} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Activity Log */}
        <div className="activity-log-section">
          <h2>Activity Log</h2>
          <div className="activity-list">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-date">
                    {activity.timestamp
                      ? (activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp)).toLocaleString('en-ZA')
                      : 'N/A'}
                  </div>
                  <div className="activity-description">
                    {activity.description || activity.type || 'Activity'}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activities">No activities recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditClient






