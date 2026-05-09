"""
FHIRBridge MCP — HF Clinical Reasoner
Sends normalised FHIR data to Hugging Face for plain-English synthesis,
anomaly detection, and clinical insights.
"""
from __future__ import annotations
import json
from typing import Any
from huggingface_hub import InferenceClient
from config import get_settings

settings = get_settings()

# Lazy client — created on first use
_client: InferenceClient | None = None


def _get_client() -> InferenceClient:
    global _client
    if _client is None:
        if not settings.huggingface_api_key:
            raise ValueError(
                "HUGGINGFACE_API_KEY is not set. Set it in your .env file to enable AI reasoning."
            )
        _client = InferenceClient(api_key=settings.huggingface_api_key)
    return _client


def _call_hf(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    """Generic HF call — returns the text response."""
    client = _get_client()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    response = client.chat_completion(
        model=settings.hf_model,
        messages=messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ── Clinical prompts ───────────────────────────────────────────────────────────

_SYSTEM_CLINICIAN = """You are a senior clinical decision support AI embedded in a hospital EHR system.
Your role is to help clinicians quickly understand patient data. Be concise, precise, and clinically accurate.
Use medical terminology where appropriate but always explain findings in a way that supports rapid clinical action.
Never fabricate data. Only reason from the structured data provided. If data is insufficient, say so clearly.
Format responses with clear sections using markdown. Flag CRITICAL findings prominently."""


def summarize_patient(
    patient: dict,
    conditions: list[dict],
    medications: list[dict],
    observations: list[dict],
    allergies: list[dict],
    encounters: list[dict],
) -> str:
    """Generate a comprehensive patient summary using Hugging Face."""
    payload = {
        "patient": patient,
        "active_conditions": conditions,
        "current_medications": medications,
        "recent_observations": observations[:20],  # cap to avoid token overflow
        "allergies": allergies,
        "recent_encounters": encounters[:5],
    }
    user_msg = f"""Generate a pre-consultation clinical briefing for this patient.
Include:
1. **Patient Overview** — demographics, key identifiers
2. **Active Problems** — diagnoses with onset, severity
3. **Medication Review** — current meds, notable interactions or concerns
4. **Recent Labs/Vitals** — abnormal values flagged with ⚠️
5. **Allergy Alerts** — critical flags with 🚨
6. **Visit History** — recent encounters summary
7. **Clinical Highlights** — 3-5 bullet actionable insights for the clinician

Patient data:
{json.dumps(payload, indent=2, default=str)}"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=1500)


def analyze_observations(observations: list[dict], patient_context: dict | None = None) -> str:
    """Analyse a set of observations for trends and anomalies."""
    payload = {
        "observations": observations,
        "patient": patient_context or {},
    }
    user_msg = f"""Analyse these clinical observations/labs for a patient.
Identify:
- ⚠️ Abnormal values (above/below reference range or interpretation flagged)
- 📈 Trends over time (improving, stable, worsening) if multiple timepoints exist
- 🔗 Clinically significant correlations between values
- 🚨 Any values requiring urgent clinical attention
- Recommended follow-up actions based on findings

Data:
{json.dumps(payload, indent=2, default=str)}"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=1200)


def check_medication_safety(medications: list[dict], conditions: list[dict], allergies: list[dict]) -> str:
    """Perform a medication safety review."""
    payload = {
        "medications": medications,
        "conditions": conditions,
        "allergies": allergies,
    }
    user_msg = f"""Perform a medication safety review for this patient's current medication list.
Evaluate:
1. 🚨 **Drug-Allergy Conflicts** — any meds conflicting with documented allergies
2. ⚠️ **Drug-Drug Interactions** — flag any known significant interactions
3. 💊 **Drug-Disease Interactions** — medications contraindicated given the patient's conditions
4. 📋 **Dosing Concerns** — any medications that may need dose adjustment (e.g., renal/hepatic considerations from labs)
5. 🔄 **Duplicate Therapy** — overlapping therapeutic classes
6. ✅ **Adherence Gaps** — medications expected but missing for documented conditions

Medication and clinical data:
{json.dumps(payload, indent=2, default=str)}"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=1200)


def generate_triage_flags(
    patient: dict,
    conditions: list[dict],
    observations: list[dict],
    allergies: list[dict],
) -> str:
    """Generate emergency triage flags for rapid ER assessment."""
    payload = {
        "patient": patient,
        "conditions": conditions,
        "critical_labs": observations,
        "allergies": allergies,
    }
    user_msg = f"""You are supporting an ER triage nurse. Generate a rapid triage assessment.
Provide:
🚨 CRITICAL ALERTS — life-threatening conditions, critical lab values, severe allergies
⚠️ ACTIVE PROBLEMS — current diagnoses the ER team must be aware of
💊 MEDICATION ALERTS — current meds that affect ER treatment decisions (anticoagulants, immunosuppressants, etc.)
📋 QUICK SUMMARY — 3-line briefing for the ER physician

Be extremely concise. Use bullet points. This will be read in under 30 seconds.

Patient data:
{json.dumps(payload, indent=2, default=str)}"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=800)


def match_clinical_trial_eligibility(
    conditions: list[dict],
    observations: list[dict],
    medications: list[dict],
    trial_criteria: str,
) -> str:
    """Assess patient eligibility against trial inclusion/exclusion criteria."""
    payload = {
        "patient_conditions": conditions,
        "patient_observations": observations,
        "patient_medications": medications,
    }
    user_msg = f"""Assess whether a patient meets the following clinical trial criteria.

**Trial Criteria:**
{trial_criteria}

**Patient Clinical Data:**
{json.dumps(payload, indent=2, default=str)}

Provide:
✅ **Met Inclusion Criteria** — list each criterion and evidence from patient data
❌ **Unmet Criteria** — list criteria not met with explanation
❓ **Uncertain** — criteria that cannot be determined from available data
📋 **Eligibility Verdict** — ELIGIBLE / NOT ELIGIBLE / REQUIRES FURTHER ASSESSMENT"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=1000)


def identify_care_gaps(
    patient: dict,
    conditions: list[dict],
    observations: list[dict],
    medications: list[dict],
    encounters: list[dict],
) -> str:
    """Identify preventive care gaps and follow-up needs."""
    payload = {
        "patient": patient,
        "conditions": conditions,
        "recent_labs": observations,
        "medications": medications,
        "recent_encounters": encounters,
    }
    user_msg = f"""Identify care gaps for this patient based on evidence-based clinical guidelines.
Consider:
- Preventive screenings due/overdue by age/gender (mammogram, colonoscopy, A1C, lipids, etc.)
- Chronic disease monitoring gaps (e.g., diabetic without HbA1c in 6+ months)
- Missing specialist referrals for documented conditions
- Immunizations that may be due
- Follow-up visits indicated but not scheduled

For each gap, note: **Gap Description** | **Guideline** | **Urgency** | **Recommended Action**

Patient data:
{json.dumps(payload, indent=2, default=str)}"""
    return _call_hf(_SYSTEM_CLINICIAN, user_msg, max_tokens=1200)
