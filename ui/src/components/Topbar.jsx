export default function Topbar({ healthStatus, healthData, onLogoClick, isDarkMode, onToggleDarkMode }) {
  return (
    <header className="topbar">
      <div className="topbar-logo" onClick={onLogoClick} style={{cursor: 'pointer'}}>
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
        
        <button 
          onClick={onToggleDarkMode} 
          className="btn-ghost" 
          style={{padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.2s'}}
          title={isDarkMode ? "Light Mode" : "Dark Mode"}
        >
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>
    </header>
  )
}
