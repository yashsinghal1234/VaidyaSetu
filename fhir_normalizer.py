"""
FHIRBridge MCP — FHIR Normalizer
Converts raw FHIR R4 JSON resources into clean, structured Python dicts
that are human-readable and AI-agent-friendly.
"""
from __future__ import annotations
from typing import Any, Optional
from datetime import datetime


# ── Utility helpers ────────────────────────────────────────────────────────────

def _coding_display(coding_list: list[dict]) -> str:
    """Extract the most human-readable display text from a coding array."""
    for c in coding_list:
        if c.get("display"):
            return c["display"]
    for c in coding_list:
        if c.get("code"):
            return c["code"]
    return "Unknown"


def _codeable_display(codeable: dict) -> str:
    """Get display from CodeableConcept (text preferred, then first coding)."""
    if not codeable:
        return "Unknown"
    if codeable.get("text"):
        return codeable["text"]
    return _coding_display(codeable.get("coding", []))


def _format_date(dt_str: Optional[str]) -> Optional[str]:
    """Normalise FHIR date/dateTime strings to ISO-like human format."""
    if not dt_str:
        return None
    try:
        # Handle date-only strings (YYYY-MM-DD)
        if len(dt_str) == 10:
            return dt_str
        # Handle full datetime strings
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return dt_str


def _name_from_patient(patient: dict) -> str:
    """Derive a display name from a Patient resource."""
    for name in patient.get("name", []):
        given = " ".join(name.get("given", []))
        family = name.get("family", "")
        full = f"{given} {family}".strip()
        if full:
            return full
    return "Unknown Patient"


# ── Per-resource normalisers ───────────────────────────────────────────────────

def normalize_patient(raw: dict) -> dict:
    """Flatten a FHIR Patient resource."""
    gender = raw.get("gender", "unknown")
    dob = raw.get("birthDate")
    age = None
    if dob:
        try:
            birth_year = int(dob[:4])
            age = datetime.utcnow().year - birth_year
        except Exception:
            pass

    telecom = raw.get("telecom", [])
    phone = next((t["value"] for t in telecom if t.get("system") == "phone"), None)
    email = next((t["value"] for t in telecom if t.get("system") == "email"), None)

    address_parts = []
    for addr in raw.get("address", [])[:1]:
        address_parts += addr.get("line", [])
        if addr.get("city"):
            address_parts.append(addr["city"])
        if addr.get("state"):
            address_parts.append(addr["state"])
        if addr.get("postalCode"):
            address_parts.append(addr["postalCode"])

    return {
        "id": raw.get("id"),
        "name": _name_from_patient(raw),
        "gender": gender,
        "date_of_birth": dob,
        "age": age,
        "phone": phone,
        "email": email,
        "address": ", ".join(address_parts) if address_parts else None,
        "marital_status": _codeable_display(raw.get("maritalStatus", {})),
        "active": raw.get("active", True),
        "identifiers": [
            {"system": i.get("system", ""), "value": i.get("value", "")}
            for i in raw.get("identifier", [])
        ],
    }


