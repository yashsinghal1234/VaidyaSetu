"""
FHIRBridge MCP — Pydantic Models
Request/response schemas for all MCP tool endpoints.
"""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Shared ────────────────────────────────────────────────────────────────────

class MCPToolResponse(BaseModel):
    tool: str
    status: str = "success"
    data: Any
    meta: dict = Field(default_factory=dict)


class MCPErrorResponse(BaseModel):
    tool: str
    status: str = "error"
    error: str
    detail: Optional[str] = None


# ── Tool Input Schemas ────────────────────────────────────────────────────────

class GetPatientInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")


class SearchPatientsInput(BaseModel):
    family: Optional[str] = Field(None, description="Patient family/last name (partial match)")
    given: Optional[str] = Field(None, description="Patient given/first name")
    birthdate: Optional[str] = Field(None, description="Date of birth (YYYY-MM-DD or range)")
    gender: Optional[str] = Field(None, description="Patient gender: male | female | other | unknown")
    identifier: Optional[str] = Field(None, description="Patient identifier (MRN, SSN etc.)")
    count: int = Field(20, description="Max results to return (default 20, max 100)")


class GetObservationsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    code: Optional[str] = Field(None, description="LOINC code to filter (e.g. '2339-0' for glucose)")
    category: Optional[str] = Field(
        None, description="Observation category: laboratory | vital-signs | social-history | survey"
    )
    date_from: Optional[str] = Field(None, description="Filter observations on/after this date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="Filter observations on/before this date (YYYY-MM-DD)")
    count: int = Field(50, description="Max observations to return")


class GetConditionsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    clinical_status: Optional[str] = Field(
        None, description="Filter by clinical status: active | recurrence | relapse | inactive | remission | resolved"
    )
    category: Optional[str] = Field(None, description="Filter by category: encounter-diagnosis | problem-list-item")


class GetMedicationsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    status: Optional[str] = Field(
        None, description="Filter by status: active | on-hold | cancelled | completed | stopped"
    )


class GetEncountersInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    date_from: Optional[str] = Field(None, description="Filter encounters on/after this date (YYYY-MM-DD)")
    count: int = Field(10, description="Max encounters to return")


class GetAllergiesInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    clinical_status: Optional[str] = Field(None, description="active | inactive | resolved")


class GetDiagnosticReportsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    category: Optional[str] = Field(None, description="Report category e.g. LAB, RAD")
    count: int = Field(10, description="Max reports to return")


class SummarizePatientInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID to summarise")


class AnalyzeObservationsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    category: Optional[str] = Field("laboratory", description="Observation category to analyse")
    date_from: Optional[str] = Field(None, description="Analysis start date")


class MedicationSafetyInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")


class TriageFlagsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")


class ClinicalTrialMatchInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
    trial_criteria: str = Field(..., description="Free-text inclusion/exclusion criteria for the trial")


class CareGapsInput(BaseModel):
    patient_id: str = Field(..., description="FHIR Patient resource ID")
