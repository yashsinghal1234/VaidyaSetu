const ITEMS = [
  { id:'dashboard', label:'Dashboard',     Icon:GridIcon },
  { id:'patient',   label:'Patient Search',Icon:UserIcon },
  { id:'tools',     label:'Tool Runner',   Icon:ZapIcon },
  { id:'health',    label:'Server Health', Icon:HeartIcon },
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <nav className="sidebar">
      <div className="nav-label">Menu</div>
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-btn ${activePage === id ? 'on' : ''}`}
          onClick={() => setActivePage(id)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}

      <div className="sidebar-footer">
        <strong>FHIRBridge MCP v1.0</strong>
        FHIR R4 · 14 Tools
        <br />Hugging Face-powered reasoning
      </div>
    </nav>
  )
}

function GridIcon({size=18}){return(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>)}
function UserIcon({size=18}){return(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)}
function ZapIcon({size=18}){return(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)}
function HeartIcon({size=18}){return(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>)}
