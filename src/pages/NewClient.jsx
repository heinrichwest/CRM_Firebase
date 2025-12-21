import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from 'firebase/auth'
import { createClient, addClientActivity, getUsers } from '../services/firestoreService'
import { getSetas } from '../services/setaService'
import { getJobTitles } from '../services/jobTitlesService'
import { useTenant } from '../context/TenantContext'
import './NewClient.css'

const NewClient = () => {
  const navigate = useNavigate()
  const auth = getAuth()
  const { getTenantId } = useTenant()
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [setas, setSetas] = useState([])
  const [jobTitles, setJobTitles] = useState([])
  const [contacts, setContacts] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    tradingName: '',
    vatNumber: '',
    type: 'Corporate',
    status: 'Prospect',
    physicalAddress: '',
    postalAddress: '',
    country: 'South Africa',
    industry: '',
    sector: '',
    hrContactPerson: '',
    hrContactEmail: '',
    hrContactPhone: '',
    sdfName: '',
    sdfEmail: '',
    sdfPhone: '',
    trainingManagerName: '',
    trainingManagerEmail: '',
    trainingManagerPhone: '',
    decisionMakerName: '',
    decisionMakerEmail: '',
    decisionMakerPhone: '',
    currentLmsUsage: 'No',
    lmsId: '',
    bbbeeLevel: '',
    seta: '',
    financialYearEnd: '',
    sharePointFolderLink: '',
    primaryContact: '',
    contactEmail: '',
    phone: '',
    notes: '',
    companyBackground: '',
    ytdRevenue: 0,
    pipelineValue: 0,
    assignedSalesPerson: '',
    skillsPartnerId: 'not-allocated'
  })

  useEffect(() => {
    // Set default account owner to current user
    if (auth.currentUser) {
      setFormData(prev => ({
        ...prev,
        assignedSalesPerson: auth.currentUser.uid
      }))
    }

    // Load users, SETAs, and job titles
    loadUsers()
    loadSetas()
    loadJobTitles()
  }, [])

  const loadUsers = async () => {
    try {
      const usersList = await getUsers()
      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
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

  const loadJobTitles = async () => {
    try {
      const jobTitlesList = await getJobTitles()
      setJobTitles(jobTitlesList)
    } catch (error) {
      console.error('Error loading job titles:', error)
    }
  }

  // Contact management functions
  const addContact = () => {
    setContacts(prev => [...prev, {
      id: Date.now(),
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      isDecisionMaker: false,
      isMainContact: false
    }])
  }

  const removeContact = (id) => {
    setContacts(prev => prev.filter(contact => contact.id !== id))
  }

  const updateContact = (id, field, value) => {
    setContacts(prev => prev.map(contact =>
      contact.id === id ? { ...contact, [field]: value } : contact
    ))
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
      const tenantId = getTenantId()
      // Generate unique client ID (will be created by Firestore, but we can add a readable ID)
      const clientId = await createClient({
        ...formData,
        clientId: `CLI-${Date.now()}`, // Temporary readable ID
        contacts: contacts // Add contacts array
      }, tenantId)
      
      // Add initial activity
      await addClientActivity(clientId, {
        type: 'client_created',
        description: `Client "${formData.name || formData.legalName}" was created`,
        userId: auth.currentUser?.uid || 'system',
        userName: auth.currentUser?.displayName || auth.currentUser?.email || 'System'
      })
      
      navigate(`/clients/${clientId}`)
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Failed to create client. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="new-client">
      <div className="new-client-header">
        <h1>Add New Client</h1>
        <button onClick={() => navigate('/clients')} className="cancel-btn">
          Cancel
        </button>
      </div>

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
          </div>
        </div>

        <div className="form-section">
          <h2>Contact Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="primaryContact">Primary Contact</label>
              <input
                type="text"
                id="primaryContact"
                name="primaryContact"
                value={formData.primaryContact}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Location</h2>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label htmlFor="physicalAddress">Physical Address</label>
              <input
                type="text"
                id="physicalAddress"
                name="physicalAddress"
                value={formData.physicalAddress}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="postalAddress">Postal Address</label>
              <input
                type="text"
                id="postalAddress"
                name="postalAddress"
                value={formData.postalAddress}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
              />
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
                placeholder="e.g., Manufacturing, Retail"
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
                placeholder="Important for SETA allocation"
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
                <option value="Non-Compliant">Non-Compliant</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>Contact Persons</h2>
            <button type="button" className="add-contact-btn" onClick={addContact}>
              + Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="empty-contacts">
              <p>No contacts added yet. Click "Add Contact" to add contact persons.</p>
            </div>
          ) : (
            <div className="contacts-list">
              {contacts.map((contact, index) => (
                <div key={contact.id} className="contact-row">
                  <div className="contact-number">{index + 1}</div>

                  <div className="contact-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>

                  <div className="contact-field">
                    <label>Job Title</label>
                    <select
                      value={contact.jobTitle}
                      onChange={(e) => updateContact(contact.id, 'jobTitle', e.target.value)}
                    >
                      <option value="">Select job title</option>
                      {jobTitles.map(jobTitle => (
                        <option key={jobTitle.id} value={jobTitle.title}>
                          {jobTitle.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="contact-field">
                    <label>Email (Optional)</label>
                    <input
                      type="text"
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                      placeholder="email@example.com (optional)"
                    />
                  </div>

                  <div className="contact-field">
                    <label>Phone (Optional)</label>
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      placeholder="Phone number (optional)"
                    />
                  </div>

                  <div className="contact-field checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={contact.isDecisionMaker}
                        onChange={(e) => updateContact(contact.id, 'isDecisionMaker', e.target.checked)}
                      />
                      <span>Decision Maker</span>
                    </label>
                  </div>

                  <div className="contact-field checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={contact.isMainContact}
                        onChange={(e) => updateContact(contact.id, 'isMainContact', e.target.checked)}
                      />
                      <span>Main Contact</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="remove-contact-btn"
                    onClick={() => removeContact(contact.id)}
                    title="Remove contact"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>LMS Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="currentLmsUsage">Current LMS Usage</label>
              <select
                id="currentLmsUsage"
                name="currentLmsUsage"
                value={formData.currentLmsUsage}
                onChange={handleInputChange}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {formData.currentLmsUsage === 'Yes' && (
              <div className="form-group">
                <label htmlFor="lmsId">LMS ID</label>
                <input
                  type="text"
                  id="lmsId"
                  name="lmsId"
                  value={formData.lmsId}
                  onChange={handleInputChange}
                  placeholder="Enter LMS ID if applicable"
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Account Assignment</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="assignedSalesPerson">Account Owner *</label>
              <select
                id="assignedSalesPerson"
                name="assignedSalesPerson"
                value={formData.assignedSalesPerson}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Salesperson</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email || user.id}
                  </option>
                ))}
              </select>
              <small>Defaults to current user. Manager can reassign later.</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Notes & Company Background</h2>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label htmlFor="companyBackground">Company Background</label>
              <textarea
                id="companyBackground"
                name="companyBackground"
                rows="4"
                value={formData.companyBackground}
                onChange={handleInputChange}
                placeholder="Enter company background and notes..."
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any additional notes..."
              />
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

            <div className="form-group">
              <label htmlFor="ytdRevenue">YTD Revenue (R)</label>
              <input
                type="text"
                id="ytdRevenue"
                name="ytdRevenue"
                value={formatNumberDisplay(formData.ytdRevenue)}
                onChange={handleCurrencyChange}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pipelineValue">Pipeline Value (R)</label>
              <input
                type="text"
                id="pipelineValue"
                name="pipelineValue"
                value={formatNumberDisplay(formData.pipelineValue)}
                onChange={handleCurrencyChange}
                placeholder="0"
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
          <button type="button" onClick={() => navigate('/clients')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewClient


