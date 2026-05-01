"""
FHIRBridge MCP — FastAPI Application
The main MCP server exposing FHIR tools as JSON-RPC 2.0 endpoints
following the Model Context Protocol spec.
"""
from __future__ import annotations
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import fhir_client as fc
import fhir_normalizer as fn
import claude_reasoner as cr
from models import (
    GetPatientInput, SearchPatientsInput,
    GetObservationsInput, GetConditionsInput, GetMedicationsInput,
    GetEncountersInput, GetAllergiesInput, GetDiagnosticReportsInput,
    SummarizePatientInput, AnalyzeObservationsInput, MedicationSafetyInput,
    TriageFlagsInput, ClinicalTrialMatchInput, CareGapsInput,
    MCPToolResponse, MCPErrorResponse,
)
from config import get_settings

settings = get_settings()
logger = logging.getLogger("fhirbridge")
logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# ─────────────────────────────────────────────────────────────────────────────
# MCP Tool Registry
# Each entry defines one tool exposed to AI agents.
# ─────────────────────────────────────────────────────────────────────────────

MCP_TOOLS: list[dict] = [
    {
        "name": "get_patient",
        "description": "Fetch and normalise a single FHIR Patient resource by patient ID. Returns demographics, identifiers, and contact information.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string", "description": "FHIR Patient resource ID"}
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "search_patients",
        "description": "Search for patients by name, date of birth, gender, or identifier. Returns a list of normalised patient records.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "family": {"type": "string", "description": "Patient family/last name"},
                "given": {"type": "string", "description": "Patient given/first name"},
                "birthdate": {"type": "string", "description": "Date of birth YYYY-MM-DD"},
                "gender": {"type": "string", "enum": ["male", "female", "other", "unknown"]},
                "identifier": {"type": "string", "description": "Patient MRN or other identifier"},
                "_count": {"type": "integer", "description": "Max results (default 20)"},
            },
        },
    },
    {
        "name": "get_observations",
        "description": "Retrieve clinical observations (labs, vitals, survey results) for a patient. Optionally filter by LOINC code, category, or date range.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "code": {"type": "string", "description": "LOINC code filter"},
                "category": {"type": "string", "description": "laboratory | vital-signs | social-history"},
                "date_from": {"type": "string", "description": "Start date YYYY-MM-DD"},
                "date_to": {"type": "string", "description": "End date YYYY-MM-DD"},
                "_count": {"type": "integer"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_conditions",
        "description": "Retrieve a patient's medical conditions/diagnoses with ICD-10 codes, clinical status, and onset dates.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "clinical_status": {"type": "string", "description": "active | inactive | resolved"},
                "category": {"type": "string", "description": "problem-list-item | encounter-diagnosis"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_medication_list",
        "description": "Retrieve a patient's medication requests including drug names, dosages, frequency, and prescriber information.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "status": {"type": "string", "description": "active | stopped | completed"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_encounters",
        "description": "Retrieve a patient's visit history including encounter type, dates, locations, and discharge information.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "date_from": {"type": "string", "description": "Start date YYYY-MM-DD"},
                "_count": {"type": "integer"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_allergies",
        "description": "Retrieve a patient's allergy and intolerance list with substances, reactions, severity, and criticality.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "clinical_status": {"type": "string"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_diagnostic_reports",
        "description": "Retrieve diagnostic reports (lab panels, radiology reads) for a patient.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "category": {"type": "string", "description": "LAB | RAD | etc."},
                "_count": {"type": "integer"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "summarize_patient",
        "description": "Generate a Claude-powered clinical briefing for a patient — pulls all available FHIR data and synthesises it into an actionable narrative summary for clinicians.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"}
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "analyze_observations",
        "description": "Use Claude to analyse a patient's observations/labs for anomalies, trends, and clinically significant patterns.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "category": {"type": "string", "description": "laboratory | vital-signs"},
                "date_from": {"type": "string"},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "check_medication_safety",
        "description": "Use Claude to perform a medication safety review — identifies drug-allergy conflicts, drug-drug interactions, contraindications, and care gaps.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"}
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "get_triage_flags",
        "description": "Generate rapid ER/ICU triage flags for a patient — surfaces critical alerts, active diagnoses, and medication warnings in under 30 seconds.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"}
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "match_clinical_trial",
        "description": "Assess whether a patient meets clinical trial inclusion/exclusion criteria based on their FHIR data. Provide the trial criteria as free text.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "trial_criteria": {"type": "string", "description": "Inclusion and exclusion criteria text"},
            },
            "required": ["patient_id", "trial_criteria"],
        },
    },
    {
        "name": "identify_care_gaps",
        "description": "Use Claude to identify preventive care gaps, missing follow-ups, and guideline-based recommendations for a patient.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"}
            },
            "required": ["patient_id"],
        },
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Helper: build FHIR search params, stripping None values
# ─────────────────────────────────────────────────────────────────────────────

