# FHIRBridge MCP 🏥

> **A Model Context Protocol (MCP) server that bridges AI agents with hospital FHIR R4 data — fetching, normalising, and reasoning over patient records using Claude.**

---

## Architecture

```
AI Agent / Clinician
        ↓
  FHIRBridge MCP        ← this server (FastAPI + MCP)
  (FastAPI · Port 8000)
        ↓  ↑
   FHIR R4 Server       ← hospital EHR (Epic / HAPI / Cerner)
```

FHIRBridge does three things:
1. **Fetches** — queries FHIR endpoints with auth, pagination, retries, and caching
2. **Normalises** — converts 500-line FHIR JSON bundles into clean structured dicts
3. **Reasons** — Claude synthesises raw clinical data into actionable plain-English insights

---

## Quickstart

### 1. Clone & install

```bash
git clone <repo>
cd fhirbridge-mcp
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
# FHIR_BASE_URL defaults to the public HAPI FHIR R4 sandbox (no auth needed for testing)
```

### 3. Run the server

```bash
python main.py
# or with uvicorn directly:
uvicorn main:app --reload --port 8000
```

### 4. Run the demo

```bash
python demo.py
```

---

## MCP Tools (14 total)

### FHIR Data Tools

| Tool | Description |
|------|-------------|
| `get_patient` | Fetch patient demographics by ID |
| `search_patients` | Search patients by name, DOB, gender, identifier |
| `get_observations` | Labs, vitals, surveys — filterable by LOINC, category, date |
| `get_conditions` | Diagnoses with ICD-10 codes, clinical status, onset dates |
| `get_medication_list` | Current medications with dosages and prescriber info |
| `get_encounters` | Visit history with encounter type, dates, locations |
| `get_allergies` | Allergies with substances, reactions, severity, criticality |
| `get_diagnostic_reports` | Lab panels, radiology reports with conclusions |

### AI Reasoning Tools (Claude-powered)

| Tool | Use Case |
|------|----------|
| `summarize_patient` | Pre-consultation chart briefing in 5 lines |
| `analyze_observations` | Lab trend analysis + anomaly detection |
| `check_medication_safety` | Drug-drug interactions, contraindications, care gaps |
| `get_triage_flags` | ER/ICU rapid triage assessment (<30 seconds) |
| `match_clinical_trial` | Patient eligibility vs. trial inclusion/exclusion criteria |
| `identify_care_gaps` | Preventive care gaps + guideline-based recommendations |

---

## API Usage

### List all tools
```bash
GET http://localhost:8000/mcp/tools/list
```

### Call a tool
```bash
POST http://localhost:8000/mcp/tools/call
Content-Type: application/json

{
  "name": "summarize_patient",
  "arguments": { "patient_id": "592473" }
}
```

### Example response
```json
{
  "tool": "summarize_patient",
  "status": "success",
  "data": {
    "patient_id": "592473",
    "patient_name": "John Smith",
    "summary": "## Patient Overview\n58M with Type 2 Diabetes...",
    "data_sources": { "conditions": 4, "medications": 6, ... }
  },
  "meta": { "elapsed_ms": 2340, "fhir_server": "https://hapi.fhir.org/baseR4" }
}
```

---

## FHIR Auth Configuration

| Mode | `.env` setting | When to use |
|------|----------------|-------------|
| **None** (default) | `FHIR_AUTH_TYPE=none` | HAPI sandbox, open FHIR servers |
| **Static Bearer** | `FHIR_AUTH_TYPE=bearer` + `FHIR_BEARER_TOKEN=<token>` | Dev/test FHIR servers |
| **SMART on FHIR** | `FHIR_AUTH_TYPE=smart` + client credentials | Epic, Cerner production |

---

## Real-World Applications

- 🏥 **Pre-Consultation Chart Review** — `summarize_patient` → 5-line briefing before appointment
- 🚨 **ER Triage Support** — `get_triage_flags` → critical alerts in <30 seconds
- 💊 **Medication Safety** — `check_medication_safety` → catch dangerous drug combos
- 📊 **Population Health** — `search_patients` + `get_observations` → cohort analysis
- 🔬 **Clinical Trial Matching** — `match_clinical_trial` → auto eligibility screening
- 🤖 **SOAP Note Generation** — combine chart context with visit transcript → auto-drafted notes

---

## Project Structure

```
fhirbridge-mcp/
├── main.py              # FastAPI app + MCP protocol endpoints
├── fhir_client.py       # FHIR HTTP client (auth, retries, pagination, cache)
├── fhir_normalizer.py   # FHIR JSON → clean structured dicts
├── claude_reasoner.py   # Claude-powered clinical reasoning engine
├── models.py            # Pydantic request/response schemas
├── config.py            # Environment configuration (pydantic-settings)
├── demo.py              # Live demo script
├── requirements.txt
└── .env.example
```

---

## Health Check

```bash
GET http://localhost:8000/health
```
Returns FHIR server connectivity, latency, FHIR version, and auth mode.
