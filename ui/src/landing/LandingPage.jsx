import { useEffect } from 'react';
import { Activity, Brain, Shield } from 'lucide-react';
import './landing.css';

export default function LandingPage({ onEnterApp }) {
  useEffect(() => {
    // Add any landing page specific body classes if needed
    document.body.classList.add('landing-mode');
    return () => document.body.classList.remove('landing-mode');
  }, []);

  return (
    <div className="landing-wrapper">
      <Navbar onEnterApp={onEnterApp} />
      <Hero onEnterApp={onEnterApp} />
      <Stats />
      <Features />
      <WhyChoose />
      <Testimonials />
      <FAQ />
      <Pricing onEnterApp={onEnterApp} />
      <CTA onEnterApp={onEnterApp} />
      <Footer />
    </div>
  );
}

function Navbar({ onEnterApp }) {
  return (
    <nav className="l-nav">
      <div className="l-container l-nav-inner">
        <div className="l-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          VaidyaSetu
        </div>
        <div className="l-nav-links">
          <a href="#features">Features</a>
          <a href="#why">Architecture</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="l-nav-actions">
          <button className="l-btn l-btn-primary" onClick={onEnterApp}>Launch Dashboard</button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onEnterApp }) {
  return (
    <section className="l-hero">
      <div className="l-container">
        <div className="l-hero-content">
          <div className="l-badge">FHIR R4 &amp; MCP COMPATIBLE</div>
          <h1 className="l-hero-title">Intelligent FHIR Data &amp; Clinical Reasoning</h1>
          <p className="l-hero-desc">
            Bridge your hospital's EHR with Hugging Face AI. Fetch, normalize, and reason over patient records instantly through our modern MCP dashboard.
          </p>
          <div className="l-hero-actions">
            <button className="l-btn l-btn-primary" onClick={onEnterApp}>Launch Dashboard</button>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="l-btn l-btn-ghost">View Documentation</a>
          </div>
        </div>
        <div className="l-hero-mockup">
          <div className="l-mockup-header">
            <div className="l-dots"><span></span><span></span><span></span></div>
          </div>
          <div className="l-mockup-body">
            <div className="l-m-sidebar">
              <div className="l-m-line"></div>
              <div className="l-m-line"></div>
              <div className="l-m-line"></div>
            </div>
            <div className="l-m-main">
              <div className="l-m-card">
                <div className="l-m-title">AI Patient Summary: 592473</div>
                <div className="l-m-text"></div>
                <div className="l-m-text short"></div>
              </div>
              <div className="l-m-grid">
                <div className="l-m-card">
                  <div className="l-m-title" style={{color:'var(--red)'}}>Critical Triage Flags</div>
                  <div className="l-m-text"></div>
                </div>
                <div className="l-m-card">
                  <div className="l-m-title" style={{color:'var(--green)'}}>Medication Safety</div>
                  <div className="l-m-text"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: 'FHIR R4', label: 'Native Compatibility' },
    { value: '14+', label: 'Clinical AI Tools' },
    { value: '< 30s', label: 'Triage Assessment Time' },
    { value: '100%', label: 'HIPAA Ready Architecture' }
  ];
  return (
    <section className="l-stats">
      <div className="l-container l-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="l-stat-item">
            <div className="l-stat-val">{s.value}</div>
            <div className="l-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


function Features() {
  const feats = [
    { icon: <Activity size={24}/>, title: 'Instant Data Normalization', desc: 'Converts complex, nested 500-line FHIR JSON bundles into clean, structured dictionaries for immediate clinical use.' },
    { icon: <Brain size={24}/>, title: 'Hugging Face AI Reasoning', desc: 'Synthesizes raw clinical data into actionable plain-English insights, generating comprehensive pre-consultation chart briefings.' },
    { icon: <Shield size={24}/>, title: 'Clinical Safety & Triage', desc: 'Automatically cross-references patient records for drug-drug interactions, contraindications, and rapid ER triage flags.' }
  ];
  return (
    <section id="features" className="l-features">
      <div className="l-container">
        <h2 className="l-section-title">A New Era of Medical Intelligence</h2>
        <p className="l-section-desc">VaidyaSetu leverages the Model Context Protocol (MCP) to seamlessly connect advanced Large Language Models with your hospital's secure FHIR endpoints.</p>
        <div className="l-features-grid">
          {feats.map((f, i) => (
            <div key={i} className="l-feature-card">
              <div className="l-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section id="why" className="l-why">
      <div className="l-container l-why-grid">
        <div className="l-why-image">
          <div className="l-m-card" style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', padding:40}}>
             <h3 style={{marginBottom:16}}>MCP Architecture</h3>
             <div className="l-m-line" style={{background:'var(--blue)', width:'100%'}}></div>
             <div className="l-m-line" style={{background:'var(--teal)', width:'80%'}}></div>
             <div className="l-m-line" style={{background:'var(--purple)', width:'90%'}}></div>
             <p style={{marginTop:20, fontSize:'.9rem', color:'var(--text-3)'}}>FHIRBridge acts as the secure middle-layer between your local EHR and cloud AI providers.</p>
          </div>
        </div>
        <div className="l-why-content">
          <h2 className="l-section-title" style={{textAlign:'left'}}>Why Choose VaidyaSetu?</h2>
          <p className="l-section-desc" style={{textAlign:'left', margin:'0 0 30px 0'}}>We eliminate the friction between raw EHR data and actionable clinical insights. Build population health reports or review individual charts in seconds.</p>
          <ul className="l-checklist">
            <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Connects seamlessly to Epic, Cerner, and HAPI</li>
            <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Secure SMART on FHIR Authentication</li>
            <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Reduces chart review time by up to 60%</li>
            <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Automatically detects clinical trial eligibility</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const tests = [
    { quote: "The Medication Safety checker caught a severe drug interaction that our legacy EHR alert system missed. It's an indispensable tool for our ICU.", author: "Dr. Sarah Jenkins", role: "Chief Medical Officer" },
    { quote: "I used to spend 15 minutes reviewing a complex patient's chart before an appointment. The AI summary gives me a perfect briefing in 5 seconds.", author: "Dr. Michael Chen", role: "Internal Medicine" }
  ];
  return (
    <section className="l-testimonials">
      <div className="l-container">
        <h2 className="l-section-title">Trusted by Clinicians</h2>
        <div className="l-test-grid">
          {tests.map((t, i) => (
            <div key={i} className="l-test-card">
              <p>"{t.quote}"</p>
              <div className="l-test-author">
                <div className="l-avatar">{t.author.charAt(0)}</div>
                <div>
                  <strong>{t.author}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Does it support Epic/Cerner?", a: "Yes, VaidyaSetu supports any EHR that exposes standard FHIR R4 APIs, and integrates securely using SMART on FHIR client credentials." },
    { q: "How does the AI reasoning work?", a: "We use the Model Context Protocol (MCP) to allow Hugging Face AI to invoke specific FHIR tools. The AI requests data, we fetch it from the EHR, and the AI synthesizes the final report." },
    { q: "Is patient data stored permanently?", a: "No. VaidyaSetu acts as a stateless bridge. Data is fetched on-the-fly and cached ephemerally during active sessions, maintaining strict HIPAA compliance." }
  ];
  return (
    <section id="faq" className="l-faq">
      <div className="l-container">
        <h2 className="l-section-title">Frequently Asked Questions</h2>
        <div className="l-faq-list">
          {faqs.map((f, i) => (
            <div key={i} className="l-faq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onEnterApp }) {
  const plans = [
    { name: "Clinical Pilot", price: "Free", desc: "For individual clinicians and researchers", feats: ["Connect to 1 FHIR Sandbox", "Up to 500 AI queries/mo", "Basic Tool Access"] },
    { name: "Enterprise Health", price: "Custom", desc: "For hospitals and large practices", feats: ["SMART on FHIR Auth", "Unlimited Queries", "Custom Clinical Tools", "Dedicated Support"] }
  ];
  return (
    <section className="l-pricing">
      <div className="l-container">
        <h2 className="l-section-title">Simple, Transparent Deployment</h2>
        <div className="l-price-grid">
          {plans.map((p, i) => (
            <div key={i} className={`l-price-card ${i===1?'featured':''}`}>
              <h3>{p.name}</h3>
              <div className="l-price-val">{p.price}</div>
              <p className="l-price-desc">{p.desc}</p>
              <ul>
                {p.feats.map((f, j) => <li key={j}>✓ {f}</li>)}
              </ul>
              <button className={`l-btn ${i===1?'l-btn-primary':'l-btn-ghost'}`} onClick={onEnterApp}>{i===1?'Contact Sales':'Start Free Pilot'}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ onEnterApp }) {
  return (
    <section className="l-cta">
      <div className="l-container">
        <h2>Ready to transform your clinical workflow?</h2>
        <p>Deploy VaidyaSetu today and bring AI-powered intelligence to your EHR data.</p>
        <button className="l-btn l-btn-primary" style={{background:'#fff',color:'#2a9d8f',marginTop:20}} onClick={onEnterApp}>Launch VaidyaSetu Dashboard</button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="l-footer">
      <div className="l-container">
        <div className="l-footer-grid">
          <div>
            <h3>VaidyaSetu</h3>
            <p>FHIRBridge MCP Server</p>
          </div>
          <div>
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
            <a href="#">GitHub</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">HIPAA Compliance</a>
          </div>
        </div>
        <div className="l-footer-bottom">
          &copy; {new Date().getFullYear()} VaidyaSetu. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