def _clean(params: dict) -> dict:
    return {k: v for k, v in params.items() if v is not None}


# ─────────────────────────────────────────────────────────────────────────────
# Tool Handlers
# ─────────────────────────────────────────────────────────────────────────────

def _handle_get_patient(args: dict) -> dict:
    raw = fc.fhir_get("Patient", args["patient_id"])
    return {"patient": fn.normalize_patient(raw)}


def _handle_search_patients(args: dict) -> dict:
    params = _clean({
        "family": args.get("family"),
        "given": args.get("given"),
        "birthdate": args.get("birthdate"),
        "gender": args.get("gender"),
        "identifier": args.get("identifier"),
        "_count": args.get("count", 20),
    })
    raws = fc.fhir_search("Patient", params)
    return {
        "patients": [fn.normalize_patient(r) for r in raws],
        "count": len(raws),
    }


def _handle_get_observations(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "code": args.get("code"),
        "category": args.get("category"),
        "date": [f"ge{args['date_from']}"] if args.get("date_from") else None,
        "_count": args.get("count", 50),
        "_sort": "-date",
    })
    if args.get("date_to"):
        existing = params.get("date", [])
        if isinstance(existing, list):
            existing.append(f"le{args['date_to']}")
        else:
            params["date"] = [existing, f"le{args['date_to']}"]
    raws = fc.fhir_search("Observation", params)
    normalised = [fn.normalize_observation(r) for r in raws]
    return {"observations": normalised, "count": len(normalised)}


def _handle_get_conditions(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "clinical-status": args.get("clinical_status"),
        "category": args.get("category"),
    })
    raws = fc.fhir_search("Condition", params)
    normalised = [fn.normalize_condition(r) for r in raws]
    return {"conditions": normalised, "count": len(normalised)}


def _handle_get_medications(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "status": args.get("status"),
    })
    raws = fc.fhir_search("MedicationRequest", params)
    normalised = [fn.normalize_medication_request(r) for r in raws]
    return {"medications": normalised, "count": len(normalised)}


def _handle_get_encounters(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "date": f"ge{args['date_from']}" if args.get("date_from") else None,
        "_count": args.get("count", 10),
        "_sort": "-date",
    })
    raws = fc.fhir_search("Encounter", params)
    normalised = [fn.normalize_encounter(r) for r in raws]
    return {"encounters": normalised, "count": len(normalised)}


def _handle_get_allergies(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "clinical-status": args.get("clinical_status"),
    })
    raws = fc.fhir_search("AllergyIntolerance", params)
    normalised = [fn.normalize_allergy_intolerance(r) for r in raws]
    return {"allergies": normalised, "count": len(normalised)}


def _handle_get_diagnostic_reports(args: dict) -> dict:
    params = _clean({
        "patient": args["patient_id"],
        "category": args.get("category"),
        "_count": args.get("count", 10),
        "_sort": "-date",
    })
    raws = fc.fhir_search("DiagnosticReport", params)
    normalised = [fn.normalize_diagnostic_report(r) for r in raws]
    return {"reports": normalised, "count": len(normalised)}


def _handle_summarize_patient(args: dict) -> dict:
    pid = args["patient_id"]
    patient = fn.normalize_patient(fc.fhir_get("Patient", pid))
    conditions = [fn.normalize_condition(r) for r in fc.fhir_search("Condition", {"patient": pid})]
    medications = [fn.normalize_medication_request(r) for r in fc.fhir_search("MedicationRequest", {"patient": pid, "status": "active"})]
    observations = [fn.normalize_observation(r) for r in fc.fhir_search("Observation", {"patient": pid, "_count": 30, "_sort": "-date"})]
    allergies = [fn.normalize_allergy_intolerance(r) for r in fc.fhir_search("AllergyIntolerance", {"patient": pid})]
    encounters = [fn.normalize_encounter(r) for r in fc.fhir_search("Encounter", {"patient": pid, "_count": 5, "_sort": "-date"})]
    summary = cr.summarize_patient(patient, conditions, medications, observations, allergies, encounters)
    return {
        "patient_id": pid,
        "patient_name": patient.get("name"),
        "summary": summary,
        "data_sources": {
            "conditions": len(conditions),
            "medications": len(medications),
            "observations": len(observations),
            "allergies": len(allergies),
            "encounters": len(encounters),
        },
    }


