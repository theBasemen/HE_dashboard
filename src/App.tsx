import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import LoginPage from './pages/LoginPage'
import FinancePage from './pages/FinancePage'
import SeoDashboard from './pages/SeoDashboard'
import LLMPage from './pages/LLMPage'
import ExpenseExplorer from './pages/ExpenseExplorer'
import TimeTrackingPage from './pages/TimeTrackingPage'
import YearWheelPage from './pages/YearWheelPage'
import AdminUsersPage from './pages/AdminUsersPage'
import ToplisterPage from './pages/ToplisterPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<FinancePage />} />
            <Route path="/seo" element={<SeoDashboard />} />
            <Route path="/llm" element={<LLMPage />} />
            <Route path="/expenses" element={<ExpenseExplorer />} />
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/year-wheel" element={<YearWheelPage />} />
            <Route path="/toplister" element={<ToplisterPage />} />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

