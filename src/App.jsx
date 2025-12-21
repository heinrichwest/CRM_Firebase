import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from './config/firebase'
import { createOrUpdateUser } from './services/userService'
import { TenantProvider } from './context/TenantContext'
import Dashboard from './pages/Dashboard'
import EditFinancial from './pages/EditFinancial'
import Clients from './pages/Clients'
import NewClient from './pages/NewClient'
import ClientDetail from './pages/ClientDetail'
import EditClient from './pages/EditClient'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import SalesPipeline from './pages/SalesPipeline'
import FollowUpTasks from './pages/FollowUpTasks'
import Reports from './pages/Reports'
import RoleManagement from './pages/RoleManagement'
import UserManagement from './pages/UserManagement'
import FinancialYearEnd from './pages/FinancialYearEnd'
import SkillsPartners from './pages/SkillsPartners'
import ProductManagement from './pages/ProductManagement'
import BudgetManagement from './pages/BudgetManagement'
import PipelineStatusManagement from './pages/PipelineStatusManagement'
import LegalDocumentManagement from './pages/LegalDocumentManagement'
import TenantManagement from './pages/TenantManagement'
import TenantUsers from './pages/TenantUsers'
import SeedData from './pages/SeedData'
import CalculationTemplateManagement from './pages/CalculationTemplateManagement'
import TenantProductManagement from './pages/TenantProductManagement'
import SalesTeamManagement from './pages/SalesTeamManagement'
import AccountantUpload from './pages/AccountantUpload'
import FinancialDashboard from './pages/FinancialDashboard'
import TenantFixAdmin from './pages/TenantFixAdmin'
import SetaManagement from './pages/SetaManagement'
import JobTitlesManagement from './pages/JobTitlesManagement'
import Login from './pages/Login'
import Layout from './components/Layout'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuth(app)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Create or update user document in Firestore
        try {
          await createOrUpdateUser(currentUser)
        } catch (error) {
          console.error('Failed to create/update user document:', error)
          // Continue even if Firestore update fails
        }
      }
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <TenantProvider>
      <Router future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/edit-financial" element={<EditFinancial />} />
            <Route path="financial-editor/:clientId" element={<EditFinancial />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<NewClient />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/:id/edit" element={<EditClient />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<Profile />} />
            <Route path="sales-pipeline" element={<SalesPipeline />} />
            <Route path="follow-up-tasks" element={<FollowUpTasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="role-management" element={<RoleManagement />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="financial-year-end" element={<FinancialYearEnd />} />
            <Route path="skills-partners" element={<SkillsPartners />} />
            <Route path="product-management" element={<ProductManagement />} />
            <Route path="budget-management" element={<BudgetManagement />} />
            <Route path="pipeline-statuses" element={<PipelineStatusManagement />} />
            <Route path="legal-documents" element={<LegalDocumentManagement />} />
            <Route path="seta-management" element={<SetaManagement />} />
            <Route path="job-titles-management" element={<JobTitlesManagement />} />
            <Route path="tenants" element={<TenantManagement />} />
            <Route path="tenants/:tenantId/users" element={<TenantUsers />} />
            <Route path="seed-data" element={<SeedData />} />
            <Route path="calculation-templates" element={<CalculationTemplateManagement />} />
            <Route path="enabled-products" element={<TenantProductManagement />} />
            <Route path="sales-team" element={<SalesTeamManagement />} />
            <Route path="accountant-upload" element={<AccountantUpload />} />
            <Route path="financial-dashboard" element={<FinancialDashboard />} />
            <Route path="tenant-fix" element={<TenantFixAdmin />} />
          </Route>
        </Routes>
      </Router>
    </TenantProvider>
  )
}

export default App