def normalize_observation(raw: dict) -> dict:
    """Flatten a FHIR Observation resource (labs, vitals, surveys)."""
    # Value extraction — FHIR supports many value[x] types
    value = None
    unit = None
    if "valueQuantity" in raw:
        vq = raw["valueQuantity"]
        value = vq.get("value")
        unit = vq.get("unit") or vq.get("code")
    elif "valueCodeableConcept" in raw:
        value = _codeable_display(raw["valueCodeableConcept"])
    elif "valueString" in raw:
        value = raw["valueString"]
    elif "valueBoolean" in raw:
        value = str(raw["valueBoolean"])
    elif "component" in raw:
        # Blood pressure etc. — multiple components
        components = []
        for comp in raw["component"]:
            comp_name = _codeable_display(comp.get("code", {}))
            comp_vq = comp.get("valueQuantity", {})
            comp_val = comp_vq.get("value")
            comp_unit = comp_vq.get("unit")
            components.append({"name": comp_name, "value": comp_val, "unit": comp_unit})
        value = components
        unit = None

    # Reference range
    ref_range = None
    if raw.get("referenceRange"):
        rr = raw["referenceRange"][0]
        low = rr.get("low", {}).get("value")
        high = rr.get("high", {}).get("value")
        if low is not None and high is not None:
            ref_range = f"{low}–{high}"
        elif low is not None:
            ref_range = f">{low}"
        elif high is not None:
            ref_range = f"<{high}"

    # Interpretation (normal / high / low / critical)
    interpretation = None
    if raw.get("interpretation"):
        interpretation = _codeable_display(raw["interpretation"][0])

    return {
        "id": raw.get("id"),
        "name": _codeable_display(raw.get("code", {})),
        "loinc_code": next(
            (c["code"] for c in raw.get("code", {}).get("coding", []) if "loinc" in c.get("system", "").lower()),
            None,
        ),
        "status": raw.get("status"),
        "value": value,
        "unit": unit,
        "reference_range": ref_range,
        "interpretation": interpretation,
        "effective_date": _format_date(raw.get("effectiveDateTime") or raw.get("effectivePeriod", {}).get("start")),
        "issued": _format_date(raw.get("issued")),
        "subject_id": (raw.get("subject", {}).get("reference") or "").replace("Patient/", ""),
        "performer": [p.get("display", "") for p in raw.get("performer", [])],
        "category": _codeable_display(raw["category"][0]) if raw.get("category") else None,
    }


def normalize_condition(raw: dict) -> dict:
    """Flatten a FHIR Condition resource."""
    onset = raw.get("onsetDateTime") or raw.get("onsetAge", {}).get("value")
    abatement = raw.get("abatementDateTime") or raw.get("abatementAge", {}).get("value")

    return {
        "id": raw.get("id"),
        "name": _codeable_display(raw.get("code", {})),
        "icd10_code": next(
            (c["code"] for c in raw.get("code", {}).get("coding", []) if "icd" in c.get("system", "").lower()),
            None,
        ),
        "snomed_code": next(
            (c["code"] for c in raw.get("code", {}).get("coding", []) if "snomed" in c.get("system", "").lower()),
            None,
        ),
        "clinical_status": _codeable_display(raw.get("clinicalStatus", {})),
        "verification_status": _codeable_display(raw.get("verificationStatus", {})),
        "severity": _codeable_display(raw.get("severity", {})),
        "category": _codeable_display(raw["category"][0]) if raw.get("category") else None,
        "onset_date": _format_date(str(onset)) if onset else None,
        "abatement_date": _format_date(str(abatement)) if abatement else None,
        "recorded_date": _format_date(raw.get("recordedDate")),
        "subject_id": (raw.get("subject", {}).get("reference") or "").replace("Patient/", ""),
        "note": raw.get("note", [{}])[0].get("text") if raw.get("note") else None,
    }


def normalize_medication_request(raw: dict) -> dict:
    """Flatten a FHIR MedicationRequest resource."""
    med_name = _codeable_display(raw.get("medicationCodeableConcept", {})) or \
               raw.get("medicationReference", {}).get("display", "Unknown")

    dosage_text = None
    dosage_info = {}
    if raw.get("dosageInstruction"):
        di = raw["dosageInstruction"][0]
        dosage_text = di.get("text")
        # Dose quantity
        dose_dose = di.get("doseAndRate", [{}])[0].get("doseQuantity", {})
        dosage_info["dose"] = f"{dose_dose.get('value', '')} {dose_dose.get('unit', '')}".strip()
        # Frequency
        timing = di.get("timing", {}).get("repeat", {})
        freq = timing.get("frequency")
        period = timing.get("period")
        period_unit = timing.get("periodUnit")
        if freq and period:
            dosage_info["frequency"] = f"{freq}x per {period} {period_unit}"
        # Route
        route = di.get("route")
        if route:
            dosage_info["route"] = _codeable_display(route)

    dispense = raw.get("dispenseRequest", {})
    supply_days = dispense.get("expectedSupplyDuration", {}).get("value")

    return {
        "id": raw.get("id"),
        "medication": med_name,
        "rxnorm_code": next(
            (c["code"] for c in raw.get("medicationCodeableConcept", {}).get("coding", [])
             if "rxnorm" in c.get("system", "").lower()),
            None,
        ),
        "status": raw.get("status"),
        "intent": raw.get("intent"),
        "dosage_text": dosage_text,
        "dosage": dosage_info,
        "authored_on": _format_date(raw.get("authoredOn")),
        "requester": raw.get("requester", {}).get("display"),
        "reason": [_codeable_display(r.get("concept", {})) for r in raw.get("reason", [])],
        "supply_days": supply_days,
        "notes": [n.get("text", "") for n in raw.get("note", [])],
        "subject_id": (raw.get("subject", {}).get("reference") or "").replace("Patient/", ""),
    }


