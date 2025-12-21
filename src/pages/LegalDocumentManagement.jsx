import { useState, useEffect } from 'react'
import { getLegalDocumentTypes, saveLegalDocumentTypes } from '../services/firestoreService'
import './LegalDocumentManagement.css'

const LegalDocumentManagement = () => {
  const [documentTypes, setDocumentTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [editForm, setEditForm] = useState({ label: '', required: false })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDocument, setNewDocument] = useState({ label: '', required: false })

  useEffect(() => {
    loadDocumentTypes()
  }, [])

  const loadDocumentTypes = async () => {
    try {
      const data = await getLegalDocumentTypes()
      setDocumentTypes(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading legal document types:', error)
      setLoading(false)
    }
  }

  const generateKey = (label) => {
    return label.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  }

  const handleAddDocument = async () => {
    if (!newDocument.label.trim()) {
      alert('Please enter a document name')
      return
    }

    const key = generateKey(newDocument.label)
    if (documentTypes.some(d => d.key === key)) {
      alert('A document with this name already exists')
      return
    }

    const maxOrder = Math.max(...documentTypes.map(d => d.order || 0), 0)
    const documentToAdd = {
      key,
      label: newDocument.label.trim(),
      required: newDocument.required,
      order: maxOrder + 1
    }

    const updatedDocuments = [...documentTypes, documentToAdd]
    await saveDocuments(updatedDocuments)
    setNewDocument({ label: '', required: false })
    setShowAddForm(false)
  }

  const handleEditDocument = (doc) => {
    setEditingKey(doc.key)
    setEditForm({
      label: doc.label,
      required: doc.required || false
    })
  }

  const handleSaveEdit = async (docKey) => {
    if (!editForm.label.trim()) {
      alert('Please enter a document name')
      return
    }

    const updatedDocuments = documentTypes.map(d => {
      if (d.key === docKey) {
        return {
          ...d,
          label: editForm.label.trim(),
          required: editForm.required
        }
      }
      return d
    })

    await saveDocuments(updatedDocuments)
    setEditingKey(null)
  }

  const handleDeleteDocument = async (docKey) => {
    const doc = documentTypes.find(d => d.key === docKey)
    if (!confirm(`Are you sure you want to delete "${doc.label}"? This will remove it from the checklist for all clients.`)) {
      return
    }

    const updatedDocuments = documentTypes.filter(d => d.key !== docKey)
    await saveDocuments(updatedDocuments)
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return

    const updatedDocuments = [...documentTypes]
    const temp = updatedDocuments[index].order
    updatedDocuments[index].order = updatedDocuments[index - 1].order
    updatedDocuments[index - 1].order = temp

    // Swap positions in array
    const tempDoc = updatedDocuments[index]
    updatedDocuments[index] = updatedDocuments[index - 1]
    updatedDocuments[index - 1] = tempDoc

    await saveDocuments(updatedDocuments)
  }

  const handleMoveDown = async (index) => {
    if (index === documentTypes.length - 1) return

    const updatedDocuments = [...documentTypes]
    const temp = updatedDocuments[index].order
    updatedDocuments[index].order = updatedDocuments[index + 1].order
    updatedDocuments[index + 1].order = temp

    // Swap positions in array
    const tempDoc = updatedDocuments[index]
    updatedDocuments[index] = updatedDocuments[index + 1]
    updatedDocuments[index + 1] = tempDoc

    await saveDocuments(updatedDocuments)
  }

  const saveDocuments = async (updatedDocuments) => {
    setSaving(true)
    try {
      await saveLegalDocumentTypes(updatedDocuments)
      setDocumentTypes(updatedDocuments.sort((a, b) => (a.order || 0) - (b.order || 0)))
    } catch (error) {
      console.error('Error saving document types:', error)
      alert('Failed to save changes. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="legal-document-management">
        <h1>Legal Document Checklist Management</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="legal-document-management">
      <div className="page-header">
        <h1>Legal Document Checklist</h1>
        <p className="page-description">
          Configure the legal documents that salespeople must check off for each client.
          Required documents will be highlighted in the client's Legal tab.
        </p>
      </div>

      <div className="document-list-container">
        <div className="document-list-header">
          <h2>Document Types</h2>
          <button
            className="add-document-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            + Add New Document
          </button>
        </div>

        {showAddForm && (
          <div className="add-document-form">
            <div className="form-row">
              <div className="form-group">
                <label>Document Name *</label>
                <input
                  type="text"
                  value={newDocument.label}
                  onChange={(e) => setNewDocument({ ...newDocument, label: e.target.value })}
                  placeholder="e.g., NDA Signed"
                />
              </div>
            </div>
            <div className="form-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newDocument.required}
                  onChange={(e) => setNewDocument({ ...newDocument, required: e.target.checked })}
                />
                Required document (must be checked before client can be marked as complete)
              </label>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="save-btn" onClick={handleAddDocument} disabled={saving}>
                {saving ? 'Adding...' : 'Add Document'}
              </button>
            </div>
          </div>
        )}

        <div className="document-list">
          {documentTypes.map((doc, index) => (
            <div
              key={doc.key}
              className={`document-item ${doc.required ? 'required' : ''}`}
            >
              {editingKey === doc.key ? (
                <div className="edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        placeholder="Document name"
                      />
                    </div>
                  </div>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.required}
                        onChange={(e) => setEditForm({ ...editForm, required: e.target.checked })}
                      />
                      Required document
                    </label>
                  </div>
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => setEditingKey(null)}>Cancel</button>
                    <button className="save-btn" onClick={() => handleSaveEdit(doc.key)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="document-info">
                    <div className="document-order">{index + 1}</div>
                    <div className="document-icon">
                      {doc.required ? '!' : ''}
                    </div>
                    <div className="document-name">
                      {doc.label}
                      {doc.required && <span className="required-tag">Required</span>}
                    </div>
                    <div className="document-key">{doc.key}</div>
                  </div>
                  <div className="document-actions">
                    <button
                      className="order-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || saving}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      className="order-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === documentTypes.length - 1 || saving}
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => handleEditDocument(doc)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteDocument(doc.key)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {documentTypes.length === 0 && (
          <div className="empty-state">
            <p>No document types configured yet. Add your first document to get started.</p>
          </div>
        )}

        <div className="info-section">
          <h3>Information</h3>
          <ul>
            <li>These document types will appear as a checklist in each client's Legal Documents tab.</li>
            <li>Salespeople can check off documents as they receive them from the client.</li>
            <li><strong>Required</strong> documents will be highlighted to indicate they must be obtained.</li>
            <li>The order shown here is the order they will appear in the checklist.</li>
            <li>Deleting a document type will not remove existing check marks from clients.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LegalDocumentManagement
