import { useState, useEffect } from 'react'
import { getMessages, createMessage, markMessageAsRead } from '../services/firestoreService'
import { getUsersByTenant } from '../services/userService'
import { useTenant } from '../context/TenantContext'
import './Messages.css'

const Messages = () => {
  const [messages, setMessages] = useState([])
  const [filteredMessages, setFilteredMessages] = useState([])
  const [activeTab, setActiveTab] = useState('inbox')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const { getTenantId, isSystemAdmin, currentUser } = useTenant()
  const tenantId = getTenantId()

  const [newMessage, setNewMessage] = useState({
    subject: '',
    recipients: [],
    body: ''
  })

  useEffect(() => {
    loadMessages()
    loadUsers()
  }, [activeTab, tenantId])

  useEffect(() => {
    filterMessages()
  }, [messages, searchTerm, activeTab])

  const loadUsers = async () => {
    try {
      // Filter users by tenant to only show users from the same tenant
      const filterTenantId = isSystemAdmin ? null : tenantId
      const usersData = await getUsersByTenant(filterTenantId)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const currentUserEmail = currentUser?.email
      const messagesData = await getMessages()

      // Filter messages based on tab
      let filtered = messagesData
      if (activeTab === 'inbox') {
        filtered = messagesData.filter(m =>
          m.recipients?.includes(currentUserEmail) || m.to === currentUserEmail
        )
      } else if (activeTab === 'sent') {
        filtered = messagesData.filter(m => m.from === currentUserEmail)
      }

      setMessages(filtered)
      setLoading(false)
    } catch (error) {
      console.error('Error loading messages:', error)
      setLoading(false)
    }
  }

  const filterMessages = () => {
    let filtered = [...messages]

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.to?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredMessages(filtered)
  }

  const handleCreateMessage = async (e) => {
    e.preventDefault()
    if (newMessage.recipients.length === 0) {
      alert('Please select at least one recipient')
      return
    }
    try {
      const messageData = {
        ...newMessage,
        from: currentUser?.email || 'Unknown',
        fromName: currentUser?.displayName || currentUser?.email || 'Unknown',
        status: 'unread',
        createdAt: new Date().toISOString()
      }

      await createMessage(messageData)
      setShowCreateForm(false)
      setNewMessage({
        subject: '',
        recipients: [],
        body: ''
      })
      loadMessages()
    } catch (error) {
      console.error('Error creating message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleRecipientToggle = (userEmail) => {
    setNewMessage(prev => ({
      ...prev,
      recipients: prev.recipients.includes(userEmail)
        ? prev.recipients.filter(r => r !== userEmail)
        : [...prev.recipients, userEmail]
    }))
  }

  const handleOpenMessage = async (message) => {
    setSelectedMessage(message)
    setShowReplyForm(false)
    setReplyText('')

    // Mark as read if it's in inbox and unread
    if (activeTab === 'inbox' && message.status === 'unread') {
      try {
        await markMessageAsRead(message.id)
        // Update local state
        setMessages(prev =>
          prev.map(m => m.id === message.id ? { ...m, status: 'read' } : m)
        )
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return

    try {
      const replyData = {
        subject: `Re: ${selectedMessage.subject}`,
        recipients: [selectedMessage.from],
        body: replyText,
        from: currentUser?.email || 'Unknown',
        fromName: currentUser?.displayName || currentUser?.email || 'Unknown',
        status: 'unread',
        inReplyTo: selectedMessage.id,
        createdAt: new Date().toISOString()
      }

      await createMessage(replyData)
      setShowReplyForm(false)
      setReplyText('')
      setSelectedMessage(null)
      loadMessages()
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to send reply. Please try again.')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-ZA')
  }

  if (loading) {
    return (
      <div className="messages">
        <h1>Messages</h1>
        <div className="messages-content">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="messages">
      <div className="messages-header">
        <h1>Messages</h1>
        {activeTab !== 'chatroom' && (
          <button
            className="create-message-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            + New Message
          </button>
        )}
      </div>

      {/* Create Message Form */}
      {showCreateForm && (
        <div className="create-message-form">
          <div className="form-header">
            <h2>New Message</h2>
            <button
              className="close-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCreateMessage}>
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                required
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Enter message subject"
              />
            </div>

            <div className="form-group">
              <label>Recipients * (select one or more)</label>
              <div className="recipients-list">
                {users.map(user => (
                  <label key={user.id} className={`recipient-checkbox ${newMessage.recipients.includes(user.email) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={newMessage.recipients.includes(user.email)}
                      onChange={() => handleRecipientToggle(user.email)}
                    />
                    <span className="recipient-name">{user.displayName || user.email}</span>
                    <span className="recipient-role">{user.role}</span>
                  </label>
                ))}
              </div>
              {newMessage.recipients.length > 0 && (
                <div className="selected-recipients">
                  Selected: {newMessage.recipients.length} recipient(s)
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                rows="6"
                required
                value={newMessage.body}
                onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                placeholder="Type your message..."
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowCreateForm(false)} className="discard-btn">
                Cancel
              </button>
              <button type="submit" className="send-btn">
                Send Message
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="messages-tabs">
        <button
          className={activeTab === 'inbox' ? 'active' : ''}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox
        </button>
        <button
          className={activeTab === 'sent' ? 'active' : ''}
          onClick={() => setActiveTab('sent')}
        >
          Sent
        </button>
      </div>

      {/* Search */}
      <div className="messages-filters">
        <input
          type="text"
          placeholder="Search messages..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Messages List */}
      <div className="messages-content">
        {filteredMessages.length > 0 ? (
          <div className="messages-list">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`message-item ${message.status === 'unread' && activeTab === 'inbox' ? 'unread' : ''}`}
                onClick={() => handleOpenMessage(message)}
                style={{ cursor: 'pointer' }}
              >
                <div className="message-header">
                  <div className="message-subject">
                    {message.status === 'unread' && activeTab === 'inbox' && <span className="unread-dot"></span>}
                    {message.subject || 'No Subject'}
                  </div>
                  <span className="message-date">{formatDate(message.createdAt)}</span>
                </div>
                <div className="message-meta">
                  {activeTab === 'inbox' ? (
                    <span className="message-from">From: {message.fromName || message.from}</span>
                  ) : (
                    <span className="message-to">
                      To: {message.recipients?.join(', ') || message.to || 'N/A'}
                    </span>
                  )}
                </div>
                <div className="message-preview">
                  {message.body?.substring(0, 150)}{message.body?.length > 150 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-messages">
            <p>No messages found.</p>
          </div>
        )}
      </div>

      {/* Message View Modal */}
      {selectedMessage && (
        <div className="message-modal-backdrop" onClick={() => setSelectedMessage(null)}>
          <div className="message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="message-modal-header">
              <h2>{selectedMessage.subject || 'No Subject'}</h2>
              <button className="close-btn" onClick={() => setSelectedMessage(null)}>×</button>
            </div>
            <div className="message-modal-meta">
              <p><strong>From:</strong> {selectedMessage.fromName || selectedMessage.from}</p>
              <p><strong>To:</strong> {selectedMessage.recipients?.join(', ') || selectedMessage.to || 'N/A'}</p>
              <p><strong>Date:</strong> {formatDate(selectedMessage.createdAt)}</p>
            </div>
            <div className="message-modal-body">
              <p>{selectedMessage.body}</p>
            </div>
            <div className="message-modal-actions">
              {activeTab === 'inbox' && !showReplyForm && (
                <button className="reply-btn" onClick={() => setShowReplyForm(true)}>
                  Reply
                </button>
              )}
              <button className="close-message-btn" onClick={() => setSelectedMessage(null)}>
                Close
              </button>
            </div>

            {showReplyForm && (
              <div className="reply-form">
                <h3>Reply</h3>
                <textarea
                  rows="4"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                />
                <div className="reply-actions">
                  <button className="cancel-btn" onClick={() => setShowReplyForm(false)}>
                    Cancel
                  </button>
                  <button className="send-btn" onClick={handleReply} disabled={!replyText.trim()}>
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages
