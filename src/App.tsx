import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import FinancePage from './pages/FinancePage'
import SeoDashboard from './pages/SeoDashboard'
import LLMPage from './pages/LLMPage'
import ExpenseExplorer from './pages/ExpenseExplorer'
import TimeTrackingPage from './pages/TimeTrackingPage'

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<FinancePage />} />
          <Route path="/seo" element={<SeoDashboard />} />
          <Route path="/llm" element={<LLMPage />} />
          <Route path="/expenses" element={<ExpenseExplorer />} />
          <Route path="/time-tracking" element={<TimeTrackingPage />} />
        </Routes>
      </DashboardLayout>
    </Router>
  )
}

export default App

