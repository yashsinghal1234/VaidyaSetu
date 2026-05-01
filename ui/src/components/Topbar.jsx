export default function Topbar({ healthStatus, healthData }) {
  return (
    <header className="topbar">
      <div className="topbar-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        FHIRBridge
        <span className="logo-badge">MCP</span>
      </div>

      <div className="topbar-right">
        {healthData?.fhir_server && (
          <span className="topbar-url">
            {healthData.fhir_server.replace('https://','').split('/')[0]}
          </span>
        )}
        <div className="conn-pill">
          <div className={`conn-dot ${healthStatus === 'healthy' ? 'ok' : healthStatus === 'unhealthy' ? 'err' : ''}`} />
          {healthStatus === 'checking'  && 'Connecting…'}
          {healthStatus === 'healthy'   && 'FHIR Connected'}
          {healthStatus === 'unhealthy' && 'FHIR Offline'}
        </div>
      </div>
    </header>
  )
}
