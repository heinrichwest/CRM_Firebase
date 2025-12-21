import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { getAuth, signOut } from 'firebase/auth'
import { auth, db } from '../config/firebase'
import { collection, query, where, onSnapshot, limit, addDoc, serverTimestamp, or } from 'firebase/firestore'
import { getUserData, getUsersByTenant } from '../services/userService'
import { getRole } from '../services/roleService'
import { useTenant } from '../context/TenantContext'
import './Layout.css'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSystemAdmin, currentTenant, getTenantId, isSalesHead } = useTenant()
  const tenantId = getTenantId()
  const isGroupSalesManager = isSalesHead ? isSalesHead() : false
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatView, setChatView] = useState('general') // 'general' or 'users' or a specific odId
  const [chatUsers, setChatUsers] = useState([])
  const [selectedChatUser, setSelectedChatUser] = useState(null)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [lastSeenChatTime, setLastSeenChatTime] = useState(null)
  const adminDropdownRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    loadUserProfile()
    // Load last seen chat time from localStorage
    const savedTime = localStorage.getItem('lastSeenChatTime')
    if (savedTime) {
      setLastSeenChatTime(parseInt(savedTime, 10))
    }
  }, [])

  // Subscribe to unread messages count
  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('recipients', 'array-contains', currentUser.email),
      where('status', '==', 'unread')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessageCount(snapshot.size)
    }, (error) => {
      console.error('Error listening to unread messages:', error)
    })

    return () => unsubscribe()
  }, [])

  // Subscribe to unread chat messages count (general chatroom + direct messages)
  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    // Get stored last seen time
    const storedTime = localStorage.getItem('lastSeenChatTime')
    const lastSeen = storedTime ? parseInt(storedTime, 10) : 0

    // Subscribe to general chatroom messages
    const chatroomRef = collection(db, 'chatroom')
    const chatroomQuery = query(chatroomRef, limit(100))

    // Subscribe to direct messages for this user
    const directRef = collection(db, 'directMessages')
    const directQuery = query(
      directRef,
      where('receiverId', '==', currentUser.uid),
      limit(100)
    )

    let chatroomUnread = 0
    let directUnread = 0

    const updateTotalUnread = () => {
      setUnreadChatCount(chatroomUnread + directUnread)
    }

    const unsubChatroom = onSnapshot(chatroomQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Count messages newer than lastSeen and not from current user
      chatroomUnread = msgs.filter(msg => {
        const msgTime = msg.createdAt?.toMillis?.() || msg.createdAt?.seconds * 1000 || 0
        return msgTime > lastSeen && msg.userId !== currentUser.uid
      }).length
      updateTotalUnread()
    }, (error) => {
      console.error('Error listening to chatroom for unread count:', error)
    })

    const unsubDirect = onSnapshot(directQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Count messages newer than lastSeen
      directUnread = msgs.filter(msg => {
        const msgTime = msg.createdAt?.toMillis?.() || msg.createdAt?.seconds * 1000 || 0
        return msgTime > lastSeen
      }).length
      updateTotalUnread()
    }, (error) => {
      console.error('Error listening to direct messages for unread count:', error)
    })

    return () => {
      unsubChatroom()
      unsubDirect()
    }
  }, [lastSeenChatTime])

  // Load users for direct messaging (filtered by tenant)
  useEffect(() => {
    const loadChatUsers = async () => {
      try {
        // Filter users by tenant to only show users from the same tenant
        const filterTenantId = isSystemAdmin ? null : tenantId
        const users = await getUsersByTenant(filterTenantId)
        // Filter out current user
        const otherUsers = users.filter(u => u.id !== auth.currentUser?.uid)
        setChatUsers(otherUsers)
      } catch (error) {
        console.error('Error loading chat users:', error)
      }
    }
    if (chatOpen) {
      loadChatUsers()
    }
  }, [chatOpen, tenantId, isSystemAdmin])

  // Subscribe to chat messages (general or direct)
  useEffect(() => {
    if (!chatOpen) return

    const currentUserId = auth.currentUser?.uid
    if (!currentUserId) return

    let chatRef
    let q

    if (chatView === 'general') {
      // General chatroom
      chatRef = collection(db, 'chatroom')
      q = query(chatRef, limit(100))
    } else if (selectedChatUser) {
      // Direct message - use a consistent chat ID based on both user IDs
      chatRef = collection(db, 'directMessages')
      // Query for messages between these two users
      q = query(
        chatRef,
        where('participants', 'array-contains', currentUserId),
        limit(100)
      )
    } else {
      return
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // For direct messages, filter to only show messages with selected user
      if (chatView !== 'general' && selectedChatUser) {
        chatData = chatData.filter(msg =>
          msg.participants?.includes(selectedChatUser.id)
        )
      }

      // Sort client-side by createdAt
      chatData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
        return timeA - timeB
      })
      setChatMessages(chatData)
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }, (error) => {
      console.error('Error listening to chat messages:', error)
    })

    return () => unsubscribe()
  }, [chatOpen, chatView, selectedChatUser])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false)
      }
    }

    if (adminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [adminDropdownOpen])

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        const userData = await getUserData(currentUser.uid)
        if (userData) {
          setUserProfile(userData)
          const role = await getRole(userData.role || 'salesperson')
          if (role) {
            setUserRole(role)
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Don't block rendering if profile loading fails
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const sendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const messageText = chatInput.trim()
    setChatInput('') // Clear input immediately for better UX

    try {
      const currentUser = auth.currentUser

      if (chatView === 'general') {
        // Send to general chatroom
        await addDoc(collection(db, 'chatroom'), {
          text: messageText,
          userId: currentUser?.uid || 'anonymous',
          userName: userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Anonymous',
          userEmail: currentUser?.email || 'anonymous',
          createdAt: serverTimestamp()
        })
      } else if (selectedChatUser) {
        // Send direct message
        await addDoc(collection(db, 'directMessages'), {
          text: messageText,
          senderId: currentUser?.uid,
          senderName: userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Anonymous',
          senderEmail: currentUser?.email,
          receiverId: selectedChatUser.id,
          receiverName: selectedChatUser.displayName || selectedChatUser.email,
          participants: [currentUser?.uid, selectedChatUser.id],
          createdAt: serverTimestamp()
        })
      }
    } catch (error) {
      console.error('Error sending chat message:', error)
      setChatInput(messageText) // Restore input if send failed
      alert('Failed to send message. Please try again.')
    }
  }

  const selectUserForChat = (user) => {
    setSelectedChatUser(user)
    setChatView('direct')
    setChatMessages([]) // Clear messages while loading new ones
  }

  const goBackToUserList = () => {
    setSelectedChatUser(null)
    setChatView('users')
    setChatMessages([])
  }

  const formatChatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }

  const markChatAsSeen = () => {
    const now = Date.now()
    localStorage.setItem('lastSeenChatTime', now.toString())
    setLastSeenChatTime(now)
    setUnreadChatCount(0)
  }

  const handleChatToggle = () => {
    if (!chatOpen) {
      // Opening chat - mark as seen
      markChatAsSeen()
    }
    setChatOpen(!chatOpen)
  }

  const isActive = (path) => location.pathname === path
  const can = (permissionId) =>
    !userRole || userRole.permissions?.includes(permissionId)

  return (
    <div className="layout">
      <header className="top-header">
        <div className="header-content">
          <h1 className="brand-title">Speccon CRM</h1>
          
          <nav className="top-nav">
            {can('view_dashboard') && userRole?.id !== 'accountant' && (
              <Link
                to="/dashboard"
                className={isActive('/dashboard') ? 'active' : ''}
              >
                Dashboard
              </Link>
            )}
            {can('view_dashboard') && (
              <Link
                to="/financial-dashboard"
                className={isActive('/financial-dashboard') ? 'active' : ''}
              >
                Financials
              </Link>
            )}
            {can('view_clients') && (
              <Link 
                to="/clients" 
                className={isActive('/clients') ? 'active' : ''}
              >
                Clients
              </Link>
            )}
            {can('view_sales_pipeline') && (
              <Link 
                to="/sales-pipeline" 
                className={isActive('/sales-pipeline') ? 'active' : ''}
              >
                Sales Pipeline
              </Link>
            )}
            {can('view_follow_up_tasks') && userRole?.id !== 'salesperson' && (
              <Link
                to="/follow-up-tasks"
                className={isActive('/follow-up-tasks') ? 'active' : ''}
              >
                Follow-Up Tasks
              </Link>
            )}
            {can('view_messages') && (
              <Link
                to="/messages"
                className={`nav-link-with-badge ${isActive('/messages') ? 'active' : ''}`}
              >
                Messages
                {unreadMessageCount > 0 && (
                  <span className="nav-badge">{unreadMessageCount}</span>
                )}
              </Link>
            )}
            {/* Seed Data - Only for Admin role (must have BOTH manage_roles AND manage_users permissions) */}
            {userRole?.permissions?.includes('manage_roles') &&
             userRole?.permissions?.includes('manage_users') &&
             userRole?.permissions?.includes('manage_financial_year') && (
              <Link
                to="/seed-data"
                className={isActive('/seed-data') ? 'active' : ''}
              >
                Seed Data
              </Link>
            )}
            {userRole && (userRole.permissions?.includes('manage_roles') ||
                          userRole.permissions?.includes('manage_users') ||
                          userRole.permissions?.includes('manage_financial_year') ||
                          userRole.permissions?.includes('manage_clients') ||
                          isGroupSalesManager) && (
              <div 
                className={`admin-dropdown ${adminDropdownOpen ? 'open' : ''}`}
                ref={adminDropdownRef}
              >
                <button
                  className={`admin-dropdown-toggle ${isActive('/role-management') || isActive('/user-management') || isActive('/financial-year-end') || isActive('/skills-partners') || isActive('/skills-partner-commissions') || isActive('/product-management') || isActive('/budget-management') || isActive('/pipeline-statuses') || isActive('/legal-documents') || isActive('/enabled-products') || isActive('/calculation-templates') || isActive('/sales-team') || isActive('/accountant-upload') ? 'active' : ''}`}
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                >
                  Admin
                  <span className="dropdown-arrow">▼</span>
                </button>
                <div className="admin-dropdown-menu">
                  {userRole.permissions?.includes('manage_users') && (
                    <Link 
                      to="/user-management" 
                      className={isActive('/user-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Users
                    </Link>
                  )}
                  {userRole.permissions?.includes('manage_roles') && (
                    <Link 
                      to="/role-management" 
                      className={isActive('/role-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Roles
                    </Link>
                  )}
                  {userRole.permissions?.includes('manage_financial_year') && (
                    <Link
                      to="/financial-year-end"
                      className={isActive('/financial-year-end') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Financial Year
                    </Link>
                  )}
                  {(userRole.permissions?.includes('manage_users') || userRole.permissions?.includes('manage_clients')) && (
                    <Link
                      to="/skills-partners"
                      className={isActive('/skills-partners') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Skills Partners
                    </Link>
                  )}
                  {(userRole.permissions?.includes('manage_users') || userRole.permissions?.includes('manage_roles')) && (
                    <Link
                      to="/product-management"
                      className={isActive('/product-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Products
                    </Link>
                  )}
                  {(userRole.permissions?.includes('manage_users') && !userRole.permissions?.includes('manage_roles')) || isGroupSalesManager ? (
                    <Link
                      to="/budget-management"
                      className={isActive('/budget-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Budgets
                    </Link>
                  ) : null}
                  {/* Accountant Upload - For accountants/admins to upload prior year and budget data */}
                  {(userRole.permissions?.includes('manage_financial_year') ||
                    userRole.permissions?.includes('manage_users')) && (
                    <Link
                      to="/accountant-upload"
                      className={isActive('/accountant-upload') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Financial Upload
                    </Link>
                  )}
                  {userRole.permissions?.includes('manage_roles') && (
                    <Link
                      to="/pipeline-statuses"
                      className={isActive('/pipeline-statuses') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Pipeline Statuses
                    </Link>
                  )}
                  {userRole.permissions?.includes('manage_roles') && (
                    <Link
                      to="/legal-documents"
                      className={isActive('/legal-documents') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Legal Documents
                    </Link>
                  )}
                  {isSystemAdmin && (
                    <Link
                      to="/seta-management"
                      className={isActive('/seta-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      SETA Management
                    </Link>
                  )}
                  {isSystemAdmin && (
                    <Link
                      to="/job-titles-management"
                      className={isActive('/job-titles-management') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Job Titles Management
                    </Link>
                  )}
                  {/* Enabled Products - Tenant Admin only */}
                  {(userRole.permissions?.includes('manage_users') || userRole.permissions?.includes('manage_clients')) && (
                    <Link
                      to="/enabled-products"
                      className={isActive('/enabled-products') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Enabled Products
                    </Link>
                  )}
                  {/* Sales Team Management - For users with team management permissions */}
                  {(userRole.permissions?.includes('manage_all_teams') ||
                    userRole.permissions?.includes('manage_team') ||
                    userRole.permissions?.includes('manage_users')) && (
                    <Link
                      to="/sales-team"
                      className={isActive('/sales-team') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Sales Team
                    </Link>
                  )}
                  {isSystemAdmin && (
                    <Link
                      to="/tenants"
                      className={isActive('/tenants') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Tenant Management
                    </Link>
                  )}
                  {/* Calculation Templates - System Admin only */}
                  {isSystemAdmin && (
                    <Link
                      to="/calculation-templates"
                      className={isActive('/calculation-templates') ? 'active' : ''}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Calculation Templates
                    </Link>
                  )}
                </div>
              </div>
            )}
            <button
              className={`team-chat-btn ${chatOpen ? 'active' : ''}`}
              onClick={handleChatToggle}
            >
              Team Chat
              {unreadChatCount > 0 && !chatOpen && (
                <span className="chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>
              )}
            </button>
          </nav>

          <div className="header-right">
            {/* Tenant Indicator */}
            {currentTenant && (
              <div className="tenant-indicator">
                <span className="tenant-label">Tenant:</span>
                <span className="tenant-name">{currentTenant.name}</span>
              </div>
            )}
            {isSystemAdmin && !currentTenant && (
              <div className="tenant-indicator system-admin">
                <span className="tenant-name">System Admin</span>
              </div>
            )}

            {/* User Profile Section - Clickable */}
            {userProfile && (
              <Link 
                to="/profile" 
                className={`user-profile-header ${isActive('/profile') ? 'active' : ''}`}
              >
                <div className="user-avatar">
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName || 'User'} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(userProfile.displayName || userProfile.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {userRole ? (
                  <div className="user-role">{userRole.name}</div>
                ) : userProfile?.role ? (
                  <div className="user-role">{userProfile.role}</div>
                ) : (
                  <div className="user-role">User</div>
                )}
              </Link>
            )}
            
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>

      {/* Floating Team Chat Popup */}
      {chatOpen && (
        <div className="team-chat-popup">
          <div className="chat-popup-header">
            {chatView === 'direct' && selectedChatUser ? (
              <>
                <button className="chat-back-btn" onClick={goBackToUserList}>←</button>
                <h3>{selectedChatUser.displayName || selectedChatUser.email}</h3>
              </>
            ) : (
              <h3>{chatView === 'general' ? 'Team Chat' : 'Direct Messages'}</h3>
            )}
            <button className="chat-close-btn" onClick={() => setChatOpen(false)}>×</button>
          </div>

          {/* Chat Tabs */}
          {chatView !== 'direct' && (
            <div className="chat-tabs">
              <button
                className={`chat-tab ${chatView === 'general' ? 'active' : ''}`}
                onClick={() => { setChatView('general'); setSelectedChatUser(null); }}
              >
                General
              </button>
              <button
                className={`chat-tab ${chatView === 'users' ? 'active' : ''}`}
                onClick={() => setChatView('users')}
              >
                Direct Messages
              </button>
            </div>
          )}

          {/* User List View */}
          {chatView === 'users' && (
            <div className="chat-users-list">
              {chatUsers.length > 0 ? (
                chatUsers.map((user) => (
                  <div
                    key={user.id}
                    className="chat-user-item"
                    onClick={() => selectUserForChat(user)}
                  >
                    <div className="chat-user-avatar">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-user-info">
                      <span className="chat-user-name">{user.displayName || user.email}</span>
                      <span className="chat-user-role">{user.role || 'User'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-chat-users">No other users found</div>
              )}
            </div>
          )}

          {/* Messages View (General or Direct) */}
          {(chatView === 'general' || chatView === 'direct') && (
            <>
              <div className="chat-popup-messages">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg) => {
                    const isOwnMessage = chatView === 'general'
                      ? msg.userEmail === auth.currentUser?.email
                      : msg.senderId === auth.currentUser?.uid
                    const senderName = chatView === 'general' ? msg.userName : msg.senderName

                    return (
                      <div
                        key={msg.id}
                        className={`chat-popup-message ${isOwnMessage ? 'own-message' : ''}`}
                      >
                        <div className="chat-popup-message-header">
                          <span className="chat-popup-user">{senderName}</span>
                          <span className="chat-popup-time">{formatChatTime(msg.createdAt)}</span>
                        </div>
                        <div className="chat-popup-text">{msg.text}</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="no-chat-popup-messages">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form className="chat-popup-input-form" onSubmit={sendChatMessage}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-popup-input"
                />
                <button type="submit" className="chat-popup-send-btn">Send</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Layout

