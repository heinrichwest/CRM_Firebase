import { useState, useEffect } from 'react'
import {
  getSkillsPartners,
  createSkillsPartner,
  updateSkillsPartner,
  deleteSkillsPartner,
  getClients,
  getProductLines
} from '../services/firestoreService'
import { validateEmail, validatePhoneNumber } from '../utils/validation'
import { useTenant } from '../context/TenantContext'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSkeleton from '../components/LoadingSkeleton'
import './SkillsPartners.css'

const SkillsPartners = () => {
  const { getTenantId, isSystemAdmin } = useTenant()
  const tenantId = getTenantId()
  const [partners, setPartners] = useState([])
  const [clients, setClients] = useState([])
  const [productLines, setProductLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    partner: null
  })

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    specialization: '',
    status: 'Active',
    notes: '',
    agreementLink: '',
    commissionRates: {}
  })

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    setError('')
    try {
      // Pass tenantId to filter skills partners by tenant (unless system admin)
      const filterTenantId = isSystemAdmin ? null : tenantId
      const [partnersData, clientsData, productLinesData] = await Promise.all([
        getSkillsPartners(filterTenantId),
        getClients(),
        getProductLines()
      ])
      setPartners(partnersData || [])
      setClients(clientsData || [])
      setProductLines(productLinesData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getClientCountForPartner = (partnerId) => {
    return clients.filter(c => c.skillsPartnerId === partnerId).length
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleCommissionChange = (productLineId, value) => {
    const percentage = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      commissionRates: {
        ...prev.commissionRates,
        [productLineId]: Math.min(100, Math.max(0, percentage)) // Clamp between 0-100
      }
    }))
  }

  const openCreateModal = () => {
    setEditingPartner(null)
    // Initialize commission rates with 0 for each product line
    const initialRates = {}
    productLines.forEach(pl => {
      initialRates[pl.id] = 0
    })
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      specialization: '',
      status: 'Active',
      notes: '',
      agreementLink: '',
      commissionRates: initialRates
    })
    setShowModal(true)
    setError('')
    setFieldErrors({})
  }

  const openEditModal = (partner) => {
    setEditingPartner(partner)
    setFormData({
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      company: partner.company || '',
      specialization: partner.specialization || '',
      status: partner.status || 'Active',
      notes: partner.notes || '',
      agreementLink: partner.agreementLink || '',
      commissionRates: partner.commissionRates || {}
    })
    setShowModal(true)
    setError('')
    setFieldErrors({})
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPartner(null)
    setError('')
    setFieldErrors({})
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Partner name is required'
    }

    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error
    }

    const phoneValidation = validatePhoneNumber(formData.phone)
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      // Format phone number if valid
      const phoneValidation = validatePhoneNumber(formData.phone)
      const dataToSave = {
        ...formData,
        phone: phoneValidation.formatted || formData.phone
      }

      if (editingPartner) {
        await updateSkillsPartner(editingPartner.id, dataToSave)
        setSuccess('Skills partner updated successfully')
      } else {
        // Include tenantId when creating new partner
        await createSkillsPartner({
          ...dataToSave,
          tenantId: tenantId
        })
        setSuccess('Skills partner created successfully')
      }

      await loadData()
      closeModal()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving partner:', err)
      setError('Failed to save skills partner')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (partner) => {
    setConfirmDialog({
      isOpen: true,
      partner
    })
  }

  const closeDeleteConfirm = () => {
    setConfirmDialog({
      isOpen: false,
      partner: null
    })
  }

  const handleConfirmDelete = async () => {
    const partner = confirmDialog.partner
    if (!partner) return

    setDeleting(true)

    try {
      const result = await deleteSkillsPartner(partner.id)
      const message = result.clientsUpdated > 0
        ? `Skills partner deleted. ${result.clientsUpdated} client(s) were unassigned.`
        : 'Skills partner deleted successfully'
      setSuccess(message)
      closeDeleteConfirm()
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting partner:', err)
      setError('Failed to delete skills partner')
      closeDeleteConfirm()
    } finally {
      setDeleting(false)
    }
  }

  const filteredPartners = partners.filter(partner =>
    partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDeleteMessage = () => {
    if (!confirmDialog.partner) return ''
    const clientCount = getClientCountForPartner(confirmDialog.partner.id)
    if (clientCount > 0) {
      return `This skills partner is assigned to ${clientCount} client(s). Deleting will remove this assignment from all affected clients. This action cannot be undone.`
    }
    return `Are you sure you want to delete "${confirmDialog.partner.name}"? This action cannot be undone.`
  }

  if (loading) {
    return (
      <div className="skills-partners">
        <div className="page-header">
          <LoadingSkeleton type="title" width="280px" />
          <LoadingSkeleton type="button" />
        </div>
        <div className="partners-toolbar">
          <LoadingSkeleton type="text" width="200px" height="40px" />
        </div>
        <div className="partners-grid">
          {[1, 2, 3, 4].map(i => (
            <LoadingSkeleton key={i} type="card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="skills-partners">
      <div className="page-header">
        <h1>Skills Partner Management</h1>
        <button className="create-btn" onClick={openCreateModal}>
          + Add Skills Partner
        </button>
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && !showModal && <div className="error-message">{error}</div>}

      <div className="partners-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="partner-stats">
          <span className="stat">
            <strong>{partners.length}</strong> Total Partners
          </span>
          <span className="stat">
            <strong>{partners.filter(p => p.status === 'Active').length}</strong> Active
          </span>
        </div>
      </div>

      {filteredPartners.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? (
            <p>No skills partners match your search.</p>
          ) : (
            <>
              <p>No skills partners have been created yet.</p>
              <button className="create-btn" onClick={openCreateModal}>
                Create your first Skills Partner
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="partners-grid">
          {filteredPartners.map(partner => (
            <div key={partner.id} className={`partner-card ${partner.status === 'Inactive' ? 'inactive' : ''}`}>
              <div className="partner-card-header">
                <div className="partner-avatar">
                  {partner.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="partner-info">
                  <h3>{partner.name}</h3>
                  {partner.company && <span className="company">{partner.company}</span>}
                </div>
                <span className={`status-badge ${partner.status?.toLowerCase()}`}>
                  {partner.status}
                </span>
              </div>

              <div className="partner-card-body">
                {partner.email && (
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <a href={`mailto:${partner.email}`}>{partner.email}</a>
                  </div>
                )}
                {partner.phone && (
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span>{partner.phone}</span>
                  </div>
                )}
                {partner.specialization && (
                  <div className="info-row">
                    <span className="label">Specialization:</span>
                    <span>{partner.specialization}</span>
                  </div>
                )}
                <div className="info-row clients-count">
                  <span className="label">Assigned Clients:</span>
                  <span className="count">{getClientCountForPartner(partner.id)}</span>
                </div>
              </div>

              {partner.notes && (
                <div className="partner-notes">
                  <p>{partner.notes}</p>
                </div>
              )}

              <div className="partner-card-actions">
                <button className="edit-btn" onClick={() => openEditModal(partner)}>
                  Edit
                </button>
                <button className="delete-btn" onClick={() => openDeleteConfirm(partner)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPartner ? 'Edit Skills Partner' : 'Add Skills Partner'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}

                <div className="form-row">
                  <div className="form-field">
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Partner name"
                      className={fieldErrors.name ? 'input-error' : ''}
                      required
                    />
                    {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
                  </div>
                  <div className="form-field">
                    <label>Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      className={fieldErrors.email ? 'input-error' : ''}
                    />
                    {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
                  </div>
                  <div className="form-field">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., 012 345 6789"
                      className={fieldErrors.phone ? 'input-error' : ''}
                    />
                    {fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Specialization</label>
                    <select
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                    >
                      <option value="">Select specialization</option>
                      <option value="Learnerships">Learnerships</option>
                      <option value="TAP Business">TAP Business</option>
                      <option value="Compliance Training">Compliance Training</option>
                      <option value="Other Courses">Other Courses</option>
                      <option value="All">All Product Lines</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-field full-width">
                  <label>Agreement Link (Google Drive/SharePoint)</label>
                  <input
                    type="url"
                    name="agreementLink"
                    value={formData.agreementLink}
                    onChange={handleInputChange}
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div className="form-field full-width">
                  <label>Commission Rates by Product Line (%)</label>
                  <div className="commission-inputs">
                    {productLines.map(pl => (
                      <div key={pl.id} className="commission-input-row">
                        <label>{pl.name}</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.commissionRates[pl.id] || 0}
                          onChange={(e) => handleCommissionChange(pl.id, e.target.value)}
                          placeholder="0.0"
                        />
                        <span className="percentage-symbol">%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-field full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes about this partner..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : (editingPartner ? 'Update Partner' : 'Create Partner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Skills Partner"
        message={getDeleteMessage()}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteConfirm}
        isLoading={deleting}
      />
    </div>
  )
}

export default SkillsPartners
