import { useState, useEffect } from 'react'
import { getJobTitles, createJobTitle, updateJobTitle, deleteJobTitle, seedJobTitles } from '../services/jobTitlesService'
import { useTenant } from '../context/TenantContext'
import './JobTitlesManagement.css'

const JobTitlesManagement = () => {
  const [jobTitles, setJobTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingJobTitle, setEditingJobTitle] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    title: ''
  })
  const { isSystemAdmin } = useTenant()

  useEffect(() => {
    loadJobTitles()
  }, [])

  const loadJobTitles = async () => {
    try {
      setLoading(true)
      const jobTitlesData = await getJobTitles()
      setJobTitles(jobTitlesData || [])
    } catch (error) {
      console.error('Error loading job titles:', error)
      setJobTitles([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (jobTitle = null) => {
    if (jobTitle) {
      setEditingJobTitle(jobTitle)
      setFormData({
        title: jobTitle.title
      })
    } else {
      setEditingJobTitle(null)
      setFormData({
        title: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingJobTitle(null)
    setFormData({
      title: ''
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

    if (!formData.title.trim()) {
      alert('Please fill in the job title')
      return
    }

    setSaving(true)
    try {
      if (editingJobTitle) {
        await updateJobTitle(editingJobTitle.id, formData)
      } else {
        await createJobTitle(formData)
      }
      await loadJobTitles()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving job title:', error)
      alert('Failed to save job title')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (jobTitleId, jobTitleName) => {
    if (!window.confirm(`Are you sure you want to delete "${jobTitleName}"? This action cannot be undone.`)) {
      return
    }

    setSaving(true)
    try {
      await deleteJobTitle(jobTitleId)
      await loadJobTitles()
    } catch (error) {
      console.error('Error deleting job title:', error)
      alert('Failed to delete job title')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedJobTitles = async () => {
    if (!window.confirm('This will add all standard job titles to the database. Continue?')) {
      return
    }

    setSaving(true)
    try {
      await seedJobTitles()
      await loadJobTitles()
      alert('Job titles seeded successfully')
    } catch (error) {
      console.error('Error seeding job titles:', error)
      alert('Failed to seed job titles')
    } finally {
      setSaving(false)
    }
  }

  const filteredJobTitles = jobTitles.filter(jobTitle =>
    jobTitle.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isSystemAdmin) {
    return (
      <div className="job-titles-management">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="job-titles-management">
        <h1>Job Titles Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="job-titles-management">
      <div className="page-header">
        <h1>Job Titles Management</h1>
        <div className="header-actions">
          {jobTitles.length === 0 && (
            <button
              className="seed-btn"
              onClick={handleSeedJobTitles}
              disabled={saving}
            >
              Seed Standard Job Titles
            </button>
          )}
          <button
            className="add-btn"
            onClick={() => handleOpenModal()}
            disabled={saving}
          >
            + Add Job Title
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search job titles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="job-title-stats">
        <div className="stat-card">
          <span className="stat-value">{jobTitles.length}</span>
          <span className="stat-label">Total Job Titles</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{filteredJobTitles.length}</span>
          <span className="stat-label">Showing</span>
        </div>
      </div>

      <div className="job-title-list">
        {filteredJobTitles.length === 0 ? (
          <div className="empty-state">
            <p>No job titles found</p>
            {jobTitles.length === 0 && (
              <button
                className="seed-btn-large"
                onClick={handleSeedJobTitles}
                disabled={saving}
              >
                Seed Standard Job Titles
              </button>
            )}
          </div>
        ) : (
          <table className="job-title-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobTitles.map(jobTitle => (
                <tr key={jobTitle.id}>
                  <td className="job-title-name">{jobTitle.title}</td>
                  <td className="job-title-actions">
                    <button
                      className="edit-btn-small"
                      onClick={() => handleOpenModal(jobTitle)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn-small"
                      onClick={() => handleDelete(jobTitle.id, jobTitle.title)}
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
              <h2>{editingJobTitle ? 'Edit Job Title' : 'Add New Job Title'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Job Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., HR Manager"
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
                  {saving ? 'Saving...' : (editingJobTitle ? 'Update Job Title' : 'Add Job Title')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobTitlesManagement
