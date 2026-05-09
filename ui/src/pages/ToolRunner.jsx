import { useState, useRef } from 'react'
import { User, Search, BarChart2, Hospital, Pill, Calendar, AlertTriangle, Microscope, Bot, TrendingUp, ShieldAlert, Siren, Dna, ClipboardCheck } from 'lucide-react'
import ResultPanel from '../components/ResultPanel'

const TOOLS = [
  { key:'get_patient',           name:'Get Patient',           icon:<User size={20}/>, cat:'fhir', desc:'Fetch full patient demographics and identifiers', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'search_patients',       name:'Search Patients',       icon:<Search size={20}/>, cat:'fhir', desc:'Search by name, date of birth, gender, or identifier', fields:[{k:'family',l:'Last Name',p:'Smith'},{k:'given',l:'First Name',p:'John'},{k:'birthdate',l:'Date of Birth',p:'YYYY-MM-DD',t:'date'},{k:'gender',l:'Gender',t:'select',opts:['','male','female','other','unknown']},{k:'identifier',l:'MRN / Identifier',p:'MRN-12345'},{k:'_count',l:'Max Results',p:'20',t:'number'}] },
  { key:'get_observations',      name:'Observations',          icon:<BarChart2 size={20}/>, cat:'fhir', desc:'Labs, vitals, and surveys — filterable by LOINC, category, date', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',t:'select',opts:['','laboratory','vital-signs','social-history']},{k:'code',l:'LOINC Code',p:'e.g. 2339-0'},{k:'date_from',l:'From Date',t:'date'},{k:'date_to',l:'To Date',t:'date'},{k:'_count',l:'Max Results',p:'50',t:'number'}] },
  { key:'get_conditions',        name:'Conditions',            icon:<Hospital size={20}/>, cat:'fhir', desc:'Diagnoses with ICD-10 codes, clinical status, onset dates', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'clinical_status',l:'Clinical Status',t:'select',opts:['','active','inactive','resolved']},{k:'category',l:'Category',t:'select',opts:['','problem-list-item','encounter-diagnosis']}] },
  { key:'get_medication_list',   name:'Medication List',       icon:<Pill size={20}/>, cat:'fhir', desc:'Current medications with dosages and prescriber information', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'status',l:'Status',t:'select',opts:['','active','stopped','completed']}] },
  { key:'get_encounters',        name:'Encounters',            icon:<Calendar size={20}/>, cat:'fhir', desc:'Visit history with encounter type, dates, and locations', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'date_from',l:'From Date',t:'date'},{k:'_count',l:'Max Results',p:'10',t:'number'}] },
  { key:'get_allergies',         name:'Allergies',             icon:<AlertTriangle size={20}/>, cat:'fhir', desc:'Allergy list with substances, reactions, severity, criticality', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'clinical_status',l:'Clinical Status',t:'select',opts:['','active','inactive','resolved']}] },
  { key:'get_diagnostic_reports',name:'Diagnostic Reports',    icon:<Microscope size={20}/>, cat:'fhir', desc:'Lab panels and radiology reports with conclusions', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',p:'LAB | RAD'},{k:'_count',l:'Max Results',p:'10',t:'number'}] },
  { key:'summarize_patient',     name:'AI Patient Summary',    icon:<Bot size={20}/>, cat:'ai',   desc:'AI-powered clinical briefing — chart overview before appointment', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'analyze_observations',  name:'Analyze Observations',  icon:<TrendingUp size={20}/>, cat:'ai',   desc:'AI lab trend analysis and anomaly detection', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'category',l:'Category',t:'select',opts:['','laboratory','vital-signs']},{k:'date_from',l:'From Date',t:'date'}] },
  { key:'check_medication_safety',name:'Medication Safety',    icon:<ShieldAlert size={20}/>, cat:'ai',   desc:'Drug interactions, allergy conflicts, and care gap review', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'get_triage_flags',      name:'Triage Flags',          icon:<Siren size={20}/>, cat:'ai',   desc:'ER/ICU rapid triage assessment — critical alerts in under 30s', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
  { key:'match_clinical_trial',  name:'Clinical Trial Match',  icon:<Dna size={20}/>, cat:'ai',   desc:'Assess patient eligibility against trial inclusion/exclusion criteria', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'},{k:'trial_criteria',l:'Trial Criteria',req:true,t:'textarea',p:'e.g. Inclusion: Age 18-65, Type 2 Diabetes...\nExclusion: Renal failure...'}] },
  { key:'identify_care_gaps',    name:'Care Gaps',             icon:<ClipboardCheck size={20}/>, cat:'ai',   desc:'Preventive care gaps and guideline-based recommendations', fields:[{k:'patient_id',l:'Patient ID',req:true,p:'e.g. 592473'}] },
]

export default function ToolRunner({ apiBase, selectedPatientId, callHistory, addToHistory }) {
  const [tool, setTool] = useState(TOOLS[0])
  const [filter, setFilter] = useState('all') // 'all', 'fhir', 'ai', 'history'
  const [searchQuery, setSearchQuery] = useState('')
  const [args, setArgs] = useState({ patient_id: selectedPatientId || '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const abortCtrl = useRef(null)

  function pick(t) { 
    setTool(t); 
    setResult(null); 
    setError(null); 
    setArgs({ patient_id: selectedPatientId || '' });
    if(window.innerWidth < 768) setSidebarOpen(false); // auto-close on mobile
  }

  function pickHistory(entry) {
    const t = TOOLS.find(x => x.key === entry.tool) || TOOLS[0];
    setTool(t);
    setResult(null);
    setError(null);
    setArgs({ ...entry.args });
    if(window.innerWidth < 768) setSidebarOpen(false);
  }

  function setArg(k, v) { setArgs(p => ({ ...p, [k]: v })) }

  function cancelRequest() {
    if (abortCtrl.current) {
      abortCtrl.current.abort();
    }
  }

  async function run(e) {
    e.preventDefault(); 
    
    cancelRequest();
    abortCtrl.current = new AbortController();

    setLoading(true); setError(null); setResult(null)
    
    // Feature 1: Inject global patient ID if the tool requires it and we have one
    const runArgs = { ...args };
    if (selectedPatientId && tool.fields.some(f => f.k === 'patient_id')) {
      runArgs.patient_id = selectedPatientId;
    }

    const clean = Object.fromEntries(Object.entries(runArgs).filter(([,v])=>v!==''&&v!=null))
    try {
      const res = await fetch(`${apiBase}/mcp/tools/call`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: tool.key, arguments: clean }),
        signal: abortCtrl.current.signal
      })
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server Error ${res.status}: The FHIR endpoint might be timing out or returning an invalid response.`);
      }

      const data = await res.json()
      setResult(data)
      addToHistory({ tool: tool.key, patientId: clean.patient_id, status: data.status, elapsed: data.meta?.elapsed_ms ?? 0, args: clean })
    } catch(e) { 
      if (e.name === 'AbortError') {
        setError("Request was cancelled.");
      } else {
        setError(e.message || "A network error occurred. The backend server might be unreachable or hanging.");
      }
    } finally { 
      setLoading(false);
      abortCtrl.current = null;
    }
  }

  const visible = TOOLS.filter(t => {
    const matchCat = (filter === 'all' || filter === 'history') || t.cat === filter;
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  })

  return (
    <div className="fade" style={{display:'flex', gap:24, alignItems:'start', height: '100%', position: 'relative'}}>

      {/* Feature 4: Collapsible Left sidebar */}
      <div className="card" style={{
        padding: sidebarOpen ? '20px 16px' : '0', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16, 
        height: 'calc(100vh - 40px)',
        width: sidebarOpen ? '320px' : '0px',
        opacity: sidebarOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        border: sidebarOpen ? undefined : 'none'
      }}>
        
        {/* Search & Filters */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <div className="search-wrap" style={{width: '100%'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              placeholder="Search tools..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="ftabs" style={{width: '100%', display: 'flex'}}>
            {[['all','All'],['fhir','FHIR'],['ai','AI'],['history','History']].map(([v,l])=>(
              <button key={v} className={`ftab ${filter===v?'on':''}`} style={{flex: 1, textAlign: 'center', padding: '6px 8px'}} onClick={()=>setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Scrollable List or History */}
        <div className="tool-list" style={{overflowY: 'auto', paddingRight: 4, flex: 1}}>
          {filter === 'history' ? (
            // Feature 3: History View
            callHistory.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px 0', color: 'var(--text-4)', fontSize: '.85rem'}}>No recent tools run.</div>
            ) : (
              callHistory.map((h, i) => {
                const t = TOOLS.find(x => x.key === h.tool) || TOOLS[0];
                return (
                  <button key={i} className="tool-btn" onClick={()=>pickHistory(h)} style={{marginBottom: 8}}>
                    <div className="tool-icon" style={{fontSize: '1rem'}}>{t.icon}</div>
                    <div className="tool-info">
                      <div className="tool-name">{t.name}</div>
                      <div className="tool-desc-short" style={{fontFamily: 'monospace', fontSize: '.7rem'}}>
                        {h.patientId ? `PT: ${h.patientId}` : 'No Patient'} • {h.elapsed}ms
                      </div>
                    </div>
                  </button>
                )
              })
            )
          ) : visible.length === 0 ? (
            <div style={{textAlign: 'center', padding: '20px 0', color: 'var(--text-4)', fontSize: '.85rem'}}>No tools found.</div>
          ) : visible.map(t => (
            <button key={t.key} className={`tool-btn ${tool.key===t.key?'on':''}`} onClick={()=>pick(t)}>
              <div className="tool-icon">{t.icon}</div>
              <div className="tool-info">
                <div className="tool-name">{t.name}</div>
                <div className="tool-desc-short">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — form + result */}
      <div style={{
        display:'flex',
        flexDirection:'column',
        gap:20, 
        height: 'calc(100vh - 50px)', 
        overflowY: 'auto', 
        paddingRight: 8,
        flex: 1,
        transition: 'all 0.3s ease'
      }}>

        {/* Feature 4: Toggle Sidebar Button */}
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost"
            style={{padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)'}}
            title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
          >
            {sidebarOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            )}
          </button>
          
          {/* Feature 1: Global Patient Banner */}
          {selectedPatientId && (
            <div className="alert info" style={{padding: '8px 14px', flex: 1, display: 'flex', alignItems: 'center', margin: 0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 6}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Active Patient: <strong>{selectedPatientId}</strong> — Patient ID will be auto-filled for this tool.
            </div>
          )}
        </div>

        {/* Tool form card */}
        <div className="card">
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div className="qa-icon" style={{background: tool.cat === 'ai' ? 'var(--purple-dim)' : 'var(--blue-dim)', color: tool.cat === 'ai' ? 'var(--purple)' : 'var(--blue)', fontSize: '1.5rem'}}>
                {tool.icon}
              </div>
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:800,color:'var(--text-1)'}}>{tool.name}</div>
                <div style={{fontSize:'.85rem',color:'var(--text-3)',marginTop:2}}>{tool.desc}</div>
              </div>
            </div>
            <span className={`badge ${tool.cat==='ai'?'b-purple':'b-blue'}`} style={{padding: '6px 12px'}}>
              {tool.cat==='ai'?'Hugging Face AI Engine':'FHIR Data Endpoint'}
            </span>
          </div>

          <div style={{height:1,background:'var(--border)',margin:'20px 0'}} />

          <form onSubmit={run} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',gap:16}}>
              {tool.fields.map(f => {
                // Feature 1: Hide patient_id if global patient is selected
                if (f.k === 'patient_id' && selectedPatientId) return null;

                return (
                  <div key={f.k} className="form-group" style={f.t==='textarea'?{gridColumn:'1/-1'}:{}}>
                    <label className="form-label">{f.l}{f.req && <span className="req"> *</span>}</label>
                    {f.t==='select' ? (
                      <select className="form-select" value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)}>
                        {f.opts.map(o=><option key={o} value={o}>{o||'— Any —'}</option>)}
                      </select>
                    ) : f.t==='textarea' ? (
                      <textarea className="form-textarea" placeholder={f.p} value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)} required={f.req && !selectedPatientId} rows={4} />
                    ) : (
                      <input type={f.t||'text'} className="form-input" placeholder={f.p} value={args[f.k]||''} onChange={e=>setArg(f.k,e.target.value)} required={f.req && !selectedPatientId} />
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 12}}>
              {loading && (
                <button type="button" className="btn btn-ghost" onClick={cancelRequest} style={{padding: '10px 24px', color: 'var(--red)'}}>
                  Cancel Request
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{padding: '10px 24px'}}>
                {loading ? <><div className="spin" style={{width:16,height:16}}/>Processing Request…</> : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Execute Tool
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