def normalize_encounter(raw: dict) -> dict:
    """Flatten a FHIR Encounter resource."""
    period = raw.get("period", {})
    return {
        "id": raw.get("id"),
        "status": raw.get("status"),
        "class": raw.get("class", {}).get("display") or raw.get("class", {}).get("code"),
        "type": _codeable_display(raw["type"][0]) if raw.get("type") else None,
        "service_type": _codeable_display(raw.get("serviceType", {})),
        "priority": _codeable_display(raw.get("priority", {})),
        "start": _format_date(period.get("start")),
        "end": _format_date(period.get("end")),
        "reason": [_codeable_display(r.get("value", {}).get("concept", {})) for r in raw.get("reason", [])],
        "discharge_disposition": _codeable_display(
            raw.get("hospitalization", raw.get("admission", {})).get("dischargeDisposition", {})
        ),
        "location": [loc.get("location", {}).get("display", "") for loc in raw.get("location", [])],
        "subject_id": (raw.get("subject", {}).get("reference") or "").replace("Patient/", ""),
        "participant": [
            p.get("individual", {}).get("display", "") for p in raw.get("participant", [])
        ],
    }


def normalize_allergy_intolerance(raw: dict) -> dict:
    """Flatten a FHIR AllergyIntolerance resource."""
    reactions = []
    for r in raw.get("reaction", []):
        manifestations = [_codeable_display(m.get("concept", m)) for m in r.get("manifestation", [])]
        reactions.append({
            "substance": _codeable_display(r.get("substance", {})),
            "manifestations": manifestations,
            "severity": r.get("severity"),
        })

    return {
        "id": raw.get("id"),
        "substance": _codeable_display(raw.get("code", {})),
        "clinical_status": _codeable_display(raw.get("clinicalStatus", {})),
        "verification_status": _codeable_display(raw.get("verificationStatus", {})),
        "type": raw.get("type"),
        "category": raw.get("category", []),
        "criticality": raw.get("criticality"),
        "onset": _format_date(raw.get("onsetDateTime")),
        "reactions": reactions,
        "note": raw.get("note", [{}])[0].get("text") if raw.get("note") else None,
        "subject_id": (raw.get("patient", {}).get("reference") or "").replace("Patient/", ""),
    }


def normalize_diagnostic_report(raw: dict) -> dict:
    """Flatten a FHIR DiagnosticReport resource."""
    return {
        "id": raw.get("id"),
        "name": _codeable_display(raw.get("code", {})),
        "status": raw.get("status"),
        "category": _codeable_display(raw["category"][0]) if raw.get("category") else None,
        "effective_date": _format_date(raw.get("effectiveDateTime")),
        "issued": _format_date(raw.get("issued")),
        "conclusion": raw.get("conclusion"),
        "result_ids": [r.get("reference", "").replace("Observation/", "") for r in raw.get("result", [])],
        "subject_id": (raw.get("subject", {}).get("reference") or "").replace("Patient/", ""),
        "performer": [p.get("display", "") for p in raw.get("performer", [])],
    }
