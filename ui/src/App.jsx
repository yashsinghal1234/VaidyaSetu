import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import PatientSearch from './pages/PatientSearch'
import ToolRunner from './pages/ToolRunner'
import HealthStatus from './pages/HealthStatus'
import LandingPage from './landing/LandingPage'
import './index.css'

const API_BASE = 'http://localhost:8000'

export default function App() {
  const [page, setPage] = useState('landing')
  const [healthData, setHealthData] = useState(null)
  const [healthStatus, setHealthStatus] = useState('checking')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [callHistory, setCallHistory] = useState([])
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode')
    return saved ? JSON.parse(saved) : true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  useEffect(() => {
    checkHealth()
    const t = setInterval(checkHealth, 30000)
    return () => clearInterval(t)
  }, [])

  async function checkHealth() {
    try {
      const r = await fetch(`${API_BASE}/health`)
      const d = await r.json()
      setHealthData(d)
      setHealthStatus(d.status === 'healthy' ? 'healthy' : 'unhealthy')
    } catch {
      setHealthStatus('unhealthy'); setHealthData(null)
    }
  }

  function addToHistory(entry) {
    setCallHistory(prev => [entry, ...prev].slice(0, 50))
  }

  const props = { apiBase: API_BASE, selectedPatientId, setSelectedPatientId, setActivePage: setPage, callHistory, addToHistory, healthData }

  if (page === 'landing') {
    return <LandingPage onEnterApp={() => setPage('dashboard')} />
  }

  return (
    <div className="shell">
      <Topbar 
        healthStatus={healthStatus} 
        healthData={healthData} 
        onLogoClick={() => setPage('landing')} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
      <Sidebar activePage={page} setActivePage={setPage} />
      <main className="main">
        {page === 'dashboard' && <Dashboard {...props} />}
        {page === 'patient'   && <PatientSearch {...props} />}
        {page === 'tools'     && <ToolRunner {...props} />}
        {page === 'health'    && <HealthStatus {...props} checkHealth={checkHealth} />}
      </main>
    </div>
  )
}
