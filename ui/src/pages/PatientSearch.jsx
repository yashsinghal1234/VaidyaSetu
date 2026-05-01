import { useState } from 'react'
import ResultPanel from '../components/ResultPanel'

export default function PatientSearch({ apiBase, setSelectedPatientId, setActivePage, addToHistory }) {
  const [mode, setMode] = useState('id')
  const [form, setForm] = useState({ patient_id:'', family:'', given:'', birthdate:'', gender:'', identifier:'' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null); setResult(null)
    const toolName = mode === 'id' ? 'get_patient' : 'search_patients'
    const args = mode === 'id'
      ? { patient_id: form.patient_id.trim() }
      : Object.fromEntries(Object.entries({ family:form.family, given:form.given, birthdate:form.birthdate, gender:form.gender, identifier:form.identifier }).filter(([,v])=>v?.trim()))
    try {
      const res = await fetch(`${apiBase}/mcp/tools/call`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: toolName, arguments: args }),
      })
      const data = await res.json()
      setResult(data)
      const pid = data.data?.patient?.id || data.data?.patients?.[0]?.id || form.patient_id
      if (data.status === 'success' && pid) setSelectedPatientId(pid)
      addToHistory({ tool: toolName, patientId: pid, status: data.status, elapsed: data.meta?.elapsed_ms ?? 0 })
    } catch(e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  function openInTools() {
    const pid = result?.data?.patient?.id || result?.data?.patients?.[0]?.id
    if (pid) { setSelectedPatientId(pid); setActivePage('tools') }
  }

  return (
    <div className="fade">
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.45rem',fontWeight:800,marginBottom:4}}>Patient Search</h1>
        <p style={{color:'var(--text-3)',fontSize:'.85rem'}}>Look up patients by ID or search by demographic information</p>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="tabs">
          <button className={`tab ${mode==='id'?'on':''}`} onClick={()=>setMode('id')}>By Patient ID</button>
          <button className={`tab ${mode==='search'?'on':''}`} onClick={()=>setMode('search')}>Advanced Search</button>
        </div>

        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
          {mode === 'id' ? (
            <div className="form-group">
              <label className="form-label">Patient ID <span className="req">*</span></label>
              <div className="search-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="e.g. 592473" value={form.patient_id} onChange={e=>set('patient_id',e.target.value)} required />
              </div>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[
                {k:'family',l:'Last Name',p:'Smith'},
                {k:'given', l:'First Name',p:'John'},
                {k:'birthdate',l:'Date of Birth',p:'YYYY-MM-DD',t:'date'},
                {k:'identifier',l:'MRN / Identifier',p:'MRN-12345'},
              ].map(f=>(
                <div key={f.k} className="form-group">
                  <label className="form-label">{f.l}</label>
                  <input type={f.t||'text'} className="form-input" placeholder={f.p} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                  <option value="">Any</option>
                  {['male','female','other','unknown'].map(g=><option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:10}}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spin" style={{width:14,height:14}}/>Searching…</> : <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
              </>}
            </button>
            {result?.status === 'success' && (
              <button type="button" className="btn btn-ghost" onClick={openInTools}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Run AI Tools on this Patient
              </button>
            )}
          </div>
        </form>
      </div>

      <ResultPanel result={result} error={error} loading={loading} toolName={mode==='id'?'get_patient':'search_patients'} />
    </div>
  )
}
