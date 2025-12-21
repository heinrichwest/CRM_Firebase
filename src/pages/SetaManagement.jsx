import { useState, useEffect } from 'react'
import { getSetas, createSeta, updateSeta, deleteSeta, seedSetas } from '../services/setaService'
import { useTenant } from '../context/TenantContext'
import './SetaManagement.css'

const SetaManagement = () => {
  const [setas, setSetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingSeta, setEditingSeta] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    shortName: '',
    fullName: ''
  })
  const { isSystemAdmin } = useTenant()

  useEffect(() => {
    loadSetas()
  }, [])

  const loadSetas = async () => {
    try {
      setLoading(true)
      const setasData = await getSetas()
      setSetas(setasData || [])
    } catch (error) {
      console.error('Error loading SETAs:', error)
      // Don't show alert if it's just an empty collection
      // The UI will handle showing the seed button
      setSetas([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (seta = null) => {
    if (seta) {
      setEditingSeta(seta)
      setFormData({
        shortName: seta.shortName,
        fullName: seta.fullName
      })
    } else {
      setEditingSeta(null)
      setFormData({
        shortName: '',
        fullName: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSeta(null)
    setFormData({
      shortName: '',
      fullName: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.shortName.trim() || !formData.fullName.trim()) {
      alert('Please fill in all fields')
      return
    }

    setSaving(true)
    try {
      if (editingSeta) {
        await updateSeta(editingSeta.id, formData)
      } else {
        await createSeta(formData)
      }
      await loadSetas()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving SETA:', error)
      alert('Failed to save SETA')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (setaId, setaName) => {
    if (!window.confirm(`Are you sure you want to delete "${setaName}"? This action cannot be undone.`)) {
      return
    }

    setSaving(true)
    try {
      await deleteSeta(setaId)
      await loadSetas()
    } catch (error) {
      console.error('Error deleting SETA:', error)
      alert('Failed to delete SETA')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedSetas = async () => {
    if (!window.confirm('This will add all standard SETAs to the database. Continue?')) {
      return
    }

    setSaving(true)
    try {
      await seedSetas()
      await loadSetas()
      alert('SETAs seeded successfully')
    } catch (error) {
      console.error('Error seeding SETAs:', error)
      alert('Failed to seed SETAs')
    } finally {
      setSaving(false)
    }
  }

  const filteredSetas = setas.filter(seta =>
    seta.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seta.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isSystemAdmin) {
    return (
      <div className="seta-management">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="seta-management">
        <h1>SETA Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="seta-management">
      <div className="page-header">
        <h1>SETA Management</h1>
        <div className="header-actions">
          {setas.length === 0 && (
            <button
              className="seed-btn"
              onClick={handleSeedSetas}
              disabled={saving}
            >
              Seed Standard SETAs
            </button>
          )}
          <button
            className="add-btn"
            onClick={() => handleOpenModal()}
            disabled={saving}
          >
            + Add SETA
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search SETAs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="seta-stats">
        <div className="stat-card">
          <span className="stat-value">{setas.length}</span>
          <span className="stat-label">Total SETAs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{filteredSetas.length}</span>
          <span className="stat-label">Showing</span>
        </div>
      </div>

      <div className="seta-list">
        {filteredSetas.length === 0 ? (
          <div className="empty-state">
            <p>No SETAs found</p>
            {setas.length === 0 && (
              <button
                className="seed-btn-large"
                onClick={handleSeedSetas}
                disabled={saving}
              >
                Seed Standard SETAs
              </button>
            )}
          </div>
        ) : (
          <table className="seta-table">
            <thead>
              <tr>
                <th>Short Name</th>
                <th>Full Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSetas.map(seta => (
                <tr key={seta.id}>
                  <td className="seta-short-name">{seta.shortName}</td>
                  <td className="seta-full-name">{seta.fullName}</td>
                  <td className="seta-actions">
                    <button
                      className="edit-btn-small"
                      onClick={() => handleOpenModal(seta)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn-small"
                      onClick={() => handleDelete(seta.id, seta.shortName)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSeta ? 'Edit SETA' : 'Add New SETA'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="shortName">Short Name *</label>
                <input
                  type="text"
                  id="shortName"
                  name="shortName"
                  value={formData.shortName}
                  onChange={handleInputChange}
                  placeholder="e.g., BANKSETA"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="e.g., Banking Sector Education and Training Authority"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingSeta ? 'Update SETA' : 'Add SETA')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SetaManagement