def _handle_analyze_observations(args: dict) -> dict:
    pid = args["patient_id"]
    params = _clean({
        "patient": pid,
        "category": args.get("category", "laboratory"),
        "date": f"ge{args['date_from']}" if args.get("date_from") else None,
        "_count": 50,
        "_sort": "-date",
    })
    patient = fn.normalize_patient(fc.fhir_get("Patient", pid))
    observations = [fn.normalize_observation(r) for r in fc.fhir_search("Observation", params)]
    analysis = cr.analyze_observations(observations, patient)
    return {"patient_id": pid, "observations_analysed": len(observations), "analysis": analysis}


def _handle_medication_safety(args: dict) -> dict:
    pid = args["patient_id"]
    medications = [fn.normalize_medication_request(r) for r in fc.fhir_search("MedicationRequest", {"patient": pid})]
    conditions = [fn.normalize_condition(r) for r in fc.fhir_search("Condition", {"patient": pid})]
    allergies = [fn.normalize_allergy_intolerance(r) for r in fc.fhir_search("AllergyIntolerance", {"patient": pid})]
    report = cr.check_medication_safety(medications, conditions, allergies)
    return {"patient_id": pid, "medications_reviewed": len(medications), "safety_report": report}


def _handle_triage_flags(args: dict) -> dict:
    pid = args["patient_id"]
    patient = fn.normalize_patient(fc.fhir_get("Patient", pid))
    conditions = [fn.normalize_condition(r) for r in fc.fhir_search("Condition", {"patient": pid, "clinical-status": "active"})]
    observations = [fn.normalize_observation(r) for r in fc.fhir_search("Observation", {"patient": pid, "_count": 20, "_sort": "-date"})]
    allergies = [fn.normalize_allergy_intolerance(r) for r in fc.fhir_search("AllergyIntolerance", {"patient": pid})]
    flags = cr.generate_triage_flags(patient, conditions, observations, allergies)
    return {"patient_id": pid, "triage_assessment": flags}


def _handle_clinical_trial(args: dict) -> dict:
    pid = args["patient_id"]
    conditions = [fn.normalize_condition(r) for r in fc.fhir_search("Condition", {"patient": pid})]
    observations = [fn.normalize_observation(r) for r in fc.fhir_search("Observation", {"patient": pid, "_count": 30, "_sort": "-date"})]
    medications = [fn.normalize_medication_request(r) for r in fc.fhir_search("MedicationRequest", {"patient": pid})]
    assessment = cr.match_clinical_trial_eligibility(conditions, observations, medications, args["trial_criteria"])
    return {"patient_id": pid, "eligibility_assessment": assessment}


def _handle_care_gaps(args: dict) -> dict:
    pid = args["patient_id"]
    patient = fn.normalize_patient(fc.fhir_get("Patient", pid))
    conditions = [fn.normalize_condition(r) for r in fc.fhir_search("Condition", {"patient": pid})]
    observations = [fn.normalize_observation(r) for r in fc.fhir_search("Observation", {"patient": pid, "_count": 30, "_sort": "-date"})]
    medications = [fn.normalize_medication_request(r) for r in fc.fhir_search("MedicationRequest", {"patient": pid})]
    encounters = [fn.normalize_encounter(r) for r in fc.fhir_search("Encounter", {"patient": pid, "_count": 5, "_sort": "-date"})]
    gaps = cr.identify_care_gaps(patient, conditions, observations, medications, encounters)
    return {"patient_id": pid, "care_gaps": gaps}


