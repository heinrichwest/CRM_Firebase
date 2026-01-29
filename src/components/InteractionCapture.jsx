import { useState } from 'react'
import { createInteraction } from '../services/firestoreService'
import { useTenant } from '../context/TenantContext'
import './InteractionCapture.css'

const InteractionCapture = ({ clientId, client, contacts = [], onInteractionCreated }) => {
  const { currentUser } = useTenant()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Get default follow-up date (1 week from now)
  const getDefaultFollowUpDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  // Build contact options from client data and contacts list
  const getContactOptions = () => {
    const options = []

    // Add primary contact from client
    if (client?.primaryContact) {
      options.push({
        id: 'primary',
        name: client.primaryContact,
        role: 'Primary Contact',
        email: client.contactEmail,
        phone: client.phone
      })
    }

    // Add HR contact
    if (client?.hrContactPerson) {
      options.push({
        id: 'hr',
        name: client.hrContactPerson,
        role: 'HR Contact',
        email: client.hrContactEmail,
        phone: client.hrContactPhone
      })
    }

    // Add SDF
    if (client?.sdfName) {
      options.push({
        id: 'sdf',
        name: client.sdfName,
        role: 'Skills Development Facilitator',
        email: client.sdfEmail,
        phone: client.sdfPhone
      })
    }

    // Add Training Manager
    if (client?.trainingManagerName) {
      options.push({
        id: 'training',
        name: client.trainingManagerName,
        role: 'Training Manager',
        email: client.trainingManagerEmail,
        phone: client.trainingManagerPhone
      })
    }

    // Add Decision Maker
    if (client?.decisionMakerName) {
      options.push({
        id: 'decision',
        name: client.decisionMakerName,
        role: 'Decision Maker',
        email: client.decisionMakerEmail,
        phone: client.decisionMakerPhone
      })
    }

    // Add contacts from the contacts list
    if (contacts && contacts.length > 0) {
      contacts.forEach(contact => {
        options.push({
          id: contact.id,
          name: contact.name,
          role: contact.role || contact.jobTitle || 'Contact',
          email: contact.email,
          phone: contact.phone
        })
      })
    }

    return options
  }

  const contactOptions = getContactOptions()

  const [formData, setFormData] = useState({
    type: 'Call',
    contactPerson: '',
    contactPersonName: '',
    contactPersonRole: '',
    summary: '',
    notes: '',
    documentsShared: '',
    objectionsRaised: '',
    nextSteps: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    // Follow-up fields
    followUpDate: getDefaultFollowUpDate(),
    followUpReason: '',
    followUpType: 'call'
  })

  const interactionTypes = [
    'Call',
    'Meeting',
    'Email',
    'WhatsApp',
    'Teams',
    'SMS',
    'Other'
  ]

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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleContactChange = (e) => {
    const selectedId = e.target.value
    if (!selectedId) {
      setFormData(prev => ({
        ...prev,
        contactPerson: '',
        contactPersonName: '',
        contactPersonRole: ''
      }))
      return
    }

    const selectedContact = contactOptions.find(c => c.id === selectedId)
    if (selectedContact) {
      setFormData(prev => ({
        ...prev,
        contactPerson: selectedId,
        contactPersonName: selectedContact.name,
        contactPersonRole: selectedContact.role
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`)
      const timestamp = dateTime.toISOString()

      // Convert follow-up date to ISO string
      const followUpDateTime = new Date(`${formData.followUpDate}T09:00:00`)
      const followUpTimestamp = followUpDateTime.toISOString()

      await createInteraction(clientId, {
        type: formData.type.toLowerCase(),
        contactPersonId: formData.contactPerson || null,
        contactPersonName: formData.contactPersonName || null,
        contactPersonRole: formData.contactPersonRole || null,
        summary: formData.summary,
        notes: formData.notes,
        documentsShared: formData.documentsShared,
        objectionsRaised: formData.objectionsRaised,
        nextSteps: formData.nextSteps,
        userId: currentUser?.uid,
        userName: currentUser?.displayName || currentUser?.email,
        timestamp: timestamp,
        // Follow-up data - will be used to update client's next follow-up
        followUpDate: followUpTimestamp,
        followUpReason: formData.followUpReason,
        followUpType: formData.followUpType
      })

      // Reset form
      setFormData({
        type: 'Call',
        contactPerson: '',
        contactPersonName: '',
        contactPersonRole: '',
        summary: '',
        notes: '',
        documentsShared: '',
        objectionsRaised: '',
        nextSteps: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        followUpDate: getDefaultFollowUpDate(),
        followUpReason: '',
        followUpType: 'call'
      })

      setShowForm(false)

      if (onInteractionCreated) {
        onInteractionCreated()
      }
    } catch (error) {
      console.error('Error creating interaction:', error)
      alert('Failed to log interaction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!showForm) {
    return (
      <button
        className="add-interaction-btn"
        onClick={() => setShowForm(true)}
      >
        + Log New Interaction
      </button>
    )
  }

  return (
    <div className="interaction-capture-form">
      <div className="form-header">
        <h3>Log New Interaction</h3>
        <button
          className="close-btn"
          onClick={() => setShowForm(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Interaction Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              {interactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Time</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Contact Person</label>
          <select
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleContactChange}
          >
            <option value="">-- Select Contact --</option>
            {contactOptions.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.name} ({contact.role})
              </option>
            ))}
          </select>
          {formData.contactPersonName && (
            <span className="selected-contact-info">
              Speaking with: {formData.contactPersonName}
            </span>
          )}
        </div>

        <div className="form-group">
          <label>Summary of Discussion *</label>
          <textarea
            name="summary"
            rows="4"
            value={formData.summary}
            onChange={handleInputChange}
            required
            placeholder="Brief summary of what was discussed..."
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Additional notes..."
          />
        </div>

        <div className="form-group">
          <label>Documents Shared</label>
          <input
            type="text"
            name="documentsShared"
            value={formData.documentsShared}
            onChange={handleInputChange}
            placeholder="List any documents shared (e.g., Proposal.pdf, Quote.xlsx)"
          />
        </div>

        <div className="form-group">
          <label>Objections Raised</label>
          <textarea
            name="objectionsRaised"
            rows="2"
            value={formData.objectionsRaised}
            onChange={handleInputChange}
            placeholder="Any objections or concerns raised..."
          />
        </div>

        <div className="form-group">
          <label>Next Steps</label>
          <textarea
            name="nextSteps"
            rows="2"
            value={formData.nextSteps}
            onChange={handleInputChange}
            placeholder="Agreed next steps..."
          />
        </div>

        {/* Follow-Up Section */}
        <div className="follow-up-section">
          <h4>Schedule Next Follow-Up *</h4>
          <p className="section-description">Every interaction must have a scheduled follow-up to keep the client in the sales cycle.</p>

          <div className="form-row">
            <div className="form-group">
              <label>Follow-Up Date *</label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Follow-Up Action *</label>
              <select
                name="followUpType"
                value={formData.followUpType}
                onChange={handleInputChange}
                required
              >
                {followUpTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Reason for Follow-Up *</label>
            <input
              type="text"
              name="followUpReason"
              value={formData.followUpReason}
              onChange={handleInputChange}
              required
              placeholder="E.g., Discuss pricing options, Send updated proposal, Check decision..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-btn"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Interaction & Schedule Follow-Up'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default InteractionCapture
