import { useState } from 'react'
import ResultPanel from '../components/ResultPanel'

const TOOLS = [
  { key:'get_patient',           name:'Get Patient',           icon:'👤', cat:'fhir', desc:'Fetch full patient demographics and identifiers', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'search_patients',       name:'Search Patients',       icon:'🔍', cat:'fhir', desc:'Search by name, date of birth, gender, or identifier', fields:[{k:'family',l:'Last Name',p:'Smith'},{k:'given',l:'First Name',p:'John'},{k:'birthdate',l:'Date of Birth',p:'YYYY-MM-DD',t:'date'},{k:'gender',l:'Gender',t:'select',opts:['','male','female','other','unknown']},{k:'identifier',l:'MRN / Identifier',p:'MRN-12345'},{k:'_count',l:'Max Results',p:'20',t:'number'}] },
  { key:'get_observations',      name:'Observations',          icon:'📊', cat:'fhir', desc:'Labs, vitals, and surveys — filterable by LOINC, category, date', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',t:'select',opts:['','laboratory','vital-signs','social-history']},{k:'code',l:'LOINC Code',p:'e.g. 2339-0'},{k:'date_from',l:'From Date',t:'date'},{k:'date_to',l:'To Date',t:'date'},{k:'_count',l:'Max Results',p:'50',t:'number'}] },
  { key:'get_conditions',        name:'Conditions',            icon:'🏥', cat:'fhir', desc:'Diagnoses with ICD-10 codes, clinical status, onset dates', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'clinical_status',l:'Clinical Status',t:'select',opts:['','active','inactive','resolved']},{k:'category',l:'Category',t:'select',opts:['','problem-list-item','encounter-diagnosis']}] },
  { key:'get_medication_list',   name:'Medication List',       icon:'💊', cat:'fhir', desc:'Current medications with dosages and prescriber information', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'status',l:'Status',t:'select',opts:['','active','stopped','completed']}] },
  { key:'get_encounters',        name:'Encounters',            icon:'🗓', cat:'fhir', desc:'Visit history with encounter type, dates, and locations', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'date_from',l:'From Date',t:'date'},{k:'_count',l:'Max Results',p:'10',t:'number'}] },
  { key:'get_allergies',         name:'Allergies',             icon:'⚠️', cat:'fhir', desc:'Allergy list with substances, reactions, severity, criticality', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'clinical_status',l:'Clinical Status',t:'select',opts:['','active','inactive','resolved']}] },
  { key:'get_diagnostic_reports',name:'Diagnostic Reports',    icon:'🔬', cat:'fhir', desc:'Lab panels and radiology reports with conclusions', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',p:'LAB | RAD'},{k:'_count',l:'Max Results',p:'10',t:'number'}] },
  { key:'summarize_patient',     name:'AI Patient Summary',    icon:'🤖', cat:'ai',   desc:'Claude-powered clinical briefing — chart overview before appointment', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'analyze_observations',  name:'Analyze Observations',  icon:'📈', cat:'ai',   desc:'AI lab trend analysis and anomaly detection', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',t:'select',opts:['','laboratory','vital-signs']},{k:'date_from',l:'From Date',t:'date'}] },
  { key:'check_medication_safety',name:'Medication Safety',    icon:'🛡', cat:'ai',   desc:'Drug interactions, allergy conflicts, and care gap review', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'get_triage_flags',      name:'Triage Flags',          icon:'🚨', cat:'ai',   desc:'ER/ICU rapid triage assessment — critical alerts in under 30s', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'match_clinical_trial',  name:'Clinical Trial Match',  icon:'🧬', cat:'ai',   desc:'Assess patient eligibility against trial inclusion/exclusion criteria', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'trial_criteria',l:'Trial Criteria',req:true,t:'textarea',p:'e.g. Inclusion: Age 18-65, Type 2 Diabetes...\nExclusion: Renal failure...'}] },
  { key:'identify_care_gaps',    name:'Care Gaps',             icon:'📋', cat:'ai',   desc:'Preventive care gaps and guideline-based recommendations', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
]

