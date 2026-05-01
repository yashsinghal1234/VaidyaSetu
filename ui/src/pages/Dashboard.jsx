export default function Dashboard({ healthData, callHistory, setActivePage }) {
  const stats = [
    { label:'FHIR Version', value: healthData?.fhir_version ?? '—', sub:'Protocol' },
    { label:'Latency',      value: healthData?.latency_ms ? `${healthData.latency_ms} ms` : '—', sub:'Last ping' },
    { label:'Tools',        value:'14', sub:'Registered' },
    { label:'Auth Mode',    value: healthData?.auth_mode ?? '—', sub:'FHIR auth' },
  ]

  const quickActions = [
    { label:'Search Patients',   desc:'Find by name, DOB, or identifier', color:'blue',   icon:'🔍', page:'patient' },
    { label:'AI Chart Summary',  desc:'Claude clinical briefing in seconds', color:'purple', icon:'🤖', page:'tools' },
    { label:'ER Triage Flags',   desc:'Critical alerts in under 30 seconds', color:'red',    icon:'🚨', page:'tools' },
    { label:'Medication Safety', desc:'Drug interactions & care gaps',       color:'green',  icon:'💊', page:'tools' },
  ]

  const TOOL_REF = [
    { icon:'👤', name:'Get Patient',          desc:'Demographics by ID',          color:'blue' },
    { icon:'🔍', name:'Search Patients',      desc:'Name, DOB, gender, MRN',      color:'blue' },
    { icon:'📊', name:'Observations',         desc:'Labs, vitals, surveys',        color:'blue' },
    { icon:'🏥', name:'Conditions',           desc:'Diagnoses with ICD-10',        color:'blue' },
    { icon:'💊', name:'Medication List',      desc:'Dosages & prescribers',        color:'blue' },
    { icon:'🗓', name:'Encounters',           desc:'Visit & encounter history',    color:'blue' },
    { icon:'⚠️', name:'Allergies',           desc:'Substances & reactions',       color:'blue' },
    { icon:'🔬', name:'Diagnostic Reports',   desc:'Lab panels & radiology',       color:'blue' },
    { icon:'🤖', name:'Summarize Patient',    desc:'AI clinical briefing',         color:'purple' },
    { icon:'📈', name:'Analyze Observations', desc:'AI trend & anomaly detection', color:'purple' },
    { icon:'🛡', name:'Medication Safety',    desc:'Drug interaction review',      color:'purple' },
    { icon:'🚨', name:'Triage Flags',         desc:'ER/ICU rapid assessment',      color:'purple' },
    { icon:'🧬', name:'Clinical Trial Match', desc:'Eligibility screening',        color:'purple' },
    { icon:'📋', name:'Care Gaps',            desc:'Preventive care gaps',         color:'purple' },
  ]

  return (
    <div className="fade">
      {/* Page header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.45rem',fontWeight:800,color:'var(--text-1)',marginBottom:4}}>Clinical Dashboard</h1>
        <p style={{color:'var(--text-3)',fontSize:'.85rem'}}>
          AI-powered FHIR patient intelligence — real-time EHR data with Claude reasoning
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:20}}>
        {stats.map(s => (
          <div key={s.label} className="stat">
            <div className="stat-label">{s.label}</div>
            <div className="stat-val">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Quick Actions
        </div>
        <div className="qa-grid">
          {quickActions.map(a => (
            <button key={a.label} className="qa-card" onClick={() => setActivePage(a.page)}>
              <div className={`qa-icon ${a.color}`}>{a.icon}</div>
              <div>
                <div className="qa-title">{a.label}</div>
                <div className="qa-desc">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent calls */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-row">
          <div className="card-title" style={{marginBottom:0}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Recent Tool Calls
          </div>
          {callHistory.length > 0 && (
            <span className="badge b-ghost">{callHistory.length} calls</span>
          )}
        </div>
        {callHistory.length === 0 ? (
          <div className="empty" style={{padding:'28px 20px'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <h3>No calls yet</h3>
            <p>Run a tool from the Tool Runner to see activity here.</p>
          </div>
        ) : (
          <div className="hist-list">
            {callHistory.slice(0,8).map((h,i) => (
              <div key={i} className="hist-item">
                <div className="hist-tool">{h.tool}</div>
                {h.patientId && <div className="hist-pid">Patient {h.patientId}</div>}
                <span className={`badge ${h.status==='success'?'b-green':'b-red'}`}>{h.status}</span>
                <div className="hist-ms">{h.elapsed}ms</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tool reference */}
      <div className="card">
        <div className="card-row" style={{marginBottom:14}}>
          <div className="card-title" style={{marginBottom:0}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            All 14 Tools
          </div>
          <div style={{display:'flex',gap:6}}>
            <span className="badge b-blue">8 FHIR</span>
            <span className="badge b-purple">6 AI</span>
          </div>
        </div>
        <div className="ref-grid">
          {TOOL_REF.map(t => (
            <div key={t.name} className="ref-item">
              <div className={`ref-icon ${t.color==='purple'?'':''}` } style={{background: t.color==='purple'?'var(--purple-dim)':'var(--blue-dim)'}}>{t.icon}</div>
              <div>
                <div className="ref-name">{t.name}</div>
                <div className="ref-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