TOOL_HANDLERS = {
    "get_patient": _handle_get_patient,
    "search_patients": _handle_search_patients,
    "get_observations": _handle_get_observations,
    "get_conditions": _handle_get_conditions,
    "get_medication_list": _handle_get_medications,
    "get_encounters": _handle_get_encounters,
    "get_allergies": _handle_get_allergies,
    "get_diagnostic_reports": _handle_get_diagnostic_reports,
    "summarize_patient": _handle_summarize_patient,
    "analyze_observations": _handle_analyze_observations,
    "check_medication_safety": _handle_medication_safety,
    "get_triage_flags": _handle_triage_flags,
    "match_clinical_trial": _handle_clinical_trial,
    "identify_care_gaps": _handle_care_gaps,
}


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🏥 FHIRBridge MCP starting — connected to {settings.fhir_base_url}")
    logger.info(f"🔐 Auth mode: {settings.fhir_auth_type}")
    logger.info(f"🤖 Claude model: {settings.claude_model}")
    logger.info(f"🛠  {len(MCP_TOOLS)} tools registered")
    yield
    logger.info("FHIRBridge MCP shutting down")


app = FastAPI(
    title="FHIRBridge MCP",
    description="Model Context Protocol server bridging AI agents with FHIR R4 healthcare data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── MCP Protocol Endpoints ────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "FHIRBridge MCP",
        "version": "1.0.0",
        "protocol": "MCP 1.0",
        "fhir_server": settings.fhir_base_url,
        "tools_count": len(MCP_TOOLS),
        "endpoints": {
            "tools_list": "/mcp/tools/list",
            "tools_call": "/mcp/tools/call",
            "health": "/health",
        },
    }


@app.get("/health")
async def health_check():
    """Check connectivity to the FHIR server."""
    start = time.time()
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{settings.fhir_base_url}/metadata",
                headers={"Accept": "application/fhir+json"},
            )
            resp.raise_for_status()
            meta = resp.json()
            fhir_version = meta.get("fhirVersion", "unknown")
            latency_ms = round((time.time() - start) * 1000)
            return {
                "status": "healthy",
                "fhir_server": settings.fhir_base_url,
                "fhir_version": fhir_version,
                "latency_ms": latency_ms,
                "auth_mode": settings.fhir_auth_type,
                "claude_model": settings.claude_model,
                "tools_registered": len(MCP_TOOLS),
            }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "fhir_server": settings.fhir_base_url, "error": str(exc)},
        )


@app.get("/mcp/tools/list")
async def list_tools():
    """MCP tools/list — returns all available tools with schemas."""
    return {"tools": MCP_TOOLS}


@app.post("/mcp/tools/call")
async def call_tool(request: Request):
    """
    MCP tools/call — JSON-RPC 2.0 compatible tool invocation.
    Body: { "name": "<tool_name>", "arguments": { ... } }
    """
    body = await request.json()
    tool_name = body.get("name")
    arguments = body.get("arguments", {})

    if not tool_name:
        raise HTTPException(status_code=400, detail="Missing 'name' field in request body")

    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return JSONResponse(
            status_code=404,
            content=MCPErrorResponse(
                tool=tool_name,
                status="error",
                error="tool_not_found",
                detail=f"No tool named '{tool_name}'. Call /mcp/tools/list to see available tools.",
            ).model_dump(),
        )

    start = time.time()
    try:
        result = handler(arguments)
        elapsed = round((time.time() - start) * 1000)
        logger.info(f"Tool '{tool_name}' executed in {elapsed}ms")
        return MCPToolResponse(
            tool=tool_name,
            status="success",
            data=result,
            meta={"elapsed_ms": elapsed, "fhir_server": settings.fhir_base_url},
        )
    except httpx.HTTPStatusError as exc:
        logger.error(f"FHIR HTTP error for tool '{tool_name}': {exc}")
        return JSONResponse(
            status_code=exc.response.status_code,
            content=MCPErrorResponse(
                tool=tool_name,
                status="error",
                error="fhir_http_error",
                detail=f"FHIR server returned {exc.response.status_code}: {exc.response.text[:200]}",
            ).model_dump(),
        )
    except ValueError as exc:
        logger.error(f"Config error for tool '{tool_name}': {exc}")
        return JSONResponse(
            status_code=500,
            content=MCPErrorResponse(
                tool=tool_name, status="error", error="configuration_error", detail=str(exc)
            ).model_dump(),
        )
    except Exception as exc:
        logger.exception(f"Unhandled error for tool '{tool_name}'")
        return JSONResponse(
            status_code=500,
            content=MCPErrorResponse(
                tool=tool_name, status="error", error="internal_error", detail=str(exc)
            ).model_dump(),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
        reload=True,
    )
