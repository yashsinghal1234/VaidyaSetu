import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ResultPanel({ result, error, loading, toolName }) {
  const [view, setView] = useState('formatted')

  if (loading) return (
    <div className="result-panel">
      <div className="loader">
        <div className="spin" />
        Running <strong style={{color:'var(--blue)'}}>{toolName}</strong>…
      </div>
    </div>
  )

  if (error) return (
    <div className="result-panel">
      <div className="result-body">
        <div className="alert err">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div><div style={{fontWeight:700,marginBottom:3}}>Error</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.77rem'}}>{error}</div></div>
        </div>
      </div>
    </div>
  )

  if (!result) return (
    <div className="result-panel">
      <div className="empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <h3>Results will appear here</h3>
        <p>Fill in the parameters above and click Run Tool</p>
      </div>
    </div>
  )

  const { tool, status, data, meta } = result
  const aiKey = ['summary','analysis','safety_report','triage_assessment','eligibility_assessment','care_gaps'].find(k => typeof data?.[k] === 'string')
  const listKey = ['conditions','medications','observations','allergies','encounters','reports'].find(k => Array.isArray(data?.[k]))

  return (
    <div className="result-panel fade">
      <div className="result-header">
        <span className="result-tool">{tool}</span>
        <span className={`badge ${status==='success'?'b-green':'b-red'}`}>{status}</span>
        {data?.count != null && <span className="badge b-blue">{data.count} records</span>}
        {data?.data_sources && Object.entries(data.data_sources).map(([k,v])=>(
          <span key={k} className="badge b-ghost">{k}: {v}</span>
        ))}
        {meta?.elapsed_ms && <span className="result-ms" style={{marginLeft:'auto'}}>{meta.elapsed_ms}ms</span>}
        <div className="view-toggle" style={{marginLeft: meta?.elapsed_ms ? '0' : 'auto'}}>
          <button className={`view-btn ${view==='formatted'?'on':''}`} onClick={()=>setView('formatted')}>Formatted</button>
          <button className={`view-btn ${view==='raw'?'on':''}`} onClick={()=>setView('raw')}>JSON</button>
        </div>
      </div>

      <div className="result-body">
        {view === 'raw' ? (
          <div className="json">{JSON.stringify(result, null, 2)}</div>
        ) : (
          <>
            {/* Patient demographics */}
            {data?.patient && <PatientCard patient={data.patient} />}

            {/* Patient name for AI tools */}
            {data?.patient_name && !data.patient && (
              <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'1.05rem',fontWeight:700}}>{data.patient_name}</span>
                <span className="badge b-ghost">ID: {data.patient_id}</span>
              </div>
            )}

            {/* AI output */}
            {aiKey && (
              <div className="md">
                <ReactMarkdown>{data[aiKey]}</ReactMarkdown>
              </div>
            )}

            {/* Tabular FHIR data */}
            {listKey && <DataTable listKey={listKey} items={data[listKey]} />}

            {/* Patient search results */}
            {data?.patients && Array.isArray(data.patients) && <PatientsList patients={data.patients} />}
          </>
        )}
      </div>
    </div>
  )
}

function PatientCard({ patient }) {
  const fields = [
    ['Name', patient.name], ['Gender', patient.gender], ['Date of Birth', patient.birthDate],
    ['Patient ID', patient.id], ['MRN', patient.mrn], ['Phone', patient.phone],
    ['Status', patient.active === true ? 'Active' : patient.active === false ? 'Inactive' : null],
  ].filter(([,v]) => v)
  return (
    <div className="pt-card">
      <div className="pt-card-label">Patient Demographics</div>
      <div className="pt-grid">
        {fields.map(([l,v]) => (
          <div key={l} className="pt-field">
            <label>{l}</label><span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DataTable({ listKey, items }) {
  if (!items.length) return <div style={{color:'var(--text-3)',fontSize:'.82rem',padding:'16px 0'}}>No {listKey} found.</div>
  const keys = Object.keys(items[0]).filter(k => !['id','resourceType'].includes(k)).slice(0,6)
  return (
    <div>
      <div className="data-title">{listKey} &nbsp;·&nbsp; {items.length} records</div>
      <div className="dtable-wrap">
        <table className="dtable">
          <thead><tr>{keys.map(k=><th key={k}>{k}</th>)}</tr></thead>
          <tbody>
            {items.map((row,i)=>(
              <tr key={row.id||i}>
                {keys.map(k=><td key={k}>{renderCell(row[k])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PatientsList({ patients }) {
  return (
    <div>
      <div className="data-title">Patients &nbsp;·&nbsp; {patients.length} results</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {patients.map(p=>(
          <div key={p.id} style={{background:'var(--bg-base)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:12,display:'flex',gap:20,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontWeight:600,fontSize:'.88rem'}}>{p.name||'—'}</span>
            <span className="badge b-ghost">{p.gender||'—'}</span>
            <span style={{fontSize:'.78rem',color:'var(--text-3)'}}>DOB: {p.birthDate||'—'}</span>
            <span style={{fontSize:'.75rem',color:'var(--text-3)',fontFamily:'JetBrains Mono,monospace',marginLeft:'auto'}}>ID: {p.id}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderCell(val) {
  if (val == null) return <span style={{color:'var(--text-4)'}}>—</span>
  if (typeof val === 'boolean') return <span className={`badge ${val?'b-green':'b-red'}`}>{val?'Yes':'No'}</span>
  if (typeof val === 'object') return <span style={{fontSize:'.72rem',color:'var(--text-3)'}}>{JSON.stringify(val).slice(0,60)}</span>
  const s = String(val)
  return s.length > 80 ? <span title={s}>{s.slice(0,80)}…</span> : s
}
