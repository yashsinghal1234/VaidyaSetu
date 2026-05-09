# FHIRBridge MCP 🏥

> **An AI-powered Model Context Protocol (MCP) server that bridges AI agents with hospital FHIR R4 data — fetching, normalising, and reasoning over patient records using Hugging Face.**

---

## 💡 Inspiration
Working with healthcare data is notoriously difficult. Electronic Health Records (EHRs) are siloed, deeply nested, and overwhelmingly dense for both clinicians and developers. We wanted to bridge the gap between standardized healthcare data (FHIR) and cutting-edge large language models to create a system that doesn't just display data, but actually *understands* it. The inspiration for FHIRBridge MCP was to leverage the new **Model Context Protocol (MCP)** to give AI agents direct, secure, and semantic access to clinical data, empowering them to act as true medical co-pilots capable of reasoning over patient histories.

## 🚀 What it does
FHIRBridge MCP connects real-time EHR data with Hugging Face's advanced reasoning capabilities. It provides a suite of **14 specialized MCP tools** (8 FHIR-native, 6 AI-powered) that can be seamlessly invoked via a clinical dashboard. 

Key features include:
*   **AI Chart Summaries:** Transforms complex, fragmented patient histories into concise, actionable clinical briefings in seconds.
*   **ER Triage Flags:** Rapidly assesses raw patient data to highlight critical alerts and triage urgency.
*   **Medication Safety Analysis:** Automatically reviews active medication lists to detect adverse drug interactions and safety concerns.
*   **Anomaly Detection:** Analyzes lab results and vitals to identify concerning clinical trends.
*   **Preventive Care Gaps:** Highlights missing preventive care steps based on patient demographics, conditions, and history.
## 💻 Tech Stack

- **Languages:** Python, JavaScript (ES6+)
- **Backend Framework:** FastAPI, Uvicorn, Pydantic
- **Frontend Framework:** React, Vite, Lucide Icons
- **AI & Reasoning:** Hugging Face Inference API (`HuggingFaceH4/zephyr-7b-beta`), `huggingface_hub`
- **Protocols & Standards:** Model Context Protocol (MCP), HL7 FHIR R4
- **External Services:** HAPI FHIR Sandbox API

## 🛠️ How we built it
*   **Backend & Interoperability:** We built the core server using Python, interfacing directly with the public HAPI FHIR R4 sandbox. We implemented the Model Context Protocol (MCP) to expose specific tools to the AI, allowing it to seamlessly query endpoints like `get_patient`, `get_observations`, `get_conditions`, and `get_allergies`.
*   **AI Engine:** We integrated Hugging Face (defaulting to the highly capable `HuggingFaceH4/zephyr-7b-beta` model) to process the raw, structured FHIR JSON responses. By acting as the reasoning engine, Hugging Face applies clinical logic to generate summaries, flag anomalies, and assess triage states.
*   **Frontend Dashboard:** The user interface is a "Clinical Dashboard" built with React and Vite. We designed a clean, professional aesthetic using custom CSS. It features real-time KPI cards, quick actions, and a "Tool Runner" interface that elegantly displays both the raw FHIR data responses and the AI-generated insights.

## ⚠️ Challenges we faced
*   **Navigating FHIR Complexity:** FHIR R4 resources are incredibly comprehensive but deeply nested. Extracting the relevant clinical signals without overwhelming the LLM's context window required careful data parsing, filtering, and shaping.
*   **Latency & Orchestration:** Orchestrating sequential API calls (e.g., fetching a patient, then their labs, then their conditions) followed by complex LLM inference can result in high latency. We had to optimize our MCP tool calls and structure our prompts to ensure rapid, reliable responses suitable for a fast-paced clinical environment.
*   **Designing for Healthcare:** Building a UI that felt intuitive, trustworthy, and authoritative enough for a healthcare setting took iteration. We transitioned from a basic developer tool prototype to a polished, card-based executive dashboard with clear information architecture.

## 🧠 What we learned
*   The immense potential of the **Model Context Protocol (MCP)** in standardizing how AI agents interact with external APIs, drastically simplifying tool-use architecture.
*   Deep practical insights into the **HL7 FHIR R4 standard** and the mechanics of modern healthcare interoperability.
*   How to engineer highly effective prompts to ensure Hugging Face accurately analyzes complex medical data without hallucination, maintaining clinical safety.

## 🔮 What's next
*   **SMART on FHIR Integration:** Implementing full OAuth2 flows for secure, authenticated access to real hospital EHR systems (like Epic or Cerner).
*   **Multi-modal Analysis:** Expanding the system to analyze medical imaging (DICOM) alongside textual FHIR data.
*   **Predictive Analytics:** Utilizing historical FHIR encounters and observation data to predict patient readmission risks and long-term health outcomes.

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
3. **Reasons** — Hugging Face synthesises raw clinical data into actionable plain-English insights

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
# Edit .env — at minimum set HUGGINGFACE_API_KEY
# You can also change the HF_MODEL if desired (defaults to HuggingFaceH4/zephyr-7b-beta)
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

### AI Reasoning Tools (Hugging Face-powered)

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
├── hf_reasoner.py       # Hugging Face-powered clinical reasoning engine
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
