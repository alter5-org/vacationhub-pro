import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/Login.tsx'
import MagicLinkVerifyPage from './pages/MagicLinkVerify.tsx'
import DashboardPage from './pages/Dashboard'
import CalendarPage from './pages/Calendar'
import RequestsPage from './pages/Requests'
import ApprovalsPage from './pages/Approvals'
import TeamPage from './pages/Team'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings.tsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  if (location.pathname === '/' && params.get('login') === '1' && params.get('token') && params.get('email')) {
    const verifyQuery = `?email=${encodeURIComponent(params.get('email'))}&token=${encodeURIComponent(params.get('token'))}`
    return <Navigate to={`/auth/verify${verifyQuery}`} replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<MagicLinkVerifyPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route
          path="/approvals"
          element={
            <AdminRoute>
              <ApprovalsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/team"
          element={
            <AdminRoute>
              <TeamPage />
            </AdminRoute>
          }
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