export default function ToolRunner({ apiBase, selectedPatientId, addToHistory }) {
  const [tool, setTool] = useState(TOOLS[0])
  const [filter, setFilter] = useState('all')
  const [args, setArgs] = useState({ patient_id: selectedPatientId || '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function pick(t) { setTool(t); setResult(null); setError(null); setArgs({ patient_id: selectedPatientId || '' }) }
  function setArg(k, v) { setArgs(p => ({ ...p, [k]: v })) }

  async function run(e) {
    e.preventDefault(); setLoading(true); setError(null); setResult(null)
    const clean = Object.fromEntries(Object.entries(args).filter(([,v])=>v!==''&&v!=null))
    try {
      const res = await fetch(`${apiBase}/mcp/tools/call`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: tool.key, arguments: clean }),
      })
      const data = await res.json()
      setResult(data)
      addToHistory({ tool: tool.key, patientId: clean.patient_id, status: data.status, elapsed: data.meta?.elapsed_ms ?? 0 })
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const visible = filter === 'all' ? TOOLS : TOOLS.filter(t => t.cat === filter)

  return (
    <div className="fade" style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:16,alignItems:'start'}}>

      {/* Left sidebar — tool list */}
      <div>
        <div className="ftabs">
          {[['all','All'],['fhir','FHIR Data'],['ai','AI Tools']].map(([v,l])=>(
            <button key={v} className={`ftab ${filter===v?'on':''}`} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="tool-list">
          {visible.map(t => (
            <button key={t.key} className={`tool-btn ${tool.key===t.key?'on':''}`} onClick={()=>pick(t)}>
              <div className="tool-icon">{t.icon}</div>
              <div className="tool-info">
                <div className="tool-name">{t.name}</div>
                <div className="tool-desc-short">{t.desc}</div>
              </div>
              <span className={`badge ${t.cat==='ai'?'b-purple':'b-blue'}`} style={{fontSize:'.6rem'}}>
                {t.cat==='ai'?'AI':'FHIR'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right — form + result */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>

        {/* Tool form card */}
        <div className="card">
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:'1.4rem'}}>{tool.icon}</span>
              <div>
                <div style={{fontSize:'.95rem',fontWeight:700,color:'var(--text-1)'}}>{tool.name}</div>
                <div style={{fontSize:'.75rem',color:'var(--text-3)',marginTop:1}}>{tool.desc}</div>
              </div>
            </div>
            <span className={`badge ${tool.cat==='ai'?'b-purple':'b-blue'}`}>
              {tool.cat==='ai'?'Claude AI':'FHIR Data'}
            </span>
          </div>

          <div style={{height:1,background:'var(--border)',margin:'14px 0'}} />

          <form onSubmit={run} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns: tool.fields.length > 2 ? '1fr 1fr' : '1fr',gap:12}}>
              {tool.fields.map(f => (
                <div key={f.k} className="form-group" style={f.t==='textarea'?{gridColumn:'1/-1'}:{}}>
                  <label className="form-label">{f.l}{f.req && <span className="req"> *</span>}</label>
                  {f.t==='select' ? (
                    <select className="form-select" value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)}>
                      {f.opts.map(o=><option key={o} value={o}>{o||'— Any —'}</option>)}
                    </select>
                  ) : f.t==='textarea' ? (
                    <textarea className="form-textarea" placeholder={f.p} value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)} required={f.req} rows={4} />
                  ) : (
                    <input type={f.t||'text'} className="form-input" placeholder={f.p} value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)} required={f.req} />
                  )}
                </div>
              ))}
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><div className="spin" style={{width:14,height:14}}/>Running…</> : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Run Tool
                </>}
              </button>
            </div>
          </form>
        </div>

        <ResultPanel result={result} error={error} loading={loading} toolName={tool.key} />
      </div>
    </div>
  )
}
