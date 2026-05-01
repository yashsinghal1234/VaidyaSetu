import { useState } from 'react'

export default function HealthStatus({ apiBase, healthData, checkHealth }) {
  const [loading, setLoading] = useState(false)
  async function refresh() { setLoading(true); await checkHealth(); setLoading(false) }
  const ok = healthData?.status === 'healthy'

  return (
    <div className="fade">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.45rem',fontWeight:800,marginBottom:4}}>Server Health</h1>
          <p style={{color:'var(--text-3)',fontSize:'.85rem'}}>FHIR server connectivity and configuration</p>
        </div>
        <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
          {loading ? <div className="spin" style={{width:14,height:14}}/> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          )}
          Refresh
        </button>
      </div>

      {/* Status hero */}
      <div className="card" style={{marginBottom:16,borderColor:healthData?(ok?'rgba(52,211,153,.25)':'rgba(248,113,113,.25)'):'var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{
            width:52,height:52,borderRadius:'50%',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',
            background: !healthData?'var(--bg-hover)': ok?'var(--green-dim)':'var(--red-dim)',
          }}>
            {!healthData ? '⏳' : ok ? '✅' : '❌'}
          </div>
          <div>
            <div style={{fontSize:'1rem',fontWeight:700,marginBottom:3}}>
              {!healthData ? 'Connecting to FHIR server…' : ok ? 'FHIR Server Online' : 'FHIR Server Unavailable'}
            </div>
            <div style={{fontSize:'.78rem',color:'var(--text-3)',fontFamily:'JetBrains Mono,monospace'}}>
              {healthData?.fhir_server || `${apiBase}/health`}
            </div>
          </div>
          {healthData && (
            <span className={`badge ${ok?'b-green':'b-red'}`} style={{marginLeft:'auto'}}>{healthData.status}</span>
          )}
        </div>
      </div>

      {healthData && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div className="card">
            <div className="card-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Connection Details
            </div>
            {[
              ['FHIR Version', healthData.fhir_version],
              ['Latency',      healthData.latency_ms && `${healthData.latency_ms} ms`],
              ['Auth Mode',    healthData.auth_mode],
              ['Claude Model', healthData.claude_model],
              ['Tools',        healthData.tools_registered && `${healthData.tools_registered} registered`],
              ['Error',        healthData.error],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} className="hrow">
                <span className="hkey">{k}</span>
                <span className="hval" style={{color:k==='Error'?'var(--red)':undefined}}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              API Endpoints
            </div>
            {[
              ['Root',       '/', 'GET'],
              ['Health',     '/health', 'GET'],
              ['Tools List', '/mcp/tools/list', 'GET'],
              ['Tools Call', '/mcp/tools/call', 'POST'],
              ['API Docs',   '/docs', 'GET'],
            ].map(([l,p,m])=>(
              <div key={p} className="hrow">
                <span className="hkey">{l}</span>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {m==='POST' && <span className="badge b-amber" style={{fontSize:'.58rem'}}>{m}</span>}
                  <a href={`${apiBase}${p}`} target="_blank" rel="noreferrer" className="hval" style={{color:'var(--blue)',textDecoration:'none'}}>{p}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth reference */}
      <div className="card">
        <div className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Authentication Reference
        </div>
        <div className="dtable-wrap">
          <table className="dtable">
            <thead><tr><th>Mode</th><th>Setting</th><th>Use Case</th></tr></thead>
            <tbody>
              <tr>
                <td><span className="badge b-ghost">none</span></td>
                <td><code style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.77rem',color:'var(--blue)'}}>FHIR_AUTH_TYPE=none</code></td>
                <td style={{color:'var(--text-3)'}}>HAPI sandbox, open FHIR servers</td>
              </tr>
              <tr>
                <td><span className="badge b-amber">bearer</span></td>
                <td><code style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.77rem',color:'var(--blue)'}}>FHIR_AUTH_TYPE=bearer</code></td>
                <td style={{color:'var(--text-3)'}}>Dev/test servers with static token</td>
              </tr>
              <tr>
                <td><span className="badge b-purple">smart</span></td>
                <td><code style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.77rem',color:'var(--blue)'}}>FHIR_AUTH_TYPE=smart</code></td>
                <td style={{color:'var(--text-3)'}}>Epic, Cerner — SMART on FHIR OAuth2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
