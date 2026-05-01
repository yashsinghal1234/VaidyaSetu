"""
FHIRBridge MCP — Demo Script
Runs a live demonstration against the public HAPI FHIR R4 sandbox.
Tests all 14 tools and prints formatted output.
"""
import httpx
import json
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import print as rprint

BASE = "http://localhost:8000"
console = Console()

# ── A known patient in the HAPI FHIR public sandbox ──────────────────────────
# You can find IDs by browsing: https://hapi.fhir.org/baseR4/Patient
DEMO_PATIENT_ID = "592473"   # update if needed


def call_tool(name: str, arguments: dict) -> dict:
    resp = httpx.post(f"{BASE}/mcp/tools/call", json={"name": name, "arguments": arguments}, timeout=60)
    return resp.json()


def section(title: str):
    console.rule(f"[bold cyan]{title}[/bold cyan]")


def show(label: str, data):
    if isinstance(data, str):
        console.print(Panel(data, title=f"[bold green]{label}[/bold green]", border_style="green"))
    else:
        console.print(Panel(json.dumps(data, indent=2, default=str), title=f"[bold yellow]{label}[/bold yellow]", border_style="yellow"))


def main():
    console.print(Panel.fit(
        "[bold magenta]🏥 FHIRBridge MCP — Live Demo[/bold magenta]\n"
        f"Target: [blue]{BASE}[/blue]  |  Patient: [cyan]{DEMO_PATIENT_ID}[/cyan]",
        border_style="magenta",
    ))

    # 1. Health check
    section("Health Check")
    h = httpx.get(f"{BASE}/health").json()
    show("Server Health", h)

    # 2. List tools
    section("Tool Registry")
    tools = httpx.get(f"{BASE}/mcp/tools/list").json()["tools"]
    table = Table(title="Registered MCP Tools", show_lines=True)
    table.add_column("Tool Name", style="cyan")
    table.add_column("Description", style="white")
    for t in tools:
        table.add_row(t["name"], t["description"][:80] + "...")
    console.print(table)

    # 3. Get patient
    section("get_patient")
    r = call_tool("get_patient", {"patient_id": DEMO_PATIENT_ID})
    show("Patient Demographics", r.get("data", r))

    # 4. Search patients
    section("search_patients")
    r = call_tool("search_patients", {"family": "Smith", "_count": 5})
    show("Patient Search (family=Smith)", r.get("data", r))

    # 5. Observations
    section("get_observations — Lab Results")
    r = call_tool("get_observations", {"patient_id": DEMO_PATIENT_ID, "category": "laboratory", "_count": 10})
    show("Lab Observations", r.get("data", r))

    # 6. Conditions
    section("get_conditions — Active Diagnoses")
    r = call_tool("get_conditions", {"patient_id": DEMO_PATIENT_ID, "clinical_status": "active"})
    show("Active Conditions", r.get("data", r))

    # 7. Medications
    section("get_medication_list")
    r = call_tool("get_medication_list", {"patient_id": DEMO_PATIENT_ID})
    show("Medications", r.get("data", r))

    # 8. Encounters
    section("get_encounters")
    r = call_tool("get_encounters", {"patient_id": DEMO_PATIENT_ID, "_count": 5})
    show("Recent Encounters", r.get("data", r))

    # 9. Allergies
    section("get_allergies")
    r = call_tool("get_allergies", {"patient_id": DEMO_PATIENT_ID})
    show("Allergies", r.get("data", r))

    # 10. AI Summary
    section("🤖 summarize_patient — Claude Clinical Briefing")
    r = call_tool("summarize_patient", {"patient_id": DEMO_PATIENT_ID})
    data = r.get("data", {})
    if "summary" in data:
        show("Clinical Summary (Claude)", data["summary"])
    else:
        show("summarize_patient response", data)

    # 11. Analyze observations
    section("🤖 analyze_observations — Anomaly Detection")
    r = call_tool("analyze_observations", {"patient_id": DEMO_PATIENT_ID, "category": "laboratory"})
    data = r.get("data", {})
    if "analysis" in data:
        show("Lab Analysis (Claude)", data["analysis"])
    else:
        show("analyze_observations response", data)

    # 12. Medication safety
    section("🤖 check_medication_safety")
    r = call_tool("check_medication_safety", {"patient_id": DEMO_PATIENT_ID})
    data = r.get("data", {})
    if "safety_report" in data:
        show("Medication Safety Report (Claude)", data["safety_report"])
    else:
        show("medication_safety response", data)

    # 13. Triage flags
    section("🚨 get_triage_flags — ER Triage Assessment")
    r = call_tool("get_triage_flags", {"patient_id": DEMO_PATIENT_ID})
    data = r.get("data", {})
    if "triage_assessment" in data:
        show("Triage Assessment (Claude)", data["triage_assessment"])
    else:
        show("triage_flags response", data)

    # 14. Care gaps
    section("🤖 identify_care_gaps — Preventive Care")
    r = call_tool("identify_care_gaps", {"patient_id": DEMO_PATIENT_ID})
    data = r.get("data", {})
    if "care_gaps" in data:
        show("Care Gaps (Claude)", data["care_gaps"])
    else:
        show("care_gaps response", data)

    console.print("\n✅ [bold green]Demo complete![/bold green]")


if __name__ == "__main__":
    main()
